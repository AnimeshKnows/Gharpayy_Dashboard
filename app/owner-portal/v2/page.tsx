'use client';

/**
 * OWNER PORTAL v3.1 - REAL-TIME SYNC
 * ───────────────────────────────────────
 * Optimized for high-fidelity operational tracking.
 * Seeding data from 'uploads_from_boss' for real-time vibe.
 */

import React, { useState, useMemo } from 'react';
import { 
  Home, Activity, ChevronRight, Search, 
  CheckCircle2, AlertCircle, TrendingUp, Filter,
  Calendar, MapPin, Zap, Info
} from 'lucide-react';
import { PG_DATA, type PGEntry } from '@/data/pgMasterData';
import { ROOM_MASTER, getRoomsForPG, type Room } from '@/data/roomMasterData';
import { useRoomStore, type AvailType } from '@/hooks/useInventoryStore';
import { toast } from 'sonner';

// ── TOKENS ──────────────────────────────────────────────────────
const T = {
  bg0: '#000', bg1: '#090909', bg2: '#111', bg3: '#1A1A1A', bg4: '#222',
  line: 'rgba(255,255,255,0.06)', lineH: 'rgba(255,255,255,0.12)',
  t0: '#FFF', t1: '#999', t2: '#555', t3: '#222',
  green: '#22C55E', amber: '#F59E0B', blue: '#3B82F6', violet: '#A78BFA', red: '#EF4444',
  sans: "'DM Sans', -apple-system, sans-serif",
  mono: "'JetBrains Mono', monospace",
};

// ── STATUS CONFIG ───────────────────────────────────────────────
const STATUS_CFG: Record<string, any> = {
  APPROVED:    { label: 'Live',          color: T.green, bg: 'rgba(34,197,94,0.08)', sub: 'Listed in Gharpayy OS' },
  SOFT_LOCKED: { label: 'Visit Hold',   color: T.blue,  bg: 'rgba(59,130,246,0.08)', sub: 'Scheduled for visit' },
  OCCUPIED:    { label: 'Occupied',     color: T.red,   bg: 'rgba(239,68,68,0.08)', sub: 'Full' },
};

// ── COMPONENTS ──────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color }: any) => (
  <div style={{ flex: 1, background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 12, padding: '24px', position: 'relative', minWidth: 200 }}>
    <div style={{ fontSize: 10, fontFamily: T.mono, color: T.t2, letterSpacing: '0.1em', marginBottom: 12 }}>{label.toUpperCase()}</div>
    <div style={{ fontSize: 44, fontWeight: 700, color, lineHeight: 1, marginBottom: 8 }}>{value}</div>
    <div style={{ fontSize: 13, color: T.t1 }}>{sub}</div>
  </div>
);

