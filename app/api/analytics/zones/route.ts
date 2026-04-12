import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Lead from '@/models/Lead';
import User from '@/models/User';
import PipelineStage from '@/models/PipelineStage';
import { PIPELINE_STAGES } from '@/types/crm';
import { getAuthUserFromCookie } from '@/lib/auth';
import {
  buildTrendByDay,
  getVisibleMembersForRole,
  normalizePhone,
  normalizeZone,
  parseDateFilters,
  type AnalyticsRole,
} from '../_utils';

type AuthUser = { id: string; role: AnalyticsRole };

type LeadLite = {
  _id: any;
  status?: string;
  source?: string;
  zone?: string;
  phone?: string;
  firstResponseTimeMin?: number;
  createdAt?: string | Date;
  lastActivityAt?: string | Date;
  createdBy?: any;
  assignedMemberId?: any;
};

function isAllowedRole(role: AnalyticsRole) {
  return role === 'super_admin' || role === 'manager' || role === 'admin';
}

function withinRange(dateValue: string | Date | undefined, from: Date | null, to: Date | null) {
  if (!from || !to) return true;
  const date = new Date(dateValue || '');
  if (isNaN(date.getTime())) return false;
  return date >= from && date <= to;
}

async function getOrderedStages() {
  const savedStages = await PipelineStage.find({}).sort({ order: 1, createdAt: 1 }).lean();
  if (savedStages.length > 0) {
    return savedStages.map((stage: any) => ({ key: String(stage.key), label: String(stage.label) }));
  }
  return PIPELINE_STAGES.map((stage) => ({ key: stage.key, label: stage.label }));
}

