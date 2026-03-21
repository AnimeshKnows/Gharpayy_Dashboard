import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Lead from '@/models/Lead';
import User from '@/models/User';
import { getAuthUserFromCookie } from '@/lib/auth';

function normalizePhone(phone?: string | null) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

async function validateAgentAssignment(authUser: any, agentId?: string | null) {
  if (!agentId) return null;

  const agent = await User.findOne({ _id: agentId, role: 'agent' }).select('_id adminId');
  if (!agent) return 'Selected agent not found';

  if (authUser.role === 'admin' && String(agent.adminId || '') !== String(authUser.id)) {
    return 'Admins can assign leads only to agents under them';
  }

  if (!['ceo', 'manager', 'admin'].includes(authUser.role)) {
    return 'Only CEO, manager, and admin can assign leads';
  }

  return null;
}

export async function GET() {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const query: any = {};
    if (authUser.role === 'agent') {
      query.assignedAgentId = authUser.id;
    } else if (!['ceo', 'manager', 'admin'].includes(authUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const leads = await Lead.find(query)
      .populate('propertyId', '_id name')
      .sort({ createdAt: -1 });

    const assignedAgentIds = Array.from(
      new Set(
        leads
          .map((l: any) => l.assignedAgentId?.toString?.())
          .filter(Boolean)
      )
    );

    const assignedAgents = assignedAgentIds.length
      ? await User.find({ _id: { $in: assignedAgentIds }, role: 'agent' }).select('_id fullName')
      : [];

    const assignedAgentMap = new Map(
      assignedAgents.map((a: any) => [a._id.toString(), { id: a._id.toString(), name: a.fullName }])
    );

    const phoneCounts = new Map<string, number>();
    for (const lead of leads) {
      const normalizedPhone = normalizePhone((lead as any).phone);
      if (!normalizedPhone) continue;
      phoneCounts.set(normalizedPhone, (phoneCounts.get(normalizedPhone) || 0) + 1);
    }

    // Transform to match frontend structure
    const transformedLeads = leads.map(l => ({
      ...l.toObject(),
      id: l._id.toString(),
      assignedAgentId: l.assignedAgentId?.toString?.(),
      duplicateCount: phoneCounts.get(normalizePhone((l as any).phone)) || 0,
      isDuplicate: (phoneCounts.get(normalizePhone((l as any).phone)) || 0) > 1,
      agents: l.assignedAgentId ? assignedAgentMap.get(l.assignedAgentId.toString()) || null : null,
      properties:
        l.propertyId && typeof l.propertyId === 'object' && '_id' in l.propertyId
          ? {
              id: (l.propertyId as any)._id.toString(),
              name: (l.propertyId as any).name,
            }
          : null,
    }));

    return NextResponse.json(transformedLeads);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ceo', 'manager', 'admin'].includes(authUser.role)) {
      return NextResponse.json({ error: 'Only CEO, managers, and admins can create leads' }, { status: 403 });
    }

    const body = await req.json();
    await connectToDatabase();

    const assignedAgentId = body.assignedAgentId || body.assigned_agent_id || null;
    const assignmentError = await validateAgentAssignment(authUser, assignedAgentId);
    if (assignmentError) {
      return NextResponse.json({ error: assignmentError }, { status: 403 });
    }

    // Map snake_case from form to camelCase for model
    const leadData = {
      ...body,
      preferredLocation: body.preferred_location || body.preferredLocation,
      assignedAgentId,
      moveInDate: body.move_in_date || body.moveInDate,
      roomType: body.room_type || body.roomType,
      needPreference: body.need_preference || body.needPreference,
      specialRequests: body.special_requests || body.specialRequests,
      profession: body.profession,
      notes: body.notes,
    };

    const lead = await Lead.create(leadData);
    return NextResponse.json(lead, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

