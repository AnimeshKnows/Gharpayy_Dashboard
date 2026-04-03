'use client';

/**
 * GHARPAYY SHARED INVENTORY STORE v2
 * ─────────────────────────────────────
 * Room-level state machine. Single source of truth across:
 *   - Inventory Dashboard  (/inventory)
 *   - Owner Portal         (/owner-portal/v2)
 *
 * State flow per room (Simplified):
 *   APPROVED (Live) → SOFT_LOCKED (Visit scheduled)
 *   SOFT_LOCKED → APPROVED (Reset)
 *   Any → OCCUPIED (Full)
 */

import { useState, useEffect, useCallback } from 'react';
import type { Room, RoomState, RoomStatus, AvailType } from '@/data/roomMasterData';
import { defaultRoomState } from '@/data/roomMasterData';

export type { RoomStatus, AvailType };

export interface VisitData {
  customerName: string;
  phone: string;
  visitType: 'Physical' | 'Virtual';
  date: string;
  time: string;
  leadSource?: string;
  notes?: string;
  scheduledAt: string;
}

// Action types for the ledger
export interface SystemAction {
  id: string;
  pgId: number;
  roomId: string;
  roomNum: string;
  type: 'OWNER_UPDATE' | 'VISIT_SCHEDULED' | 'RETAIL_APPROVED' | 'PRE_BOOKED' | 'RESET';
  note: string;
  by: string;
  at: string;
}

// The full store shape
interface Store {
  rooms: Record<string, RoomState>; // keyed by room.id
  actions: SystemAction[];
}

const STORE_KEY   = 'gharpayy_rooms_v4';
const STORE_EVENT = 'gharpayy_rooms_updated';

// ── GHARPAYY 3X DATA SEED (from uploads_from_boss) ──────────
const SEED_DATA: Record<string, RoomState> = {
  'pg1_rm1': { roomId: 'pg1_rm1', status: 'APPROVED', updatedAt: '2026-03-24', retailPrice: 11500, approvedBy: 'Karan S', availType: 'NOW', expectedRent: 11000, remarks: 'Boss approved' },
  'pg1_rm2': { roomId: 'pg1_rm2', status: 'SOFT_LOCKED', updatedAt: '2026-03-23', retailPrice: 15500, approvedBy: 'Karan S', visitCustomer: 'Rohan Gupta', visitDate: '2026-03-27', visitTime: '11:00 AM', visitType: 'Physical', availType: 'NOW', expectedRent: 15000, remarks: 'Hot lead' },
  'pg1_rm3': { roomId: 'pg1_rm3', status: 'APPROVED', updatedAt: '2026-03-25', retailPrice: 15500, availType: 'NOW', expectedRent: 15000, remarks: 'Owner updated' },
  'pg2_rm1': { roomId: 'pg2_rm1', status: 'APPROVED', updatedAt: '2026-03-24', retailPrice: 10500, approvedBy: 'Karan S', availType: 'NOW', expectedRent: 10000, remarks: 'Ready to sell' },
  'pg3_rm1': { roomId: 'pg3_rm1', status: 'APPROVED', updatedAt: '2026-03-25', retailPrice: 16000, approvedBy: 'Priya R', availType: 'NOW', expectedRent: 15000, remarks: 'Girls PG prime' },
};

const SEED_ACTIONS: SystemAction[] = [
  { id: 'a1', pgId: 1, roomId: 'pg1_rm1', roomNum: '101', type: 'RETAIL_APPROVED', note: 'Retail approved at ₹11,500', by: 'Karan S', at: '2026-03-24 10:12 AM' },
  { id: 'a2', pgId: 1, roomId: 'pg1_rm2', roomNum: '102', type: 'VISIT_SCHEDULED', note: 'Physical visit scheduled for Rohan Gupta', by: 'Sales Team', at: '2026-03-23 04:45 PM' },
  { id: 'a3', pgId: 1, roomId: 'pg1_rm3', roomNum: '201', type: 'OWNER_UPDATE', note: 'Owner updated expected rent to ₹15,000', by: 'Owner', at: '2026-03-25 09:30 AM' },
];

// ── Persistence ──────────────────────────────────────────────
function loadStore(): Store {
  if (typeof window === 'undefined') return { rooms: SEED_DATA, actions: SEED_ACTIONS };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : { rooms: SEED_DATA, actions: SEED_ACTIONS };
  } catch { return { rooms: SEED_DATA, actions: SEED_ACTIONS }; }
}

function saveStore(store: Store) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent(STORE_EVENT));
  } catch { /* storage full */ }
}

