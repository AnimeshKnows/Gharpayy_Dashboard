"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Building2, Video, Briefcase, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const zones = [
  { id: "z1", name: "Zone 1", area: "Area 1" },
  { id: "z2", name: "Zone 2", area: "Area 2" },
];

const teamMembers = [
  { id: "m1", name: "TCM One", role: "tcm", zoneId: "z1" },
  { id: "m2", name: "TCM Two", role: "tcm", zoneId: "z2" },
];

const allProperties = [
  { id: "p1", name: "Property A", zoneId: "z1", basePrice: 12000 },
  { id: "p2", name: "Property B", zoneId: "z2", basePrice: 15000 },
];

type BookingSource = "ad" | "referral" | "organic" | "whatsapp" | "call" | "walk-in";
type TourType = "physical" | "virtual" | "pre-book-pitch";
type WillBookToday = "yes" | "maybe" | "no";
type DecisionMaker = "self" | "parent" | "group";
type Intent = "soft" | "medium" | "hard";

interface TourQualification {
  moveInDate: string;
  decisionMaker: DecisionMaker;
  roomType: string;
  occupation: string;
  workLocation: string;
  willBookToday: WillBookToday;
  readyIn48h: boolean;
  exploring: boolean;
  comparing: boolean;
  needsFamily: boolean;
  keyConcern: string;
}

interface SelectedLead {
  id?: string;
  name?: string;
  phone?: string;
  budget?: string | number;
  preferredLocation?: string;
  occupation?: string;
  source?: string;
}

interface ScheduleTourFormProps {
  selectedLead?: SelectedLead | null;
  onScheduled?: () => void;
}

interface IntentFlag {
  key: "readyIn48h" | "exploring" | "comparing" | "needsFamily";
  label: string;
  kind: "positive" | "negative";
}

interface TourTypeOption {
  value: TourType;
  icon: ReactNode;
  label: string;
}

const intentBg: Record<Intent, string> = {
  soft: "bg-muted/40 border-muted",
  medium: "bg-amber-500/10 border-amber-500/40",
  hard: "bg-emerald-500/10 border-emerald-500/40",
};

const roomTypes = ["Single", "Double Sharing", "Triple Sharing", "Studio"];

const INTENT_FLAGS: IntentFlag[] = [
  { key: "readyIn48h", label: "Ready to finalize within 48 hours", kind: "positive" },
  { key: "exploring", label: "Only exploring", kind: "negative" },
  { key: "comparing", label: "Comparing options", kind: "negative" },
  { key: "needsFamily", label: "Needs family approval", kind: "negative" },
];

const TOUR_TYPE_OPTIONS: TourTypeOption[] = [
  { value: "physical", icon: <Building2 className="h-4 w-4" />, label: "Physical" },
  { value: "virtual", icon: <Video className="h-4 w-4" />, label: "Virtual" },
  { value: "pre-book-pitch", icon: <Briefcase className="h-4 w-4" />, label: "Pre-book" },
];

const todayStr = () => new Date().toISOString().split("T")[0];

const in7days = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
};

function normalizeSource(source?: string): BookingSource {
  switch ((source || "").toLowerCase()) {
    case "whatsapp":
      return "whatsapp";
    case "call":
    case "phone":
      return "call";
    case "referral":
      return "referral";
    case "organic":
      return "organic";
    case "walk-in":
    case "walkin":
      return "walk-in";
    default:
      return "whatsapp";
  }
}

function scoreTour(
  q: TourQualification,
  budget: number
): { score: number; intent: Intent; reason: string[] } {
  let score = 50;
  const reason: string[] = [];

  if (q.willBookToday === "yes") {
    score += 20;
    reason.push("Says will book today");
  } else if (q.willBookToday === "maybe") {
    score += 5;
    reason.push("Maybe will book today");
  } else {
    score -= 10;
    reason.push("Won't book today");
  }

  if (q.readyIn48h) {
    score += 10;
    reason.push("Ready within 48h");
  }
  if (q.exploring) {
    score -= 5;
    reason.push("Just exploring");
  }
  if (q.comparing) {
    score -= 5;
    reason.push("Comparing options");
  }
  if (q.needsFamily) {
    score -= 5;
    reason.push("Needs family approval");
  }
  if (budget >= 15000) {
    score += 5;
    reason.push("Good budget");
  }

  if (score > 80) return { score, intent: "hard", reason };
  if (score >= 60) return { score, intent: "medium", reason };
  return { score, intent: "soft", reason };
}

