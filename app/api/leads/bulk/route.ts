import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Lead from '@/models/Lead';
import User from '@/models/User';
import { getAuthUserFromCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ceo', 'manager', 'admin'].includes(authUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { leads } = await req.json();
    if (!Array.isArray(leads)) return NextResponse.json({ error: 'Leads array required' }, { status: 400 });

    await connectToDatabase();
    
    // Transform leads to match MongoDB schema
    const transformedLeads = leads.map(l => ({
      ...l,
      preferredLocation: l.preferred_location || l.preferredLocation,
      assignedAgentId: l.assigned_agent_id || l.assignedAgentId,
      firstResponseTimeMin: l.first_response_time_min || l.firstResponseTimeMin,
    }));

    const result = await Lead.insertMany(transformedLeads);
    return NextResponse.json({ count: result.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ceo', 'manager', 'admin'].includes(authUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { ids, updates } = await req.json();
    if (!Array.isArray(ids)) return NextResponse.json({ error: 'IDs array required' }, { status: 400 });

    await connectToDatabase();
    
    // Map snake_case updates to camelCase for MongoDB
    const mappedUpdates: any = { ...updates };
    if (updates.assigned_agent_id) mappedUpdates.assignedAgentId = updates.assigned_agent_id;
    if (updates.preferred_location) mappedUpdates.preferredLocation = updates.preferred_location;

    // Assignment permission checks
    if (mappedUpdates.assignedAgentId !== undefined) {
      const agent = await User.findOne({ _id: mappedUpdates.assignedAgentId, role: 'agent' }).select('_id adminId');
      if (!agent) {
        return NextResponse.json({ error: 'Selected agent not found' }, { status: 400 });
      }
      if (authUser.role === 'admin' && String(agent.adminId || '') !== String(authUser.id)) {
        return NextResponse.json(
          { error: 'Admins can assign leads only to agents under them' },
          { status: 403 }
        );
      }
    }

    const result = await Lead.updateMany(
      { _id: { $in: ids } },
      { $set: mappedUpdates }
    );
    return NextResponse.json({ count: result.modifiedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ceo', 'manager', 'admin'].includes(authUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const idsString = searchParams.get('ids');
    let ids: string[] = [];
    
    if (idsString) {
      ids = idsString.split(',').filter(Boolean);
    } else {
      const body = await req.json().catch(() => ({}));
      ids = body.ids || [];
    }

    if (!ids || ids.length === 0) return NextResponse.json({ error: 'IDs required' }, { status: 400 });

    await connectToDatabase();
    const result = await Lead.deleteMany({ _id: { $in: ids } });
    return NextResponse.json({ count: result.deletedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
