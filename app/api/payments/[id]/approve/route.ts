import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import PaymentBooking from '@/models/PaymentBooking';
import { getAuthUserFromCookie } from '@/lib/auth';

// POST /api/payments/[id]/approve — admin approves, starts 15-min offer timer
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const user = await getAuthUserFromCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    await connectToDatabase();

    const now = new Date();
    const offerExpiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

    const booking = await PaymentBooking.findByIdAndUpdate(
      id,
      {
        $set: {
          ...body, // allows passing pricing overrides at approve time
          status: 'approved',
          approvedAt: now,
          offerExpiresAt,
          adminUnread: false,
        },
      },
      { new: true }
    ).lean() as any;

    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ...booking, id: booking._id.toString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}