function inferConfirmationStrength(
  q: TourQualification
): "low" | "medium" | "high" {
  if (q.willBookToday === "yes" && q.readyIn48h && !q.exploring && !q.comparing) {
    return "high";
  }
  if (q.willBookToday === "maybe") return "medium";
  return "low";
}

function getTakenSlotsForDate(
  _tours: any[],
  _tcmId: string,
  _date: string
): Set<string> {
  return new Set<string>();
}

function autoAssignTcm(_tours: any[], zoneId: string, _intent: Intent) {
  const inZone = teamMembers.filter((m) => m.role === "tcm" && m.zoneId === zoneId);
  return inZone[0] ?? null;
}

function createInitialForm(selectedLead?: SelectedLead | null) {
  return {
    leadName: selectedLead?.name ?? "",
    phone: selectedLead?.phone ?? "",
    bookingSource: normalizeSource(selectedLead?.source),
    moveInDate: todayStr(),
    budget:
      selectedLead?.budget !== undefined && selectedLead?.budget !== null
        ? String(selectedLead.budget)
        : "12000",
    workLocation: selectedLead?.preferredLocation ?? "",
    occupation: selectedLead?.occupation ?? "",
    roomType: "Single",
    decisionMaker: "self" as DecisionMaker,
    readyIn48h: false,
    exploring: false,
    comparing: false,
    needsFamily: false,
    willBookToday: "maybe" as WillBookToday,
    keyConcern: "",
    tourType: "physical" as TourType,
    zoneId: zones[0].id,
    propertyName: "",
    tourDate: todayStr(),
    tourTime: "",
    assignedTo: "",
  };
}

