"use client";

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useZones, useCreateZone, useUpdateZone, useDeleteZone, useTeamQueues, useCreateTeamQueue, useEscalations, useUpdateEscalation } from '@/hooks/useZones';
import { useAgents } from '@/hooks/useCrmData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Map, Plus, Users, AlertTriangle, CheckCircle, Clock, Trash2, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const ZONE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

const ZoneManagement = () => {
  const { data: zones, isLoading } = useZones();
  const { data: members } = useAgents();
  const { data: queues } = useTeamQueues();
  const { data: escalations } = useEscalations('open');
  const createZone = useCreateZone();
  const updateZone = useUpdateZone();
  const deleteZone = useDeleteZone();
  const createQueue = useCreateTeamQueue();
  const updateEsc = useUpdateEscalation();

  const [newZone, setNewZone] = useState({ name: '', city: 'Bangalore', areas: '', color: ZONE_COLORS[0] });
  const [editZone, setEditZone] = useState<any | null>(null);
  const [editZoneForm, setEditZoneForm] = useState({ name: '', city: '', areas: '', color: ZONE_COLORS[0] });
  const [newQueue, setNewQueue] = useState({ zone_id: '', team_name: '', owner_agent_id: '' });
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [editZoneDialogOpen, setEditZoneDialogOpen] = useState(false);
  const [queueDialogOpen, setQueueDialogOpen] = useState(false);

  const handleCreateZone = async () => {
    if (!newZone.name || !newZone.areas) { toast.error('Name and areas required'); return; }
    await createZone.mutateAsync({
      name: newZone.name,
      city: newZone.city,
      areas: newZone.areas.split(',').map(a => a.trim()).filter(Boolean),
      color: newZone.color,
    });
    setNewZone({ name: '', city: 'Bangalore', areas: '', color: ZONE_COLORS[0] });
    setZoneDialogOpen(false);
  };

  const handleCreateQueue = async () => {
    if (!newQueue.zone_id || !newQueue.team_name) { toast.error('Zone and team name required'); return; }
    await createQueue.mutateAsync({
      zone_id: newQueue.zone_id,
      team_name: newQueue.team_name,
      owner_agent_id: newQueue.owner_agent_id || undefined,
    });
    setNewQueue({ zone_id: '', team_name: '', owner_agent_id: '' });
    setQueueDialogOpen(false);
  };

  const handleResolveEscalation = async (id: string) => {
    await updateEsc.mutateAsync({ id, status: 'resolved', resolved_at: new Date().toISOString() });
    toast.success('Escalation resolved');
  };

  const handleDeleteZone = async (zone: any) => {
    const zoneId = zone.id || zone._id;
    if (!zoneId) {
      toast.error('Unable to identify zone');
      return;
    }

    const confirmed = window.confirm(`Delete zone \"${zone.name}\"?`);
    if (!confirmed) return;

    await deleteZone.mutateAsync(zoneId);
  };

  const handleOpenEditZone = (zone: any) => {
    setEditZone(zone);
    setEditZoneForm({
      name: zone.name || '',
      city: zone.city || '',
      areas: Array.isArray(zone.areas) ? zone.areas.join(', ') : '',
      color: zone.color || ZONE_COLORS[0],
    });
    setEditZoneDialogOpen(true);
  };

  const handleUpdateZone = async () => {
    if (!editZone) return;
    if (!editZoneForm.name || !editZoneForm.areas) {
      toast.error('Name and areas required');
      return;
    }

    const zoneId = editZone.id || editZone._id;
    if (!zoneId) {
      toast.error('Unable to identify zone');
      return;
    }

    await updateZone.mutateAsync({
      id: zoneId,
      name: editZoneForm.name,
      city: editZoneForm.city,
      areas: editZoneForm.areas.split(',').map(a => a.trim()).filter(Boolean),
      color: editZoneForm.color,
    });

    setEditZoneDialogOpen(false);
    setEditZone(null);
  };

  if (isLoading) {
    return (
      <AppLayout title="Zone Management" subtitle="Geographic routing & team operations">
        <Skeleton className="h-[500px] rounded-2xl" />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Zone Management" subtitle="Geographic routing, team queues & escalations">
      <Tabs defaultValue="zones">
        <TabsList className="mb-6">
          <TabsTrigger value="zones" className="text-xs gap-1.5"><Map size={12} /> Zones</TabsTrigger>
          <TabsTrigger value="queues" className="text-xs gap-1.5"><Users size={12} /> Team Queues</TabsTrigger>
          <TabsTrigger value="escalations" className="text-xs gap-1.5">
            <AlertTriangle size={12} /> Escalations
            {(escalations?.length || 0) > 0 && (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 ml-1">{escalations?.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ZONES TAB */}
        <TabsContent value="zones">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground">{zones?.length || 0} active zones</p>
            <div className="flex items-center gap-2">
              <Dialog open={editZoneDialogOpen} onOpenChange={setEditZoneDialogOpen}>
                <DialogContent>
                  <DialogHeader><DialogTitle>Edit Zone</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Zone name" value={editZoneForm.name} onChange={e => setEditZoneForm({ ...editZoneForm, name: e.target.value })} className="text-xs" />
                    <Input placeholder="City" value={editZoneForm.city} onChange={e => setEditZoneForm({ ...editZoneForm, city: e.target.value })} className="text-xs" />
                    <Input placeholder="Areas (comma-separated)" value={editZoneForm.areas} onChange={e => setEditZoneForm({ ...editZoneForm, areas: e.target.value })} className="text-xs" />
                    <div className="flex gap-2">
                      {ZONE_COLORS.map(c => (
                        <button key={c} className={`w-6 h-6 rounded-full border-2 transition-transform ${editZoneForm.color === c ? 'scale-125 border-foreground' : 'border-transparent'}`}
                          style={{ background: c }} onClick={() => setEditZoneForm({ ...editZoneForm, color: c })} />
                      ))}
                    </div>
                    <Button className="w-full text-xs" onClick={handleUpdateZone} disabled={updateZone.isPending}>
                      {updateZone.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={zoneDialogOpen} onOpenChange={setZoneDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5 text-xs rounded-xl"><Plus size={12} /> New Zone</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create Zone</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Zone name (e.g. Marathahalli Cluster)" value={newZone.name} onChange={e => setNewZone({ ...newZone, name: e.target.value })} className="text-xs" />
                    <Input placeholder="City" value={newZone.city} onChange={e => setNewZone({ ...newZone, city: e.target.value })} className="text-xs" />
                    <Input placeholder="Areas (comma-separated: Marathahalli, Varthur, Kundalahalli)" value={newZone.areas} onChange={e => setNewZone({ ...newZone, areas: e.target.value })} className="text-xs" />
                    <div className="flex gap-2">
                      {ZONE_COLORS.map(c => (
                        <button key={c} className={`w-6 h-6 rounded-full border-2 transition-transform ${newZone.color === c ? 'scale-125 border-foreground' : 'border-transparent'}`}
                          style={{ background: c }} onClick={() => setNewZone({ ...newZone, color: c })} />
                      ))}
                    </div>
                    <Button className="w-full text-xs" onClick={handleCreateZone} disabled={createZone.isPending}>
                      {createZone.isPending ? 'Creating...' : 'Create Zone'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones?.map((zone: any, i: number) => (
              <motion.div key={zone.id || zone._id || `${zone.name}-${i}`} className="kpi-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: zone.color }} />
                    <h3 className="font-display font-semibold text-sm text-foreground">{zone.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleOpenEditZone(zone)}
                      aria-label={`Edit ${zone.name}`}
                    >
                      <Pencil size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteZone(zone)}
                      disabled={deleteZone.isPending}
                      aria-label={`Delete ${zone.name}`}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mb-2">
                  <span className="font-medium text-foreground">City:</span> {zone.city || 'NA'}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(zone.areas || []).map((area: string, areaIndex: number) => (
                    <span key={`${area}-${areaIndex}`} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-foreground">{area}</span>
                  ))}
                  {(!zone.areas || zone.areas.length === 0) && (
                    <span className="text-[10px] text-muted-foreground">No areas added</span>
                  )}
                </div>
              </motion.div>
            ))}
            {zones?.length === 0 && (
              <div className="col-span-3 text-center py-10 text-xs text-muted-foreground">No zones created yet. Create your first zone to start routing.</div>
            )}
          </div>
        </TabsContent>

        {/* QUEUES TAB */}
        <TabsContent value="queues">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground">{queues?.length || 0} queues</p>
            <Dialog open={queueDialogOpen} onOpenChange={setQueueDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 text-xs rounded-xl"><Plus size={12} /> New Queue</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Team Queue</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Select value={newQueue.zone_id} onValueChange={v => setNewQueue({ ...newQueue, zone_id: v })}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Select Zone" /></SelectTrigger>
                    <SelectContent>{zones?.map((z: any) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Team name (e.g. Marathahalli Sales)" value={newQueue.team_name} onChange={e => setNewQueue({ ...newQueue, team_name: e.target.value })} className="text-xs" />
                  <Select value={newQueue.owner_agent_id} onValueChange={v => setNewQueue({ ...newQueue, owner_agent_id: v })}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Queue Owner (optional)" /></SelectTrigger>
                    <SelectContent>{members?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button className="w-full text-xs" onClick={handleCreateQueue} disabled={createQueue.isPending}>
                    {createQueue.isPending ? 'Creating...' : 'Create Queue'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="kpi-card p-0 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3.5 text-2xs font-medium text-muted-foreground">Team</th>
                  <th className="text-left px-4 py-3.5 text-2xs font-medium text-muted-foreground">Zone</th>
                  <th className="text-left px-4 py-3.5 text-2xs font-medium text-muted-foreground">Owner</th>
                  <th className="text-left px-4 py-3.5 text-2xs font-medium text-muted-foreground">Dispatch</th>
                  <th className="text-left px-4 py-3.5 text-2xs font-medium text-muted-foreground">Members</th>
                </tr>
              </thead>
              <tbody>
                {queues?.map((q: any) => (
                  <tr key={q.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-foreground">{q.team_name}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{q.zones?.name}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{q.members?.name || '—'}</td>
                    <td className="px-4 py-3.5"><Badge variant="outline" className="text-[9px]">{q.dispatch_rule}</Badge></td>
                    <td className="px-4 py-3.5 text-muted-foreground">{(q.member_ids || []).length} members</td>
                  </tr>
                ))}
                {queues?.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No queues yet</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ESCALATIONS TAB */}
        <TabsContent value="escalations">
          <div className="space-y-3">
            {escalations?.map((esc: any) => (
              <div key={esc.id} className={`kpi-card flex items-start justify-between gap-4 ${esc.priority === 'high' ? 'border-destructive/30' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={esc.priority === 'high' ? 'destructive' : 'outline'} className="text-[9px]">{esc.priority}</Badge>
                    <span className="text-[10px] text-muted-foreground">{esc.entity_type} · {esc.zones?.name || 'No zone'}</span>
                  </div>
                  <p className="text-xs text-foreground">{esc.description || 'No description'}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Raised by {esc.raised?.name || '—'} · Assigned to {esc.assigned?.name || '—'}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 h-7 text-[10px] gap-1 rounded-lg" onClick={() => handleResolveEscalation(esc.id)}>
                  <CheckCircle size={10} /> Resolve
                </Button>
              </div>
            ))}
            {escalations?.length === 0 && <p className="text-xs text-muted-foreground text-center py-10">No open escalations ✓</p>}
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default ZoneManagement;
