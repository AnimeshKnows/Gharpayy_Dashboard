"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  CalendarCheck,
  FileText,
  Phone,
  Sparkles,
  TrendingUp,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { useToursState } from "@/contexts/ToursContext";
import { ToursMetricCard } from "@/components/tours/ToursMetricCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { TourMode } from "@/features/tours/types";
import {
  useAgents,
  useAllVisibleLeads,
  useCreateVisit,
  useOfficeZones,
  useProperties,
  useVisits,
} from "@/hooks/useCrmData";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type WillBookToday = "yes" | "maybe" | "no";
type DecisionMaker = "self" | "parent" | "group";
type SmartTourType = "physical" | "virtual" | "pre-book-pitch";
type Intent = "soft" | "medium" | "hard";

function objectIdLike() {
  const seed = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  return seed.padEnd(24, "0").slice(0, 24);
}

function extractTypedProperty(notes: string) {
  const match = notes.match(/typed_property:([^;]+)/i);
  return match?.[1]?.trim() || "";
}

function extractMeta(notes: string, key: string) {
  const re = new RegExp(`${key}:([^;]+)`, "i");
  const match = notes.match(re);
  return match?.[1]?.trim() || "";
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function in7days() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

function normalizeSource(source?: string): string {
  const value = String(source || "").toLowerCase();
  if (value.includes("whatsapp")) return "whatsapp";
  if (value.includes("call") || value.includes("phone")) return "call";
  if (value.includes("referral")) return "referral";
  if (value.includes("organic")) return "organic";
  if (value.includes("walk")) return "walk-in";
  if (value.includes("ad")) return "ad";
  return "whatsapp";
}

function normalizeTourMode(mode: SmartTourType): TourMode {
  return mode === "virtual" ? "virtual" : "physical";
}

function scoreLeadIntent(params: {
  budget: number;
  readyIn48h: boolean;
  exploring: boolean;
  comparing: boolean;
  needsFamily: boolean;
  willBookToday: WillBookToday;
}) {
  let score = 50;
  const reason: string[] = [];

  if (params.willBookToday === "yes") {
    score += 20;
    reason.push("Will book today");
  } else if (params.willBookToday === "maybe") {
    score += 6;
    reason.push("May book today");
  } else {
    score -= 8;
    reason.push("Not booking today");
  }

  if (params.readyIn48h) {
    score += 12;
    reason.push("Move fast");
  }
  if (params.exploring) {
    score -= 6;
    reason.push("Exploring");
  }
  if (params.comparing) {
    score -= 5;
    reason.push("Comparing");
  }
  if (params.needsFamily) {
    score -= 6;
    reason.push("Needs family approval");
  }
  if (params.budget >= 15000) {
    score += 6;
    reason.push("Budget aligned");
  }

  const intent: Intent = score > 80 ? "hard" : score >= 60 ? "medium" : "soft";
  return { score: Math.max(0, Math.min(score, 100)), intent, reason };
}

const intentBg: Record<Intent, string> = {
  soft: "bg-muted/40 border-muted",
  medium: "bg-amber-500/10 border-amber-500/30",
  hard: "bg-emerald-500/10 border-emerald-500/30",
};

const roomTypes = ["Single", "Double Sharing", "Triple Sharing", "Studio"] as const;

export function FlowOpsPanel() {
  const { tours } = useToursState();
  const { data: officeZones } = useOfficeZones();
  const { data: members } = useAgents();
  const { data: leads } = useAllVisibleLeads();
  const { data: properties } = useProperties();
  const { data: visits, isLoading: isVisitsLoading } = useVisits();
  const createVisit = useCreateVisit();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);

  const [leadId, setLeadId] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  const [showLeadOptions, setShowLeadOptions] = useState(false);
  const [phone, setPhone] = useState("");

  const [propertyName, setPropertyName] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [tourDate, setTourDate] = useState(todayStr());
  const [tourTime, setTourTime] = useState("11:00");
  const [tourMode, setTourMode] = useState<TourMode>("physical");
  const [smartTourType, setSmartTourType] = useState<SmartTourType>("physical");

  const [assignedTo, setAssignedTo] = useState("");
  const [assignedSearch, setAssignedSearch] = useState("");
  const [showAssignedOptions, setShowAssignedOptions] = useState(false);

  const [budget, setBudget] = useState("12000");
  const [remarks, setRemarks] = useState("");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [bookingSource, setBookingSource] = useState("whatsapp");
  const [decisionMaker, setDecisionMaker] = useState<DecisionMaker>("self");
  const [moveInDate, setMoveInDate] = useState(todayStr());
  const [workLocation, setWorkLocation] = useState("");
  const [occupation, setOccupation] = useState("");
  const [roomType, setRoomType] = useState<(typeof roomTypes)[number]>("Single");
  const [readyIn48h, setReadyIn48h] = useState(false);
  const [exploring, setExploring] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [needsFamily, setNeedsFamily] = useState(false);
  const [willBookToday, setWillBookToday] = useState<WillBookToday>("maybe");
  const [keyConcern, setKeyConcern] = useState("");

  const myVisits = useMemo(() => {
    const list = (visits || []) as any[];
    const currentUserId = String(user?.id || "");
    if (!currentUserId) return [];

    return list.filter((visit) => {
      const notes = String(visit?.notes || "");
      const scheduledById = extractMeta(notes, "scheduled_by_id");
      return scheduledById === currentUserId;
    });
  }, [visits, user?.id]);

  const visitTours = useMemo(() => {
    return myVisits
      .map((visit) => {
        const outcome = String(visit?.outcome || "");
        const notes = String(visit?.notes || "");
        const typedProperty = extractTypedProperty(notes);

        const status =
          outcome === "completed"
            ? "completed"
            : outcome === "no_show"
              ? "no-show"
              : outcome === "cancelled"
                ? "cancelled"
                : outcome === "rescheduled"
                  ? "rescheduled"
                  : visit?.confirmed
                    ? "confirmed"
                    : "scheduled";

        return {
          id: String(visit.id || visit._id || ""),
          leadName: String(visit?.leads?.name || "Unknown Lead"),
          propertyName: String(
            visit?.properties?.name || typedProperty || "Property Pending"
          ),
          createdAt: visit?.createdAt || visit?.scheduledAt || new Date().toISOString(),
          tourTime: visit?.scheduledAt
            ? new Date(visit.scheduledAt).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "-",
          status,
          showUp: outcome === "completed" ? true : outcome === "no_show" ? false : null,
          outcome: null,
        };
      })
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [myVisits]);

  const localScheduledTours = useMemo(() => {
    const currentUserId = String(user?.id || "");
    return tours
      .filter((tour) => {
        const isLocallyCreated = String(tour.id || "").startsWith("t-");
        const sameScheduler = currentUserId
          ? String(tour.scheduledBy || "") === currentUserId
          : String(tour.scheduledBy || "") === "system";
        return isLocallyCreated && sameScheduler;
      })
      .map((tour) => ({
        id: String(tour.id),
        leadName: String(tour.leadName || "Unknown Lead"),
        propertyName: String(tour.propertyName || "Unknown Property"),
        createdAt: tour.createdAt || new Date().toISOString(),
        tourTime: `${tour.tourDate || ""} ${tour.tourTime || ""}`.trim() || "-",
        status: String(tour.status || "scheduled"),
        showUp: tour.showUp,
        outcome: tour.outcome,
      }));
  }, [tours, user?.id]);

  const myTours = useMemo(() => {
    const byId = new Map<string, any>();
    [...visitTours, ...localScheduledTours].forEach((tour) => {
      byId.set(String(tour.id), tour);
    });
    return Array.from(byId.values()).sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt))
    );
  }, [visitTours, localScheduledTours]);

  const showUps = myTours.filter((tour) => tour.showUp === true).length;
  const drafts = myTours.filter(
    (tour) => tour.status === "rescheduled" || tour.outcome === "draft"
  ).length;
  const pending = myTours.filter((tour) => tour.status === "scheduled").length;

  const memberOptions = useMemo(
    () =>
      (members || [])
        .map((member: any) => ({
          id: String(member?.id || member?._id || ""),
          name: String(member?.name || member?.fullName || "").trim(),
        }))
        .filter((member: { id: string; name: string }) => member.id && member.name),
    [members]
  );

  const zoneOptions = useMemo(
    () =>
      (officeZones || [])
        .map((zone: any) => ({
          id: String(zone?._id || zone?.id || ""),
          name: String(zone?.name || "").trim(),
        }))
        .filter((zone: { id: string; name: string }) => zone.id && zone.name),
    [officeZones]
  );

  const leadOptions = useMemo(
    () =>
      (leads || []).map((lead: any) => ({
        id: String(lead.id || lead._id),
        name: String(lead.name || ""),
        phone: String(lead.phone || ""),
        budget: lead?.budget,
        preferredLocation: String(
          lead?.preferredLocation || lead?.workLocation || lead?.location || ""
        ),
        occupation: String(lead?.occupation || lead?.work || lead?.company || ""),
        source: String(lead?.source || ""),
      })),
    [leads]
  );

  const propertyOptions = useMemo(
    () =>
      (properties || []).map((property: any) => ({
        id: String(property?.id || property?._id || ""),
        name: String(property?.name || ""),
        zoneId: String(property?.zoneId || property?.zone?._id || property?.zone || ""),
        zoneName: String(property?.zoneName || property?.zone?.name || ""),
        area: String(property?.area || ""),
        basePrice: Number(property?.basePrice || property?.price || 0),
      })),
    [properties]
  );

  useEffect(() => {
    if (!zoneId && zoneOptions.length > 0) {
      setZoneId(zoneOptions[0].id);
    }
  }, [zoneId, zoneOptions]);

  useEffect(() => {
    if (!assignedTo) return;
    const selected = memberOptions.find((member) => member.id === assignedTo);
    if (selected) {
      setAssignedSearch(selected.name);
    }
  }, [assignedTo, memberOptions]);

  const filteredMemberOptions = useMemo(() => {
    const q = assignedSearch.trim().toLowerCase();
    if (!q) return memberOptions.slice(0, 8);
    return memberOptions
      .filter((member) => member.name.toLowerCase().includes(q))
      .slice(0, 12);
  }, [assignedSearch, memberOptions]);

  const filteredLeadOptions = useMemo(() => {
    const q = leadSearch.trim().toLowerCase();
    if (!q) return leadOptions.slice(0, 12);
    return leadOptions
      .filter(
        (lead) =>
          lead.name.toLowerCase().includes(q) || lead.phone.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [leadSearch, leadOptions]);

  const filteredPropertyOptions = useMemo(() => {
    const zoneAware = zoneId
      ? propertyOptions.filter(
          (property) =>
            property.zoneId === zoneId ||
            property.zoneName.toLowerCase() ===
              (zoneOptions.find((z) => z.id === zoneId)?.name || "").toLowerCase()
        )
      : propertyOptions;

    return zoneAware;
  }, [propertyOptions, zoneId, zoneOptions]);

  const selectedLead = useMemo(
    () => leadOptions.find((lead) => lead.id === leadId) || null,
    [leadId, leadOptions]
  );

  const selectedProperty = useMemo(
    () =>
      filteredPropertyOptions.find(
        (property) => property.name.toLowerCase() === propertyName.trim().toLowerCase()
      ) || null,
    [filteredPropertyOptions, propertyName]
  );

  useEffect(() => {
    if (!selectedLead) return;
    setPhone(String(selectedLead.phone || ""));
    if (selectedLead.budget !== undefined && selectedLead.budget !== null) {
      setBudget(String(selectedLead.budget));
    }
    if (selectedLead.preferredLocation) {
      setWorkLocation(selectedLead.preferredLocation);
    }
    if (selectedLead.occupation) {
      setOccupation(selectedLead.occupation);
    }
    if (selectedLead.source) {
      setBookingSource(normalizeSource(selectedLead.source));
    }
  }, [selectedLead]);

  useEffect(() => {
    if (!selectedProperty) return;
    if (selectedProperty.basePrice > 0 && (!budget || budget === "12000")) {
      setBudget(String(selectedProperty.basePrice));
    }
  }, [selectedProperty, budget]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const shouldOpen = params.get("openSchedule") === "1";
    if (!shouldOpen) return;

    const qsLeadId = String(params.get("leadId") || "").trim();
    const qsLeadName = String(params.get("leadName") || "").trim();
    const qsPhone = String(params.get("phone") || "").trim();
    const qsZone = String(params.get("zone") || "").trim();

    if (qsLeadId) setLeadId(qsLeadId);
    if (qsLeadName || qsPhone) {
      setLeadSearch(`${qsLeadName}${qsPhone ? ` - ${qsPhone}` : ""}`.trim());
    }
    if (qsPhone) setPhone(qsPhone);
    if (qsZone) {
      const zoneMatch = zoneOptions.find(
        (z) => z.name.toLowerCase() === qsZone.toLowerCase()
      );
      if (zoneMatch) setZoneId(zoneMatch.id);
    }
    setOpen(true);
  }, [zoneOptions]);

  const handleLeadSearchChange = (nextValue: string) => {
    setLeadSearch(nextValue);
    setLeadId("");
    setShowLeadOptions(true);
  };

  const handleLeadSelect = (lead: {
    id: string;
    name: string;
    phone: string;
    budget?: string | number;
    preferredLocation?: string;
    occupation?: string;
    source?: string;
  }) => {
    setLeadId(lead.id);
    setLeadSearch(`${lead.name}${lead.phone ? ` - ${lead.phone}` : ""}`);
    setPhone(String(lead.phone || ""));
    if (lead.budget !== undefined && lead.budget !== null) {
      setBudget(String(lead.budget));
    }
    if (lead.preferredLocation) setWorkLocation(lead.preferredLocation);
    if (lead.occupation) setOccupation(lead.occupation);
    if (lead.source) setBookingSource(normalizeSource(lead.source));
    setShowLeadOptions(false);
  };

  const handleAssignedSearchChange = (nextValue: string) => {
    setAssignedSearch(nextValue);
    const matched = memberOptions.find(
      (member) => member.name.toLowerCase() === nextValue.trim().toLowerCase()
    );
    setAssignedTo(matched?.id || "");
    setShowAssignedOptions(true);
  };

  const handleAssignedSelect = (member: { id: string; name: string }) => {
    setAssignedTo(member.id);
    setAssignedSearch(member.name);
    setShowAssignedOptions(false);
  };

  const resetForm = () => {
    setLeadId("");
    setLeadSearch("");
    setShowLeadOptions(false);
    setPhone("");
    setPropertyName("");
    setZoneId(zoneOptions[0]?.id || "");
    setTourDate(todayStr());
    setTourTime("11:00");
    setTourMode("physical");
    setSmartTourType("physical");
    setAssignedTo(memberOptions[0]?.id || "");
    setAssignedSearch(memberOptions[0]?.name || "");
    setBudget("12000");
    setRemarks("");
    setStep(1);

    setBookingSource("whatsapp");
    setDecisionMaker("self");
    setMoveInDate(todayStr());
    setWorkLocation("");
    setOccupation("");
    setRoomType("Single");
    setReadyIn48h(false);
    setExploring(false);
    setComparing(false);
    setNeedsFamily(false);
    setWillBookToday("maybe");
    setKeyConcern("");
  };

  const { score, intent, reason } = useMemo(
    () =>
      scoreLeadIntent({
        budget: Number(budget) || 0,
        readyIn48h,
        exploring,
        comparing,
        needsFamily,
        willBookToday,
      }),
    [budget, readyIn48h, exploring, comparing, needsFamily, willBookToday]
  );

  const canGoStep2 = !!leadSearch.trim() && !!phone.trim();
  const canGoStep3 = true;
  const canSchedule =
    !!leadId &&
    !!propertyName.trim() &&
    !!zoneId &&
    !!tourDate &&
    !!tourTime &&
    !!assignedTo;

  const handleScheduleTour = async () => {
    if (!leadId || !propertyName.trim() || !zoneId || !tourDate || !tourTime || !assignedTo) {
      toast.error("Please fill all required fields");
      return;
    }

    const assignedMember = memberOptions.find((m) => m.id === assignedTo);
    const zone = zoneOptions.find((z) => z.id === zoneId);

    if (!assignedMember || !zone) {
      toast.error("Invalid zone or assigned TCM member");
      return;
    }

    const selectedLeadAny = (leads || []).find(
      (lead: any) => String(lead.id || lead._id) === leadId
    ) as any;

    const fallbackPropertyId =
      String(selectedProperty?.id || "") ||
      String((properties || [])[0]?.id || (properties || [])[0]?._id || "") ||
      String(selectedLeadAny?.properties?.id || selectedLeadAny?.properties?._id || "") ||
      String(selectedLeadAny?.propertyId || "") ||
      objectIdLike();

    try {
      const scheduledAt = new Date(`${tourDate}T${tourTime}:00`);

      const encodedConcern = keyConcern ? encodeURIComponent(keyConcern) : "";
      const encodedOccupation = occupation ? encodeURIComponent(occupation) : "";
      const encodedWorkLocation = workLocation ? encodeURIComponent(workLocation) : "";
      const encodedRoomType = roomType ? encodeURIComponent(roomType) : "";
      const encodedDecisionMaker = decisionMaker
        ? encodeURIComponent(decisionMaker)
        : "";
      const encodedWillBookToday = willBookToday
        ? encodeURIComponent(willBookToday)
        : "";
      const encodedReason = reason.join(" | ")
        ? encodeURIComponent(reason.join(" | "))
        : "";

      await createVisit.mutateAsync({
        leadId,
        propertyId: fallbackPropertyId,
        assignedStaffId: assignedMember.id,
        scheduledAt: scheduledAt.toISOString(),
        lead_id: leadId,
        property_id: fallbackPropertyId,
        assigned_staff_id: assignedMember.id,
        scheduled_at: scheduledAt.toISOString(),
        scheduleRemarks: remarks.trim() || null,
        notes: [
          `tour_mode:${normalizeTourMode(smartTourType)}`,
          `tour_type:${smartTourType}`,
          `zone:${zone.name}`,
          `budget:${Number(budget) || 0}`,
          `scheduled_by:${user?.fullName || user?.username || "system"}`,
          `scheduled_by_id:${String(user?.id || "")}`,
          `assigned_to:${assignedMember.name}`,
          `assigned_to_id:${assignedMember.id}`,
          `typed_property:${propertyName.trim()}`,
          `booking_source:${bookingSource}`,
          `move_in_date:${moveInDate}`,
          `decision_maker:${encodedDecisionMaker}`,
          `occupation:${encodedOccupation}`,
          `work_location:${encodedWorkLocation}`,
          `room_type:${encodedRoomType}`,
          `ready_in_48h:${readyIn48h ? "yes" : "no"}`,
          `exploring:${exploring ? "yes" : "no"}`,
          `comparing:${comparing ? "yes" : "no"}`,
          `needs_family:${needsFamily ? "yes" : "no"}`,
          `will_book_today:${encodedWillBookToday}`,
          `key_concern:${encodedConcern}`,
          `intent:${intent}`,
          `score:${score}`,
          `score_reason:${encodedReason}`,
        ].join("; "),
        phone,
      });

      toast.success("Tour scheduled successfully");
      setOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.message || "Failed to schedule tour");
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-foreground">
            Flow Ops Dashboard
          </h2>
          <p className="text-xs text-muted-foreground">
            Scheduling performance and tours booked by flow ops
          </p>
        </div>

        <Button size="sm" className="h-8 text-xs" onClick={() => setOpen(true)}>
          Schedule Tour
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <ToursMetricCard
          label="My Tours"
          value={myTours.length}
          tone="blue"
          icon={<CalendarCheck className="h-4 w-4" />}
        />
        <ToursMetricCard
          label="Pending"
          value={pending}
          tone="amber"
          icon={<Phone className="h-4 w-4" />}
        />
        <ToursMetricCard
          label="Show-Ups"
          value={showUps}
          tone="green"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <ToursMetricCard
          label="Drafts"
          value={drafts}
          tone="amber"
          icon={<FileText className="h-4 w-4" />}
        />
      </div>

      <div className="kpi-card p-3 md:p-5">
        <h3 className="mb-3 text-xs md:text-sm font-semibold text-foreground">
          Tours I Scheduled
        </h3>

        <div className="space-y-2">
          {isVisitsLoading ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Loading tours...
            </p>
          ) : null}

          {myTours.map((tour) => (
            <div
              key={tour.id}
              className="flex flex-col gap-1.5 rounded-lg bg-secondary/35 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <span className="text-sm font-medium text-foreground">
                  {tour.leadName}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {tour.propertyName}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">{tour.tourTime}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] capitalize ${
                    tour.status === "completed"
                      ? "bg-success/15 text-success"
                      : tour.status === "confirmed"
                        ? "bg-info/15 text-info"
                        : tour.status === "no-show" || tour.status === "cancelled"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-warning/15 text-warning"
                  }`}
                >
                  {tour.status}
                </span>
              </div>
            </div>
          ))}

          {!isVisitsLoading && myTours.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No tours assigned to this flow ops member.
            </p>
          ) : null}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Schedule Tour</DialogTitle>
            <DialogDescription>
              Smart form — every tour scored before send.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-foreground">
                  Schedule Tour
                </h3>
                <p className="text-xs text-muted-foreground">
                  Multi-step qualification before assignment
                </p>
              </div>

              <div
                className={cn(
                  "rounded-xl border p-3 min-w-[220px]",
                  intentBg[intent]
                )}
              >
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
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      intent === "hard"
                        ? "bg-emerald-500"
                        : intent === "medium"
                          ? "bg-amber-500"
                          : "bg-slate-400"
                    )}
                    style={{ width: `${Math.min(score, 100)}%` }}
                  />
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
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Lead Name
                    </Label>
                    <div className="relative">
                      <Input
                        value={leadSearch}
                        onChange={(e) => handleLeadSearchChange(e.target.value)}
                        onFocus={() => setShowLeadOptions(true)}
                        onBlur={() => setTimeout(() => setShowLeadOptions(false), 120)}
                        placeholder="Type lead name or phone..."
                      />
                      {showLeadOptions && filteredLeadOptions.length > 0 ? (
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-44 overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
                          {filteredLeadOptions.map((lead) => (
                            <button
                              key={lead.id}
                              type="button"
                              className="w-full rounded-sm px-2 py-1.5 text-left text-xs text-popover-foreground hover:bg-accent/20"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleLeadSelect(lead)}
                            >
                              {lead.name}
                              {lead.phone ? ` - ${lead.phone}` : ""}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Phone
                    </Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Source
                    </Label>
                    <select
                      value={bookingSource}
                      onChange={(e) => setBookingSource(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="ad">Ad</option>
                      <option value="referral">Referral</option>
                      <option value="organic">Organic</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="call">Call</option>
                      <option value="walk-in">Walk-in</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Decision Maker
                    </Label>
                    <select
                      value={decisionMaker}
                      onChange={(e) =>
                        setDecisionMaker(e.target.value as DecisionMaker)
                      }
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="self">Self</option>
                      <option value="parent">Parent</option>
                      <option value="group">Group</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Move-in Date
                    </Label>
                    <Input
                      type="date"
                      min={todayStr()}
                      value={moveInDate}
                      onChange={(e) => setMoveInDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Budget (₹/mo)
                    </Label>
                    <Input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Work / College
                    </Label>
                    <Input
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      placeholder="e.g. Infosys"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Work Location
                    </Label>
                    <Input
                      value={workLocation}
                      onChange={(e) => setWorkLocation(e.target.value)}
                      placeholder="e.g. Bellandur"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Room Type
                  </Label>
                  <select
                    value={roomType}
                    onChange={(e) =>
                      setRoomType(e.target.value as (typeof roomTypes)[number])
                    }
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {roomTypes.map((room) => (
                      <option key={room} value={room}>
                        {room}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={() => setStep(2)}
                  disabled={!canGoStep2}
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
                  {[
                    {
                      key: "readyIn48h",
                      label: "Ready to finalize within 48 hours",
                      checked: readyIn48h,
                      setChecked: setReadyIn48h,
                      positive: true,
                    },
                    {
                      key: "exploring",
                      label: "Only exploring",
                      checked: exploring,
                      setChecked: setExploring,
                      positive: false,
                    },
                    {
                      key: "comparing",
                      label: "Comparing options",
                      checked: comparing,
                      setChecked: setComparing,
                      positive: false,
                    },
                    {
                      key: "needsFamily",
                      label: "Needs family approval",
                      checked: needsFamily,
                      setChecked: setNeedsFamily,
                      positive: false,
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors",
                        item.checked &&
                          (item.positive
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : "border-amber-500/40 bg-amber-500/5")
                      )}
                    >
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={(v) => item.setChecked(v === true)}
                      />
                      <span className="text-sm text-foreground flex-1">
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-medium",
                          item.positive ? "text-emerald-600" : "text-amber-600"
                        )}
                      >
                        {item.positive ? "+" : "−"}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="pt-2 border-t border-border">
                  <Label className="text-foreground text-sm font-semibold">
                    If everything matches, will this lead book today?
                  </Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {(["yes", "maybe", "no"] as WillBookToday[]).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setWillBookToday(opt)}
                        className={cn(
                          "h-11 rounded-lg border-2 text-sm font-medium uppercase tracking-wide transition-all",
                          willBookToday === opt
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

                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Key Concern
                  </Label>
                  <Input
                    value={keyConcern}
                    onChange={(e) => setKeyConcern(e.target.value)}
                    placeholder="e.g. food quality, location, sharing preference"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Remarks
                  </Label>
                  <Input
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Any context for assigned person"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
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
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Tour Type
                  </Label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {[
                      {
                        value: "physical" as SmartTourType,
                        label: "Physical",
                        icon: <Building2 className="h-4 w-4" />,
                      },
                      {
                        value: "virtual" as SmartTourType,
                        label: "Virtual",
                        icon: <Video className="h-4 w-4" />,
                      },
                      {
                        value: "pre-book-pitch" as SmartTourType,
                        label: "Pre-book",
                        icon: <Briefcase className="h-4 w-4" />,
                      },
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          setSmartTourType(type.value);
                          setTourMode(normalizeTourMode(type.value));
                        }}
                        className={cn(
                          "h-14 rounded-lg border-2 text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all",
                          smartTourType === type.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted/40 text-muted-foreground"
                        )}
                      >
                        {type.icon}
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Zone
                    </Label>
                    <select
                      value={zoneId}
                      onChange={(e) => {
                        setZoneId(e.target.value);
                        setAssignedTo("");
                        setAssignedSearch("");
                        setPropertyName("");
                      }}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {zoneOptions.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Property
                    </Label>
                    <select
                      value={propertyName}
                      onChange={(e) => setPropertyName(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Select property…</option>
                      {filteredPropertyOptions.map((property) => (
                        <option key={property.id} value={property.name}>
                          {property.name}
                          {property.basePrice ? ` · ₹${Math.round(property.basePrice / 1000)}k` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Date
                    </Label>
                    <Input
                      type="date"
                      min={todayStr()}
                      max={in7days()}
                      value={tourDate}
                      onChange={(e) => setTourDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Assign TCM
                    </Label>
                    <div className="relative">
                      <Input
                        value={assignedSearch}
                        onChange={(e) => handleAssignedSearchChange(e.target.value)}
                        onFocus={() => setShowAssignedOptions(true)}
                        onBlur={() =>
                          setTimeout(() => setShowAssignedOptions(false), 120)
                        }
                        placeholder="Type member name..."
                      />
                      {showAssignedOptions && filteredMemberOptions.length > 0 ? (
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-44 overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
                          {filteredMemberOptions.map((member) => (
                            <button
                              key={member.id}
                              type="button"
                              className="w-full rounded-sm px-2 py-1.5 text-left text-xs text-popover-foreground hover:bg-accent/20"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleAssignedSelect(member)}
                            >
                              {member.name}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Tour Time
                  </Label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {["10:00", "11:30", "13:00", "16:00", "18:00"].map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setTourTime(slot)}
                        className={cn(
                          "px-3 py-2 rounded-full text-xs border transition-colors",
                          tourTime === slot
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted/30 hover:bg-muted/50"
                        )}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1"
                  >
                    ← Back
                  </Button>
                  <Button
                    onClick={handleScheduleTour}
                    disabled={!canSchedule || createVisit.isPending}
                    className="flex-[2]"
                  >
                    {createVisit.isPending
                      ? "Scheduling..."
                      : `Schedule ${intent.toUpperCase()} Tour`}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}