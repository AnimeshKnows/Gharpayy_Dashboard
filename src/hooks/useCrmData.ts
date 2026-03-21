import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Type for lead with joined agent and property
export type LeadWithRelations = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  source: string;
  firstResponseTimeMin?: number;
  agents: { id: string, name: string } | null;
  properties: { id: string, name: string } | null;
  preferredLocation?: string;
  budget?: string;
  moveInDate?: string;
  profession?: string;
  roomType?: string;
  needPreference?: string;
  specialRequests?: string;
  leadScore: number;
  isDuplicate?: boolean;
  duplicateCount?: number;
  notes?: string;
  assignedAgentId?: string;
  createdAt: string;
  lastActivityAt: string;
};


// Leads (all)
export const useLeads = () =>
  useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await fetch('/api/leads');
      if (!res.ok) throw new Error('Failed to fetch leads');
      return res.json() as Promise<LeadWithRelations[]>;
    },
  });

// Leads (paginated)
export const useLeadsPaginated = (page = 0, pageSize = 50) =>
  useQuery({
    queryKey: ['leads-paginated', page, pageSize],
    queryFn: async () => {
      const res = await fetch('/api/leads');
      if (!res.ok) throw new Error('Failed to fetch leads');
      const data = await res.json();
      return { leads: data as LeadWithRelations[], total: data.length };
    },
  });

export const useLeadsByStatus = (status: string) =>
  useQuery({
    queryKey: ['leads', 'status', status],
    queryFn: async () => {
      const res = await fetch('/api/leads');
      if (!res.ok) throw new Error('Failed to fetch leads');
      const data = await res.json() as LeadWithRelations[];
      return data.filter(l => l.status === status);
    },
  });

export const useCreateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: any) => {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      if (!res.ok) throw new Error('Failed to create lead');
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['leads'] });
      await qc.invalidateQueries({ queryKey: ['leads-paginated'] });
      await qc.invalidateQueries({ queryKey: ['leads', 'status'] });
      await qc.refetchQueries({ queryKey: ['leads-paginated'], type: 'active' });
      toast.success('Lead created');
    },
  });
};

export const useUpdateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update lead');
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['leads'] });
      await qc.invalidateQueries({ queryKey: ['leads-paginated'] });
      await qc.invalidateQueries({ queryKey: ['leads', 'status'] });
      await qc.refetchQueries({ queryKey: ['leads-paginated'], type: 'active' });
    },
  });
};

export const useAgents = () =>
  useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('Failed to fetch agents');
      return res.json();
    },
  });

export const useCreateAgent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agent: any) => {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agent),
      });
      if (!res.ok) throw new Error('Failed to create agent');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });
};

export const useUpdateAgent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update agent');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });
};

export const useDeleteAgent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete agent');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });
};

export const useProperties = () =>
  useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const res = await fetch('/api/properties');
      if (!res.ok) throw new Error('Failed to fetch properties');
      return res.json();
    },
  });

export const useCreateProperty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (property: any) => {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(property),
      });
      if (!res.ok) throw new Error('Failed to create property');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['properties'] }),
  });
};

export const useDeleteProperty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete property');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['properties'] }),
  });
};

// Visits
export const useVisits = () =>
  useQuery({
    queryKey: ['visits'],
    queryFn: async () => {
      const res = await fetch('/api/visits');
      if (!res.ok) throw new Error('Failed to fetch visits');
      return res.json();
    },
  });

export const useCreateVisit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (visit: any) => {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visit),
      });
      if (!res.ok) throw new Error('Failed to create visit');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visits'] });
      toast.success('Visit scheduled');
    },
  });
};

// Agent Stats (for dashboard)
export const useAgentStats = () =>
  useQuery({
    queryKey: ['agent-stats'],
    queryFn: async () => {
      const res = await fetch('/api/agents/stats');
      if (!res.ok) throw new Error('Failed to fetch agent stats');
      return res.json();
    },
  });

// Dashboard stats
export const useDashboardStats = () =>
  useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error('Failed to fetch dashboard stats');
      return res.json();
    },
  });

