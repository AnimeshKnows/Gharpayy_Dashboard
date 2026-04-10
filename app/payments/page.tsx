"use client";

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import KpiCard from '@/components/KpiCard';
import { usePayments, usePaymentStats, useApprovePayment, useUpdatePayment, useDeletePayment, useCreatePayment } from '@/hooks/usePayments';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  IndianRupee, Clock, CheckCircle, XCircle, TrendingUp,
  ExternalLink, Send, Plus, Trash2, Timer,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-warning/10 text-warning border-warning/20',
  approved:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  paid:      'bg-success/10 text-success border-success/20',
  expired:   'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

const EMPTY_FORM = {
  tenantName: '', tenantPhone: '', tenantEmail: '', propertyName: '',
  roomNumber: '', actualRent: '', discountedRent: '', deposit: '',
  maintenanceFee: '', tokenAmount: '', upiId: '', notes: '',
};

export default function PaymentsPage() {
  const { user } = useAuth();
  const { data: bookings = [], isLoading } = usePayments();
  const stats = usePaymentStats(bookings);
  const approvePayment = useApprovePayment();
  const updatePayment  = useUpdatePayment();
  const deletePayment  = useDeletePayment();
  const createPayment  = useCreatePayment();

  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const filtered = bookings.filter((b: any) => {
    const matchStatus = filterStatus === 'all' || b.status === filterStatus;
    const matchSearch = !search ||
      b.tenantName?.toLowerCase().includes(search.toLowerCase()) ||
      b.tenantPhone?.includes(search) ||
      b.propertyName?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const offerUrl = (id: string) => `${window.location.origin}/pay/${id}`;

  const handleSendOffer = (booking: any) => {
    if (booking.status === 'pending') {
      setApprovingId(booking.id || booking._id);
    } else if (booking.status === 'approved') {
      const url = offerUrl(booking.id || booking._id);
      navigator.clipboard.writeText(url);
      toast.success('Offer link copied to clipboard');
    }
  };

  const confirmApprove = async () => {
    if (!approvingId) return;
    await approvePayment.mutateAsync({ id: approvingId });
    const url = offerUrl(approvingId);
    navigator.clipboard.writeText(url);
    toast.success('Offer link copied — share it with the tenant');
    setApprovingId(null);
  };

  const handleCreate = async () => {
    if (!form.tenantName || !form.tenantPhone || !form.propertyName) {
      toast.error('Name, phone, and property are required');
      return;
    }
    await createPayment.mutateAsync({
      ...form,
      actualRent:     Number(form.actualRent) || 0,
      discountedRent: Number(form.discountedRent) || 0,
      deposit:        Number(form.deposit) || 0,
      maintenanceFee: Number(form.maintenanceFee) || 0,
      tokenAmount:    Number(form.tokenAmount) || 0,
    });
    setShowCreate(false);
    setForm(EMPTY_FORM);
  };

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  if (isLoading) {
    return (
      <AppLayout title="Payments" subtitle="Token payment pipeline">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[130px] rounded-2xl" />)}
        </div>
        <Skeleton className="h-[400px] rounded-2xl" />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Payments" subtitle="Tenant token payment pipeline — send offers, track conversions">

      {/* KPIs */}
      <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <KpiCard title="Total Requests"   value={stats.total}     icon={<IndianRupee size={17} />} />
        <KpiCard title="Pending"          value={stats.pending}   icon={<Clock size={17} />}        color="hsl(var(--warning))" />
        <KpiCard title="Offer Sent"       value={stats.approved}  icon={<Timer size={17} />}        color="hsl(var(--info))" />
        <KpiCard title="Paid (Revenue)"
          value={`₹${(stats.totalRevenue / 1000).toFixed(0)}k`}
          icon={<TrendingUp size={17} />}
          color="hsl(var(--success))"
        />
      </motion.div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Input
          placeholder="Search by name, phone, property…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 text-xs w-[240px] rounded-xl"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] h-8 text-xs rounded-xl">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Offer Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-2xs text-muted-foreground ml-auto">
          {filtered.length} request{filtered.length !== 1 ? 's' : ''}
        </span>

        {/* New Request button opens the public request page */}
        <a href="/pay/request" target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline" className="h-8 text-xs rounded-xl gap-1.5">
            <ExternalLink size={13} /> Tenant Request Form
          </Button>
        </a>
        <Button size="sm" className="h-8 text-xs rounded-xl gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus size={13} /> New Request
        </Button>
      </div>

      {/* Table */}
      <div className="kpi-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-3.5 text-2xs font-medium text-muted-foreground">Tenant</th>
                <th className="text-left px-4 py-3.5 text-2xs font-medium text-muted-foreground">Property</th>
                <th className="text-left px-4 py-3.5 text-2xs font-medium text-muted-foreground">Token Amt</th>
                <th className="text-left px-4 py-3.5 text-2xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3.5 text-2xs font-medium text-muted-foreground">Expires</th>
                <th className="text-left px-4 py-3.5 text-2xs font-medium text-muted-foreground">Source</th>
                <th className="text-left px-4 py-3.5 text-2xs font-medium text-muted-foreground">Created</th>
                <th className="text-left px-4 py-3.5 text-2xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b: any, i: number) => {
                const id = b.id || b._id;
                const canSendOffer = b.status === 'pending' || b.status === 'approved';
                return (
                  <motion.tr
                    key={id}
                    className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  >
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-foreground">{b.tenantName}</p>
                      <p className="text-[10px] text-muted-foreground">{b.tenantPhone}</p>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      <p>{b.propertyName}</p>
                      {b.roomNumber && <p className="text-[10px]">Rm {b.roomNumber}</p>}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      {b.tokenAmount ? `₹${Number(b.tokenAmount).toLocaleString()}` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`badge-pipeline text-[10px] border ${STATUS_COLORS[b.status] || ''}`}>
                        {b.status === 'approved' ? 'Offer Sent' : b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-[10px]">
                      {b.offerExpiresAt && b.status === 'approved'
                        ? format(new Date(b.offerExpiresAt), 'dd MMM, HH:mm')
                        : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] text-muted-foreground capitalize">{b.source}</span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-[10px]">
                      {b.createdAt ? format(new Date(b.createdAt), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {/* Send Offer / Copy Link */}
                        {canSendOffer && (
                          <Button
                            size="sm"
                            variant={b.status === 'approved' ? 'outline' : 'default'}
                            className="h-6 text-[10px] rounded-lg px-2 gap-1"
                            onClick={() => handleSendOffer(b)}
                            disabled={approvePayment.isPending}
                          >
                            <Send size={10} />
                            {b.status === 'approved' ? 'Copy Link' : 'Send Offer'}
                          </Button>
                        )}

                        {/* Open offer page */}
                        {(b.status === 'approved' || b.status === 'paid') && (
                          <a href={offerUrl(id)} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] rounded-lg px-2">
                              <ExternalLink size={10} />
                            </Button>
                          </a>
                        )}

                        {/* Mark cancelled */}
                        {(b.status === 'pending' || b.status === 'expired') && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-6 text-[10px] rounded-lg px-2 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(id)}
                          >
                            <Trash2 size={10} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-xs text-muted-foreground">
                    No payment requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve confirmation */}
      <AlertDialog open={!!approvingId} onOpenChange={() => setApprovingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Timer size={16} className="text-warning" /> Send Offer?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will approve the request and start a 15-minute countdown for the tenant.
              The offer link will be copied to your clipboard — share it on WhatsApp immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApprove} disabled={approvePayment.isPending}>
              Approve & Copy Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle size={16} className="text-destructive" /> Delete Request?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this payment request. Cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => { await deletePayment.mutateAsync(deleteId!); setDeleteId(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create new request dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Payment Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-2xs text-muted-foreground mb-1 block">Tenant Name *</label>
                <Input className="h-8 text-xs" value={form.tenantName} onChange={f('tenantName')} placeholder="Rahul Sharma" />
              </div>
              <div>
                <label className="text-2xs text-muted-foreground mb-1 block">Phone *</label>
                <Input className="h-8 text-xs" value={form.tenantPhone} onChange={f('tenantPhone')} placeholder="+91 98765 43210" />
              </div>
            </div>
            <div>
              <label className="text-2xs text-muted-foreground mb-1 block">Email</label>
              <Input className="h-8 text-xs" value={form.tenantEmail} onChange={f('tenantEmail')} placeholder="optional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-2xs text-muted-foreground mb-1 block">Property Name *</label>
                <Input className="h-8 text-xs" value={form.propertyName} onChange={f('propertyName')} placeholder="Koramangala PG" />
              </div>
              <div>
                <label className="text-2xs text-muted-foreground mb-1 block">Room Number</label>
                <Input className="h-8 text-xs" value={form.roomNumber} onChange={f('roomNumber')} placeholder="3A" />
              </div>
            </div>
            <p className="text-2xs font-medium text-muted-foreground pt-1">Pricing</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-2xs text-muted-foreground mb-1 block">Market Rent ₹</label>
                <Input className="h-8 text-xs" type="number" value={form.actualRent} onChange={f('actualRent')} placeholder="15000" />
              </div>
              <div>
                <label className="text-2xs text-muted-foreground mb-1 block">Offer Rent ₹</label>
                <Input className="h-8 text-xs" type="number" value={form.discountedRent} onChange={f('discountedRent')} placeholder="12000" />
              </div>
              <div>
                <label className="text-2xs text-muted-foreground mb-1 block">Deposit ₹</label>
                <Input className="h-8 text-xs" type="number" value={form.deposit} onChange={f('deposit')} placeholder="12000" />
              </div>
              <div>
                <label className="text-2xs text-muted-foreground mb-1 block">Maintenance ₹</label>
                <Input className="h-8 text-xs" type="number" value={form.maintenanceFee} onChange={f('maintenanceFee')} placeholder="5000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-2xs text-muted-foreground mb-1 block">Token Amount ₹</label>
                <Input className="h-8 text-xs" type="number" value={form.tokenAmount} onChange={f('tokenAmount')} placeholder="10000" />
              </div>
              <div>
                <label className="text-2xs text-muted-foreground mb-1 block">UPI ID</label>
                <Input className="h-8 text-xs" value={form.upiId} onChange={f('upiId')} placeholder="gharpayy@upi" />
              </div>
            </div>
            <div>
              <label className="text-2xs text-muted-foreground mb-1 block">Notes</label>
              <Input className="h-8 text-xs" value={form.notes} onChange={f('notes')} placeholder="Any internal notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={createPayment.isPending}>
              {createPayment.isPending ? 'Creating…' : 'Create Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
