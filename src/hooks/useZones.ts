import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ─── Zones ──────────────────────────────────────────
export function useZones() {
  return useQuery({
    queryKey: ['zones'],
    queryFn: async () => {
      const res = await fetch('/api/zones', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch zones');
      return res.json();
    },
  });
}

export function useCreateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (zone: any) => {
      const res = await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zone),
      });
      if (!res.ok) throw new Error('Failed to create zone');
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['zones'] });
      await qc.refetchQueries({ queryKey: ['zones'], type: 'active' });
      toast.success('Zone created');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
       const res = await fetch(`/api/zones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update zone');
      return res.json();
    },
    onSuccess: async (updatedZone: any, variables: { id: string; [key: string]: any }) => {
      qc.setQueryData(['zones'], (prev: any) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((zone: any) => {
          const zoneId = zone.id || zone._id;
          if (String(zoneId) !== String(variables.id)) return zone;
          return {
            ...zone,
            ...variables,
            ...updatedZone,
            id: updatedZone?.id || String(zoneId),
            _id: updatedZone?._id || String(zoneId),
          };
        });
      });
      await qc.invalidateQueries({ queryKey: ['zones'] });
      await qc.refetchQueries({ queryKey: ['zones'], type: 'active' });
      toast.success('Zone updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/zones/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete zone');
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['zones'] });
      await qc.refetchQueries({ queryKey: ['zones'], type: 'active' });
      await qc.invalidateQueries({ queryKey: ['team-queues'] });
      toast.success('Zone deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Team Queues ────────────────────────────────────
export function useTeamQueues(zoneId?: string) {
  return useQuery({
    queryKey: ['team-queues', zoneId],
    queryFn: async () => {
      const url = zoneId ? `/api/team-queues?zoneId=${zoneId}` : '/api/team-queues';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch team queues');
      return res.json();
    },
  });
}

export function useCreateTeamQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (queue: any) => {
      const res = await fetch('/api/team-queues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queue),
      });
      if (!res.ok) throw new Error('Failed to create queue');
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team-queues'] }); toast.success('Queue created'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateTeamQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const res = await fetch(`/api/team-queues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update team queue');
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team-queues'] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Handoffs ───────────────────────────────────────
export function useHandoffs(leadId?: string) {
  return useQuery({
    queryKey: ['handoffs', leadId],
    queryFn: async () => {
      const url = leadId ? `/api/handoffs?leadId=${leadId}` : '/api/handoffs';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch handoffs');
      return res.json();
    },
  });
}

export function useCreateHandoff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (handoff: any) => {
      const res = await fetch('/api/handoffs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(handoff),
      });
      if (!res.ok) throw new Error('Failed to create handoff');
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['handoffs'] }); toast.success('Handoff recorded'); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Escalations ────────────────────────────────────
export function useEscalations(status?: string) {
  return useQuery({
    queryKey: ['escalations', status],
    queryFn: async () => {
      const url = status ? `/api/escalations?status=${status}` : '/api/escalations';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch escalations');
      return res.json();
    },
  });
}

export function useCreateEscalation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (esc: any) => {
      const res = await fetch('/api/escalations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(esc),
      });
      if (!res.ok) throw new Error('Failed to create escalation');
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['escalations'] }); toast.success('Escalation raised'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateEscalation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const res = await fetch(`/api/escalations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update escalation');
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['escalations'] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Zone Routing ───────────────────────────────────
export function useRouteLeadToZone() {
  return useMutation({
    mutationFn: async (location: string) => {
      // Logic would be here to route based on area search in Zones
      console.log('Routing lead to zone for location:', location);
      return null;
    },
  });
}

// ─── DB Matching ────────────────────────────────────
export function useDbMatchBeds() {
  return useMutation({
    mutationFn: async (params: { location: string; budget: number; roomType?: string }) => {
       const res = await fetch(`/api/public/properties?city=${params.location}`);
       if (!res.ok) return [];
       return res.json();
    },
  });
}

