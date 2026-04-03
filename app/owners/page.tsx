"use client";

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useOwners, useCreateOwner } from '@/hooks/useInventoryData';
import { usePropertiesWithOwners } from '@/hooks/useInventoryData';
import { Plus, Building2, Phone, Mail, Search } from 'lucide-react';
import { toast } from 'sonner';

const Owners = () => {
  const { data: owners, isLoading } = useOwners();
  const { data: properties } = usePropertiesWithOwners();
  const createOwner = useCreateOwner();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ 
    name: '', phone: '', email: '', 
    username: '', password: '', 
    exactPgName: '', gharpayyPgName: '',
    company_name: '', notes: '' 
  });

  const filtered = owners?.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.phone.includes(search) ||
    o.username?.toLowerCase().includes(search.toLowerCase()) ||
    (o.email && o.email.toLowerCase().includes(search.toLowerCase()))
  );

  const getOwnerProperties = (ownerId: string) =>
    properties?.filter((p: any) => p.ownerId === ownerId || p.owner_id === ownerId) || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.username.trim() || !form.password.trim()) { 
      toast.error('Name, Phone, Username and Password are required'); 
      return; 
    }
    
    try {
      await createOwner.mutateAsync({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password.trim(),
        exactPgName: form.exactPgName.trim(),
        gharpayyPgName: form.gharpayyPgName.trim(),
        company_name: form.company_name.trim() || null,
        notes: form.notes.trim() || null,
      });
      setOpen(false);
      setForm({ name: '', phone: '', email: '', username: '', password: '', exactPgName: '', gharpayyPgName: '', company_name: '', notes: '' });
    } catch (err) {
      // toast.error is handled in the hook
    }
  };

  return (
    <AppLayout title="Owners" subtitle="Manage property owners and their portals">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <Building2 size={20} />
             </div>
             <div>
                <h1 className="text-xl font-display font-semibold">Owners Database</h1>
                <p className="text-xs text-muted-foreground">Manage roles and permissions for PG owners</p>
             </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl shadow-lg shadow-accent/20"><Plus size={16} /> Add New Owner</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="font-display">Create Owner Portal</DialogTitle>
                <p className="text-xs text-muted-foreground">Assign credentials and PG mapping</p>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Full Name *</Label><Input placeholder="Owner name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Phone *</Label><Input placeholder="+91 00000 00000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  </div>

                  <div className="space-y-1"><Label className="text-xs">Email Address *</Label><Input type="email" placeholder="owner@gharpayy.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>

                  <div className="bg-muted/30 p-3 rounded-xl space-y-3 border border-border/50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Login Credentials</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Username *</Label><Input placeholder="unique_username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Password *</Label><Input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
                    </div>
                  </div>

                  <div className="bg-accent/5 p-3 rounded-xl space-y-3 border border-accent/10">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-accent">PG Mapping</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Exact PG Name</Label><Input placeholder="Actual building name" value={form.exactPgName} onChange={e => setForm(f => ({ ...f, exactPgName: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Gharpayy PG Name</Label><Input placeholder="Standard name" value={form.gharpayyPgName} onChange={e => setForm(f => ({ ...f, gharpayyPgName: e.target.value }))} /></div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="rounded-lg px-6" disabled={createOwner.isPending}>
                    {createOwner.isPending ? 'Processing...' : 'Create Account'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, phone or username..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl" />
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-card animate-pulse border" />)}
          </div>
        ) : !filtered?.length ? (
          <div className="text-center py-20 bg-card/50 rounded-3xl border border-dashed">
            <Building2 size={40} className="mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium text-muted-foreground">No accounts found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Create a new owner account to begin</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(owner => {
              const ownerProps = getOwnerProperties(owner.id || owner._id);
              return (
                <div key={owner.id || owner._id} className="group p-5 rounded-2xl border bg-card hover:border-accent/30 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-lg">
                      {owner.name.charAt(0)}
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-accent/5 text-accent border-accent/20">
                      OWNER
                    </Badge>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-base group-hover:text-accent transition-colors">{owner.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono bg-muted px-1 rounded">@{owner.username}</span>
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                    <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                      <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center"><Phone size={10} /></div>
                      {owner.phone}
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                      <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center"><Mail size={10} /></div>
                      <span className="truncate">{owner.email}</span>
                    </div>
                    {owner.gharpayyPgName && (
                      <div className="flex items-center gap-2.5 text-xs text-accent font-medium">
                        <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center"><Building2 size={10} /></div>
                        {owner.gharpayyPgName}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>

  );
};

export default Owners;
