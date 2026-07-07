"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCcw, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  bulkCreatePosts,
  deleteGrillaDraft,
  getGrillaDraft,
  saveGrillaDraft,
} from "@/lib/actions";
import { buildGrillaPeriodKey, type GrillaDraftPayload } from "@/lib/grilla-draft";
import {
  createSlot,
  currentMonthValue,
  currentQuincena,
  daysInMonth,
  daysInQuincena,
  daysInWeek,
  formatDayLabel,
  formatShortLabel,
  getMondayOfDate,
  monthLabel,
  quincenaLabel,
  rebuildSlotsForDates,
  shiftMonth,
  shiftQuincena,
  shiftWeek,
  slotHasContent,
  slotToBulkInput,
  titleFromCopy,
  weekRangeLabel,
  type GrillaPeriod,
  type GrillaSlot,
  type QuincenaId,
} from "@/lib/grilla-slot-utils";
import { CaptionEditor } from "@/components/grilla/caption-editor";
import { GrillaBuilderCalendar } from "@/components/grilla/grilla-builder-calendar";
import { GrillaCopyEditor } from "@/components/grilla/grilla-copy-editor";
import { GrillaModal } from "@/components/grilla/grilla-modal";
import { PillarDistributionBar, type PillarTarget } from "@/components/grilla/pillar-distribution-bar";
import { PostAssignmentFields } from "@/components/grilla/post-assignment-fields";
import { PostIdentifierField } from "@/components/grilla/post-identifier-field";
import {
  PILLAR_OPTIONS,
  type ContentPillar,
  type OrgHashtagGroup,
  type OrgIdentifier,
  type PostFormat,
} from "@/lib/types";
import type { OrgIdentifierConfig } from "@/lib/org-identifier";
import type { PostAssignmentOptions } from "@/lib/team-assignments";
import type { CatalogEvent } from "@/lib/calendar-types";
import { catalogEventsForDate } from "@/lib/calendar-types";

const ALL_FORMATS: PostFormat[] = [
  "image",
  "carousel",
  "video_carousel",
  "feed",
  "reel",
  "story",
];

const PERIOD_LABELS: Record<GrillaPeriod, string> = {
  week: "Semana",
  quincena: "Quincena",
  month: "Mes",
};

function formatDraftTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatEfemerideDateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, day));
}

interface GrillaBuilderDialogProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentOptions: PostAssignmentOptions;
  currentUserId: string;
  pillarOptions?: string[];
  pillars?: ContentPillar[];
  hashtagGroups?: OrgHashtagGroup[];
  identifierConfig?: OrgIdentifierConfig;
  identifiers?: OrgIdentifier[];
  allowedFormats?: PostFormat[];
  catalogEvents?: CatalogEvent[];
}

