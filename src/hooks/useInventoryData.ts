import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ─── Owners ──────────────────────────────────────────────────────────
export function useOwners() {
  return useQuery({
    queryKey: ['owners'],
    queryFn: async () => {
      const res = await fetch('/api/owners');
      if (!res.ok) throw new Error('Failed to fetch owners');
      return res.json();
    },
  });
}

export function useCreateOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (owner: {
      name: string;
      phone: string;
      email?: string | null;
      username?: string | null;
      password?: string | null;
      exactPgName?: string | null;
      gharpayyPgName?: string | null;
      company_name?: string | null;
      notes?: string | null;
    }) => {
      const res = await fetch('/api/owners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(owner),
      });
      if (!res.ok) throw new Error('Failed to create owner');
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owners'] }); toast.success('Owner created'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const res = await fetch(`/api/owners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update owner');
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owners'] }); },
  });
}

// ─── Rooms ───────────────────────────────────────────────────────────
export function useRooms(propertyId?: string) {
  return useQuery({
    queryKey: ['rooms', propertyId],
    queryFn: async () => {
      const url = propertyId ? `/api/rooms?propertyId=${propertyId}` : '/api/rooms';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch rooms');
      return res.json();
    },
  });
}

export function useAllRoomsWithDetails() {
  return useQuery({
    queryKey: ['rooms', 'all-details'],
    queryFn: async () => {
      const res = await fetch('/api/rooms'); // GET /api/rooms returns details by default now
      if (!res.ok) throw new Error('Failed to fetch rooms');
      return res.json();
    },
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (room: any) => {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(room),
      });
      if (!res.ok) throw new Error('Failed to add room');
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rooms'] }); qc.invalidateQueries({ queryKey: ['beds'] }); toast.success('Room added'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const res = await fetch(`/api/rooms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update room');
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rooms'] }); },
  });
}

// ─── Beds ────────────────────────────────────────────────────────────
export function useBeds(roomId?: string) {
  return useQuery({
    queryKey: ['beds', roomId],
    queryFn: async () => {
      const url = roomId ? `/api/beds?roomId=${roomId}` : '/api/beds';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch beds');
      return res.json();
    },
  });
}

export function useAllBeds() {
  return useQuery({
    queryKey: ['beds', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/beds');
      if (!res.ok) throw new Error('Failed to fetch beds');
      return res.json();
    },
  });
}

export function useUpdateBed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const res = await fetch(`/api/beds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update bed');
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['beds'] }); toast.success('Bed updated'); },
  });
}

// ─── Room Status Confirmation ────────────────────────────────────────
export function useConfirmRoomStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: any) => {
      const res = await fetch('/api/room-status-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (!res.ok) throw new Error('Failed to confirm status');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Status confirmed');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Soft Locks ──────────────────────────────────────────────────────
export function useSoftLocks(roomId?: string) {
  return useQuery({
    queryKey: ['soft_locks', roomId],
    queryFn: async () => {
      const url = roomId ? `/api/soft-locks?roomId=${roomId}` : '/api/soft-locks';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch soft locks');
      return res.json();
    },
  });
}

export function useCreateSoftLock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lock: any) => {
      const res = await fetch('/api/soft-locks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lock),
      });
      if (!res.ok) throw new Error('Failed to create soft lock');
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['soft_locks'] }); toast.success('Locked'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useReleaseSoftLock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lockId: string) => {
      const res = await fetch(`/api/soft-locks/${lockId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });
      if (!res.ok) throw new Error('Failed to release lock');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['soft_locks'] }); toast.success('Lock released'); },
  });
}

// ─── Properties with owner info ──────────────────────────────────────
export function usePropertiesWithOwners() {
  return useQuery({
    queryKey: ['properties', 'with-owners'],
    queryFn: async () => {
      const res = await fetch('/api/properties');
      if (!res.ok) throw new Error('Failed to fetch properties');
      return res.json();
    },
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update property');
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['properties'] }); },
  });
}

