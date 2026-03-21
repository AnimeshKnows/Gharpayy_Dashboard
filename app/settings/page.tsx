"use client";

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAgents, useProperties, useCreateAgent, useUpdateAgent, useDeleteAgent, useCreateProperty, useDeleteProperty } from '@/hooks/useCrmData';
import { useAuth } from '@/contexts/AuthContext';
import { CEOSettingsPanel } from '@/components/CEOSettingsPanel';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { KeyRound, Plus, Trash2, UserCog, Building2, User, Save } from 'lucide-react';

const SettingsPage = () => {
  const { user } = useAuth();
  const { data: agents } = useAgents();
  const { data: properties } = useProperties();
  const isCEO = user?.role === 'ceo';
  const isManager = user?.role === 'manager';

  if (isCEO) {
    return (
      <AppLayout title="Settings" subtitle="CEO Control Panel" showQuickAddLead={false}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        >
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-6">Manage Organization</h2>
            <CEOSettingsPanel />
          </div>
        </motion.div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Settings" subtitle="System configuration" showQuickAddLead={false}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      >
        <Tabs defaultValue={isManager ? 'admins' : 'team'} className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-sm">
            {isManager ? (
              <TabsTrigger value="admins" className="text-xs gap-1.5"><UserCog size={13} /> Admins</TabsTrigger>
            ) : (
              <TabsTrigger value="team" className="text-xs gap-1.5"><UserCog size={13} /> Team</TabsTrigger>
            )}
            <TabsTrigger value="properties" className="text-xs gap-1.5"><Building2 size={13} /> Properties</TabsTrigger>
            <TabsTrigger value="profile" className="text-xs gap-1.5"><User size={13} /> Profile</TabsTrigger>
          </TabsList>

          {!isManager && (
            <TabsContent value="team">
              <TeamTab agents={agents || []} />
            </TabsContent>
          )}
          {isManager && (
            <TabsContent value="admins">
              <AdminsTab />
            </TabsContent>
          )}
          <TabsContent value="properties">
            <PropertiesTab properties={properties || []} />
          </TabsContent>
          <TabsContent value="profile">
            <ProfileTab user={user || {}} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </AppLayout>
  );
};

function AdminsTab() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', zoneName: '', username: '', password: '' });

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admins');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load admins');
      setAdmins(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleAddAdmin = async () => {
    if (!form.fullName || !form.email || !form.phone || !form.zoneName || !form.username || !form.password) {
      toast.error('Name, email, phone, zone, username and password are required');
      return;
    }

    const confirmed = window.confirm(`Create admin ${form.fullName} for ${form.zoneName}?`);
    if (!confirmed) return;

    try {
      setSaving(true);
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create admin');

      toast.success('Admin created');
      setForm({ fullName: '', email: '', phone: '', zoneName: '', username: '', password: '' });
      await loadAdmins();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    const confirmed = window.confirm('Remove this admin?');
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admins/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove admin');
      toast.success('Admin removed');
      await loadAdmins();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleResetAdminPassword = async (id: string, name: string) => {
    const newPassword = window.prompt(`Enter new password for admin ${name}:`);
    if (!newPassword) return;

    try {
      const res = await fetch(`/api/admins/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset admin password');
      toast.success('Admin password reset successfully');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="kpi-card">
        <h3 className="font-display font-semibold text-xs mb-4">Add Admin</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[10px]">Name *</Label>
            <Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Admin name" className="text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px]">Email *</Label>
            <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@email.com" className="text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px]">Phone *</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91..." className="text-xs" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div className="space-y-1.5">
            <Label className="text-[10px]">Zone *</Label>
            <Input
              value={form.zoneName}
              onChange={(e) => setForm((f) => ({ ...f, zoneName: e.target.value }))}
              placeholder="Enter new zone name"
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px]">Username *</Label>
            <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="zoneXadmin@gharpayy" className="text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px]">Password *</Label>
            <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Initial password" className="text-xs" />
          </div>
        </div>
        <Button size="sm" onClick={handleAddAdmin} disabled={saving} className="mt-3 gap-1.5 text-xs">
          <Plus size={12} /> {saving ? 'Adding...' : 'Add Admin'}
        </Button>
      </div>

      <div className="kpi-card">
        <h3 className="font-display font-semibold text-xs mb-4">Admin List</h3>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading admins...</p>
        ) : (
          <div className="space-y-3">
            {admins.map((admin) => (
              <div key={admin.id} className="rounded-xl bg-secondary/50 p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Admin Details <span className="text-[10px] font-medium text-accent">({admin.zoneName})</span></p>
                    <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Name:</span> {admin.fullName}</p>
                    <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Email:</span> {admin.email}</p>
                    <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Phone:</span> {admin.phone || 'No phone'}</p>
                    <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Username:</span> {admin.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => handleResetAdminPassword(admin.id, admin.fullName)}>
                      <KeyRound size={11} /> Reset
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteAdmin(admin.id)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-foreground mb-2">Team Members ({admin.teamMembers?.length || 0})</p>
                  {(admin.teamMembers || []).length > 0 ? (
                    <div className="space-y-2">
                      {admin.teamMembers.map((member: any) => (
                        <div key={member.id} className="rounded-lg bg-background/70 border border-border px-2.5 py-2">
                          <p className="text-xs font-medium text-foreground">Agent Details <span className="text-[10px] text-muted-foreground">({member.zoneName || 'NA'})</span></p>
                          <p className="text-[10px] text-muted-foreground"><span className="font-medium text-foreground">Name:</span> {member.name}</p>
                          <p className="text-[10px] text-muted-foreground"><span className="font-medium text-foreground">Email:</span> {member.email}</p>
                          <p className="text-[10px] text-muted-foreground"><span className="font-medium text-foreground">Phone:</span> {member.phone || 'No phone'}</p>
                          <p className="text-[10px] text-muted-foreground"><span className="font-medium text-foreground">Username:</span> {member.username || 'No username'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">No agents under this admin.</p>
                  )}
                </div>
              </div>
            ))}
            {admins.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No admins found</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamTab({ agents }: { agents: any[] }) {
  const { user, loading, checkUser } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.username?.endsWith('admin@gharpayy');
  const [form, setForm] = useState({ name: '', email: '', phone: '', username: '', password: '' });
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  const deleteAgent = useDeleteAgent();

  useEffect(() => {
    if (!user && !loading) {
      checkUser();
    }
  }, [user, loading, checkUser]);

  const handleAdd = async () => {
    if (!isAdmin) {
      toast.error('Only zone admins can add agents');
      return;
    }
    if (!form.name || !form.email || !form.phone || !form.username || !form.password) {
      toast.error('Name, email, phone, username and password are required');
      return;
    }

    const confirmed = window.confirm(
      `Create agent ${form.name} for ${user?.zoneName}?\nUsername: ${form.username}`
    );
    if (!confirmed) return;

    try {
      await createAgent.mutateAsync(form);
      setForm({ name: '', email: '', phone: '', username: '', password: '' });
      toast.success('Agent added');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await updateAgent.mutateAsync({ id, is_active: !isActive });
      toast.success(isActive ? 'Agent deactivated' : 'Agent activated');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    try {
      if (!confirm('Are you sure?')) return;
      await deleteAgent.mutateAsync(id);
      toast.success('Agent removed');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleResetAgentPassword = async (id: string, name: string) => {
    const newPassword = window.prompt(`Enter new password for agent ${name}:`);
    if (!newPassword) return;

    try {
      await updateAgent.mutateAsync({ id, password: newPassword });
      toast.success('Agent password reset successfully');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="kpi-card">
          <h3 className="font-display font-semibold text-xs mb-4">Add Agent ({user?.zoneName})</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px]">Name *</Label>
              <Input placeholder="Agent name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px]">Email *</Label>
              <Input placeholder="email@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px]">Phone *</Label>
              <Input placeholder="+91..." value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-[10px]">Username *</Label>
              <Input placeholder="zone1agent01@gharpayy" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px]">Password *</Label>
              <Input type="password" placeholder="Set initial password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="text-xs" />
            </div>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={createAgent.isPending} className="mt-3 gap-1.5 text-xs">
            <Plus size={12} /> {createAgent.isPending ? 'Adding...' : 'Add Agent'}
          </Button>
        </div>
      )}

      {!loading && !isAdmin && (
        <div className="kpi-card">
          <h3 className="font-display font-semibold text-xs mb-1">Add Agent</h3>
          <p className="text-xs text-muted-foreground">Only zone admins can add team members. Current role: {user?.role || 'unknown'}.</p>
        </div>
      )}

      <div className="kpi-card">
        <h3 className="font-display font-semibold text-xs mb-4">Team Members</h3>
        <div className="space-y-2">
          {agents.map(a => (
            <div key={a.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-secondary/50">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">Agent Details</p>
                <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Name:</span> {a.name}</p>
                <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Email:</span> {a.email || 'No email'}</p>
                <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Phone:</span> {a.phone || 'No phone'}</p>
                <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Username:</span> {a.username || 'No username'}</p>
                <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Zone:</span> {a.zoneName || 'NA'}</p>
                <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Status:</span> {(a as any).is_active ? 'Active' : 'Inactive'}</p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => handleToggle(a.id, (a as any).is_active)}>
                      {(a as any).is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1" onClick={() => handleResetAgentPassword(a.id, a.name)}>
                      <KeyRound size={11} /> Reset
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(a.id)}>
                      <Trash2 size={12} />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
          {agents.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No agents yet</p>}
        </div>
      </div>
    </div>
  );
}

function PropertiesTab({ properties }: { properties: any[] }) {
  const [form, setForm] = useState({ name: '', city: '', area: '', price_range: '', address: '' });
  const createProperty = useCreateProperty();
  const deleteProperty = useDeleteProperty();

  const handleAdd = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    try {
      await createProperty.mutateAsync(form);
      toast.success('Property added');
      setForm({ name: '', city: '', area: '', price_range: '', address: '' });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    try {
      if (!confirm('Are you sure?')) return;
      await deleteProperty.mutateAsync(id);
      toast.success('Property removed');
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="kpi-card">
        <h3 className="font-display font-semibold text-xs mb-4">Add Property</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[10px]">Name *</Label>
            <Input placeholder="Property name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px]">City</Label>
            <Input placeholder="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px]">Area</Label>
            <Input placeholder="Area" value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} className="text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px]">Price Range</Label>
            <Input placeholder="₹50L - 80L" value={form.price_range} onChange={e => setForm(f => ({ ...f, price_range: e.target.value }))} className="text-xs" />
          </div>
        </div>
        <Button size="sm" onClick={handleAdd} disabled={createProperty.isPending} className="mt-3 gap-1.5 text-xs">
          <Plus size={12} /> {createProperty.isPending ? 'Adding...' : 'Add Property'}
        </Button>
      </div>

      <div className="kpi-card">
        <h3 className="font-display font-semibold text-xs mb-4">Properties</h3>
        <div className="space-y-2">
          {properties.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
              <div>
                <p className="text-xs font-medium text-foreground">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">{[p.area, p.city].filter(Boolean).join(', ')} {(p as any).price_range ? `· ${(p as any).price_range}` : ''}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)}>
                <Trash2 size={12} />
              </Button>
            </div>
          ))}
          {properties.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No properties yet</p>}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ user }: { user: any }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Stub for profile update using fetch
      const res = await fetch('/api/auth/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      if (!res.ok) throw new Error('Update failed');
      toast.success('Profile updated (simulated)');
      setPassword('');
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="kpi-card max-w-md">
      <h3 className="font-display font-semibold text-xs mb-4">Your Profile</h3>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[10px]">Email</Label>
          <Input value={user?.email || ''} disabled className="text-xs bg-secondary" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px]">Full Name</Label>
          <Input placeholder="Update your name" value={name} onChange={e => setName(e.target.value)} className="text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px]">New Password</Label>
          <Input type="password" placeholder="Leave blank to keep current" value={password} onChange={e => setPassword(e.target.value)} className="text-xs" />
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs">
          <Save size={12} /> {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

export default SettingsPage;