export function GrillaBuilderDialog({
  orgId,
  open,
  onOpenChange,
  assignmentOptions,
  currentUserId,
  pillarOptions = [...PILLAR_OPTIONS],
  pillars = [],
  hashtagGroups = [],
  identifierConfig = { label: null, allowPhoto: false, placeholder: null },
  identifiers = [],
  allowedFormats,
  catalogEvents = [],
}: GrillaBuilderDialogProps) {
  const formats = (allowedFormats ?? ALL_FORMATS).map((value) => ({
    value,
    label: formatShortLabel(value),
  }));
  const defaultFormat = formats[0]?.value ?? "image";
  const defaultPillar = pillarOptions[0] || PILLAR_OPTIONS[0];
  const slotDefaults = useMemo(
    () => ({ pillar: defaultPillar, format: defaultFormat }),
    [defaultPillar, defaultFormat]
  );

  const [period, setPeriod] = useState<GrillaPeriod>("month");
  const [month, setMonth] = useState(currentMonthValue);
  const [weekStart, setWeekStart] = useState(() => getMondayOfDate());
  const [quincena, setQuincena] = useState<QuincenaId>(currentQuincena);
  const [slots, setSlots] = useState<GrillaSlot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState("");
  const [designerId, setDesignerId] = useState("");
  const [communityManagerId, setCommunityManagerId] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftMeta, setDraftMeta] = useState<{
    updatedAt: string;
    updatedByName: string | null;
  } | null>(null);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const skipAutoSave = useRef(true);
  const router = useRouter();

  const pillarTargets: PillarTarget[] = useMemo(() => {
    if (pillars.length > 0) {
      return pillars.map((p) => ({ name: p.name, targetPct: p.target_pct }));
    }
    return pillarOptions.map((name) => ({
      name,
      targetPct: Math.round(100 / pillarOptions.length),
    }));
  }, [pillars, pillarOptions]);

  const hasTeamSection =
    assignmentOptions.creators.length > 0 ||
    assignmentOptions.designers.length > 0 ||
    assignmentOptions.communityManagers.length > 0;

  const weekDates = useMemo(() => daysInWeek(weekStart), [weekStart]);

  const activeDatesList = useMemo(() => {
    if (period === "week") return weekDates;
    if (period === "quincena") return daysInQuincena(month, quincena);
    return daysInMonth(month);
  }, [period, weekDates, month, quincena]);

  const activeDates = useMemo(
    () => new Set(activeDatesList),
    [activeDatesList]
  );

  const periodLabel = useMemo(() => {
    if (period === "week") return weekRangeLabel(weekStart);
    if (period === "quincena") return quincenaLabel(month, quincena);
    return monthLabel(month);
  }, [period, weekStart, month, quincena]);

  const resetAssignments = useCallback(() => {
    setCreatorId(
      assignmentOptions.defaultCreatorId ||
        (assignmentOptions.creators.length === 0 ? currentUserId : "")
    );
    setDesignerId(assignmentOptions.defaultDesignerId || "");
    setCommunityManagerId(assignmentOptions.defaultCommunityManagerId || "");
  }, [assignmentOptions, currentUserId]);

  const applyDates = useCallback(
    (dates: string[]) => {
      setSlots((prev) => {
        const next = rebuildSlotsForDates(dates, prev, slotDefaults);
        setSelectedId((current) => {
          if (current && next.some((s) => s.id === current)) return current;
          return next[0]?.id ?? null;
        });
        return next;
      });
    },
    [slotDefaults]
  );

  const periodKey = useMemo(
    () => buildGrillaPeriodKey(period, { month, weekStart, quincena }),
    [period, month, weekStart, quincena]
  );

  const restoreFromPayload = useCallback(
    (payload: GrillaDraftPayload, dates: string[]) => {
      const restored = rebuildSlotsForDates(dates, payload.slots, slotDefaults);
      setSlots(restored);
      setSelectedId(
        payload.selectedId && restored.some((s) => s.id === payload.selectedId)
          ? payload.selectedId
          : restored[0]?.id ?? null
      );
      if (payload.creatorId) setCreatorId(payload.creatorId);
      if (payload.designerId) setDesignerId(payload.designerId);
      if (payload.communityManagerId) setCommunityManagerId(payload.communityManagerId);
    },
    [slotDefaults]
  );

  const loadDraftFor = useCallback(
    async (
      p: GrillaPeriod,
      m: string,
      ws: string,
      q: QuincenaId,
      dates: string[]
    ) => {
      const key = buildGrillaPeriodKey(p, { month: m, weekStart: ws, quincena: q });
      const result = await getGrillaDraft(orgId, p, key);
      if (result.data?.payload) {
        restoreFromPayload(result.data.payload, dates);
        setDraftMeta({
          updatedAt: result.data.updated_at,
          updatedByName: result.data.updated_by_name,
        });
        return true;
      }
      applyDates(dates);
      setDraftMeta(null);
      return false;
    },
    [orgId, restoreFromPayload, applyDates]
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function init() {
      setDraftLoading(true);
      setError(null);
      setDraftMessage(null);
      skipAutoSave.current = true;

      const m = currentMonthValue();
      const ws = getMondayOfDate();
      const q = currentQuincena();
      const p: GrillaPeriod = "month";
      const dates = daysInMonth(m);

      resetAssignments();
      setPeriod(p);
      setMonth(m);
      setWeekStart(ws);
      setQuincena(q);

      if (!cancelled) {
        await loadDraftFor(p, m, ws, q, dates);
      }

      if (!cancelled) {
        setDraftLoading(false);
        setTimeout(() => {
          skipAutoSave.current = false;
        }, 500);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [open, resetAssignments, loadDraftFor]);

  async function changePeriod(next: GrillaPeriod) {
    const dates =
      next === "week"
        ? daysInWeek(weekStart)
        : next === "quincena"
          ? daysInQuincena(month, quincena)
          : daysInMonth(month);

    setPeriod(next);
    setDraftLoading(true);
    skipAutoSave.current = true;
    await loadDraftFor(next, month, weekStart, quincena, dates);
    setDraftLoading(false);
    skipAutoSave.current = false;
  }

  async function navigatePeriod(delta: number) {
    skipAutoSave.current = true;
    setDraftLoading(true);

    if (period === "week") {
      const nextStart = shiftWeek(weekStart, delta);
      const dates = daysInWeek(nextStart);
      setWeekStart(nextStart);
      setPeriod("week");
      await loadDraftFor("week", month, nextStart, quincena, dates);
    } else if (period === "quincena") {
      const next = shiftQuincena(month, quincena, delta);
      const dates = daysInQuincena(next.month, next.quincena);
      setMonth(next.month);
      setQuincena(next.quincena);
      await loadDraftFor("quincena", next.month, weekStart, next.quincena, dates);
    } else {
      const nextMonth = shiftMonth(month, delta);
      const dates = daysInMonth(nextMonth);
      setMonth(nextMonth);
      await loadDraftFor("month", nextMonth, weekStart, quincena, dates);
    }

    setDraftLoading(false);
    skipAutoSave.current = false;
  }

  const persistDraft = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!open || draftLoading || skipAutoSave.current) return;

      const payload: GrillaDraftPayload = {
        slots,
        selectedId,
        month,
        weekStart,
        quincena,
        creatorId,
        designerId,
        communityManagerId,
      };

      setDraftSaving(true);
      const result = await saveGrillaDraft(orgId, period, periodKey, payload);

      if (!result.error && result.data) {
        setDraftMeta({
          updatedAt: result.data.updated_at,
          updatedByName: "Tú",
        });
        if (!options?.silent) {
          setDraftMessage("Borrador guardado para todo el equipo");
          setTimeout(() => setDraftMessage(null), 3000);
        }
      }

      setDraftSaving(false);
    },
    [
      open,
      draftLoading,
      slots,
      selectedId,
      month,
      weekStart,
      quincena,
      creatorId,
      designerId,
      communityManagerId,
      orgId,
      period,
      periodKey,
    ]
  );

  useEffect(() => {
    if (!open || draftLoading) return;
    const timer = setTimeout(() => {
      void persistDraft({ silent: true });
    }, 4000);
    return () => clearTimeout(timer);
  }, [
    slots,
    selectedId,
    period,
    month,
    weekStart,
    quincena,
    creatorId,
    designerId,
    communityManagerId,
    open,
    draftLoading,
    persistDraft,
  ]);

  async function handleSaveDraft() {
    setError(null);
    await persistDraft({ silent: false });
  }

  const activeSlots = useMemo(
    () => slots.filter((s) => slotHasContent(s, slotDefaults)),
    [slots, slotDefaults]
  );
  const selectedSlot = slots.find((s) => s.id === selectedId) ?? null;
  const slotsForSelectedDate = selectedSlot
    ? slots.filter((s) => s.date === selectedSlot.date)
    : [];

  const selectedDateEfemerides = useMemo(() => {
    if (!selectedSlot || catalogEvents.length === 0) return [];
    const [, month, day] = selectedSlot.date.split("-").map(Number);
    return catalogEventsForDate(catalogEvents, month - 1, day);
  }, [selectedSlot, catalogEvents]);

  const pillarCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const slot of activeSlots) {
      counts[slot.pillar] = (counts[slot.pillar] || 0) + 1;
    }
    return counts;
  }, [activeSlots]);

  function updateSlot(id: string, patch: Partial<GrillaSlot>) {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function handleCopyChange(id: string, value: string, autoTitle: boolean) {
    const patch: Partial<GrillaSlot> = { copy: value };
    if (autoTitle) {
      const generated = titleFromCopy(value);
      if (generated) patch.title = generated;
    }
    updateSlot(id, patch);
  }

  function clearSlot(id: string) {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        return { ...createSlot(s.date, slotDefaults), id: s.id };
      })
    );
  }

  function addSlotForDate(date: string) {
    const newSlot = createSlot(date, slotDefaults);
    setSlots((prev) => {
      const index = prev.map((s) => s.date).lastIndexOf(date);
      const next = [...prev];
      next.splice(index + 1, 0, newSlot);
      return next;
    });
    setSelectedId(newSlot.id);
  }

  function selectDate(date: string) {
    if (!activeDates.has(date)) return;
    const daySlots = slots.filter((s) => s.date === date);
    if (daySlots.length === 0) return;
    const withContent = daySlots.find((s) => slotHasContent(s, slotDefaults));
    setSelectedId((withContent ?? daySlots[0]).id);
  }

  async function handleSave() {
    if (activeSlots.length === 0) {
      setError("Agrega contenido en al menos un día");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await bulkCreatePosts(
      orgId,
      activeSlots.map(slotToBulkInput),
      {
        content_creator_id: creatorId || currentUserId,
        assigned_to: designerId || undefined,
        community_manager_id: communityManagerId || undefined,
      }
    );

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    await deleteGrillaDraft(orgId, period, periodKey);
    onOpenChange(false);
    router.refresh();
    setLoading(false);
  }

  return (
    <GrillaModal open={open}>
      <div className="flex h-[95vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-6">
          <div>
            <h2 className="text-sm font-semibold">Crear grilla</h2>
            <p className="text-xs text-muted mt-0.5">
              Elige el período, un día en el calendario y completa el contenido
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted hover:text-foreground"
            type="button"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row overflow-hidden">
          <aside className="flex w-full md:max-w-[300px] shrink-0 flex-col border-b md:border-b-0 md:border-r border-border overflow-y-auto max-h-[45vh] md:max-h-none">
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted block">
                  Período
                </label>
                <div className="flex rounded-lg border border-border bg-background p-0.5">
                  {(["week", "quincena", "month"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => changePeriod(p)}
                      className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                        period === p
                          ? "bg-accent text-accent-foreground"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {PERIOD_LABELS[p]}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 rounded-md border border-border bg-background px-1 py-1">
                  <button
                    type="button"
                    onClick={() => navigatePeriod(-1)}
                    className="shrink-0 rounded p-1 text-muted hover:bg-surface hover:text-foreground"
                    aria-label="Período anterior"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <div className="flex-1 text-center text-xs font-medium capitalize py-0.5">
                    {period === "month" ? (
                      <label className="cursor-pointer">
                        {periodLabel}
                        <input
                          type="month"
                          value={month}
                          onChange={async (e) => {
                            const nextMonth = e.target.value;
                            const dates = daysInMonth(nextMonth);
                            setMonth(nextMonth);
                            skipAutoSave.current = true;
                            setDraftLoading(true);
                            await loadDraftFor(period, nextMonth, weekStart, quincena, dates);
                            setDraftLoading(false);
                            skipAutoSave.current = false;
                          }}
                          className="sr-only"
                        />
                      </label>
                    ) : (
                      periodLabel
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigatePeriod(1)}
                    className="shrink-0 rounded p-1 text-muted hover:bg-surface hover:text-foreground"
                    aria-label="Período siguiente"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              <PillarDistributionBar pillars={pillarTargets} counts={pillarCounts} />

              {draftMeta && !draftLoading && (
                <p className="text-[11px] text-muted rounded-md border border-border bg-background/50 px-2.5 py-2">
                  Borrador del equipo
                  {draftMeta.updatedByName ? ` · ${draftMeta.updatedByName}` : ""}
                  {" · "}
                  {formatDraftTime(draftMeta.updatedAt)}
                </p>
              )}

              {draftLoading && (
                <p className="text-[11px] text-muted">Cargando borrador…</p>
              )}

              <div>
                <p className="text-xs text-muted mb-2">
                  Los días con contenido muestran un punto de color
                </p>
                <GrillaBuilderCalendar
                  month={month}
                  slots={slots}
                  selectedId={selectedId}
                  pillarOptions={pillarOptions}
                  slotDefaults={slotDefaults}
                  activeDates={activeDates}
                  view={period}
                  weekDates={weekDates}
                  onSelectDate={selectDate}
                />
                {selectedSlot && selectedDateEfemerides.length > 0 && (
                  <div className="space-y-1.5 rounded-md border border-border bg-background/50 px-2.5 py-2">
                    {selectedDateEfemerides.map((event) => (
                      <p
                        key={`${event.id}-${event.name}`}
                        className="text-[11px] leading-snug text-foreground"
                      >
                        <span className="text-muted">
                          {formatEfemerideDateLabel(selectedSlot.date)}
                        </span>
                        <span className="text-muted mx-1.5">|</span>
                        <span
                          className="font-medium"
                          style={{ color: event.catalog_color }}
                        >
                          {event.name}
                        </span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {hasTeamSection && (
              <div className="mt-auto border-t border-border p-4">
                <PostAssignmentFields
                  assignmentOptions={assignmentOptions}
                  creatorId={creatorId}
                  designerId={designerId}
                  communityManagerId={communityManagerId}
                  onCreatorChange={setCreatorId}
                  onDesignerChange={setDesignerId}
                  onCommunityManagerChange={setCommunityManagerId}
                />
              </div>
            )}
          </aside>

          <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {selectedSlot ? (
              <div className="mx-auto max-w-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium">
                      {formatDayLabel(selectedSlot.date).weekday}{" "}
                      {formatDayLabel(selectedSlot.date).day}
                      {period === "month" && ` de ${monthLabel(month)}`}
                    </h3>
                    {slotsForSelectedDate.length > 1 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {slotsForSelectedDate.map((slot, index) => (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setSelectedId(slot.id)}
                            className={`rounded-md px-2 py-0.5 text-[11px] transition-colors ${
                              slot.id === selectedId
                                ? "bg-accent text-accent-foreground"
                                : "bg-background text-muted hover:text-foreground border border-border"
                            }`}
                          >
                            Post {index + 1}
                            {slotHasContent(slot, slotDefaults) ? "" : " (vacío)"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {slotHasContent(selectedSlot, slotDefaults) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => clearSlot(selectedSlot.id)}
                      >
                        <RotateCcw size={12} />
                        Limpiar
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addSlotForDate(selectedSlot.date)}
                    >
                      <Plus size={12} />
                      Otro post
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted">Pilar</label>
                    <select
                      value={selectedSlot.pillar}
                      onChange={(e) =>
                        updateSlot(selectedSlot.id, { pillar: e.target.value })
                      }
                      className="flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    >
                      {pillarOptions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted">Formato</label>
                    <select
                      value={selectedSlot.format}
                      onChange={(e) =>
                        updateSlot(selectedSlot.id, {
                          format: e.target.value as PostFormat,
                        })
                      }
                      className="flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    >
                      {formats.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-muted">Título</label>
                    <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSlot.autoTitle}
                        onChange={(e) =>
                          updateSlot(selectedSlot.id, {
                            autoTitle: e.target.checked,
                          })
                        }
                        className="rounded border-border"
                      />
                      Auto desde copy
                    </label>
                  </div>
                  <input
                    value={selectedSlot.title}
                    onChange={(e) =>
                      updateSlot(selectedSlot.id, {
                        title: e.target.value,
                        autoTitle: false,
                      })
                    }
                    placeholder="Se genera del copy si está activo"
                    className="flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>

                <GrillaCopyEditor
                  key={`${selectedSlot.id}-${selectedSlot.format}`}
                  format={selectedSlot.format}
                  value={selectedSlot.copy}
                  onChange={(value) =>
                    handleCopyChange(
                      selectedSlot.id,
                      value,
                      selectedSlot.autoTitle
                    )
                  }
                />

                <div className="space-y-1.5">
                  <label className="text-sm text-muted">Caption</label>
                  <CaptionEditor
                    value={selectedSlot.caption}
                    onChange={(value) =>
                      updateSlot(selectedSlot.id, { caption: value })
                    }
                    hashtagGroups={hashtagGroups}
                  />
                </div>

                <PostIdentifierField
                  orgId={orgId}
                  config={identifierConfig}
                  identifiers={identifiers}
                  selectedId={selectedSlot.orgIdentifierId}
                  onChange={({ id, value, photoUrl }) =>
                    updateSlot(selectedSlot.id, {
                      orgIdentifierId: id,
                      plate: value,
                      identifierPhotoUrl: photoUrl,
                    })
                  }
                />

                <div className="space-y-1.5">
                  <label className="text-sm text-muted">Referencias</label>
                  <textarea
                    value={selectedSlot.references}
                    onChange={(e) =>
                      updateSlot(selectedSlot.id, {
                        references: e.target.value,
                      })
                    }
                    rows={2}
                    placeholder="Links, inspiración..."
                    className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted py-8 text-center">
                Selecciona un día en el calendario
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
          <div className="min-w-0 space-y-0.5">
            {error && <p className="text-xs text-destructive">{error}</p>}
            {draftMessage && (
              <p className="text-xs text-emerald-700">{draftMessage}</p>
            )}
            {!error && !draftMessage && draftSaving && (
              <p className="text-xs text-muted">Guardando borrador…</p>
            )}
            {!error && !draftMessage && !draftSaving && activeSlots.length > 0 && (
              <p className="text-xs text-muted">
                {activeSlots.length} post{activeSlots.length !== 1 ? "s" : ""}{" "}
                con contenido
              </p>
            )}
            {!error && !draftMessage && !draftSaving && draftMeta && (
              <p className="text-xs text-muted">
                Borrador sincronizado · {formatDraftTime(draftMeta.updatedAt)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={draftSaving}
              disabled={draftLoading}
              onClick={handleSaveDraft}
            >
              Guardar borrador
            </Button>
            <Button
              type="button"
              size="sm"
              loading={loading}
              disabled={activeSlots.length === 0 || draftLoading}
              onClick={handleSave}
            >
              Publicar grilla ({activeSlots.length})
            </Button>
          </div>
        </div>
      </div>
    </GrillaModal>
  );
}
