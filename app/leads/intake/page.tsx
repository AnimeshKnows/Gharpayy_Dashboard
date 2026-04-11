"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AddLeadDialog from '@/components/AddLeadDialog';

const LeadIntakePage = () => {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (open) return;

    // If this page was opened via window.open, close the tab after dialog close.
    window.close();

    const t = window.setTimeout(() => {
      router.replace('/leads');
    }, 120);

    return () => window.clearTimeout(t);
  }, [open, router]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,#f4f7ff_0%,#eef3fb_35%,#e9eef8_65%,#e2e9f5_100%)] text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <div className="mb-5 rounded-2xl border border-slate-300/80 bg-white/75 px-4 py-4 backdrop-blur md:px-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Gharpayy CRM</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">Lead Intake Workspace</h1>
          <p className="mt-1 text-xs text-slate-600 md:text-sm">Capture and qualify incoming leads in a dedicated full-page flow.</p>
        </div>

        <div className="h-[calc(100vh-10.5rem)] min-h-[680px] rounded-2xl border border-slate-300/90 bg-white/70 p-2 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.35)] backdrop-blur-sm md:p-3">
          <AddLeadDialog open={open} onOpenChange={setOpen} layout="page" />
        </div>
      </div>
    </div>
  );
};

export default LeadIntakePage;
