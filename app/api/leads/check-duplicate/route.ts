import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Lead from '@/models/Lead';
import { getAuthUserFromCookie } from '@/lib/auth';

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

    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();
    
    // Fetch all potential duplicates
    const leads = await Lead.find({}).select('_id name phone status assignedMemberId createdBy');
    const duplicates = leads.filter((lead: any) => normalizePhone(lead.phone) === normalizedInput);

    if (duplicates.length === 0) {
      return NextResponse.json({ isDuplicate: false, duplicateCount: 0 });
    }

    // Check if user has access to any of these duplicates
    const accessibleDuplicate = duplicates.find((d: any) => 
      ['super_admin', 'manager', 'admin'].includes(authUser.role) ||
      String(d.createdBy || '') === authUser.id ||
      String(d.assignedMemberId || '') === authUser.id
    );

    if (accessibleDuplicate) {
      return NextResponse.json({
        isDuplicate: true,
        duplicateCount: duplicates.length,
        id: accessibleDuplicate._id?.toString?.() || '',
        name: accessibleDuplicate.name || 'Existing Lead',
        phone: accessibleDuplicate.phone || phone,
        status: accessibleDuplicate.status || 'new',
      });
    }

    // If duplicate exists but user doesn't have access, return minimal info
    return NextResponse.json({
      isDuplicate: true,
      duplicateCount: duplicates.length,
      id: 'restricted',
      name: 'Existing Lead (Assigned to another member)',
      phone: '********' + normalizedInput.slice(-2),
      status: 'hidden',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
