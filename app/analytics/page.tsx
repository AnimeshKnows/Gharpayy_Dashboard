"use client";

import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAnalyticsOptions, useMemberAnalytics, useZoneAnalytics, type AnalyticsPeriod } from '@/hooks/useCrmData';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, Users, Filter, UserRound } from 'lucide-react';

const PERIOD_OPTIONS: Array<{ label: string; value: AnalyticsPeriod }> = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: 'last_7_days' },
  { label: 'Last 30 Days', value: 'last_30_days' },
  { label: 'Custom', value: 'custom' },
];

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function chartTooltipStyle() {
  return {
    borderRadius: '12px',
    border: 'none',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    fontSize: '11px',
    background: 'hsl(var(--card))',
    color: 'hsl(var(--foreground))',
  };
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

const Analytics = () => {
  const { user } = useAuth();
  const isMemberViewOnly = user?.role === 'member';

  const [view, setView] = useState<'zone' | 'member'>('zone');
  const [period, setPeriod] = useState<AnalyticsPeriod>('last_30_days');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [zone, setZone] = useState('all');
  const [memberId, setMemberId] = useState('');

  const { data: analyticsOptions } = useAnalyticsOptions();
  const zones = analyticsOptions?.zones || [];
  const members = analyticsOptions?.members || [];

  const zoneOptions = useMemo(
    () => zones.map((item: any) => ({ value: String(item.name), label: String(item.name) })),
    [zones]
  );

  const filteredMembers = useMemo(() => {
    if (isMemberViewOnly && user?.id) {
      return members.filter((member: any) => String(member.id) === String(user.id));
    }

    if (zone === 'all') return members;
    return members.filter((member: any) =>
      Array.isArray(member.zones)
        ? member.zones.map((item: any) => String(item).toLowerCase()).includes(zone.toLowerCase())
        : false
    );
  }, [isMemberViewOnly, members, user?.id, zone]);

  useEffect(() => {
    if (isMemberViewOnly) setView('member');
  }, [isMemberViewOnly]);

  useEffect(() => {
    if (isMemberViewOnly && user?.id) {
      setMemberId(String(user.id));
      return;
    }

    if (filteredMembers.length === 0) {
      setMemberId('');
      return;
    }
    if (!memberId || !filteredMembers.some((member: any) => String(member.id) === memberId)) {
      setMemberId(String(filteredMembers[0].id));
    }
  }, [filteredMembers, isMemberViewOnly, memberId, user?.id]);

  const commonPeriodFilters = {
    period,
    from: period === 'custom' ? from : undefined,
    to: period === 'custom' ? to : undefined,
  };

  const zoneAnalytics = useZoneAnalytics({
    zone,
    ...commonPeriodFilters,
    enabled: !isMemberViewOnly,
  });

  const memberAnalytics = useMemberAnalytics({
    memberId: (isMemberViewOnly ? user?.id : memberId) || undefined,
    zone: isMemberViewOnly ? undefined : zone,
    ...commonPeriodFilters,
  });

  const exportCurrentView = () => {
    if (view === 'zone' && zoneAnalytics.data) {
      const m = zoneAnalytics.data.metrics;
      downloadCsv('zone-analytics.csv', [
        {
          zone: zoneAnalytics.data.filters.zone || 'all',
          period,
          totalMembers: m.totalMembers,
          totalLeadsTillDate: m.totalLeadsTillDate,
          totalLeadsInRange: m.totalLeadsInRange,
          duplicateLeadsTillDate: m.duplicateLeadsTillDate,
          duplicateLeadsInRange: m.duplicateLeadsInRange,
          conversionRate: m.conversionRate,
          activeMembers: m.activeMembers,
          followUpPending: m.followUpPending,
        },
      ]);
      return;
    }

    if (view === 'member' && memberAnalytics.data) {
      const m = memberAnalytics.data.metrics;
      downloadCsv('member-analytics.csv', [
        {
          memberId: m.memberId,
          memberName: m.memberName,
          period,
          totalLeadsAddedTillDate: m.totalLeadsAddedTillDate,
          totalLeadsAddedInRange: m.totalLeadsAddedInRange,
          duplicateLeads: m.duplicateLeads,
          duplicateRatio: m.duplicateRatio,
          conversionRate: m.conversionRate,
          avgFirstResponseMin: m.avgFirstResponseMin,
          avgStageMovementHours: m.avgStageMovementHours,
          avgLeadScore: m.avgLeadScore,
          staleLeads: m.staleLeads,
        },
      ]);
    }
  };

  const showLoading = (isMemberViewOnly || view === 'member') ? memberAnalytics.isLoading : zoneAnalytics.isLoading;

  return (
    <AppLayout
      title="Analytics"
      subtitle={isMemberViewOnly ? 'Your personal analytics' : 'Zone-wise and member-wise performance analytics'}
    >
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter size={16} /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Date Range</p>
              <Select value={period} onValueChange={(value) => setPeriod(value as AnalyticsPeriod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isMemberViewOnly && (
              <>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">Zone</p>
                  <Select value={zone} onValueChange={setZone}>
                    <SelectTrigger><SelectValue placeholder="All Zones" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Zones</SelectItem>
                      {zoneOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">Member</p>
                  <Select value={memberId || undefined} onValueChange={setMemberId}>
                    <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                    <SelectContent>
                      {filteredMembers.map((member: any) => (
                        <SelectItem key={String(member.id)} value={String(member.id)}>{member.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {period === 'custom' && (
              <>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">From</p>
                  <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">To</p>
                  <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
                </div>
              </>
            )}

            <div className="flex items-end gap-2">
              <Button type="button" variant="outline" className="w-full" onClick={exportCurrentView}>
                <Download size={14} className="mr-1" /> Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={view} onValueChange={(value) => setView(value as 'zone' | 'member')}>
        {!isMemberViewOnly && (
          <TabsList className="mb-4">
            <TabsTrigger value="zone"><Users size={14} className="mr-1" /> Zone Analytics</TabsTrigger>
            <TabsTrigger value="member"><UserRound size={14} className="mr-1" /> Member Analytics</TabsTrigger>
          </TabsList>
        )}

        {showLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {[...Array(6)].map((_, index) => (
              <Skeleton key={index} className="h-[120px] rounded-xl" />
            ))}
          </div>
        )}

        <TabsContent value="zone" hidden={isMemberViewOnly}>
          {zoneAnalytics.data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Members in Zone</p><p className="text-2xl font-semibold mt-1">{zoneAnalytics.data.metrics.totalMembers}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Leads till Date</p><p className="text-2xl font-semibold mt-1">{zoneAnalytics.data.metrics.totalLeadsTillDate}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Duplicate Leads</p><p className="text-2xl font-semibold mt-1">{zoneAnalytics.data.metrics.duplicateLeadsTillDate}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Conversion Rate</p><p className="text-2xl font-semibold mt-1">{formatPercent(zoneAnalytics.data.metrics.conversionRate)}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active Members</p><p className="text-2xl font-semibold mt-1">{zoneAnalytics.data.metrics.activeMembers}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Follow-up Pending</p><p className="text-2xl font-semibold mt-1">{zoneAnalytics.data.metrics.followUpPending}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">SLA Under 5 Min</p><p className="text-2xl font-semibold mt-1">{zoneAnalytics.data.metrics.sla.under5}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Top Performer</p><p className="text-base font-semibold mt-1 truncate">{zoneAnalytics.data.metrics.topPerformer?.memberName || 'N/A'}</p></CardContent></Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Pipeline Stage Analytics</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {zoneAnalytics.data.metrics.stageAnalytics.map((stage) => (
                      <div key={stage.key} className="flex items-center justify-between text-sm border-b border-border/40 pb-2">
                        <span>{stage.label}</span>
                        <Badge variant="secondary">{stage.count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">First Response SLA Split</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={[
                          { name: '< 5 min', value: zoneAnalytics.data.metrics.sla.under5 },
                          { name: '5-30 min', value: zoneAnalytics.data.metrics.sla.between5And30 },
                          { name: '> 30 min', value: zoneAnalytics.data.metrics.sla.over30 },
                          { name: 'Unknown', value: zoneAnalytics.data.metrics.sla.unknown },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={chartTooltipStyle()} />
                        <Bar dataKey="value" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Lead Trends</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={zoneAnalytics.data.metrics.trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={chartTooltipStyle()} />
                        <Line type="monotone" dataKey="leads" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="booked" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Source Mix by Zone</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={zoneAnalytics.data.metrics.sourceMix}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="source" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={chartTooltipStyle()} />
                        <Bar dataKey="leads" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="booked" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Stage Aging (Average Days in Stage)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={zoneAnalytics.data.metrics.stageAging}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={chartTooltipStyle()} />
                      <Bar dataKey="avgDays" fill="hsl(var(--warning))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

            </>
          )}
        </TabsContent>

        <TabsContent value="member">
          {memberAnalytics.data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Leads Added</p><p className="text-2xl font-semibold mt-1">{memberAnalytics.data.metrics.totalLeadsAddedTillDate}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Leads Added in Range</p><p className="text-2xl font-semibold mt-1">{memberAnalytics.data.metrics.totalLeadsAddedInRange}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Duplicate Leads</p><p className="text-2xl font-semibold mt-1">{memberAnalytics.data.metrics.duplicateLeads}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Duplicate Ratio</p><p className="text-2xl font-semibold mt-1">{formatPercent(memberAnalytics.data.metrics.duplicateRatio)}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Conversion Rate</p><p className="text-2xl font-semibold mt-1">{formatPercent(memberAnalytics.data.metrics.conversionRate)}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Avg First Response</p><p className="text-2xl font-semibold mt-1">{memberAnalytics.data.metrics.avgFirstResponseMin}m</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Stage Velocity</p><p className="text-2xl font-semibold mt-1">{memberAnalytics.data.metrics.avgStageMovementHours}h</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Avg Lead Score</p><p className="text-2xl font-semibold mt-1">{memberAnalytics.data.metrics.avgLeadScore}</p></CardContent></Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Pipeline Stage Analytics</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {memberAnalytics.data.metrics.stageAnalytics.map((stage) => (
                      <div key={stage.key} className="flex items-center justify-between text-sm border-b border-border/40 pb-2">
                        <span>{stage.label}</span>
                        <Badge variant="secondary">{stage.count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Visit Outcomes</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={[
                          { name: 'Completed', value: memberAnalytics.data.metrics.visitOutcomes.completed },
                          { name: 'No Show', value: memberAnalytics.data.metrics.visitOutcomes.noShow },
                          { name: 'Rescheduled', value: memberAnalytics.data.metrics.visitOutcomes.rescheduled },
                          { name: 'Cancelled', value: memberAnalytics.data.metrics.visitOutcomes.cancelled },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={chartTooltipStyle()} />
                        <Bar dataKey="value" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Source-wise Performance</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={memberAnalytics.data.metrics.sourcePerformance}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="source" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={chartTooltipStyle()} />
                        <Bar dataKey="leads" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="booked" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Assignment and Stale Health</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-border/40 pb-2"><span>Accepted Assignments</span><Badge variant="secondary">{memberAnalytics.data.metrics.assignmentStats.accepted}</Badge></div>
                    <div className="flex justify-between border-b border-border/40 pb-2"><span>Passed On Assignments</span><Badge variant="secondary">{memberAnalytics.data.metrics.assignmentStats.passedOn}</Badge></div>
                    <div className="flex justify-between border-b border-border/40 pb-2"><span>Pending Assignments (Now)</span><Badge variant="secondary">{memberAnalytics.data.metrics.assignmentStats.pendingNow}</Badge></div>
                    <div className="flex justify-between"><span>Stale Leads</span><Badge variant="secondary">{memberAnalytics.data.metrics.staleLeads}</Badge></div>
                  </CardContent>
                </Card>
              </div>

            </>
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Analytics;