const RoomRow = ({ room, state, onUpdate }: any) => {
  const cfg = STATUS_CFG[state.status] || STATUS_CFG.APPROVED;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px 20px', borderBottom: `1px solid ${T.line}`, background: 'rgba(255,255,255,0.01)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 8, background: T.bg3, border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 16 }}>{room.num}</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{room.type} Room · Floor {room.floor}</span>
          <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`, borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, fontFamily: T.mono }}>{cfg.label.toUpperCase()}</span>
        </div>
        <div style={{ fontSize: 12, color: T.t2, marginTop: 4 }}>{cfg.sub}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>₹{state.retailPrice || state.expectedRent || room.basePrice}</div>
        <div style={{ fontSize: 10, color: T.t2, fontFamily: T.mono }}>EXPECTING</div>
      </div>
      <button onClick={() => onUpdate(room)}
        style={{ background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: T.t1, cursor: 'pointer' }}>
        Update
      </button>
    </div>
  );
};

// ── UPDATE MODAL ───────────────────────────────────────────────
const UpdateModal = ({ room, state, onClose, onSave }: any) => {
  const [rent, setRent] = useState(state.expectedRent || room.basePrice);
  const [type, setType] = useState<AvailType>(state.availType || 'NOW');
  const [remarks, setRemarks] = useState(state.remarks || '');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: T.bg2, border: `1px solid ${T.lineH}`, borderRadius: 16, width: '100%', maxWidth: 440, padding: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>Update Room {room.num}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: T.mono, color: T.t2, marginBottom: 6 }}>AVAILABILITY STATUS</div>
            <select value={type} onChange={(e) => setType(e.target.value as any)}
              style={{ width: '100%', background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 8, padding: '12px', color: T.t0 }}>
              <option value="NOW">Available Now</option>
              <option value="SOON">Available Soon (Next 15d)</option>
              <option value="OCCUPIED">Still Occupied</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontFamily: T.mono, color: T.t2, marginBottom: 6 }}>EXPECTED MONTHLY RENT</div>
            <input value={rent} onChange={(e) => setRent(Number(e.target.value))} type="number"
              style={{ width: '100%', background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 8, padding: '12px', color: T.t0 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontFamily: T.mono, color: T.t2, marginBottom: 6 }}>REMARKS</div>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Needs painting..." style={{ width: '100%', background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 8, padding: '12px', color: T.t0, height: 80 }} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 8, background: T.bg3, border: `1px solid ${T.line}`, color: T.t1 }}>Cancel</button>
            <button onClick={() => onSave(type, rent, remarks)} style={{ flex: 2, padding: 12, borderRadius: 8, background: T.green, color: '#000', fontWeight: 700 }}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── MAIN PAGE ────────────────────────────────────────────────────
export default function OwnerPortal() {
  const { getRoom, ownerUpdateRoom, getPGStats, snapshot } = useRoomStore();
  const [selectedPgId, setSelectedPgId] = useState(1);
  const [activeTab, setActiveTab] = useState('inventory');
  const [search, setSearch] = useState('');
  const [modTarget, setModTarget] = useState<Room | null>(null);

  const selectedPG = useMemo(() => PG_DATA.find(p => p.id === selectedPgId) || PG_DATA[0], [selectedPgId]);
  const pgRooms = useMemo(() => getRoomsForPG(selectedPgId), [selectedPgId]);
  const stats = useMemo(() => getPGStats(selectedPgId, pgRooms), [selectedPgId, pgRooms, snapshot]);

  const flp = PG_DATA.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleUpdate = (type: AvailType, rent: number, remarks: string) => {
    if (modTarget) {
      ownerUpdateRoom(modTarget, type, rent, remarks);
      setModTarget(null);
      toast.success('Room status updated successfully');
    }
  };

  return (
    <div style={{ background: T.bg0, minHeight: '100vh', display: 'flex', fontFamily: T.sans, color: T.t0 }}>
      {/* Sidebar - Property Picker */}
      <div style={{ width: 340, borderRight: `1px solid ${T.line}`, display: 'flex', flexDirection: 'column', background: T.bg1 }}>
        <div style={{ padding: '24px 20px', borderBottom: `1px solid ${T.line}` }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Owner Portal</div>
          <div style={{ fontSize: 10, fontFamily: T.mono, color: T.t2, marginTop: 4 }}>3X Build · Transparency First</div>
        </div>
        
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.line}` }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.t2 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Properties..."
              style={{ width: '100%', background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 7, padding: '8px 10px 8px 32px', fontSize: 12 }} />
          </div>
          <div style={{ fontSize: 9, fontFamily: T.mono, color: T.t3, marginTop: 12 }}>PROPERTY SELECTION ({PG_DATA.length})</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {flp.map(p => (
            <div key={p.id} onClick={() => setSelectedPgId(p.id)}
              style={{ padding: '16px 20px', cursor: 'pointer', borderBottom: `1px solid ${T.line}`, background: selectedPgId === p.id ? 'rgba(255,255,255,0.03)' : 'transparent', borderLeft: selectedPgId === p.id ? `4px solid ${T.green}` : '4px solid transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                <ChevronRight size={14} style={{ color: T.t2 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.green }} />
                <span style={{ fontSize: 11, color: T.green, fontWeight: 600 }}>active</span>
                <span style={{ fontSize: 11, color: T.t2 }}>· {getRoomsForPG(p.id).length} rooms total</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', background: T.bg0 }}>
        {/* Header Section */}
        <div style={{ padding: '40px 40px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: T.blue }} />
            <h1 style={{ fontSize: 28, fontWeight: 800 }}>{selectedPG.name} ({selectedPG.area?.toUpperCase()})</h1>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, color: T.t2, fontSize: 14, fontFamily: T.mono }}>
            <span>{selectedPG.gender}</span>
            <span>·</span>
            <span>{selectedPG.propertyType || 'Mid'}</span>
            <span>·</span>
            <span>{pgRooms.length} rooms tracked</span>
            <span>·</span>
            <span>Manager: {selectedPG.managerName || 'NA'}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ padding: '0 40px', display: 'flex', gap: 20 }}>
          <StatCard label="Live Units" value={stats.approved} sub="Active in Gharpayy OS" color={T.green} />
          <StatCard label="Active Leads" value={stats.softLocked} sub="Sales team efforts" color={T.violet} />
        </div>

        {/* Tabs Control */}
        <div style={{ padding: '40px 40px 0', display: 'flex', gap: 40, borderBottom: `1px solid ${T.line}` }}>
          {['inventory', 'ledger'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ background: 'none', border: 'none', borderBottom: activeTab === tab ? `3px solid ${T.amber}` : '3px solid transparent', padding: '12px 0', fontSize: 15, fontWeight: 700, color: activeTab === tab ? T.amber : T.t2, cursor: 'pointer', fontFamily: T.mono }}>
              {tab === 'inventory' ? 'Inventory Control' : 'Action Ledger'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '0 40px 40px' }}>
          {activeTab === 'inventory' ? (
            <div style={{ marginTop: 20, border: `1px solid ${T.line}`, borderRadius: 12, overflow: 'hidden' }}>
              {pgRooms.map(r => (
                <RoomRow key={r.id} room={r} state={getRoom(r)} onUpdate={(target: any) => setModTarget(target)} />
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {snapshot.actions && snapshot.actions.filter(a => a.pgId === selectedPgId).length > 0 ? (
                snapshot.actions.filter(a => a.pgId === selectedPgId).map((action, i) => (
                  <div key={action.id} style={{ 
                    background: T.bg2, 
                    border: `1px solid ${T.line}`, 
                    borderRadius: 12, 
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16,
                    animation: 'fadeIn 0.3s ease-out'
                  }}>
                    <div style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: 10, 
                      background: action.type === 'VISIT_SCHEDULED' ? 'rgba(59,130,246,0.1)' : 'rgba(34,197,94,0.1)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {action.type === 'VISIT_SCHEDULED' ? <Calendar size={20} color={T.blue} /> : <Zap size={20} color={T.green} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span style={{ fontSize: 13, color: T.t2, fontFamily: T.mono }}>{action.at}</span>
                         <span style={{ fontSize: 11, background: T.bg3, padding: '2px 8px', borderRadius: 4, color: T.t1 }}>ROOM {action.roomNum}</span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: T.t0 }}>{action.note}</div>
                      <div style={{ fontSize: 13, color: T.t2, marginTop: 4 }}>Ref: {action.by}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '100px 0', textAlign: 'center' }}>
                  <Activity size={48} style={{ color: T.t3, marginBottom: 20 }} />
                  <div style={{ fontSize: 18, color: T.t2, fontWeight: 700 }}>Action Ledger — System Syncing...</div>
                  <div style={{ color: T.t3, marginTop: 8, fontFamily: T.mono }}>Verified sales efforts for {selectedPG.name} will appear here.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modTarget && (
        <UpdateModal room={modTarget} state={getRoom(modTarget)} onClose={() => setModTarget(null)} onSave={handleUpdate} />
      )}
    </div>
  );
}
