import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Agent from '@/models/Agent';
import Lead from '@/models/Lead';
import { getAuthUserFromCookie } from '@/lib/auth';

export async function GET() {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const query = authUser.zoneName ? { isActive: true, zoneName: authUser.zoneName } : { isActive: true };
    const agents = await Agent.find(query);
    const leads = await Lead.find({}, 'id status assignedAgentId firstResponseTimeMin');

    const stats = agents.map(agent => {
      const agentLeads = leads.filter(l => l.assignedAgentId?.toString() === agent._id.toString());
      const responseTimes = agentLeads.filter(l => l.firstResponseTimeMin !== undefined && l.firstResponseTimeMin !== null).map(l => l.firstResponseTimeMin!);
      const avgResponse = responseTimes.length ? +(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1) : 0;
      const conversions = agentLeads.filter(l => l.status === 'booked').length;
      const active = agentLeads.filter(l => !['booked', 'lost'].includes(l.status)).length;

      return {
        id: agent._id,
        name: agent.name,
        totalLeads: agentLeads.length,
        activeLeads: active,
        avgResponseTime: avgResponse,
        conversions,
      };
    });

    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
