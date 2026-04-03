'use client';

import React from 'react';

// ── DESIGN TOKENS ──────────────────────────────────────────────
export const T = {
  bg0: '#F8F9FA',
  bg1: '#FFFFFF',
  bg2: '#FFF6F4',
  bg3: '#FFFFFF',
  bg4: '#FEF3C7',
  line: '#FEE2E2',
  lineH: '#FECACA',
  lineA: '#FCA5A5',
  t0: '#111827',
  t1: '#4B5563',
  t2: '#9CA3AF',
  t3: '#E5E7EB',
  gold: '#F97316',
  goldD: 'rgba(249,115,22,0.08)',
  goldB: 'rgba(249,115,22,0.25)',
  green: '#22C55E',
  greenD: 'rgba(34,197,94,0.12)',
  greenB: 'rgba(34,197,94,0.3)',
  amber: '#F59E0B',
  amberD: 'rgba(245,158,11,0.08)',
  amberB: 'rgba(245,158,11,0.3)',
  red: '#B91C1C',
  redD: 'rgba(185,28,28,0.08)',
  redB: 'rgba(185,28,28,0.3)',
  blue: '#2563EB',
  blueD: 'rgba(37,99,235,0.08)',
  blueB: 'rgba(37,99,235,0.3)',
  violet: '#7C3AED',
  violetD: 'rgba(124,58,237,0.08)',
  violetB: 'rgba(124,58,237,0.3)',
  cyan: '#0891B2',
  cyanD: 'rgba(8,145,178,0.08)',
  cyanB: 'rgba(8,145,178,0.3)',
  sans: "'DM Sans', -apple-system, system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
};

export const ROOM_STATES: any = {
  LOCKED: { label: 'Locked', color: '#5E5E72', bg: 'rgba(94,94,114,0.1)', border: 'rgba(94,94,114,0.3)', desc: 'No owner update' },
  AVAILABLE: { label: 'Available', color: T.amber, bg: T.amberD, border: T.amberB, desc: 'Owner updated, awaiting retail' },
  APPROVED: { label: 'Approved', color: T.green, bg: T.greenD, border: T.greenB, desc: 'Live - sellable' },
  SOFT_LOCKED: { label: 'Tour Sched.', color: T.blue, bg: T.blueD, border: T.blueB, desc: 'Tour scheduled - temp hold' },
  HARD_LOCKED: { label: 'Pre-booked', color: T.violet, bg: T.violetD, border: T.violetB, desc: 'Pre-booking in progress' },
  OCCUPIED: { label: 'Occupied', color: T.red, bg: T.redD, border: T.redB, desc: 'Currently occupied' },
};