function nowStr() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function todayStr() {
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Hook ─────────────────────────────────────────────────────
export function useRoomStore() {
  const [store, setStore] = useState<Store>({ rooms: {}, actions: [] });

  useEffect(() => {
    setStore(loadStore());
    const handler = () => setStore(loadStore());
    window.addEventListener(STORE_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(STORE_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  // ── READ (optimized to use reactive state) ──────────────
  const getRoom = useCallback((room: Room): RoomState => {
    return store.rooms[room.id] || defaultRoomState(room);
  }, [store.rooms]);

  const getRoomsForPGState = useCallback((pgId: number, allRooms: Room[]): RoomState[] => {
    return allRooms
      .filter(r => r.pgId === pgId)
      .map(r => store.rooms[r.id] || defaultRoomState(r));
  }, [store.rooms]);

  // ── WRITE ─────────────────────────────────────────────────
  const mutate = useCallback((roomId: string, updater: (prev: RoomState) => RoomState, room: Room, action?: Omit<SystemAction, 'id' | 'at'>) => {
    const s = loadStore();
    const prev = s.rooms[roomId] || defaultRoomState(room);
    const next = updater(prev);
    
    let nextActions = s.actions;
    if (action) {
      const newAction: SystemAction = {
        ...action,
        id: `a${Date.now()}`,
        at: `${todayStr()} ${nowStr()}`,
      };
      nextActions = [newAction, ...s.actions].slice(0, 100); // Keep last 100
    }

    const newStore = { ...s, rooms: { ...s.rooms, [roomId]: next }, actions: nextActions };
    saveStore(newStore);
    setStore(newStore);
  }, []);

  // OWNER: update room availability (Direct to LIVE)
  const ownerUpdateRoom = useCallback((room: Room, availType: AvailType, expectedRent: number, remarks: string) => {
    mutate(room.id, prev => ({
      ...prev,
      status: availType === 'OCCUPIED' ? 'OCCUPIED' : 'APPROVED',
      availType,
      expectedRent,
      retailPrice: expectedRent, // Auto-set retail price to match
      remarks,
      updatedAt: `${todayStr()} ${nowStr()}`,
    }), room, {
      pgId: room.pgId,
      roomId: room.id,
      roomNum: room.num,
      type: 'OWNER_UPDATE',
      note: `Updated expected rent to ₹${expectedRent.toLocaleString()}`,
      by: 'Owner'
    });
  }, [mutate]);

  // SALES: approve a room for retail
  const approveRoom = useCallback((room: Room, retailPrice: number, approvedBy: string) => {
    mutate(room.id, prev => ({
      ...prev,
      status: 'APPROVED',
      retailPrice,
      approvedBy,
    }), room, {
      pgId: room.pgId,
      roomId: room.id,
      roomNum: room.num,
      type: 'RETAIL_APPROVED',
      note: `Approved at ₹${retailPrice.toLocaleString()}`,
      by: approvedBy
    });
  }, [mutate]);

  // SALES: schedule a visit → SOFT_LOCKED
  const scheduleVisit = useCallback((room: Room, visit: VisitData) => {
    mutate(room.id, prev => ({
      ...prev,
      status: 'SOFT_LOCKED',
      visitCustomer: visit.customerName,
      visitDate: visit.date,
      visitTime: visit.time,
      visitType: visit.visitType,
      visitPhone: visit.phone,
    }), room, {
      pgId: room.pgId,
      roomId: room.id,
      roomNum: room.num,
      type: 'VISIT_SCHEDULED',
      note: `${visit.visitType} visit scheduled for ${visit.customerName} on ${visit.date}`,
      by: 'Sales Team'
    });
  }, [mutate]);

  // SALES: mark pre-booked
  const preBookRoom = useCallback((room: Room) => {
    mutate(room.id, prev => ({ ...prev, status: 'HARD_LOCKED' }), room);
  }, [mutate]);

  // Reset room to LOCKED
  const resetRoom = useCallback((room: Room) => {
    mutate(room.id, () => defaultRoomState(room), room);
  }, [mutate]);

  // ── STATS for a PG ───────────────────────────────────────
  const getPGStats = useCallback((pgId: number, allRooms: Room[]) => {
    const pgRooms = allRooms.filter(r => r.pgId === pgId).map(r => store.rooms[r.id] || defaultRoomState(r));
    return {
      total: pgRooms.length,
      available: pgRooms.filter(r => r.status === 'AVAILABLE').length,
      approved: pgRooms.filter(r => r.status === 'APPROVED').length,
      softLocked: pgRooms.filter(r => r.status === 'SOFT_LOCKED').length,
      hardLocked: pgRooms.filter(r => r.status === 'HARD_LOCKED').length,
      occupied: pgRooms.filter(r => r.status === 'OCCUPIED').length,
      locked: pgRooms.filter(r => r.status === 'LOCKED').length,
    };
  }, [store.rooms]);

  const getGlobalStats = useCallback((allRooms: Room[]) => {
    let live = 0, scheduled = 0, occupied = 0;
    allRooms.forEach(r => {
      const s = getRoom(r);
      if (s.status === 'APPROVED') live++;
      else if (s.status === 'SOFT_LOCKED') scheduled++;
      else if (s.status === 'OCCUPIED') occupied++;
    });
    return { live, scheduled, occupied, total: allRooms.length };
  }, [store.rooms, getRoom]);

  // ── STORE snapshot (for reactive reads) ──────────────────
  const snapshot = store;

  return {
    snapshot,
    getRoom,
    getRoomsForPGState,
    ownerUpdateRoom,
    approveRoom,
    scheduleVisit,
    preBookRoom,
    resetRoom,
    getPGStats,
    getGlobalStats,
  };
}

// Export as both names for compatibility
export { useRoomStore as useInventoryStore };

// Re-export types the old hook exported for backwards compat
export type { RoomState };
// Export old type alias
export type RoomSubmission = {
  roomType: string;
  roomLabel?: string;
  roomNum: string;
  price: number;
  availType: 'available_now' | 'available_on_date' | 'occupied';
  availDate?: string;
  remarks?: string;
  submittedAt: string;
};