export function ScheduleTourForm({
  selectedLead,
  onScheduled,
}: ScheduleTourFormProps) {
  const [tours, setTours] = useState<any[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState(() => createInitialForm(selectedLead));

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      leadName: selectedLead?.name ?? "",
      phone: selectedLead?.phone ?? "",
      bookingSource: normalizeSource(selectedLead?.source),
      budget:
        selectedLead?.budget !== undefined && selectedLead?.budget !== null
          ? String(selectedLead.budget)
          : prev.budget,
      workLocation: selectedLead?.preferredLocation ?? "",
      occupation: selectedLead?.occupation ?? "",
    }));
    setStep(1);
  }, [selectedLead]);

  const qualification: TourQualification = useMemo(
    () => ({
      moveInDate: form.moveInDate,
      decisionMaker: form.decisionMaker,
      roomType: form.roomType,
      occupation: form.occupation,
      workLocation: form.workLocation,
      willBookToday: form.willBookToday,
      readyIn48h: form.readyIn48h,
      exploring: form.exploring,
      comparing: form.comparing,
      needsFamily: form.needsFamily,
      keyConcern: form.keyConcern,
    }),
    [form]
  );

  const { score, intent, reason } = useMemo(
    () => scoreTour(qualification, parseInt(form.budget) || 0),
    [qualification, form.budget]
  );

  const confirmationStrength = useMemo(
    () => inferConfirmationStrength(qualification),
    [qualification]
  );

  const tcmsInZone = useMemo(
    () => teamMembers.filter((m) => m.role === "tcm" && m.zoneId === form.zoneId),
    [form.zoneId]
  );

  const effectiveTcm = useMemo(
    () =>
      form.assignedTo
        ? teamMembers.find((m) => m.id === form.assignedTo) ?? null
        : autoAssignTcm(tours, form.zoneId, intent),
    [form.assignedTo, form.zoneId, intent, tours]
  );

  const takenSlots = useMemo(
    () =>
      effectiveTcm
        ? getTakenSlotsForDate(tours, effectiveTcm.id, form.tourDate)
        : new Set<string>(),
    [tours, effectiveTcm, form.tourDate]
  );

  const canSubmit =
    !!form.leadName &&
    !!form.phone &&
    !!form.propertyName &&
    !!form.tourTime &&
    !!effectiveTcm;

  const handleSubmit = () => {
    if (!effectiveTcm) {
      toast.error("No TCM available");
      return;
    }

    if (!form.tourTime) {
      toast.error("Pick a slot");
      return;
    }

    const zone = zones.find((z) => z.id === form.zoneId);
    if (!zone) {
      toast.error("Invalid zone selected");
      return;
    }

    const newTour = {
      id: `t${Date.now()}`,
      leadId: selectedLead?.id ?? null,
      leadName: form.leadName,
      phone: form.phone,
      assignedTo: effectiveTcm.id,
      assignedToName: effectiveTcm.name,
      propertyName: form.propertyName,
      area: zone.area,
      zoneId: form.zoneId,
      tourDate: form.tourDate,
      tourTime: form.tourTime,
      bookingSource: form.bookingSource,
      scheduledBy: "you",
      scheduledByName: "You",
      leadType: intent === "hard" ? "urgent" : "future",
      status: "scheduled",
      showUp: null,
      outcome: null,
      remarks: "",
      budget: parseInt(form.budget) || 0,
      createdAt: new Date().toISOString(),
      tourType: form.tourType,
      intent,
      confidenceScore: score,
      confidenceReason: reason,
      confirmationStrength,
      qualification,
    };

    setTours((prev) => [newTour, ...prev]);
    toast.success(`${intent.toUpperCase()} tour assigned to ${effectiveTcm.name}`);

    setForm((prev) => ({
      ...createInitialForm(selectedLead),
      propertyName: "",
      tourTime: "",
      assignedTo: "",
    }));
    setStep(1);
    onScheduled?.();
  };

  const selectCls =
    "w-full h-10 bg-background border border-border rounded-md px-3 text-sm text-foreground";
  const labelCls = "text-muted-foreground text-[11px] uppercase tracking-wide";

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">
            Schedule Tour
          </h1>
          <p className="text-xs text-muted-foreground">
            Smart form — every tour scored before send
          </p>
        </div>

        <div className={cn("rounded-xl border p-3 min-w-[200px]", intentBg[intent])}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="h-3 w-3" />
            <span className="text-[10px] uppercase tracking-wide font-semibold">
              Live Score
            </span>
          </div>

          <div className="text-2xl font-bold tabular-nums">
            {score}
            <span className="text-xs text-muted-foreground">/100</span>
          </div>

          {reason.length > 0 ? (
            <p className="text-[10px] mt-1.5 leading-snug opacity-80">
              {reason.join(" · ")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex gap-1.5">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStep(n as 1 | 2 | 3)}
            className={cn(
              "flex-1 h-1.5 rounded-full transition-colors",
              step >= n ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      {step === 1 ? (
        <div className="rounded-xl border bg-card p-4 md:p-5 space-y-4">
          <h3 className="font-semibold text-sm text-foreground">
            1. Customer & Qualification
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className={labelCls}>Lead Name</Label>
              <Input
                value={form.leadName}
                onChange={(e) => setForm((f) => ({ ...f, leadName: e.target.value }))}
              />
            </div>

            <div>
              <Label className={labelCls}>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelCls}>Source</Label>
              <select
                value={form.bookingSource}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    bookingSource: e.target.value as BookingSource,
                  }))
                }
                className={selectCls}
              >
                <option value="ad">Ad</option>
                <option value="referral">Referral</option>
                <option value="organic">Organic</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="call">Call</option>
                <option value="walk-in">Walk-in</option>
              </select>
            </div>

            <div>
              <Label className={labelCls}>Decision Maker</Label>
              <select
                value={form.decisionMaker}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    decisionMaker: e.target.value as DecisionMaker,
                  }))
                }
                className={selectCls}
              >
                <option value="self">Self</option>
                <option value="parent">Parent</option>
                <option value="group">Group</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelCls}>Move-in Date</Label>
              <Input
                type="date"
                min={todayStr()}
                value={form.moveInDate}
                onChange={(e) => setForm((f) => ({ ...f, moveInDate: e.target.value }))}
              />
            </div>

            <div>
              <Label className={labelCls}>Budget (₹/mo)</Label>
              <Input
                type="number"
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelCls}>Work / College</Label>
              <Input
                value={form.occupation}
                onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))}
                placeholder="e.g. Infosys"
              />
            </div>

            <div>
              <Label className={labelCls}>Work Location</Label>
              <Input
                value={form.workLocation}
                onChange={(e) => setForm((f) => ({ ...f, workLocation: e.target.value }))}
                placeholder="e.g. Bellandur"
              />
            </div>
          </div>

          <div>
            <Label className={labelCls}>Room Type</Label>
            <select
              value={form.roomType}
              onChange={(e) => setForm((f) => ({ ...f, roomType: e.target.value }))}
              className={selectCls}
            >
              {roomTypes.map((roomType) => (
                <option key={roomType} value={roomType}>
                  {roomType}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={() => setStep(2)}
            disabled={!form.leadName || !form.phone}
            className="w-full"
          >
            Next: Intent →
          </Button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="rounded-xl border bg-card p-4 md:p-5 space-y-4">
          <h3 className="font-semibold text-sm text-foreground">
            2. Intent Signals
          </h3>

          <div className="space-y-2">
            {INTENT_FLAGS.map(({ key, label, kind }) => (
              <label
                key={key}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors",
                  form[key] &&
                    (kind === "positive"
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-amber-500/40 bg-amber-500/5")
                )}
              >
                <Checkbox
                  checked={form[key]}
                  onCheckedChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      [key]: v === true,
                    }))
                  }
                />
                <span className="text-sm text-foreground flex-1">{label}</span>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    kind === "positive" ? "text-emerald-600" : "text-amber-600"
                  )}
                >
                  {kind === "positive" ? "+" : "−"}
                </span>
              </label>
            ))}
          </div>

          <div className="pt-2 border-t border-border">
            <Label className="text-foreground text-sm font-semibold">
              If everything matches, will you book today?
            </Label>

            <div className="grid grid-cols-3 gap-2 mt-2">
              {(["yes", "maybe", "no"] as WillBookToday[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, willBookToday: opt }))}
                  className={cn(
                    "h-11 rounded-lg border-2 text-sm font-medium uppercase tracking-wide transition-all",
                    form.willBookToday === opt
                      ? opt === "yes"
                        ? "border-emerald-600 bg-emerald-500/10 text-emerald-700"
                        : opt === "no"
                          ? "border-rose-600 bg-rose-500/10 text-rose-700"
                          : "border-sky-600 bg-sky-500/10 text-sky-700"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className={labelCls}>Key Concern (optional)</Label>
            <Input
              value={form.keyConcern}
              onChange={(e) => setForm((f) => ({ ...f, keyConcern: e.target.value }))}
              placeholder="e.g. food, distance"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              ← Back
            </Button>
            <Button onClick={() => setStep(3)} className="flex-1">
              Next: Slot →
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="rounded-xl border bg-card p-4 md:p-5 space-y-4">
          <h3 className="font-semibold text-sm text-foreground">
            3. Tour Type & Slot
          </h3>

          <div>
            <Label className={labelCls}>Tour Type</Label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {TOUR_TYPE_OPTIONS.map(({ value, icon, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, tourType: value }))}
                  className={cn(
                    "h-14 rounded-lg border-2 text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all",
                    form.tourType === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/40 text-muted-foreground"
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelCls}>Zone</Label>
              <select
                value={form.zoneId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    zoneId: e.target.value,
                    assignedTo: "",
                  }))
                }
                className={selectCls}
              >
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className={labelCls}>Property</Label>
              <select
                value={form.propertyName}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    propertyName: e.target.value,
                  }))
                }
                className={selectCls}
              >
                <option value="">Select property…</option>
                {allProperties
                  .filter((property) => property.zoneId === form.zoneId)
                  .map((property) => (
                    <option key={property.id} value={property.name}>
                      {property.name} · ₹{(property.basePrice / 1000).toFixed(0)}k
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelCls}>Date</Label>
              <Input
                type="date"
                min={todayStr()}
                max={in7days()}
                value={form.tourDate}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tourDate: e.target.value,
                    tourTime: "",
                  }))
                }
              />
            </div>

            <div>
              <Label className={labelCls}>Assign TCM</Label>
              <select
                value={form.assignedTo}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    assignedTo: e.target.value,
                    tourTime: "",
                  }))
                }
                className={selectCls}
              >
                <option value="">
                  ⚡ Auto-assign ({effectiveTcm?.name ?? "—"})
                </option>
                {tcmsInZone.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label className={labelCls}>Pick Slot</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {["10:00", "11:30", "13:00", "16:00", "18:00"].map((slot) => {
                const disabled = takenSlots.has(slot);

                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={disabled}
                    onClick={() => setForm((f) => ({ ...f, tourTime: slot }))}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs border transition-colors",
                      disabled
                        ? "border-border text-muted-foreground/60 bg-muted/40 cursor-not-allowed"
                        : form.tourTime === slot
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/30 hover:bg-muted/50"
                    )}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
              ← Back
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-[2]">
              Schedule {intent.toUpperCase()} Tour
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}