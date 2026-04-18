"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  Clock,
  FileText,
  MapPin,
  Phone,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { format, isAfter, isBefore, isToday, parse, startOfDay } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToursState } from "@/contexts/ToursContext";
import { ToursMetricCard } from "@/components/tours/ToursMetricCard";
import {
  ToursOutcomeBadge,
  ToursStatusBadge,
} from "@/components/tours/ToursStatusBadge";
import type { Tour, TourOutcome } from "@/features/tours/types";
import { useVisits } from "@/hooks/useCrmData";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

function getId(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  const fromProps = String(value.id || value._id || "");
  if (fromProps) return fromProps;
  try {
    const raw = String(value);
    return raw === "[object Object]" ? "" : raw;
  } catch {
    return "";
  }
}

function extractMeta(notes: string, key: string) {
  const re = new RegExp(`${key}:([^;]+)`, "i");
  const match = notes.match(re);
  return match?.[1]?.trim() || "";
}

function safeDecode(value: string) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractScheduleRemarks(visit: any) {
  const fromField = String(visit?.scheduleRemarks || "").trim();
  if (fromField) return fromField;

  const notes = String(visit?.notes || "");
  const parsed = extractMeta(notes, "tour_remarks");
  if (!parsed) return "";
  return safeDecode(parsed);
}

type Intent = "hard" | "medium" | "soft";

type TcmTourItem = {
  id: string;
  leadName: string;
  leadPhone?: string;
  propertyName: string;
  area?: string;
  intent: Intent;
  scheduledAtRaw?: string;
  scheduledLabel: string;
  status: Tour["status"];
  showUp: Tour["showUp"];
  outcome: Tour["outcome"];
  remarks?: string;
  scheduleRemarks?: string;
  createdAt: string;
  isLocal: boolean;
};

function parseIntentFromNotes(notes: string): Intent {
  const parsed = extractMeta(notes, "intent").toLowerCase();
  if (parsed === "hard" || parsed === "medium" || parsed === "soft") return parsed;
  return "soft";
}

function buildDateLabel(input?: string) {
  if (!input) return "-";
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return "-";

  if (isToday(dt)) {
    return `Today, ${format(dt, "hh:mm a")}`;
  }

  const now = startOfDay(new Date());
  if (isAfter(dt, now)) {
    return format(dt, "dd MMM, hh:mm a");
  }

  return format(dt, "dd MMM, hh:mm a");
}

function parseLooseDateTime(value: string) {
  if (!value) return null;

  const patterns = [
    "yyyy-MM-dd HH:mm",
    "yyyy-MM-dd hh:mm a",
    "dd MMM HH:mm",
    "dd MMM hh:mm a",
    "dd MMM, HH:mm",
    "dd MMM, hh:mm a",
  ];

  for (const pattern of patterns) {
    const parsed = parse(value, pattern, new Date());
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const native = new Date(value);
  if (!Number.isNaN(native.getTime())) return native;

  return null;
}

function intentOrder(intent: Intent) {
  if (intent === "hard") return 0;
  if (intent === "medium") return 1;
  return 2;
}

function sortTours(list: TcmTourItem[]) {
  return [...list].sort((a, b) => {
    const byIntent = intentOrder(a.intent) - intentOrder(b.intent);
    if (byIntent !== 0) return byIntent;

    const aDate = a.scheduledAtRaw
      ? new Date(a.scheduledAtRaw)
      : parseLooseDateTime(a.scheduledLabel);
    const bDate = b.scheduledAtRaw
      ? new Date(b.scheduledAtRaw)
      : parseLooseDateTime(b.scheduledLabel);

    const aTime = aDate?.getTime() ?? 0;
    const bTime = bDate?.getTime() ?? 0;
    return aTime - bTime;
  });
}

function intentBadge(intent: Intent) {
  return cn(
    "rounded border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide",
    intent === "hard" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
    intent === "medium" && "border-amber-500/30 bg-amber-500/10 text-amber-700",
    intent === "soft" && "border-border bg-muted/40 text-muted-foreground"
  );
}

function QueueSection({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: "primary" | "danger" | "warning" | "muted";
  children: React.ReactNode;
}) {
  if (count === 0) return null;

  const toneClass =
    tone === "primary"
      ? "text-primary"
      : tone === "danger"
        ? "text-destructive"
        : tone === "warning"
          ? "text-warning"
          : "text-foreground";

  return (
    <div className="kpi-card p-3 md:p-5">
      <div className="mb-3 flex items-center gap-2">
        <h3 className={cn("text-xs md:text-sm font-semibold", toneClass)}>{title}</h3>
        <span className="text-[10px] text-muted-foreground">({count})</span>
      </div>
      <div className="grid gap-2 md:grid-cols-2">{children}</div>
    </div>
  );
}

function OutcomeInlineForm({
  tour,
  onSubmit,
  onClose,
}: {
  tour: TcmTourItem;
  onSubmit: (updates: Partial<Tour>) => void;
  onClose: () => void;
}) {
  const [remarks, setRemarks] = useState("");

  const save = (outcome: TourOutcome) => {
    onSubmit({ outcome, remarks });
    toast.success(`Outcome set to ${outcome}`);
    onClose();
  };

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-secondary/35 p-3">
      <Textarea
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder="Remarks — objections, feedback..."
        className="h-16 resize-none bg-background text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => save("draft")}
          className="h-8 bg-warning/20 text-warning hover:bg-warning/30"
        >
          Draft
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => save("follow-up")}
          className="h-8"
        >
          Follow-up
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => save("rejected")}
          className="h-8 text-destructive"
        >
          Rejected
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-8">
          Cancel
        </Button>
      </div>
    </div>
  );
}

