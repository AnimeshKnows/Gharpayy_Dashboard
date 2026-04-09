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
    <div className="min-h-screen bg-background">
      <AddLeadDialog open={open} onOpenChange={setOpen} />
    </div>
  );
};

export default LeadIntakePage;
