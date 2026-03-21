import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Reminder from '@/models/Reminder';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('leadId');
    
    await connectToDatabase();
    
    let query: any = { isCompleted: false };
    if (leadId) query.leadId = leadId;
    
    const reminders = await Reminder.find(query)
      .populate('leadId', 'id name phone')
      .populate('agentId', 'id name')
      .sort({ reminderDate: 1 });

    const transformedReminders = reminders.map(r => ({
      ...r.toObject(),
      id: r._id,
      leads: r.leadId,
      members: r.agentId,
      reminder_date: r.reminderDate
    }));

    return NextResponse.json(transformedReminders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    // Map snake_case from frontend to camelCase for Mongoose if needed
    const mappedBody = {
      ...body,
      leadId: body.lead_id || body.leadId,
      agentId: body.agent_id || body.agentId,
      reminderDate: body.reminder_date || body.reminderDate
    };
    const reminder = await Reminder.create(mappedBody);
    return NextResponse.json(reminder, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