function TourQueueCard({
  tour,
  onUpdate,
}: {
  tour: TcmTourItem;
  onUpdate: (id: string, updates: Partial<Tour>) => void;
}) {
  const [showOutcome, setShowOutcome] = useState(false);

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3 space-y-3 transition-all hover:border-primary/20 hover:shadow-sm",
        tour.intent === "hard" && "border-emerald-500/30",
        tour.intent === "medium" && "border-amber-500/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground">
              {tour.leadName}
            </span>
            <span className={intentBadge(tour.intent)}>{tour.intent}</span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {tour.leadPhone ? (
              <a
                href={`tel:${tour.leadPhone}`}
                className="inline-flex items-center gap-1 hover:text-primary"
              >
                <Phone className="h-3 w-3" />
                {tour.leadPhone}
              </a>
            ) : null}
            {tour.area ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {tour.area}
              </span>
            ) : null}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-xs font-medium text-foreground">{tour.scheduledLabel}</div>
          <div className="mt-1 flex justify-end">
            <ToursStatusBadge status={tour.status} />
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{tour.propertyName}</span>
      </div>

      {tour.scheduleRemarks ? (
        <div className="rounded-md bg-secondary/45 px-2.5 py-2 text-[11px] text-foreground/90">
          <span className="font-medium">Remarks:</span> {tour.scheduleRemarks}
        </div>
      ) : null}

      {tour.outcome ? (
        <div className="flex items-center gap-2">
          <ToursOutcomeBadge outcome={tour.outcome} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {tour.status === "scheduled" ? (
          <Button
            size="sm"
            onClick={() => onUpdate(tour.id, { status: "confirmed" })}
            className="h-8 text-xs"
          >
            Confirm
          </Button>
        ) : null}

        {tour.status === "confirmed" ? (
          <>
            <Button
              size="sm"
              onClick={() => onUpdate(tour.id, { status: "completed", showUp: true })}
              className="h-8 text-xs"
            >
              Mark Complete
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdate(tour.id, { status: "no-show", showUp: false })}
              className="h-8 text-xs text-destructive"
            >
              No Show
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdate(tour.id, { status: "cancelled" })}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
          </>
        ) : null}

        {tour.status === "completed" && !tour.outcome ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowOutcome((v) => !v)}
            className="h-8 text-xs"
          >
            Fill Outcome
          </Button>
        ) : null}
      </div>

      {showOutcome ? (
        <OutcomeInlineForm
          tour={tour}
          onClose={() => setShowOutcome(false)}
          onSubmit={(updates) => onUpdate(tour.id, updates)}
        />
      ) : null}
    </div>
  );
}

