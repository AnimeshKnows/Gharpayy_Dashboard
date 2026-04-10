import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import PaymentBooking from '@/models/PaymentBooking';
import { getAuthUserFromCookie } from '@/lib/auth';

// Auto-expire approved bookings whose timer has run out
function applyExpiry(booking: any) {
  if (
    booking.status === 'approved' &&
    booking.offerExpiresAt &&
    new Date(booking.offerExpiresAt) < new Date()
  ) {
    booking.status = 'expired';
  }
  return booking;
}

// GET /api/payments — list all (superadmin) or zone-filtered (agent)
export async function GET(req: Request) {
  try {
    const user = await getAuthUserFromCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const query: any = {};
    const isSuperAdmin = user.role === 'super_admin';
    if (!isSuperAdmin && user.zones?.length) {
      query.zoneId = { $in: user.zones };
    }

    const raw = await PaymentBooking.find(query).sort({ createdAt: -1 }).lean();

    // Apply in-memory expiry + bulk DB update for expired ones
    const now = new Date();
    const toExpire: string[] = [];
    const bookings = raw.map((b: any) => {
      if (b.status === 'approved' && b.offerExpiresAt && new Date(b.offerExpiresAt) < now) {
        toExpire.push(b._id.toString());
        return { ...b, status: 'expired' };
      }
      return b;
    });

    if (toExpire.length > 0) {
      await PaymentBooking.updateMany(
        { _id: { $in: toExpire } },
        { $set: { status: 'expired' } }
      );
    }

    const formatted = bookings.map((b: any) => ({ ...b, id: b._id.toString() }));
    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/payments — admin creates a payment booking
export async function POST(req: Request) {
  try {
    const user = await getAuthUserFromCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    await connectToDatabase();

    const booking = await PaymentBooking.create({
      ...body,
      source: body.source ?? 'admin',
      status: 'pending',
      assignedToId: user.id,
      zoneId: user.role === 'super_admin' ? (body.zoneId ?? null) : (user.zones?.[0] ?? null),
    });

    return NextResponse.json({ ...booking.toObject(), id: booking._id.toString() }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
