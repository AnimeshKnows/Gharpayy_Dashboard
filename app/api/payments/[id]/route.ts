import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import PaymentBooking from '@/models/PaymentBooking';
import { getAuthUserFromCookie } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const booking = await PaymentBooking.findById(id).lean() as any;
    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (booking.status === 'approved' && booking.offerExpiresAt && new Date(booking.offerExpiresAt) < new Date()) {
      await PaymentBooking.findByIdAndUpdate(id, { status: 'expired' });
      booking.status = 'expired';
    }

    if (!booking.viewedAt) {
      PaymentBooking.findByIdAndUpdate(id, { viewedAt: new Date(), adminUnread: true }).exec().catch(() => {});
    }

    return NextResponse.json({ ...booking, id: booking._id.toString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getAuthUserFromCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    await connectToDatabase();

    const booking = await PaymentBooking.findByIdAndUpdate(id, { $set: body }, { new: true }).lean() as any;
    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ...booking, id: booking._id.toString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getAuthUserFromCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();
    const booking = await PaymentBooking.findByIdAndDelete(id);
    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}