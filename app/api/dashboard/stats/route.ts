import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Lead from '@/models/Lead';
import Visit from '@/models/Visit';
import Booking from '@/models/Booking';
import { getAuthUserFromCookie } from '@/lib/auth';

export async function GET() {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const leadQuery: any = {};
    const visitQuery: any = {};
    const bookingQuery: any = { bookingStatus: 'booked' };

    if (authUser.role === 'member') {
      leadQuery.assignedMemberId = authUser.id;
      
      // For visits and bookings, we need to filter by associated lead or assigned agent
      // Assuming Visit has a leadId or assignedTo field (need to check models)
      // If we don't have direct filtering on visits/bookings, we might need a more complex query
    }

    const [leads] = await Promise.all([
      Lead.find(leadQuery, 'id status firstResponseTimeMin source createdAt'),
      // Add visit/booking filtering later if needed, but leads are the primary constraint
    ]);

    // Re-fetch visits and bookings with filtering if member
    let visits, bookings;
    if (authUser.role === 'member') {
      const memberLeads = leads.map(l => l._id);
      visits = await Visit.find({ leadId: { $in: memberLeads } }, 'id outcome scheduledAt');
      bookings = await Booking.find({ ...bookingQuery, leadId: { $in: memberLeads } }, 'id');
    } else {
      visits = await Visit.find({}, 'id outcome scheduledAt');
      bookings = await Booking.find(bookingQuery, 'id');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalLeads = leads.length;
    const newToday = leads.filter(l => new Date(l.createdAt) >= today).length;
    const responseTimes = leads.filter(l => l.firstResponseTimeMin !== undefined && l.firstResponseTimeMin !== null).map(l => l.firstResponseTimeMin!);
    const avgResponseTime = responseTimes.length ? +(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1) : 0;
    const withinSLA = responseTimes.filter(t => t <= 5).length;
    const slaCompliance = responseTimes.length ? Math.round((withinSLA / responseTimes.length) * 100) : 0;
    const slaBreaches = responseTimes.filter(t => t > 5).length;
    const bookedLeads = leads.filter(l => l.status === 'booked').length;
    const conversionRate = totalLeads ? +((bookedLeads / totalLeads) * 100).toFixed(1) : 0;
    const upcomingVisits = visits.filter(v => new Date(v.scheduledAt) >= today && !v.outcome).length;
    const completedVisits = visits.filter(v => v.outcome !== undefined && v.outcome !== null).length;

    return NextResponse.json({
      totalLeads,
      newToday,
      avgResponseTime,
      slaCompliance,
      slaBreaches,
      conversionRate,
      visitsScheduled: upcomingVisits,
      visitsCompleted: completedVisits,
      bookingsClosed: bookedLeads,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