export function TCMPanel() {
  const { tours, updateTour } = useToursState();
  const { data: visits, isLoading: isVisitsLoading } = useVisits();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((v) => v + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const currentUserId = String(user?.id || "");

  const visitTours = useMemo(() => {
    const list = (visits || []) as any[];
    const currentUserName = String(user?.fullName || user?.username || "")
      .trim()
      .toLowerCase();

    const scoped = currentUserId
      ? list.filter((visit) => {
        const assignedId = getId(visit.members || visit.assignedStaffId);
        const notes = String(visit?.notes || "");
        const assignedMetaId = extractMeta(notes, "assigned_to_id");
        const assignedMetaName = extractMeta(notes, "assigned_to");

        if (assignedId && assignedId === currentUserId) return true;
        if (assignedMetaId && assignedMetaId === currentUserId) return true;
        if (!assignedId && !assignedMetaId && currentUserName && assignedMetaName) {
          return assignedMetaName.toLowerCase() === currentUserName;
        }

        return false;
      })
      : list;

    return scoped.map((visit) => {
      const outcome = String(visit?.outcome || "");
      const notes = String(visit?.notes || "");

      const status: Tour["status"] =
        outcome === "completed"
          ? "completed"
          : outcome === "no_show"
            ? "no-show"
            : outcome === "cancelled"
              ? "cancelled"
              : visit?.confirmed
                ? "confirmed"
                : "scheduled";

      const createdAt = String(
        visit?.createdAt || visit?.scheduledAt || new Date().toISOString()
      );

      const item: TcmTourItem = {
        id: String(visit.id || visit._id || ""),
        leadName: String(visit?.leads?.name || "Unknown Lead"),
        leadPhone: String(visit?.leads?.phone || ""),
        propertyName: String(visit?.properties?.name || "Unknown Property"),
        area: String(
          visit?.properties?.area ||
          visit?.properties?.zone?.name ||
          extractMeta(notes, "zone") ||
          ""
        ),
        intent: parseIntentFromNotes(notes),
        scheduledAtRaw: String(visit?.scheduledAt || ""),
        scheduledLabel: visit?.scheduledAt
          ? buildDateLabel(visit.scheduledAt)
          : "-",
        status,
        showUp: outcome === "completed" ? true : outcome === "no_show" ? false : null,
        outcome: null,
        remarks: String(visit?.notes || ""),
        scheduleRemarks: extractScheduleRemarks(visit),
        createdAt,
        isLocal: false,
      };

      return item;
    });
  }, [visits, currentUserId, user?.fullName, user?.username]);

  const localAssignedTours = useMemo(() => {
    const scoped = currentUserId
      ? tours.filter((tour) => String(tour.assignedTo || "") === currentUserId)
      : tours;

    return scoped.map(
      (tour) =>
        ({
          id: String(tour.id),
          leadName: String(tour.leadName || "Unknown Lead"),
          leadPhone: "",
          propertyName: String(tour.propertyName || "Unknown Property"),
          area: String(tour.area || ""),
          intent: "soft",
          scheduledAtRaw: "",
          scheduledLabel:
            tour.tourDate && tour.tourTime
              ? `${tour.tourDate} ${tour.tourTime}`
              : `${tour.tourDate || ""} ${tour.tourTime || ""}`.trim() || "-",
          status: tour.status,
          showUp: tour.showUp,
          outcome: tour.outcome,
          remarks: tour.remarks,
          scheduleRemarks: tour.remarks,
          createdAt: String(tour.createdAt || new Date().toISOString()),
          isLocal: true,
        }) satisfies TcmTourItem
    );
  }, [tours, currentUserId]);

  const myTours = useMemo(() => {
    const merged = new Map<string, TcmTourItem>();
    [...visitTours, ...localAssignedTours].forEach((tour) => merged.set(tour.id, tour));
    return Array.from(merged.values());
  }, [visitTours, localAssignedTours]);

  const sortedTours = useMemo(() => sortTours(myTours), [myTours]);

  const now = new Date();

  const toConfirm = useMemo(
    () => sortTours(sortedTours.filter((tour) => tour.status === "scheduled")),
    [sortedTours]
  );

  const missed = useMemo(
    () => sortTours(sortedTours.filter((tour) => tour.status === "no-show")),
    [sortedTours]
  );

  const needsOutcome = useMemo(
    () =>
      sortTours(
        sortedTours.filter((tour) => tour.status === "completed" && !tour.outcome)
      ),
    [sortedTours]
  );

  const draftPush = useMemo(
    () => sortTours(sortedTours.filter((tour) => tour.outcome === "draft")),
    [sortedTours]
  );

  const todayTours = useMemo(() => {
    return sortedTours.filter((tour) => {
      if (tour.scheduledAtRaw) {
        const dt = new Date(tour.scheduledAtRaw);
        return !Number.isNaN(dt.getTime()) && isToday(dt);
      }
      return false;
    });
  }, [sortedTours]);

  const upcoming = useMemo(() => {
    return sortedTours.filter((tour) => {
      const dt = tour.scheduledAtRaw ? new Date(tour.scheduledAtRaw) : null;
      if (!dt || Number.isNaN(dt.getTime())) return false;
      return (
        isAfter(dt, now) &&
        dt.getTime() - now.getTime() <= 2 * 60 * 60 * 1000 &&
        tour.status !== "completed" &&
        tour.status !== "cancelled"
      );
    });
  }, [sortedTours, now]);

  const pastTours = useMemo(() => {
    return sortedTours.filter((tour) => {
      const dt = tour.scheduledAtRaw ? new Date(tour.scheduledAtRaw) : null;
      if (!dt || Number.isNaN(dt.getTime())) return false;
      return isBefore(dt, now) && !isToday(dt);
    });
  }, [sortedTours, now]);

  const completed = myTours.filter((tour) => tour.status === "completed").length;
  const showUps = myTours.filter((tour) => tour.showUp === true).length;
  const drafts = myTours.filter((tour) => tour.outcome === "draft").length;

  const handleUpdateTour = async (tourId: string, updates: Partial<Tour>) => {
    const local = myTours.find((tour) => tour.id === tourId)?.isLocal;
    if (local) {
      updateTour(tourId, updates);
      return;
    }

    const payload: Record<string, any> = {};

    if (updates.status) {
      if (updates.status === "confirmed") payload.confirmed = true;
      if (updates.status === "completed") payload.outcome = "completed";
      if (updates.status === "no-show") payload.outcome = "no_show";
      if (updates.status === "cancelled") payload.outcome = "cancelled";
    }

    if (typeof updates.remarks === "string") payload.notes = updates.remarks;
    if (updates.outcome === "draft") payload.notes = updates.remarks || "draft";
    if (updates.outcome === "follow-up") payload.notes = updates.remarks || "follow-up";
    if (updates.outcome === "rejected") payload.notes = updates.remarks || "rejected";

    try {
      const res = await fetch(`/api/visits/${tourId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update visit");
      await qc.invalidateQueries({ queryKey: ["visits"] });
    } catch (error: any) {
      toast.error(error?.message || "Failed to update tour");
    }
  };

  const totalQueue =
    toConfirm.length + missed.length + needsOutcome.length + draftPush.length;

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-foreground">My Tours</h2>
        <p className="text-xs text-muted-foreground">
          Hard intent surfaced first for fast follow-up and closures
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <ToursMetricCard
          label="My Tours"
          value={myTours.length}
          tone="green"
          icon={<CalendarCheck className="h-4 w-4" />}
        />
        <ToursMetricCard
          label="Completed"
          value={completed}
          tone="green"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <ToursMetricCard
          label="Show-Up %"
          value={myTours.length ? `${Math.round((showUps / myTours.length) * 100)}%` : "0%"}
          tone={myTours.length && showUps / myTours.length >= 0.7 ? "green" : "red"}
        />
        <ToursMetricCard
          label="Drafts"
          value={drafts}
          tone="amber"
          icon={<FileText className="h-4 w-4" />}
        />
      </div>

      {upcoming.length > 0 ? (
        <div className="kpi-card border-info/35 p-3 md:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-info" />
            <h3 className="text-xs md:text-sm font-semibold text-info">
              Confirm in next 2 hours
            </h3>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {upcoming.map((tour) => (
              <TourQueueCard key={tour.id} tour={tour} onUpdate={handleUpdateTour} />
            ))}
          </div>
        </div>
      ) : null}

      <QueueSection
        title="Confirm Attendance"
        count={toConfirm.length}
        tone="primary"
      >
        {toConfirm.map((tour) => (
          <TourQueueCard key={tour.id} tour={tour} onUpdate={handleUpdateTour} />
        ))}
      </QueueSection>

      <QueueSection title="Missed — Follow Up" count={missed.length} tone="danger">
        {missed.map((tour) => (
          <TourQueueCard key={tour.id} tour={tour} onUpdate={handleUpdateTour} />
        ))}
      </QueueSection>

      <QueueSection
        title="Update Outcome"
        count={needsOutcome.length}
        tone="warning"
      >
        {needsOutcome.map((tour) => (
          <TourQueueCard key={tour.id} tour={tour} onUpdate={handleUpdateTour} />
        ))}
      </QueueSection>

      <QueueSection title="Draft Push" count={draftPush.length} tone="muted">
        {draftPush.map((tour) => (
          <TourQueueCard key={tour.id} tour={tour} onUpdate={handleUpdateTour} />
        ))}
      </QueueSection>

      {totalQueue === 0 ? (
        <div className="kpi-card p-8 text-center text-sm text-muted-foreground">
          All caught up! 🎉
        </div>
      ) : null}

      <div className="kpi-card p-3 md:p-5">
        <h3 className="mb-3 text-xs md:text-sm font-semibold text-foreground">
          Full Schedule
        </h3>

        <div className="space-y-2 md:hidden">
          {sortedTours.map((tour) => (
            <div key={tour.id} className="rounded-lg bg-secondary/35 p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{tour.leadName}</span>
                <span className="text-xs text-muted-foreground">{tour.scheduledLabel}</span>
              </div>

              <div className="mb-1 flex items-center gap-2">
                <span className={intentBadge(tour.intent)}>{tour.intent}</span>
                <ToursStatusBadge status={tour.status} />
                <ToursOutcomeBadge outcome={tour.outcome} />
              </div>

              <p className="text-xs text-muted-foreground">{tour.propertyName}</p>
              {tour.area ? (
                <p className="mt-1 text-[11px] text-muted-foreground">{tour.area}</p>
              ) : null}
              {tour.scheduleRemarks ? (
                <p className="mt-2 text-xs font-medium text-foreground/90">
                  Remarks: {tour.scheduleRemarks}
                </p>
              ) : null}

              <div className="mt-3 flex gap-1">
                {tour.status === "scheduled" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUpdateTour(tour.id, { status: "confirmed" })}
                    className="h-7 px-2 text-[10px]"
                  >
                    Confirm
                  </Button>
                ) : null}
                {tour.status === "confirmed" ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        handleUpdateTour(tour.id, {
                          status: "completed",
                          showUp: true,
                        })
                      }
                      className="h-7 px-2 text-[10px] text-success"
                    >
                      Show
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        handleUpdateTour(tour.id, {
                          status: "no-show",
                          showUp: false,
                        })
                      }
                      className="h-7 px-2 text-[10px] text-destructive"
                    >
                      No Show
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ))}

          {!isVisitsLoading && sortedTours.length === 0 ? (
            <p className="rounded-lg bg-secondary/20 p-3 text-center text-xs text-muted-foreground">
              No tours assigned to you yet.
            </p>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 text-left font-medium">Time</th>
                <th className="py-2 text-left font-medium">Lead</th>
                <th className="py-2 text-left font-medium">Property</th>
                <th className="py-2 text-left font-medium">Area</th>
                <th className="py-2 text-left font-medium">Remarks</th>
                <th className="py-2 text-left font-medium">Status</th>
                <th className="py-2 text-left font-medium">Outcome</th>
                <th className="py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedTours.map((tour) => (
                <tr
                  key={tour.id}
                  className="border-b border-border/60 hover:bg-secondary/20"
                >
                  <td className="py-2 text-muted-foreground">{tour.scheduledLabel}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{tour.leadName}</span>
                      <span className={intentBadge(tour.intent)}>{tour.intent}</span>
                    </div>
                  </td>
                  <td className="py-2 text-muted-foreground">{tour.propertyName}</td>
                  <td className="py-2 text-muted-foreground">{tour.area || "-"}</td>
                  <td
                    className="max-w-[240px] truncate py-2 text-muted-foreground"
                    title={tour.scheduleRemarks || ""}
                  >
                    {tour.scheduleRemarks || "-"}
                  </td>
                  <td className="py-2">
                    <ToursStatusBadge status={tour.status} />
                  </td>
                  <td className="py-2">
                    <ToursOutcomeBadge outcome={tour.outcome} />
                  </td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      {tour.status === "scheduled" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleUpdateTour(tour.id, { status: "confirmed" })
                          }
                          className="h-7 text-xs"
                        >
                          Confirm
                        </Button>
                      ) : null}
                      {tour.status === "confirmed" ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleUpdateTour(tour.id, {
                                status: "completed",
                                showUp: true,
                              })
                            }
                            className="h-7 text-xs text-success"
                          >
                            Show
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleUpdateTour(tour.id, {
                                status: "no-show",
                                showUp: false,
                              })
                            }
                            className="h-7 text-xs text-destructive"
                          >
                            No Show
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}

              {!isVisitsLoading && sortedTours.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-xs text-muted-foreground">
                    No tours assigned to you yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {todayTours.length > 0 || pastTours.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
            <span>Today: {todayTours.length}</span>
            <span>Past: {pastTours.length}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}