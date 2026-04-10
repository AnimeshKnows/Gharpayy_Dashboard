import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import PaymentBooking from '@/models/PaymentBooking';

// POST /api/payments/request — public, tenant self-submits room request
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenantName, tenantPhone, tenantEmail, propertyName, tenantMessage, zoneId } = body;

    if (!tenantName || !tenantPhone || !propertyName) {
      return NextResponse.json({ error: 'Name, phone, and property are required.' }, { status: 400 });
    }

    await connectToDatabase();

    const booking = await PaymentBooking.create({
      tenantName: tenantName.trim(),
      tenantPhone: tenantPhone.trim(),
      tenantEmail: tenantEmail?.trim() || undefined,
      propertyName: propertyName.trim(),
      notes: tenantMessage?.trim() || undefined,
      zoneId: zoneId || undefined,
      source: 'tenant',
      status: 'pending',
      actualRent: 0,
      discountedRent: 0,
      deposit: 0,
      maintenanceFee: 0,
      tokenAmount: 0,
    });

    return NextResponse.json(
      { id: booking._id.toString(), status: booking.status },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