function buildZoneMetrics({
  leadsAllTime,
  leadsInRange,
  members,
  stages,
}: {
  leadsAllTime: LeadLite[];
  leadsInRange: LeadLite[];
  members: any[];
  stages: Array<{ key: string; label: string }>;
}) {
  const stageAnalytics = stages.map((stage) => ({
    key: stage.key,
    label: stage.label,
    count: leadsInRange.filter((lead) => String(lead.status || '') === stage.key).length,
  }));

  const allTimePhoneCounts = new Map<string, number>();
  for (const lead of leadsAllTime) {
    const normalized = normalizePhone(lead.phone);
    if (!normalized) continue;
    allTimePhoneCounts.set(normalized, (allTimePhoneCounts.get(normalized) || 0) + 1);
  }

  const rangePhoneCounts = new Map<string, number>();
  for (const lead of leadsInRange) {
    const normalized = normalizePhone(lead.phone);
    if (!normalized) continue;
    rangePhoneCounts.set(normalized, (rangePhoneCounts.get(normalized) || 0) + 1);
  }

  const duplicateLeadsAllTime = leadsAllTime.filter((lead) => {
    const normalized = normalizePhone(lead.phone);
    return normalized ? (allTimePhoneCounts.get(normalized) || 0) > 1 : false;
  }).length;

  const duplicateLeadsInRange = leadsInRange.filter((lead) => {
    const normalized = normalizePhone(lead.phone);
    return normalized ? (rangePhoneCounts.get(normalized) || 0) > 1 : false;
  }).length;

  let under5 = 0;
  let between5And30 = 0;
  let over30 = 0;
  let unknown = 0;

  for (const lead of leadsInRange) {
    const value = Number(lead.firstResponseTimeMin);
    if (!Number.isFinite(value) || value < 0) {
      unknown += 1;
    } else if (value < 5) {
      under5 += 1;
    } else if (value <= 30) {
      between5And30 += 1;
    } else {
      over30 += 1;
    }
  }

  const sourceMap = new Map<string, { source: string; leads: number; booked: number }>();
  for (const lead of leadsInRange) {
    const source = String(lead.source || 'unknown');
    const current = sourceMap.get(source) || { source, leads: 0, booked: 0 };
    current.leads += 1;
    if (String(lead.status || '') === 'won') current.booked += 1;
    sourceMap.set(source, current);
  }

  const sourceMix = Array.from(sourceMap.values())
    .map((item) => ({
      ...item,
      conversionRate: item.leads > 0 ? Math.round((item.booked / item.leads) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.leads - a.leads);

  const now = Date.now();
  const stageAging = stages.map((stage) => {
    const items = leadsInRange.filter((lead) => String(lead.status || '') === stage.key);
    const validAges = items
      .map((lead) => {
        const createdAt = new Date(lead.createdAt || '');
        if (isNaN(createdAt.getTime())) return null;
        return (now - createdAt.getTime()) / 86400000;
      })
      .filter((value): value is number => value !== null);
    const avgDays = validAges.length > 0
      ? Math.round((validAges.reduce((sum, age) => sum + age, 0) / validAges.length) * 100) / 100
      : 0;
    return { key: stage.key, label: stage.label, avgDays, leads: items.length };
  });

  const staleThreshold = new Date(now - 3 * 86400000);
  const followUpPending = leadsInRange.filter((lead) => {
    const status = String(lead.status || '');
    if (status === 'won' || status === 'lost') return false;
    const lastActivityAt = new Date(lead.lastActivityAt || lead.createdAt || '');
    return !isNaN(lastActivityAt.getTime()) && lastActivityAt <= staleThreshold;
  }).length;

  const activeMemberIds = new Set<string>();
  const scopedMemberIds = new Set<string>(members.map((member: any) => String(member._id)));
  for (const lead of leadsInRange) {
    const createdById = lead.createdBy ? String(lead.createdBy) : '';
    if (createdById && scopedMemberIds.has(createdById)) activeMemberIds.add(createdById);

    const assignedMemberId = lead.assignedMemberId ? String(lead.assignedMemberId) : '';
    if (assignedMemberId && scopedMemberIds.has(assignedMemberId)) activeMemberIds.add(assignedMemberId);
  }

  const performerMap = new Map<string, { memberId: string; leads: number; booked: number }>();
  for (const lead of leadsInRange) {
    const creatorId = lead.createdBy ? String(lead.createdBy) : '';
    if (!creatorId || !scopedMemberIds.has(creatorId)) continue;
    const current = performerMap.get(creatorId) || { memberId: creatorId, leads: 0, booked: 0 };
    current.leads += 1;
    if (String(lead.status || '') === 'won') current.booked += 1;
    performerMap.set(creatorId, current);
  }

  const memberNameMap = new Map(members.map((member: any) => [String(member._id), member.fullName || member.username || 'Unknown']));
  const rankedPerformers = Array.from(performerMap.values())
    .map((entry) => {
      const score = entry.leads + (entry.booked * 3);
      return {
        memberId: entry.memberId,
        memberName: memberNameMap.get(entry.memberId) || 'Unknown',
        leads: entry.leads,
        booked: entry.booked,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  const bookedCount = leadsInRange.filter((lead) => String(lead.status || '') === 'won').length;
  const conversionRate = leadsInRange.length > 0
    ? Math.round((bookedCount / leadsInRange.length) * 10000) / 100
    : 0;

  return {
    totalMembers: members.length,
    totalLeadsTillDate: leadsAllTime.length,
    totalLeadsInRange: leadsInRange.length,
    duplicateLeadsTillDate: duplicateLeadsAllTime,
    duplicateLeadsInRange,
    stageAnalytics,
    conversionRate,
    sla: {
      under5,
      between5And30,
      over30,
      unknown,
    },
    stageAging,
    sourceMix,
    trend: buildTrendByDay(leadsInRange as any[]),
    activeMembers: activeMemberIds.size,
    followUpPending,
    topPerformer: rankedPerformers[0] || null,
    topPerformers: rankedPerformers.slice(0, 5),
  };
}

export async function GET(req: Request) {
  try {
    const authUser = (await getAuthUserFromCookie()) as AuthUser | null;
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAllowedRole(authUser.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await connectToDatabase();

    const url = new URL(req.url);
    const selectedZoneRaw = url.searchParams.get('zone') || '';
    const compareZoneRaw = url.searchParams.get('compareZone') || '';
    const selectedZone = normalizeZone(selectedZoneRaw);
    const compareZone = normalizeZone(compareZoneRaw);
    const { period, from, to } = parseDateFilters(url.searchParams);

    const leadQuery: any = {};

    const leads = await Lead.find(leadQuery)
      .select('_id status source zone phone firstResponseTimeMin createdAt lastActivityAt createdBy assignedMemberId')
      .lean();

    const orderedStages = await getOrderedStages();

    const selectedZoneLeads = leads.filter((lead: any) => {
      if (!selectedZone) return true;
      return normalizeZone(lead.zone) === selectedZone;
    }) as LeadLite[];

    const selectedZoneLeadsInRange = selectedZoneLeads.filter((lead) => withinRange(lead.createdAt, from, to));
    const selectedZoneMembers = await getVisibleMembersForRole(authUser, selectedZoneRaw || null);

    const metrics = buildZoneMetrics({
      leadsAllTime: selectedZoneLeads,
      leadsInRange: selectedZoneLeadsInRange,
      members: selectedZoneMembers,
      stages: orderedStages,
    });

    let compare: any = null;
    if (compareZone && compareZone !== selectedZone) {
      const compareLeads = leads.filter((lead: any) => normalizeZone(lead.zone) === compareZone) as LeadLite[];
      const compareLeadsInRange = compareLeads.filter((lead) => withinRange(lead.createdAt, from, to));
      const compareMembers = await getVisibleMembersForRole(authUser, compareZoneRaw || null);
      compare = {
        zone: compareZoneRaw,
        metrics: buildZoneMetrics({
          leadsAllTime: compareLeads,
          leadsInRange: compareLeadsInRange,
          members: compareMembers,
          stages: orderedStages,
        }),
      };
    }

    return NextResponse.json({
      filters: {
        zone: selectedZoneRaw || null,
        compareZone: compareZoneRaw || null,
        period,
        from,
        to,
      },
      stages: orderedStages,
      metrics,
      compare,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
