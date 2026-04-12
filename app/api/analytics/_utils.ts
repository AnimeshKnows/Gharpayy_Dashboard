import User from '@/models/User';

export type AnalyticsRole = 'super_admin' | 'manager' | 'admin' | 'member' | 'user' | 'owner';

export function normalizePhone(phone?: string | null) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

export function normalizeZone(zone?: string | null) {
  return String(zone || '').trim().toLowerCase();
}

export function parseDateFilters(params: URLSearchParams) {
  const period = params.get('period') || 'all';
  const fromQuery = params.get('from');
  const toQuery = params.get('to');

  const now = new Date();

  if (period === 'today') {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    return { period, from, to: now };
  }

  if (period === 'last_7_days') {
    const from = new Date(now);
    from.setUTCDate(from.getUTCDate() - 7);
    from.setUTCHours(0, 0, 0, 0);
    return { period, from, to: now };
  }

  if (period === 'last_30_days') {
    const from = new Date(now);
    from.setUTCDate(from.getUTCDate() - 30);
    from.setUTCHours(0, 0, 0, 0);
    return { period, from, to: now };
  }

  if (period === 'custom' && fromQuery && toQuery) {
    const from = new Date(fromQuery);
    const to = new Date(toQuery);
    if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
      to.setUTCHours(23, 59, 59, 999);
      return { period, from, to };
    }
  }

  return { period: 'all', from: null as Date | null, to: null as Date | null };
}

export async function getScopedMemberIdsForAdmin(adminId: string) {
  const adminUser = await User.findById(adminId).select('zones').lean();
  const adminZones = new Set(
    (adminUser?.zones || []).map((zone: any) => normalizeZone(zone)).filter(Boolean)
  );

  if (adminZones.size === 0) return [] as string[];

  const members = await User.find({ role: 'member', status: { $in: ['active', 'inactive'] } })
    .select('_id zones')
    .lean();

  return members
    .filter((member: any) => {
      const memberZones = Array.isArray(member.zones)
        ? member.zones.map((zone: any) => normalizeZone(zone)).filter(Boolean)
        : [];
      return memberZones.some((zone: string) => adminZones.has(zone));
    })
    .map((member: any) => String(member._id));
}

export async function getVisibleMembersForRole(authUser: { id: string; role: AnalyticsRole }, selectedZone?: string | null) {
  const zoneNorm = normalizeZone(selectedZone);

  if (authUser.role === 'super_admin' || authUser.role === 'manager' || authUser.role === 'admin') {
    const members = await User.find({ role: 'member', status: { $in: ['active', 'inactive'] } })
      .select('_id fullName username zones')
      .lean();

    if (!zoneNorm) return members;

    return members.filter((member: any) => {
      const zones = Array.isArray(member.zones)
        ? member.zones.map((zone: any) => normalizeZone(zone))
        : [];
      return zones.includes(zoneNorm);
    });
  }

  if (authUser.role === 'member') {
    const me = await User.findOne({ _id: authUser.id, role: 'member' })
      .select('_id fullName username zones')
      .lean();
    if (!me) return [];

    if (!zoneNorm) return [me];
    const zones = Array.isArray((me as any).zones)
      ? (me as any).zones.map((zone: any) => normalizeZone(zone))
      : [];
    return zones.includes(zoneNorm) ? [me] : [];
  }

  return [];
}

export function buildTrendByDay(leads: any[]) {
  const map = new Map<string, { leads: number; booked: number }>();

  for (const lead of leads) {
    const createdAt = new Date(lead.createdAt);
    if (isNaN(createdAt.getTime())) continue;
    const day = createdAt.toISOString().slice(0, 10);
    const current = map.get(day) || { leads: 0, booked: 0 };
    current.leads += 1;
    if (lead.status === 'won') current.booked += 1;
    map.set(day, current);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, ...values }));
}
