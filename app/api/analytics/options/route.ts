import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import Zone from '@/models/Zone';
import { getAuthUserFromCookie } from '@/lib/auth';
import type { AnalyticsRole } from '../_utils';

type AuthUser = { id: string; role: AnalyticsRole };

function isAllowedRole(role: AnalyticsRole) {
  return role === 'super_admin' || role === 'manager' || role === 'admin' || role === 'member';
}

export async function GET() {
  try {
    const authUser = (await getAuthUserFromCookie()) as AuthUser | null;
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAllowedRole(authUser.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await connectToDatabase();

    if (authUser.role === 'member') {
      const me = await User.findOne({ _id: authUser.id, role: 'member' })
        .select('_id fullName username zones')
        .lean();

      const members = me
        ? [{ id: String((me as any)._id), name: (me as any).fullName || (me as any).username || 'Me', zones: (me as any).zones || [] }]
        : [];

      const zones = ((me as any)?.zones || []).map((zone: any) => ({ name: String(zone) }));

      return NextResponse.json({
        role: authUser.role,
        members,
        zones,
        canViewZoneAnalytics: false,
      });
    }

    const [memberDocs, zoneDocs] = await Promise.all([
      User.find({ role: 'member', status: { $in: ['active', 'inactive'] } })
        .select('_id fullName username zones')
        .sort({ fullName: 1 })
        .lean(),
      Zone.find({ isActive: true }).select('name').sort({ name: 1 }).lean(),
    ]);

    const members = memberDocs.map((member: any) => ({
      id: String(member._id),
      name: member.fullName || member.username || 'Unknown',
      zones: Array.isArray(member.zones) ? member.zones : [],
    }));

    const zones = zoneDocs.map((zone: any) => ({ name: String(zone.name || '') })).filter((zone) => zone.name);

    return NextResponse.json({
      role: authUser.role,
      members,
      zones,
      canViewZoneAnalytics: true,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