export const GlobalStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
      body { background: ${T.bg0}; margin:0; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
      .gp-fade { animation: gpFadeIn 0.35s ease-out; }
      @keyframes gpFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      .gp-pulse { animation: gpPulse 2s infinite; }
      @keyframes gpPulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.92); } 100% { opacity: 1; transform: scale(1); } }
      .gp-spin { animation: gpSpin 0.8s linear infinite; }
      @keyframes gpSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      input:focus, select:focus, textarea:focus { border-color: ${T.gold} !important; box-shadow: 0 0 0 2px ${T.goldD}; }
      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: ${T.lineA}; border-radius: 10px; }
      @media (max-width: 768px) {
        .inventory-grid, .matching-results-grid { grid-template-columns: 1fr !important; padding: 8px !important; }
        .matching-layout { grid-template-columns: 1fr !important; }
        .detail-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .detail-two-col { grid-template-columns: 1fr !important; }
        .gp-card { border-radius: 0 !important; border-left: none !important; border-right: none !important; }
        h1 { font-size: 20px !important; }
        h2 { font-size: 18px !important; }
        .inventory-filter-bar { flex-direction: column !important; align-items: stretch !important; }
        .inventory-filter-bar > * { width: 100% !important; min-width: 0 !important; }
        .lg\\:ml-\\[232px\\] { margin-left: 0 !important; }
      }
      .mobile-stack { display: flex; flex-direction: column; }
      @media (min-width: 769px) { .mobile-stack { flex-direction: row; } }
    `}} />
);

export const Card = ({ children, style, glow }: any) => (
  <div style={{ background:T.bg2, border:`1px solid ${T.line}`, borderRadius:12, padding:'22px 24px', boxShadow: glow ? `0 0 40px ${glow}` : 'none', ...style }} className="gp-fade">
    {children}
  </div>
);

export const Btn = ({ children, onClick, variant, style, disabled, loading }: any) => {
  const styles: any = {
    base: { fontFamily:T.sans, fontSize:13, fontWeight:600, padding:'10px 16px', borderRadius:8, cursor: disabled ? 'not-allowed' : 'pointer', border:'none', transition:'all .15s', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:disabled?0.5:1, userSelect:'none' },
    ghost: { background:T.bg3, color:T.t1, border:`1px solid ${T.line}` },
    primary: { background:T.gold, color:T.bg0 },
    green: { background:T.greenD, color:T.green, border:`1px solid ${T.greenB}` },
    blue: { background:T.blueD, color:T.blue, border:`1px solid ${T.blueB}` },
    violet: { background:T.violetD, color:T.violet, border:`1px solid ${T.violetB}` },
    red: { background:T.redD, color:T.red, border:`1px solid ${T.redB}` },
    amber: { background:T.amberD, color:T.amber, border:`1px solid ${T.amberB}` },
  };
  const s = { ...styles.base, ...(styles[variant] || styles.ghost), ...style };
  return (
    <button onClick={onClick} style={s} disabled={disabled || loading}>
      {loading && <div className="gp-spin" style={{ width:12, height:12, border:`2px solid currentColor`, borderTopColor:'transparent', borderRadius:100 }} />}
      {children}
    </button>
  );
};

export const Tag = ({ state }: any) => {
  const info = ROOM_STATES[state] || ROOM_STATES.LOCKED;
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:info.bg, color:info.color, padding:'4px 10px', borderRadius:100, border:`1px solid ${info.border}`, fontFamily:T.mono, fontSize:10, fontWeight:600, letterSpacing:'0.02em' }}>
      <div style={{ width:5, height:5, borderRadius:5, background:info.color }} />
      {info.label.toUpperCase()}
    </div>
  );
};

export const Chip = ({ label, color }: any) => (
  <div style={{ display:'inline-flex', background:`${color}15`, color, border:`1px solid ${color}30`, padding:'2px 8px', borderRadius:6, fontFamily:T.mono, fontSize:9, fontWeight:600 }}>
    {label?.toUpperCase() || ''}
  </div>
);

export const Avatar = ({ name, size = 32 }: any) => (
  <div style={{ width:size, height:size, borderRadius:size/2, background:`linear-gradient(135deg, ${T.violet}, ${T.blue})`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:Math.max(10, size/2.5), color:T.t0, textTransform:'uppercase', flexShrink:0, border:`1px solid ${T.lineA}` }}>
    {name?.slice(0,1) || '?'}
  </div>
);

export const Divider = () => <div style={{ height:1, background:T.line, margin:'14px 0' }} />;

export const StatBox = ({ label, value, color, sub }: any) => (
  <div style={{ flex:1, minWidth:160, background:T.bg2, border:`1px solid ${T.line}`, borderRadius:10, padding:'16px 18px' }}>
    <div style={{ fontFamily:T.mono, fontSize:10, color:T.t2, marginBottom:10, letterSpacing:'0.05em' }}>{label.toUpperCase()}</div>
    <div style={{ fontSize:28, fontWeight:700, color, marginBottom:4, fontFamily:T.sans }}>{value}</div>
    <div style={{ fontSize:11, color:T.t3, fontWeight:500 }}>{sub}</div>
  </div>
);

export const TabBar = ({ tabs, active, onChange }: any) => (
  <div style={{ display:'flex', background:T.bg1, padding:4, borderRadius:10, border:`1px solid ${T.line}`, gap:4, overflowX:'auto' }}>
    {tabs.map(([id, label, count]: any) => (
      <button key={id} onClick={() => onChange(id)} style={{ display:'flex', alignItems:'center', gap:8, background:active===id ? T.bg3 : 'transparent', color:active===id ? T.t0 : T.t2, border:active===id ? `1px solid ${T.lineH}` : '1px solid transparent', borderRadius:7, padding:'8px 14px', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .15s', fontFamily:T.sans, whiteSpace:'nowrap' }}>
        {label}
        {count !== undefined && count > 0 && <span style={{ background:active===id ? T.gold : T.bg4, color:active===id ? T.bg0 : T.t2, fontSize:10, padding:'1px 6px', borderRadius:5 }}>{count}</span>}
      </button>
    ))}
  </div>
);

export const Label = ({ children, style }: any) => (
  <div style={{ fontFamily:T.mono, fontSize:10, color:T.t2, marginBottom:6, letterSpacing:'0.05em', ...style }}>{children || ''}</div>
);

export const Input = (props: any) => (
  <div style={{ position:'relative', width:'100%' }}>
    {props.label && <Label>{props.label}</Label>}
    <input {...props} style={{ width:'100%', background:T.bg3, border:`1px solid ${T.line}`, borderRadius:8, padding:'10px 12px', color:T.t0, fontSize:13, fontFamily:T.sans, outline:'none', transition:'all .15s', ...props.style }} />
  </div>
);

export const Select = (props: any) => (
  <div style={{ position:'relative', width:'100%' }}>
    {props.label && <Label>{props.label}</Label>}
    <select {...props} style={{ width:'100%', background:T.bg3, border:`1px solid ${T.line}`, borderRadius:8, padding:'10px 12px', color:T.t0, fontSize:13, fontFamily:T.sans, outline:'none', cursor:'pointer', appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235E5E72' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center', paddingRight:34, ...props.style }}>
      {props.children}
    </select>
  </div>
);

export const Textarea = (props: any) => (
  <div style={{ position:'relative', width:'100%' }}>
    {props.label && <Label>{props.label}</Label>}
    <textarea {...props} style={{ width:'100%', background:T.bg3, border:`1px solid ${T.line}`, borderRadius:8, padding:'10px 12px', color:T.t0, fontSize:13, fontFamily:T.sans, outline:'none', resize:'none', ...props.style }} />
  </div>
);

export const EmptyState = ({ msg }: any) => (
  <div style={{ padding:'60px 20px', textAlign:'center', background:T.bg2, borderRadius:12, border:`1px dashed ${T.lineH}` }}>
    <div style={{ fontSize:13, color:T.t2, fontFamily:T.mono }}>{msg}</div>
  </div>
);
