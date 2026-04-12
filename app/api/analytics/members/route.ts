import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Lead from '@/models/Lead';
import LeadActivity from '@/models/LeadActivity';
import PipelineStage from '@/models/PipelineStage';
import Visit from '@/models/Visit';
import { PIPELINE_STAGES } from '@/types/crm';
import { getAuthUserFromCookie } from '@/lib/auth';
import {
  normalizePhone,
  normalizeZone,
  parseDateFilters,
  getVisibleMembersForRole,
  type AnalyticsRole,
} from '../_utils';

type AuthUser = { id: string; role: AnalyticsRole };

function isAllowedRole(role: AnalyticsRole) {
  return role === 'super_admin' || role === 'manager' || role === 'admin' || role === 'member';
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

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

async function buildMemberMetrics({
  memberId,
  memberName,
  leads,
  leadsInRange,
  stages,
  from,
  to,
  zoneFilter,
}: {
  memberId: string;
  memberName: string;
  leads: any[];
  leadsInRange: any[];
  stages: Array<{ key: string; label: string }>;
  from: Date | null;
  to: Date | null;
  zoneFilter: string;
}) {
  const stageAnalytics = stages.map((stage) => ({
    key: stage.key,
    label: stage.label,
    count: leadsInRange.filter((lead) => String(lead.status || '') === stage.key).length,
  }));

  const phones = new Map<string, number>();
  for (const lead of leadsInRange) {
    const normalized = normalizePhone(lead.phone);
    if (!normalized) continue;
    phones.set(normalized, (phones.get(normalized) || 0) + 1);
  }

  const duplicateLeads = leadsInRange.filter((lead) => {
    const normalized = normalizePhone(lead.phone);
    return normalized ? (phones.get(normalized) || 0) > 1 : false;
  }).length;

  const duplicateRatio = leadsInRange.length > 0
    ? Math.round((duplicateLeads / leadsInRange.length) * 10000) / 100
    : 0;

  const booked = leadsInRange.filter((lead) => String(lead.status || '') === 'won').length;
  const conversionRate = leadsInRange.length > 0
    ? Math.round((booked / leadsInRange.length) * 10000) / 100
    : 0;

  const avgFirstResponseMin = average(
    leadsInRange
      .map((lead) => Number(lead.firstResponseTimeMin))
      .filter((value) => Number.isFinite(value) && value >= 0)
  );

  const avgLeadScore = average(
    leadsInRange
      .map((lead) => Number(lead.leadScore))
      .filter((value) => Number.isFinite(value))
  );

  const sourceMap = new Map<string, { source: string; leads: number; booked: number }>();
  for (const lead of leadsInRange) {
    const source = String(lead.source || 'unknown');
    const current = sourceMap.get(source) || { source, leads: 0, booked: 0 };
    current.leads += 1;
    if (String(lead.status || '') === 'won') current.booked += 1;
    sourceMap.set(source, current);
  }
  const sourcePerformance = Array.from(sourceMap.values())
    .map((item) => ({
      ...item,
      conversionRate: item.leads > 0 ? Math.round((item.booked / item.leads) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.leads - a.leads);

  const staleThreshold = new Date(Date.now() - 3 * 86400000);
  const staleLeads = leadsInRange.filter((lead) => {
    const status = String(lead.status || '');
    if (status === 'won' || status === 'lost') return false;
    const lastActivityAt = new Date(lead.lastActivityAt || lead.createdAt || '');
    return !isNaN(lastActivityAt.getTime()) && lastActivityAt <= staleThreshold;
  }).length;

  const leadIds = leadsInRange.map((lead) => lead._id);
  const visits = leadIds.length > 0
    ? await Visit.find({ leadId: { $in: leadIds } }).select('outcome').lean()
    : [];

  const visitOutcomes = {
    completed: visits.filter((visit: any) => visit.outcome === 'completed').length,
    noShow: visits.filter((visit: any) => visit.outcome === 'no_show').length,
    rescheduled: visits.filter((visit: any) => visit.outcome === 'rescheduled').length,
    cancelled: visits.filter((visit: any) => visit.outcome === 'cancelled').length,
  };

  const activityQuery: any = {
    userId: memberId,
    actionType: { $in: ['status_changed', 'assignment_accepted', 'assignment_passed_on'] },
  };
  if (from && to) {
    activityQuery.createdAt = { $gte: from, $lte: to };
  }

  const activities = await LeadActivity.find(activityQuery)
    .select('leadId actionType createdAt')
    .sort({ leadId: 1, createdAt: 1 })
    .lean();

  const statusChanges = activities.filter((entry: any) => entry.actionType === 'status_changed');
  const statusByLead = new Map<string, Date[]>();
  for (const entry of statusChanges) {
    const leadId = String(entry.leadId || '');
    if (!leadId) continue;
    const current = statusByLead.get(leadId) || [];
    current.push(new Date(entry.createdAt));
    statusByLead.set(leadId, current);
  }

  const velocityHours: number[] = [];
  for (const times of statusByLead.values()) {
    if (times.length < 2) continue;
    for (let i = 1; i < times.length; i += 1) {
      const diff = (times[i].getTime() - times[i - 1].getTime()) / 3600000;
      if (diff >= 0) velocityHours.push(diff);
    }
  }

  const assignmentAccepted = activities.filter((entry: any) => entry.actionType === 'assignment_accepted').length;
  const assignmentPassedOn = activities.filter((entry: any) => entry.actionType === 'assignment_passed_on').length;

  const pendingQuery: any = { assignedMemberId: memberId, assignmentStatus: 'pending' };
  if (zoneFilter) {
    pendingQuery.zone = new RegExp(`^${zoneFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }
  const assignmentPendingNow = await Lead.countDocuments(pendingQuery);

  return {
    memberId,
    memberName,
    totalLeadsAddedTillDate: leads.length,
    totalLeadsAddedInRange: leadsInRange.length,
    stageAnalytics,
    duplicateLeads,
    duplicateRatio,
    conversionRate,
    avgFirstResponseMin,
    avgStageMovementHours: average(velocityHours),
    avgLeadScore,
    sourcePerformance,
    visitOutcomes,
    staleLeads,
    assignmentStats: {
      accepted: assignmentAccepted,
      passedOn: assignmentPassedOn,
      pendingNow: assignmentPendingNow,
    },
  };
}

export async function GET(req: Request) {
  try {
    const authUser = (await getAuthUserFromCookie()) as AuthUser | null;
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAllowedRole(authUser.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await connectToDatabase();

    const url = new URL(req.url);
    const requestedMemberId = (url.searchParams.get('memberId') || '').trim();
    const compareMemberId = (url.searchParams.get('compareMemberId') || '').trim();
    const zoneRaw = (url.searchParams.get('zone') || '').trim();
    const zoneFilter = normalizeZone(zoneRaw);
    const { period, from, to } = parseDateFilters(url.searchParams);
    const memberId = authUser.role === 'member' ? authUser.id : requestedMemberId;

    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    const visibleMembers = await getVisibleMembersForRole(authUser, zoneRaw || null);
    const visibleMemberMap = new Map(visibleMembers.map((member: any) => [String(member._id), member]));

    if (!visibleMemberMap.has(memberId)) {
      return NextResponse.json({ error: 'Member not found in your scope' }, { status: 403 });
    }

    const orderedStages = await getOrderedStages();

    const targetIds = [memberId];
    if (authUser.role !== 'member' && compareMemberId && compareMemberId !== memberId && visibleMemberMap.has(compareMemberId)) {
      targetIds.push(compareMemberId);
    }

    const leadQuery: any = { createdBy: { $in: targetIds } };
    const leads = await Lead.find(leadQuery)
      .select('_id phone status source zone firstResponseTimeMin leadScore createdAt lastActivityAt createdBy assignedMemberId assignmentStatus')
      .lean();

    const byMember = new Map<string, any[]>();
    for (const member of targetIds) byMember.set(member, []);

    for (const lead of leads) {
      if (zoneFilter && normalizeZone((lead as any).zone) !== zoneFilter) continue;
      const creatorId = String((lead as any).createdBy || '');
      if (!creatorId || !byMember.has(creatorId)) continue;
      byMember.get(creatorId)!.push(lead);
    }

    const selectedLeads = byMember.get(memberId) || [];
    const selectedLeadsInRange = selectedLeads.filter((lead) => withinRange((lead as any).createdAt, from, to));
    const selectedMetrics = await buildMemberMetrics({
      memberId,
      memberName: (visibleMemberMap.get(memberId) as any)?.fullName || (visibleMemberMap.get(memberId) as any)?.username || 'Unknown',
      leads: selectedLeads,
      leadsInRange: selectedLeadsInRange,
      stages: orderedStages,
      from,
      to,
      zoneFilter,
    });

    let compare: any = null;
    if (targetIds.length > 1) {
      const compareId = targetIds[1];
      const compareLeads = byMember.get(compareId) || [];
      const compareLeadsInRange = compareLeads.filter((lead) => withinRange((lead as any).createdAt, from, to));
      compare = await buildMemberMetrics({
        memberId: compareId,
        memberName: (visibleMemberMap.get(compareId) as any)?.fullName || (visibleMemberMap.get(compareId) as any)?.username || 'Unknown',
        leads: compareLeads,
        leadsInRange: compareLeadsInRange,
        stages: orderedStages,
        from,
        to,
        zoneFilter,
      });
    }

    return NextResponse.json({
      filters: {
        memberId,
        compareMemberId: authUser.role === 'member' ? null : (compareMemberId || null),
        zone: zoneRaw || null,
        period,
        from,
        to,
      },
      stages: orderedStages,
      metrics: selectedMetrics,
      compare,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
