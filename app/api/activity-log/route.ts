import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ActivityLog from '@/models/ActivityLog';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('leadId');
    
    await connectToDatabase();
    
    let query: any = {};
    if (leadId) query.leadId = leadId;
    
    const logs = await ActivityLog.find(query)
      .populate('agentId', 'id name')
      .sort({ createdAt: -1 })
      .limit(50);
      
    const transformedLogs = logs.map(l => ({
      ...l.toObject(),
      id: l._id,
      members: l.agentId
    }));

    return NextResponse.json(transformedLogs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
