"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Trophy, TrendingUp, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface MemberProgress {
  id: string;
  name: string;
  zones: string[];
  newLeads: number;
  visitConfirmed: number;
}

interface ProgressData {
  members: MemberProgress[];
  visitStageLabel: string;
  targets: { newLeads: number; visitConfirmed: number };
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
}

export default function AdminProgressFab() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  if (!['super_admin', 'manager'].includes(user?.role ?? '')) return null;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leads/daily-progress', { cache: 'no-store' });
      if (res.ok) {
        setData(await res.json());
        setLastUpdated(new Date());
      }
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (open) {
      fetchData();
      const id = setInterval(fetchData, 90_000);
      return () => clearInterval(id);
    }
  }, [open, fetchData]);

  if (!data && !open) {
    // prefetch summary counts for the badge
  }

  const members = data?.members ?? [];
  const targets = data?.targets ?? { newLeads: 40, visitConfirmed: 10 };
  const visitLabel = data?.visitStageLabel ?? 'Visit Confirmed';

  const fullAchievers = members.filter(
    m => m.newLeads >= targets.newLeads && m.visitConfirmed >= targets.visitConfirmed
  ).length;
  const partialAchievers = members.filter(
    m => (m.newLeads >= targets.newLeads) !== (m.visitConfirmed >= targets.visitConfirmed)
  ).length;

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-24 right-6 z-60 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors bg-accent text-accent-foreground"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.6 }}
        title="Team Today's Progress"
      >
        <Users size={28} />
        {/* Badge showing full achievers */}
        {open && fullAchievers > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center border border-background">
            {fullAchievers}
          </span>
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="admin-progress-panel"
            initial={{ opacity: 0, scale: 0.92, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 14 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed bottom-40 right-6 z-50 w-80 rounded-2xl border bg-card shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: 'calc(100vh - 180px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-primary" />
                <p className="text-xs font-semibold text-foreground">Team Today</p>
                {lastUpdated && (
                  <span className="text-[9px] text-muted-foreground">
                    {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Targets legend */}
            <div className="px-4 py-2 border-b bg-secondary/30 shrink-0">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Daily Targets per Member</p>
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                  New Leads: <strong className="text-foreground">{targets.newLeads}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  {visitLabel}: <strong className="text-foreground">{targets.visitConfirmed}</strong>
                </span>
              </div>
            </div>

            {/* Summary chips */}
            {members.length > 0 && (
              <div className="px-4 pt-2.5 pb-1.5 flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <Trophy size={9} />
                  {fullAchievers} both done
                </div>
                {partialAchievers > 0 && (
                  <div className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    <AlertCircle size={9} />
                    {partialAchievers} partial
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground ml-auto">
                  {members.length} members
                </div>
              </div>
            )}

            {/* Members list */}
            <div className="overflow-y-auto flex-1 px-3 pb-3 space-y-2 pt-1">
              {loading && !data && (
                <div className="py-8 text-center">
                  <p className="text-xs text-muted-foreground animate-pulse">Loading team progress...</p>
                </div>
              )}
              {!loading && members.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-xs text-muted-foreground">No active members found.</p>
                </div>
              )}
              {members.map((m, i) => {
                const newDone = m.newLeads >= targets.newLeads;
                const visitDone = m.visitConfirmed >= targets.visitConfirmed;
                const bothDone = newDone && visitDone;
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.22 }}
                    className={`rounded-xl border p-3 space-y-2 ${
                      bothDone
                        ? 'border-emerald-500/25 bg-emerald-500/5'
                        : 'border-border bg-secondary/20'
                    }`}
                  >
                    {/* Member header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          bothDone ? 'bg-emerald-500/20 text-emerald-600' : 'bg-accent/15 text-accent'
                        }`}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{m.name}</p>
                          {m.zones.length > 0 && (
                            <p className="text-[9px] text-muted-foreground truncate">{m.zones.join(', ')}</p>
                          )}
                        </div>
                      </div>
                      {bothDone && <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />}
                    </div>

                    {/* New Leads bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">New Leads</span>
                        <span className={`text-[10px] font-semibold ${newDone ? 'text-emerald-500' : 'text-foreground'}`}>
                          {m.newLeads}/{targets.newLeads}
                          {newDone && ' ✓'}
                        </span>
                      </div>
                      <MiniBar value={m.newLeads} max={targets.newLeads} color="#8b5cf6" />
                    </div>

                    {/* Visit Confirmed bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{visitLabel}</span>
                        <span className={`text-[10px] font-semibold ${visitDone ? 'text-emerald-500' : 'text-foreground'}`}>
                          {m.visitConfirmed}/{targets.visitConfirmed}
                          {visitDone && ' ✓'}
                        </span>
                      </div>
                      <MiniBar value={m.visitConfirmed} max={targets.visitConfirmed} color="#10b981" />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t bg-secondary/20 shrink-0">
              <p className="text-[9px] text-muted-foreground text-center">Auto-refreshes every 90s · Resets at midnight</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
