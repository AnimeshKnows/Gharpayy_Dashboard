"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, X, Trophy, TrendingUp, Star, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface DailyTargetData {
  newLeadsToday: number;
  visitConfirmedToday: number;
  visitStageLabel: string;
  targets: { newLeads: number; visitConfirmed: number };
}

function CircleProgress({ value, max, color, size = 44 }: { value: number; max: number; color: string; size?: number }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={4} className="text-border opacity-30" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={4} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
}

export default function DailyTargetFab() {
  const { user } = useAuth();
  const [open, setOpen] = useState(true);
  const [data, setData] = useState<DailyTargetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [highlighted, setHighlighted] = useState(false);
  const queryClient = useQueryClient();

  // Only for members
  if (user?.role !== 'member') return null;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leads/daily-target', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (
          json.newLeadsToday >= json.targets.newLeads &&
          json.visitConfirmedToday >= json.targets.visitConfirmed
        ) {
          setShowCongrats(true);
        }
      }
    } catch { }
    finally { setLoading(false); }
  }, []);

  // Auto-open once per day + pulsing highlight
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]; // e.g. "2026-03-31"
    const key = `daily_target_seen_${today}`;
    const alreadySeen = localStorage.getItem(key);

    // Start highlight ring immediately
    setHighlighted(true);

    if (!alreadySeen) {
      // Auto-open after 2s on first visit of the day
      const t = setTimeout(() => {
        setOpen(true);
        localStorage.setItem(key, '1');
        // Stop highlight ring once opened
        setHighlighted(false);
      }, 2000);
      return () => clearTimeout(t);
    } else {
      // Already seen today — stop highlight after 4s
      const t = setTimeout(() => setHighlighted(false), 4000);
      return () => clearTimeout(t);
    }
  }, []);

  // Fetch on open; also refetch every 60s while open
  useEffect(() => {
    if (open) {
      setHighlighted(false);
      fetchData();
      const id = setInterval(fetchData, 60_000);
      return () => clearInterval(id);
    }
  }, [open, fetchData]);

  // Also refresh whenever React Query invalidates leads
  useEffect(() => {
    return queryClient.getQueryCache().subscribe(() => {
      if (open) fetchData();
    });
  }, [open, fetchData, queryClient]);

  const newLeads = data?.newLeadsToday ?? 0;
  const visits = data?.visitConfirmedToday ?? 0;
  const targetNew = data?.targets.newLeads ?? 40;
  const targetVisit = data?.targets.visitConfirmed ?? 10;
  const visitLabel = data?.visitStageLabel ?? 'Visit Confirmed';

  const bothDone = newLeads >= targetNew && visits >= targetVisit;
  const anyProgress = newLeads > 0 || visits > 0;

  return (
    <>
      {/* FAB button */}
      <div className="fixed bottom-24 right-6 z-60">
        {/* Sonar rings — only while highlighted */}
        {highlighted && (
          <>
            <span className="absolute inset-0 rounded-full animate-ping bg-violet-400 opacity-40" />
            <span className="absolute -inset-2 rounded-full animate-ping bg-violet-300 opacity-20" style={{ animationDelay: '0.3s' }} />
          </>
        )}
        <motion.button
          onClick={() => { setOpen(o => !o); setHighlighted(false); }}
          className="relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors bg-accent text-accent-foreground"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.6 }}
          title="Daily Target"
        >
          {bothDone ? <Trophy size={28} /> : <Target size={28} />}
          {/* Pulse dot when progress > 0 */}
          {anyProgress && !bothDone && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-violet-300 border-2 border-background animate-pulse" />
          )}
        </motion.button>
      </div>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="target-panel"
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed bottom-40 right-6 z-50 w-72 rounded-2xl border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-violet-500" />
                <p className="text-xs font-semibold text-foreground">Today's Target</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-md hover:bg-secondary">
                <X size={14} />
              </button>
            </div>

            {/* Congrats banner */}
            <AnimatePresence>
              {showCongrats && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-emerald-500/10 to-violet-500/10 border-b border-emerald-500/20 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎉</span>
                      <div>
                        <p className="text-xs font-bold text-foreground">You crushed it today!</p>
                        <p className="text-[10px] text-muted-foreground">Both targets achieved. Outstanding work!</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {loading && !data ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-muted-foreground animate-pulse">Loading...</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* New Leads */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <CircleProgress value={newLeads} max={targetNew} color="#8b5cf6" size={52} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[11px] font-bold text-foreground">{newLeads}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-foreground">New Leads</p>
                      {newLeads >= targetNew && <Star size={12} className="text-emerald-500 fill-emerald-500" />}
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-violet-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (newLeads / targetNew) * 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {newLeads}/{targetNew} &nbsp;·&nbsp;
                      {newLeads >= targetNew
                        ? <span className="text-emerald-500 font-semibold">✓ Done!</span>
                        : <span>{targetNew - newLeads} to go</span>}
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border/50" />

                {/* Visit Confirmed */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <CircleProgress value={visits} max={targetVisit} color="#10b981" size={52} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[11px] font-bold text-foreground">{visits}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-foreground truncate">{visitLabel}</p>
                      {visits >= targetVisit && <Star size={12} className="text-emerald-500 fill-emerald-500 shrink-0" />}
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (visits / targetVisit) * 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {visits}/{targetVisit} &nbsp;·&nbsp;
                      {visits >= targetVisit
                        ? <span className="text-emerald-500 font-semibold">✓ Done!</span>
                        : <span>{targetVisit - visits} to go</span>}
                    </p>
                  </div>
                </div>

                {/* Footer note */}
                <div className="flex items-center gap-1.5 pt-1">
                  <TrendingUp size={11} className="text-muted-foreground shrink-0" />
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    Resets every day at midnight. Keep going! 💪
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
