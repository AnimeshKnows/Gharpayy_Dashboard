'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { T, GlobalStyles, Card, Btn, Tag, Chip, TabBar, Label, Input, Textarea, EmptyState } from '@/components/Gharpayy3X';
import { toast } from 'sonner';

export default function OwnerPortal() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("rooms");
  const [updateModal, setUpdateModal] = useState<any>(null);
  const [form, setForm] = useState({ type: "available_now", availFrom: "", price: "", remarks: "" });

  // 1. Fetch user (auth check)
  const { data: user, isLoading: authLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error('Not logged in');
      const data = await res.json();
      if (!data.user || data.user.role !== 'owner') throw new Error('Owner only');
      return data.user;
    },
    retry: false
  });

  // 2. Fetch inventory
  const { data: properties, isLoading: inventoryLoading } = useQuery({
    queryKey: ['owner-inventory'],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch('/api/inventory/owner');
      if (!res.ok) throw new Error('Failed to fetch inventory');
      return res.json();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ roomId, data }: any) => {
      const res = await fetch('/api/inventory/owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, ...data })
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-inventory'] });
      toast.success('Room updated securely. Synced with Truth Pipe.');
      setUpdateModal(null);
    },
    onError: (e: any) => toast.error(e.message)
  });

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/owner-login');
  };

  if (authLoading || (user && inventoryLoading)) {
    return (
      <div style={{ minHeight:"100vh", background:T.bg0, display:'flex', alignItems:'center', justifyContent:'center' }}>
         <GlobalStyles />
         <div className="gp-spin" style={{ width:24, height:24, border:`3px solid ${T.goldD}`, borderTopColor:T.gold, borderRadius:"50%" }} />
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') router.push('/owner-login');
    return null;
  }

  const prop = properties?.[0]; // Handling first grouped property for layout
  if (!prop) {
    return (
      <div style={{ padding: 40, background:T.bg0, minHeight:'100vh', color:T.t0 }}>
         <GlobalStyles />
         <EmptyState msg="No properties assigned to your account yet." />
         <Btn onClick={signOut} style={{ marginTop: 20 }}>Sign Out</Btn>
      </div>
    );
  }

  const myRooms = prop.rooms || [];
  const vacantCount = myRooms.filter((r: any) => r.state === "APPROVED" || r.state === "AVAILABLE").length;
  const lockedCount = myRooms.filter((r: any) => r.state === "LOCKED" || r.state === "OCCUPIED").length;
  const totalActions = myRooms.reduce((acc: number, r: any) => acc + (r.actionCount || 0), 0);

  const openUpdate = (room: any) => {
    setForm({ 
      type: room.availabilityType || "available_now", 
      availFrom: room.availableFrom || "", 
      price: room.expectedRent?.toString() || "", 
      remarks: room.remarks || "" 
    });
    setUpdateModal(room);
  };

  const submit = () => {
    updateMutation.mutate({
      roomId: updateModal.id,
      data: {
        availabilityType: form.type,
        availableFrom: form.availFrom || null,
        expectedPrice: parseInt(form.price) || updateModal.expectedRent,
        remarks: form.remarks
      }
    });
  };

  return (
    <div className="gp-fade" style={{ minHeight:"100vh", background:T.bg0, fontFamily:T.sans, paddingBottom: 60 }}>
      <GlobalStyles />
      {/* Top Header */}
      <div style={{ background:T.bg1, borderBottom:`1px solid ${T.line}`, height:54, display:"flex", alignItems:"center", padding:"0 20px", justifyContent:"space-between", position:"sticky", top:0, zIndex:10 }}>
         <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
               <div style={{ width:26, height:26, background:T.gold, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <div style={{ width:9, height:9, background:T.bg0, borderRadius:1, transform:"rotate(45deg)" }} />
               </div>
               <span style={{ fontFamily:T.sans, fontWeight:700, fontSize:16, color:T.t0, letterSpacing:"-0.02em" }}>
                  Gharpayy<span style={{ color:T.gold }}>OS</span>
               </span>
            </div>
            <div style={{ width:1, height:20, background:T.line }} />
            <div style={{ fontFamily:T.mono, fontSize:11, color:T.gold, background:T.gold+"18", border:`1px solid ${T.gold}35`, borderRadius:4, padding:"3px 9px", letterSpacing:"0.06em" }}>LISTING PARTNER</div>
         </div>
         <Btn onClick={signOut}>Sign Out</Btn>
      </div>

      <div style={{ padding:"24px 20px", maxWidth:720, margin:"0 auto" }}>
        {/* Property card */}
        <Card glow={T.goldB} style={{ marginBottom:20, background:`linear-gradient(135deg, ${T.goldD}, transparent 70%)` }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:14 }}>
            <div>
              <div style={{ fontFamily:T.mono, fontSize:10, color:T.gold, letterSpacing:"0.1em", marginBottom:5 }}>YOUR PROPERTY</div>
              <div style={{ fontWeight:700, fontSize:22, color:T.t0, letterSpacing:"-0.025em" }}>{prop?.location}</div>
              <div style={{ fontFamily:T.mono, fontSize:12, color:T.t1, marginTop:4 }}>{prop?.area} · {myRooms.length} rooms managed</div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <div style={{ textAlign:"center", background:T.greenD, border:`1px solid ${T.greenB}`, borderRadius:8, padding:"10px 16px" }}>
                <div style={{ fontWeight:700, fontSize:24, color:T.green }}>{vacantCount}</div>
                <div style={{ fontFamily:T.mono, fontSize:9, color:T.green, marginTop:2, letterSpacing:"0.05em" }}>SELLABLE</div>
              </div>
              <div style={{ textAlign:"center", background:T.redD, border:`1px solid ${T.redB}`, borderRadius:8, padding:"10px 16px" }}>
                <div style={{ fontWeight:700, fontSize:24, color:T.red }}>{lockedCount}</div>
                <div style={{ fontFamily:T.mono, fontSize:9, color:T.red, marginTop:2, letterSpacing:"0.05em" }}>LOCKED</div>
              </div>
            </div>
          </div>
        </Card>

        <TabBar tabs={[["rooms", "Rooms Ledger", lockedCount], ["tours", "Tour Ledger", prop.liveTours?.length || 0]]} active={tab} onChange={setTab} />
        <div style={{ height:18 }} />

        {/* ── ROOMS TAB ── */}
        {tab === "rooms" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {myRooms.map((room: any) => {
              const needsUpdate = room.state === "LOCKED";
              return (
                <div key={room.id} style={{ background:T.bg2, border:`1px solid ${needsUpdate ? T.redB : T.line}`, borderRadius:10, padding:"16px 20px", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", transition:"border .15s" }}>
                  <div style={{ width:52, height:52, background:T.bg3, border:`1px solid ${T.line}`, borderRadius:8, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <div style={{ fontFamily:T.mono, fontWeight:600, fontSize:16, color:T.t0 }}>{room.roomNumber}</div>
                    <div style={{ fontFamily:T.mono, fontSize:9, color:T.t3 }}>RM</div>
                  </div>
                  <div style={{ flex:1, minWidth:160 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                      <Tag state={room.state} />
                      {room.tier && <Chip label={room.tier} color={T.amber} />}
                    </div>
                    {room.availabilityType ? (
                      <div style={{ fontFamily:T.mono, fontSize:12, color:T.t1 }}>
                        Expected: ₹{room.expectedRent?.toLocaleString()}
                        {room.retailPrice && <span style={{ color:T.gold, marginLeft:8 }}>→ Market ₹{room.retailPrice.toLocaleString()}</span>}
                        {room.availableFrom && <span style={{ color:T.amber, marginLeft:8 }}>· From {room.availableFrom}</span>}
                      </div>
                    ) : (
                      <div style={{ fontFamily:T.mono, fontSize:12, color:T.red }}>No availability set · System blocked</div>
                    )}
                    {room.remarks && <div style={{ fontSize:11, color:T.t2, marginTop:4 }}>{room.remarks}</div>}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                    {room.updatedAt && <div style={{ fontFamily:T.mono, fontSize:10, color:T.t2 }}>Upd: {room.updatedAt}</div>}
                    <Btn onClick={() => openUpdate(room)} variant={needsUpdate ? "red" : "ghost"} style={{ fontSize:12, padding:"6px 14px", whiteSpace:"nowrap" }}>
                      {needsUpdate ? "Resolve Block" : "Update Truth"}
                    </Btn>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TOURS TAB ── */}
        {tab === "tours" && (
          <div>
            <Card style={{ marginBottom:16, background:T.greenD, border:`1px solid ${T.greenB}` }}>
              <div style={{ fontFamily:T.mono, fontSize:12, color:T.green, lineHeight:1.75 }}>
                Every action below is our live tour ledger for your property.<br/>
                This is how we earn your trust — through transparent work, not talk.
              </div>
            </Card>

            {prop.liveTours?.length > 0 ? (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {prop.liveTours.map((tour: any) => (
                  <div key={tour.id} style={{ background:T.bg2, border:`1px solid ${T.line}`, borderRadius:10, padding:"16px 20px", display:"flex", alignItems:"center", gap:16 }}>
                    <div style={{ width:40, height:40, background:T.goldD, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                       <div style={{ color:T.gold, fontWeight:700 }}>{tour.customer?.slice(0,1)}</div>
                    </div>
                    <div style={{ flex:1 }}>
                       <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                          <span style={{ fontWeight:700, fontSize:14, color:T.t0 }}>{tour.customer}</span>
                          <Chip label={tour.tourType} color={T.blue} />
                       </div>
                       <div style={{ fontFamily:T.mono, fontSize:11, color:T.t2 }}>
                          Scheduled for {new Date(tour.tourAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                       </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                       <Tag state="SOFT_LOCKED" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState msg="No active tours scheduled. Tours appear here dynamicly as our sales team schedules them." />
            )}
          </div>
        )}
      </div>

      {/* ── UPDATE MODAL ── */}
      {updateModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:998, backdropFilter:"blur(4px)" }} onClick={e => e.target === e.currentTarget && setUpdateModal(null)}>
          <div className="gp-fade" style={{ background:T.bg2, border:`1px solid ${T.lineH}`, borderRadius:"16px 16px 0 0", padding:"28px 24px", width:"100%", maxWidth:480, paddingBottom:40 }}>
            <div style={{ fontFamily:T.mono, fontSize:10, color:T.gold, letterSpacing:"0.1em", marginBottom:6 }}>SUBMIT TRUTH UPDATE</div>
            <div style={{ fontWeight:700, fontSize:22, color:T.t0, marginBottom:4 }}>Room {updateModal.roomNumber}</div>
            <div style={{ fontFamily:T.mono, fontSize:12, color:T.t1, marginBottom:24 }}>Base expected: ₹{updateModal.expectedRent?.toLocaleString()}/mo</div>

            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <Label>Availability Target</Label>
                <div style={{ display:"flex", gap:10 }}>
                  {[["available_now","Available Now"],["available_on_date","Available On Date"], ["occupied", "Occupied"]].map(([v,l]) => (
                    <button key={v} onClick={() => setForm({...form, type:v})} style={{ flex:1, background:form.type===v ? T.gold : T.bg3, border:`1px solid ${form.type===v ? T.gold : T.line}`, borderRadius:8, padding:"10px 0", fontSize:12, color:form.type===v ? T.bg0 : T.t1, fontFamily:T.sans, fontWeight:600, cursor:"pointer", transition:"all .12s" }}>{l}</button>
                  ))}
                </div>
              </div>
              {form.type === "available_on_date" && (
                <div>
                  <Label>Available From (Date)</Label>
                  <Input type="date" value={form.availFrom} onChange={(e: any)=>setForm({...form,availFrom:e.target.value})} />
                </div>
              )}
              {form.type !== "occupied" && (
                 <div>
                   <Label>Expected Rent (₹/month)</Label>
                   <Input type="number" value={form.price} onChange={(e: any)=>setForm({...form,price:e.target.value})} placeholder={updateModal.expectedRent?.toString()} />
                 </div>
              )}
              {form.type !== "occupied" && (
                 <div>
                   <Label>Remarks (optional · max 150 chars)</Label>
                   <Textarea value={form.remarks} onChange={(e: any)=>setForm({...form,remarks:e.target.value.slice(0,150)})} placeholder="Why should a tenant take this room? Any highlights?" />
                   <div style={{ textAlign:"right", fontFamily:T.mono, fontSize:10, color:T.t3, marginTop:4 }}>{form.remarks.length}/150</div>
                 </div>
              )}
            </div>
            <div style={{ display:"flex", gap:12, marginTop:28 }}>
              <Btn onClick={() => setUpdateModal(null)} style={{ flex:1 }}>Cancel</Btn>
              <Btn onClick={submit} variant="primary" style={{ flex:2, fontWeight:700 }} loading={updateMutation.isPending}>
                 Commit Update
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
