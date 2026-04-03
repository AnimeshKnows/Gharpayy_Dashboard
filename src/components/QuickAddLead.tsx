import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2, AlertTriangle, Phone, Mail, MapPin, IndianRupee, User, StickyNote, Sparkles, PenLine, Calendar, Briefcase, Clock, Home } from 'lucide-react';
import { useCreateLead, useAgents } from '@/hooks/useCrmData';
import { SOURCE_LABELS } from '@/types/crm';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { parseLeadText, type ParsedLead } from '@/lib/parseLeadText';

type Mode = 'smart' | 'manual';

const QuickAddLead = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('smart');
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedLead | null>(null);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-quick-add', handler);
    return () => window.removeEventListener('open-quick-add', handler);
  }, []);

  const [form, setForm] = useState({
    name: '', phone: '', email: '', source: 'whatsapp' as string,
    budget: '', preferred_location: '', address: '', notes: '', assigned_agent_id: '',
    movingDate: '', gender: '' as string, occupation: '' as string, stayDuration: ''
  });
  const [duplicate, setDuplicate] = useState<{ id: string; name: string; status: string } | null>(null);

  const createLead = useCreateLead();
  const { data: agents } = useAgents();

  const reset = () => {
    setForm({ name: '', phone: '', email: '', source: 'whatsapp', budget: '', preferred_location: '', address: '', notes: '', assigned_agent_id: '', movingDate: '', gender: '', occupation: '', stayDuration: '' });
    setDuplicate(null);
    setRawText('');
    setParsed(null);
    setMode('smart');
  };

  const checkDuplicate = async (phone: string) => {
    if (!phone || phone.length < 5) { setDuplicate(null); return; }
    try {
      const res = await fetch(`/api/leads/check-duplicate?phone=${phone}`);
      const data = await res.json();
      if (data) setDuplicate(data);
      else setDuplicate(null);
    } catch (e) {
      setDuplicate(null);
    }
  };

  const handleParse = useCallback((text: string) => {
    setRawText(text);
    if (!text.trim()) { setParsed(null); return; }
    const result = parseLeadText(text);
    setParsed(result);
    // Also sync to form for submission
    setForm(f => ({
      ...f,
      name: result.name || f.name,
      phone: result.phone || f.phone,
      email: result.email || f.email,
      budget: result.budget || f.budget,
      preferred_location: result.preferred_location || f.preferred_location,
      address: result.address || f.address,
      notes: result.notes || f.notes,
      movingDate: result.moving_date || f.movingDate,
      gender: result.gender || f.gender,
      occupation: result.occupation || f.occupation,
      stayDuration: result.stay_duration || f.stayDuration,
    }));
    if (result.phone) checkDuplicate(result.phone);
  }, []);

  const getAutoAgent = () => {
    if (!agents || agents.length === 0) return null;
    if (form.assigned_agent_id) return form.assigned_agent_id;
    return (agents[0] as any)?.id || null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = mode === 'smart' ? (parsed?.name || form.name) : form.name;
    const phone = mode === 'smart' ? (parsed?.phone || form.phone) : form.phone;

    if (!name.trim() || !phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      await createLead.mutateAsync({
        name: name.trim(),
        phone: phone.trim(),
        email: (mode === 'smart' ? (parsed?.email || form.email) : form.email).trim() || null,
        source: form.source as any,
        budget: (mode === 'smart' ? (parsed?.budget || form.budget) : form.budget).trim() || null,
        preferredLocation: (mode === 'smart' ? (parsed?.preferred_location || form.preferred_location) : form.preferred_location).trim() || null,
        address: (mode === 'smart' ? (parsed?.address || form.address) : form.address).trim() || null,
        notes: (mode === 'smart' ? (parsed?.notes || form.notes) : form.notes).trim() || null,
        movingDate: (mode === 'smart' ? (parsed?.moving_date || form.movingDate) : form.movingDate).trim() || null,
        gender: mode === 'smart' ? (parsed?.gender || form.gender) : form.gender || null,
        occupation: mode === 'smart' ? (parsed?.occupation || form.occupation) : form.occupation || null,
        stayDuration: (mode === 'smart' ? (parsed?.stay_duration || form.stayDuration) : form.stayDuration).trim() || null,
        assignedAgentId: getAutoAgent(),
        status: 'new',
      });
      toast.success('Lead created!');
      setOpen(false);
      reset();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create lead');
    }
  };


  const fields = parsed ? [
    { icon: User, label: 'Name', value: parsed.name, conf: parsed.confidence.name, color: 'text-primary' },
    { icon: Phone, label: 'Phone', value: parsed.phone, conf: parsed.confidence.phone, color: 'text-emerald-500' },
    { icon: Mail, label: 'Email', value: parsed.email, conf: parsed.confidence.email, color: 'text-sky-500' },
    { icon: IndianRupee, label: 'Budget', value: parsed.budget, conf: parsed.confidence.budget, color: 'text-amber-500' },
    { icon: MapPin, label: 'Location', value: parsed.preferred_location, conf: parsed.confidence.location, color: 'text-rose-500' },
    { icon: Home, label: 'Address', value: parsed.address, conf: 0.7, color: 'text-indigo-500' },
    { icon: Calendar, label: 'Moving Date', value: parsed.moving_date, conf: 0.8, color: 'text-blue-500' },
    { icon: User, label: 'Gender', value: parsed.gender, conf: 0.8, color: 'text-pink-500' },
    { icon: Briefcase, label: 'Occupation', value: parsed.occupation, conf: 0.8, color: 'text-indigo-500' },
    { icon: Clock, label: 'Stay Duration', value: parsed.stay_duration, conf: 0.8, color: 'text-orange-500' },
    { icon: StickyNote, label: 'Notes', value: parsed.notes, conf: 0.5, color: 'text-muted-foreground' },
  ].filter(f => f.value) : [];

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
      >
        <Plus size={24} strokeWidth={2.5} />
      </motion.button>

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle className="font-display text-lg flex items-center gap-2">
                {mode === 'smart' ? <><Sparkles size={18} className="text-accent" /> Smart Add Lead</> : <><PenLine size={18} /> Manual Entry</>}
              </DialogTitle>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-muted-foreground flex-1">
                  {mode === 'smart'
                    ? 'Paste any text — we\'ll extract the details automatically.'
                    : 'Fill in the fields manually.'}
                </p>
                <button
                  type="button"
                  onClick={() => setMode(mode === 'smart' ? 'manual' : 'smart')}
                  className="text-[11px] font-medium text-accent hover:text-accent/80 transition-colors shrink-0"
                >
                  {mode === 'smart' ? 'Fill manually →' : '← Smart paste'}
                </button>
              </div>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-3">
            <AnimatePresence mode="wait">
              {mode === 'smart' ? (
                <motion.div
                  key="smart"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {/* Smart paste textarea */}
                  <Textarea
                    autoFocus
                    placeholder={"Paste lead info here...\ne.g. Rahul Sharma 9876543210 looking for 2BHK in Koramangala budget 15-20k rahul@gmail.com"}
                    value={rawText}
                    onChange={e => handleParse(e.target.value)}
                    rows={3}
                    className="rounded-xl text-sm resize-none border-2 border-dashed border-accent/30 focus:border-accent bg-accent/5 placeholder:text-muted-foreground/60"
                  />

                  {/* Parsed fields as chips */}
                  {fields.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-wrap gap-2"
                    >
                      {fields.map((f, i) => (
                        <motion.div
                          key={f.label}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                            f.conf >= 0.8
                              ? 'bg-accent/10 border-accent/20'
                              : f.conf >= 0.5
                              ? 'bg-warning/10 border-warning/20'
                              : 'bg-muted border-border'
                          }`}
                        >
                          <f.icon size={12} className={f.color} />
                          <span className="text-muted-foreground">{f.label}:</span>
                          <span className="text-foreground">{f.value}</span>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Name *</Label>
                      <Input
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="h-10 rounded-xl"
                        placeholder="Name"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Mobile Number *</Label>
                      <Input
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        className="h-10 rounded-xl"
                        placeholder="Mobile Number"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Location</Label>
                      <Input
                        value={form.preferred_location}
                        onChange={e => setForm(f => ({ ...f, preferred_location: e.target.value }))}
                        className="h-10 rounded-xl"
                        placeholder="Location"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Exact Address</Label>
                      <Input
                        value={form.address}
                        onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                        className="h-10 rounded-xl"
                        placeholder="House No, Landmark"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Move-in Date</Label>
                      <Input
                        value={form.movingDate}
                        onChange={e => setForm(f => ({ ...f, movingDate: e.target.value }))}
                        className="h-10 rounded-xl"
                        placeholder="Move-in Date"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Gender</Label>
                      <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select Gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Student/Working</Label>
                      <Select value={form.occupation} onValueChange={v => setForm(f => ({ ...f, occupation: v }))}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select Occupation" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Student">Student</SelectItem>
                          <SelectItem value="Working">Working</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Budget</Label>
                      <Input
                        value={form.budget}
                        onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                        className="h-10 rounded-xl"
                        placeholder="₹ Budget"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Source</Label>
                      <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Agent</Label>
                      <Select value={form.assigned_agent_id} onValueChange={v => setForm(f => ({ ...f, assigned_agent_id: v }))}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Auto-assign" /></SelectTrigger>
                        <SelectContent>
                          {agents?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="manual"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {/* Manual mode — classic form */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Name *</Label>
                      <Input autoFocus placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-10 rounded-xl" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Phone *</Label>
                      <Input placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} onBlur={() => checkDuplicate(form.phone)} className="h-10 rounded-xl" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="h-10 rounded-xl" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Source</Label>
                      <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Budget</Label>
                      <Input placeholder="₹ Range" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} className="h-10 rounded-xl" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Location</Label>
                      <Input placeholder="Area" value={form.preferred_location} onChange={e => setForm(f => ({ ...f, preferred_location: e.target.value }))} className="h-10 rounded-xl" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Exact Address</Label>
                      <Input placeholder="House No, Landmark" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="h-10 rounded-xl" />
                    </div>
                  </div>

                  {/* New Fields for Manual Mode */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Moving Date</Label>
                      <Input placeholder="Date or Month" value={form.movingDate} onChange={e => setForm(f => ({ ...f, movingDate: e.target.value }))} className="h-10 rounded-xl" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Stay Duration</Label>
                      <Input placeholder="e.g. 6 Months" value={form.stayDuration} onChange={e => setForm(f => ({ ...f, stayDuration: e.target.value }))} className="h-10 rounded-xl" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Gender</Label>
                      <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Occupation</Label>
                      <Select value={form.occupation} onValueChange={v => setForm(f => ({ ...f, occupation: v }))}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Student">Student</SelectItem>
                          <SelectItem value="Working">Working</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Agent</Label>
                      <Select value={form.assigned_agent_id} onValueChange={v => setForm(f => ({ ...f, assigned_agent_id: v }))}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Auto-assign" /></SelectTrigger>
                        <SelectContent>
                          {agents?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Notes</Label>
                      <Input placeholder="Quick notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-10 rounded-xl" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Duplicate warning */}
            {duplicate && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/10 border border-warning/20">
                <AlertTriangle size={13} className="text-warning shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-foreground">Duplicate: {duplicate.name}</p>
                  <p className="text-muted-foreground text-[10px]">Status: {duplicate.status.replace(/_/g, ' ')}</p>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => { setOpen(false); reset(); }}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 h-11 rounded-xl font-semibold" disabled={createLead.isPending}>
                {createLead.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Create Lead'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuickAddLead;
