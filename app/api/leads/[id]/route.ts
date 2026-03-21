import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Lead from '@/models/Lead';
import User from '@/models/User';
import { getAuthUserFromCookie } from '@/lib/auth';

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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    await connectToDatabase();

    const lead = await Lead.findById(id);
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    if (authUser.role === 'agent' && String(lead.assignedAgentId || '') !== String(authUser.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!['ceo', 'manager', 'admin', 'agent'].includes(authUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates: any = { ...body };
    if (body.assigned_agent_id !== undefined && body.assignedAgentId === undefined) {
      updates.assignedAgentId = body.assigned_agent_id;
    }
    if (body.preferred_location !== undefined && body.preferredLocation === undefined) {
      updates.preferredLocation = body.preferred_location;
    }
    if (body.move_in_date !== undefined && body.moveInDate === undefined) {
      updates.moveInDate = body.move_in_date;
    }
    if (body.room_type !== undefined && body.roomType === undefined) {
      updates.roomType = body.room_type;
    }
    if (body.need_preference !== undefined && body.needPreference === undefined) {
      updates.needPreference = body.need_preference;
    }
    if (body.special_requests !== undefined && body.specialRequests === undefined) {
      updates.specialRequests = body.special_requests;
    }

    const isAgentReassignAttempt = updates.assignedAgentId !== undefined;
    if (isAgentReassignAttempt) {
      const assignmentError = await validateAgentAssignment(authUser, updates.assignedAgentId || null);
      if (assignmentError) {
        return NextResponse.json({ error: assignmentError }, { status: 403 });
      }
    }

    const updated = await Lead.findByIdAndUpdate(id, updates, { new: true })
      .populate('propertyId', '_id name');

    if (!updated) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const assignedAgent = updated.assignedAgentId
      ? await User.findOne({ _id: updated.assignedAgentId, role: 'agent' }).select('_id fullName')
      : null;

    return NextResponse.json({
      ...updated.toObject(),
      id: updated._id.toString(),
      assignedAgentId: updated.assignedAgentId?.toString?.(),
      agents: assignedAgent ? { id: assignedAgent._id.toString(), name: assignedAgent.fullName } : null,
      properties:
        updated.propertyId && typeof updated.propertyId === 'object' && '_id' in updated.propertyId
          ? { id: (updated.propertyId as any)._id.toString(), name: (updated.propertyId as any).name }
          : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
