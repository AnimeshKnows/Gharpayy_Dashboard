import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Lead from '@/models/Lead';

function normalizePhone(phone?: string | null) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 });

    const normalizedInput = normalizePhone(phone);
    if (!normalizedInput) return NextResponse.json({ isDuplicate: false, duplicateCount: 0 });

    await connectToDatabase();
    const leads = await Lead.find({}).select('_id name phone status').limit(5000);
    const duplicates = leads.filter((lead: any) => normalizePhone(lead.phone) === normalizedInput);

    if (duplicates.length === 0) {
      return NextResponse.json({ isDuplicate: false, duplicateCount: 0 });
    }

    const sample = duplicates[0];
    return NextResponse.json({
      isDuplicate: true,
      duplicateCount: duplicates.length,
      id: sample._id?.toString?.() || '',
      name: sample.name || 'Existing Lead',
      phone: sample.phone || phone,
      status: sample.status || 'new',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
