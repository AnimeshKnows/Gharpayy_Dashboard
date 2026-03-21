import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  User,
  StickyNote,
  CalendarDays,
  Briefcase,
  Home,
  Users,
} from 'lucide-react';
import { useCreateLead, useAgents } from '@/hooks/useCrmData';
import { useAuth } from '@/contexts/AuthContext';
import { SOURCE_LABELS } from '@/types/crm';
import { toast } from 'sonner';
import { parseLeadText, type ParsedLead } from '@/lib/parseLeadText';
import { motion } from 'framer-motion';

const AddLeadDialog = () => {
  const { user } = useAuth();
  const canAddLead = user && ['ceo', 'manager', 'admin'].includes(user.role);
  const [open, setOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedLead | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'whatsapp' as string,
    budget: '',
    preferred_location: '',
    move_in_date: '',
    profession: '',
    room_type: '',
    need_preference: '',
    special_requests: '',
    notes: '',
    assigned_agent_id: '' as string,
  });

  const [duplicate, setDuplicate] = useState<{
    isDuplicate: boolean;
    duplicateCount: number;
    id: string;
    name: string;
    phone: string;
    status: string;
  } | null>(null);

  const createLead = useCreateLead();
  const { data: agents } = useAgents();

  const checkDuplicate = async (phone: string) => {
    if (!phone || phone.length < 5) {
      setDuplicate(null);
      return;
    }
    try {
      const res = await fetch(`/api/leads/check-duplicate?phone=${phone}`);
      const data = await res.json();
      if (data?.isDuplicate) setDuplicate(data);
      else setDuplicate(null);
    } catch {
      setDuplicate(null);
    }
  };

  const handleParse = useCallback((text: string) => {
    setRawText(text);
    if (!text.trim()) {
      setParsed(null);
      return;
    }

    const result = parseLeadText(text);
    setParsed(result);

    setForm((f) => ({
      ...f,
      name: result.name || f.name,
      phone: result.phone || f.phone,
      email: result.email || f.email,
      budget: result.budget || f.budget,
      preferred_location: result.preferred_location || f.preferred_location,
      move_in_date: result.move_in_date || f.move_in_date,
      profession: result.profession || f.profession,
      room_type: result.room_type || f.room_type,
      need_preference: result.need_preference || f.need_preference,
      special_requests: result.special_requests || f.special_requests,
      notes: result.notes || f.notes,
    }));

    if (result.phone) checkDuplicate(result.phone);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error('Name and phone are required');
      return;
    }

    try {
      const agentId = form.assigned_agent_id || (agents?.[0] as any)?.id || null;
      await createLead.mutateAsync({
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        source: form.source as any,
        budget: form.budget || null,
        preferredLocation: form.preferred_location || null,
        moveInDate: form.move_in_date || null,
        profession: form.profession || null,
        roomType: form.room_type || null,
        needPreference: form.need_preference || null,
        specialRequests: form.special_requests || null,
        notes: form.notes || null,
        assignedAgentId: agentId,
        status: 'new',
      });

      toast.success('Lead created successfully!');
      setOpen(false);
      setDuplicate(null);
      setParsed(null);
      setRawText('');
      setForm({
        name: '',
        phone: '',
        email: '',
        source: 'whatsapp',
        budget: '',
        preferred_location: '',
        move_in_date: '',
        profession: '',
        room_type: '',
        need_preference: '',
        special_requests: '',
        notes: '',
        assigned_agent_id: '',
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create lead');
    }
  };

  const chips = parsed
    ? [
        { icon: User, value: parsed.name, conf: parsed.confidence.name, color: 'text-primary' },
        { icon: Phone, value: parsed.phone, conf: parsed.confidence.phone, color: 'text-emerald-500' },
        { icon: Mail, value: parsed.email, conf: parsed.confidence.email, color: 'text-sky-500' },
        { icon: IndianRupee, value: parsed.budget, conf: parsed.confidence.budget, color: 'text-amber-500' },
        { icon: MapPin, value: parsed.preferred_location, conf: parsed.confidence.location, color: 'text-rose-500' },
        { icon: CalendarDays, value: parsed.move_in_date, conf: 0.7, color: 'text-indigo-500' },
        { icon: Briefcase, value: parsed.profession, conf: 0.7, color: 'text-cyan-500' },
        { icon: Home, value: parsed.room_type, conf: 0.7, color: 'text-orange-500' },
        { icon: Users, value: parsed.need_preference, conf: 0.7, color: 'text-lime-600' },
        { icon: StickyNote, value: parsed.special_requests, conf: 0.7, color: 'text-fuchsia-500' },
      ].filter((f) => f.value)
    : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setDuplicate(null);
          setParsed(null);
          setRawText('');
        }
      }}
    >
      <DialogTrigger asChild disabled={!canAddLead}>
        <Button size="sm" className="gap-1.5 text-xs" disabled={!canAddLead} title={!canAddLead ? 'Only CEOs, managers, and admins can add leads' : ''}>
          <Plus size={13} /> Add Lead
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[96vw] max-w-none h-[92vh] p-0 border-0 bg-transparent shadow-none">
        <div className="h-full rounded-[28px] border border-border/60 bg-background/95 backdrop-blur-sm shadow-2xl overflow-hidden">
          <DialogHeader className="px-8 pt-7 pb-4 border-b border-border/60 bg-secondary/20">
            <DialogTitle className="font-display flex items-center gap-2 text-xl">
              <Sparkles size={18} className="text-accent" /> Add New Lead
            </DialogTitle>
            <p className="text-[10px] sm:text-[11px] md:text-xs text-muted-foreground whitespace-nowrap md:whitespace-normal leading-tight">
              Paste raw lead text and review all extracted details before saving.
            </p>
          </DialogHeader>

          <div className="h-[calc(92vh-86px)] overflow-y-auto px-8 py-6">
            <div className="space-y-3 mb-6">
              <Textarea
                placeholder={"Paste lead info here and we will auto-fill the form..."}
                value={rawText}
                onChange={(e) => handleParse(e.target.value)}
                rows={4}
                className="rounded-2xl text-sm resize-none border-2 border-dashed border-accent/30 focus:border-accent bg-accent/5 placeholder:text-muted-foreground/60"
              />

              {chips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {chips.map((f, i) => (
                    <motion.span
                      key={`${f.value}-${i}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border ${
                        f.conf >= 0.8
                          ? 'bg-accent/10 border-accent/20'
                          : f.conf >= 0.5
                            ? 'bg-warning/10 border-warning/20'
                            : 'bg-muted border-border'
                      }`}
                    >
                      <f.icon size={11} className={f.color} />
                      <span className="text-foreground">{f.value}</span>
                    </motion.span>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone *</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    onBlur={() => checkDuplicate(form.phone)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
              </div>

              {duplicate ? (
                <p className="text-[11px] text-muted-foreground">
                  Duplicate phone detected ({duplicate.duplicateCount} leads with same number).
                </p>
              ) : null}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Source</Label>
                  <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Budget</Label>
                  <Input value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Preferred Location</Label>
                  <Input
                    value={form.preferred_location}
                    onChange={(e) => setForm((f) => ({ ...f, preferred_location: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Move-in Date</Label>
                  <Input
                    value={form.move_in_date}
                    onChange={(e) => setForm((f) => ({ ...f, move_in_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Student/Working</Label>
                  <Select
                    value={form.profession || 'unknown'}
                    onValueChange={(v) => setForm((f) => ({ ...f, profession: v === 'unknown' ? '' : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Not specified</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="working">Working</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Assign Agent</Label>
                  <Select
                    value={form.assigned_agent_id}
                    onValueChange={(v) => setForm((f) => ({ ...f, assigned_agent_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-assign (round robin)" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents?.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Room Preference</Label>
                  <Select
                    value={form.room_type || 'unknown'}
                    onValueChange={(v) => setForm((f) => ({ ...f, room_type: v === 'unknown' ? '' : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Not specified</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="shared">Shared</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                      <SelectItem value="any">Any</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Need (Boys/Girls/Coed)</Label>
                  <Select
                    value={form.need_preference || 'unknown'}
                    onValueChange={(v) => setForm((f) => ({ ...f, need_preference: v === 'unknown' ? '' : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Not specified</SelectItem>
                      <SelectItem value="boys">Boys</SelectItem>
                      <SelectItem value="girls">Girls</SelectItem>
                      <SelectItem value="coed">Coed</SelectItem>
                      <SelectItem value="boys/coed">Boys/Coed</SelectItem>
                      <SelectItem value="girls/coed">Girls/Coed</SelectItem>
                      <SelectItem value="couple">Couple</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Special Requests</Label>
                  <Textarea
                    value={form.special_requests}
                    onChange={(e) => setForm((f) => ({ ...f, special_requests: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-background/95 border-t border-border/60 mt-2 -mx-8 px-8 py-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={createLead.isPending || !canAddLead}>
                  {createLead.isPending ? 'Creating...' : 'Create Lead'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddLeadDialog;
