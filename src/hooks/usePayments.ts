import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await fetch('/api/payments');
      if (!res.ok) throw new Error('Failed to fetch payments');
      return res.json();
    },
    refetchInterval: 30_000, // auto-refresh every 30s to catch expirations
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ['payments', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/payments/${id}`);
      if (!res.ok) throw new Error('Failed to fetch payment');
      return res.json();
    },
    refetchInterval: 10_000,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create payment booking');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment booking created');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const res = await fetch(`/api/payments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update payment');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useApprovePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...pricing }: { id: string; [key: string]: any }) => {
      const res = await fetch(`/api/payments/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricing),
      });
      if (!res.ok) throw new Error('Failed to approve');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Offer sent — 15-minute timer started');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useMarkAsPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/payments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid', paidAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error('Failed to mark as paid');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Marked as paid ✓');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/payments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function usePaymentStats(bookings: any[]) {
  if (!bookings?.length) return { total: 0, pending: 0, approved: 0, paid: 0, expired: 0, cancelled: 0, totalRevenue: 0 };
  return {
    total:        bookings.length,
    pending:      bookings.filter(b => b.status === 'pending').length,
    approved:     bookings.filter(b => b.status === 'approved').length,
    paid:         bookings.filter(b => b.status === 'paid').length,
    expired:      bookings.filter(b => b.status === 'expired').length,
    cancelled:    bookings.filter(b => b.status === 'cancelled').length,
    totalRevenue: bookings.filter(b => b.status === 'paid').reduce((s: number, b: any) => s + (b.tokenAmount || 0), 0),
  };
}