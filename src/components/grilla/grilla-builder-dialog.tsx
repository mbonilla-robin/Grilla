"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  CheckCircle2,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  bulkCreatePosts,
  deleteGrillaDraft,
  getGrillaDraft,
  saveGrillaDraft,
} from "@/lib/actions";
import {
  buildGrillaPeriodKey,
  resolveDraftContentCreatorId,
  type GrillaDraftPayload,
} from "@/lib/grilla-draft";
import {
  invalidateGrillaPostsCache,
  fetchGrillaPostsClient,
} from "@/lib/grilla-posts-client";
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
  isPublishedSlot,
  mergePublishedAndDraftSlots,
  monthLabel,
  quincenaLabel,
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
import { PostPillarField } from "@/components/grilla/post-pillar-field";
import { formatPillars, parsePillars } from "@/lib/pillars";
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
  /** Month currently shown on the Grilla page (`YYYY-MM`). */
  initialMonth?: string;
  pillarOptions?: string[];
  pillars?: ContentPillar[];
  hashtagGroups?: OrgHashtagGroup[];
  identifierConfig?: OrgIdentifierConfig;
  identifiers?: OrgIdentifier[];
  allowedFormats?: PostFormat[];
  catalogEvents?: CatalogEvent[];
}

function isValidMonthParam(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}$/.test(value);
}

export function GrillaBuilderDialog({
  orgId,
  open,
  onOpenChange,
  assignmentOptions,
  currentUserId,
  initialMonth,
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
    authorId: string | null;
    updatedBy: string | null;
  } | null>(null);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<{
    count: number;
    month: string;
  } | null>(null);
  const [bilingualSlotIds, setBilingualSlotIds] = useState<Set<string>>(
    () => new Set()
  );
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

  const periodKey = useMemo(
    () => buildGrillaPeriodKey(period, { month, weekStart, quincena }),
    [period, month, weekStart, quincena]
  );

  const applyMergedState = useCallback(
    (
      dates: string[],
      posts: Awaited<ReturnType<typeof fetchGrillaPostsClient>>,
      payload: GrillaDraftPayload | null
    ) => {
      const merged = mergePublishedAndDraftSlots(
        dates,
        posts,
        payload?.slots,
        slotDefaults
      );
      setSlots(merged);
      setBilingualSlotIds(
        new Set(
          merged
            .filter((s) => s.copyEn?.trim() || s.captionEn?.trim())
            .map((s) => s.id)
        )
      );

      const draftSelected =
        payload?.selectedId &&
        merged.some(
          (s) => s.id === payload.selectedId && !isPublishedSlot(s)
        )
          ? payload.selectedId
          : null;
      const firstEmpty = merged.find(
        (s) => !isPublishedSlot(s) && !slotHasContent(s, slotDefaults)
      );
      const firstDraft = merged.find((s) => !isPublishedSlot(s));
      setSelectedId(draftSelected ?? firstEmpty?.id ?? firstDraft?.id ?? merged[0]?.id ?? null);

      if (payload) {
        const restoredCreator =
          payload.creatorId ||
          payload.authorId ||
          assignmentOptions.defaultCreatorId ||
          "";
        if (restoredCreator) setCreatorId(restoredCreator);
        if (payload.designerId) setDesignerId(payload.designerId);
        if (payload.communityManagerId) {
          setCommunityManagerId(payload.communityManagerId);
        }
      }
    },
    [slotDefaults, assignmentOptions.defaultCreatorId]
  );

  const loadPeriod = useCallback(
    async (
      p: GrillaPeriod,
      m: string,
      ws: string,
      q: QuincenaId,
      dates: string[]
    ) => {
      const key = buildGrillaPeriodKey(p, { month: m, weekStart: ws, quincena: q });
      const months = [...new Set(dates.map((d) => d.slice(0, 7)))];
      for (const monthKey of months) {
        invalidateGrillaPostsCache(orgId, monthKey);
      }

      const [draftResult, postBatches] = await Promise.all([
        getGrillaDraft(orgId, p, key),
        Promise.all(months.map((monthKey) => fetchGrillaPostsClient(orgId, monthKey))),
      ]);
      const posts = postBatches.flat();
      const payload = draftResult.data?.payload ?? null;

      applyMergedState(dates, posts, payload);

      if (draftResult.data) {
        setDraftMeta({
          updatedAt: draftResult.data.updated_at,
          updatedByName: draftResult.data.updated_by_name,
          authorId:
            draftResult.data.payload.authorId ||
            draftResult.data.payload.creatorId ||
            draftResult.data.updated_by ||
            null,
          updatedBy: draftResult.data.updated_by || null,
        });
        return true;
      }

      setDraftMeta(null);
      return false;
    },
    [orgId, applyMergedState]
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function init() {
      setDraftLoading(true);
      setError(null);
      setDraftMessage(null);
      setPublishSuccess(null);
      setBilingualSlotIds(new Set());
      skipAutoSave.current = true;

      const m = isValidMonthParam(initialMonth)
        ? initialMonth
        : currentMonthValue();
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
        await loadPeriod(p, m, ws, q, dates);
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
  }, [open, initialMonth, resetAssignments, loadPeriod]);

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
    await loadPeriod(next, month, weekStart, quincena, dates);
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
      await loadPeriod("week", month, nextStart, quincena, dates);
    } else if (period === "quincena") {
      const next = shiftQuincena(month, quincena, delta);
      const dates = daysInQuincena(next.month, next.quincena);
      setMonth(next.month);
      setQuincena(next.quincena);
      await loadPeriod("quincena", next.month, weekStart, next.quincena, dates);
    } else {
      const nextMonth = shiftMonth(month, delta);
      const dates = daysInMonth(nextMonth);
      setMonth(nextMonth);
      await loadPeriod("month", nextMonth, weekStart, quincena, dates);
    }

    setDraftLoading(false);
    skipAutoSave.current = false;
  }

  const persistDraft = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!open || draftLoading || skipAutoSave.current) return;

      const payload: GrillaDraftPayload = {
        slots: slots.filter((s) => !isPublishedSlot(s)),
        selectedId:
          selectedId &&
          slots.some((s) => s.id === selectedId && !isPublishedSlot(s))
            ? selectedId
            : null,
        month,
        weekStart,
        quincena,
        authorId: draftMeta?.authorId || creatorId || currentUserId,
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
          authorId: payload.authorId || draftMeta?.authorId || currentUserId,
          updatedBy: currentUserId,
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
      draftMeta?.authorId,
      currentUserId,
      orgId,
      period,
      periodKey,
    ]
  );

  useEffect(() => {
    if (!open || draftLoading || publishSuccess) return;
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
    publishSuccess,
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
  const newSlotsToPublish = useMemo(
    () => activeSlots.filter((s) => !isPublishedSlot(s)),
    [activeSlots]
  );
  const publishedSlotCount = useMemo(
    () => slots.filter((s) => isPublishedSlot(s)).length,
    [slots]
  );
  const selectedSlot = slots.find((s) => s.id === selectedId) ?? null;
  const selectedIsPublished = selectedSlot
    ? isPublishedSlot(selectedSlot)
    : false;
  const slotsForSelectedDate = selectedSlot
    ? slots.filter((s) => s.date === selectedSlot.date)
    : [];
  const selectedBilingual = selectedSlot
    ? bilingualSlotIds.has(selectedSlot.id)
    : false;

  function toggleBilingualForSelected() {
    if (!selectedSlot || isPublishedSlot(selectedSlot)) return;
    setBilingualSlotIds((prev) => {
      const next = new Set(prev);
      if (next.has(selectedSlot.id)) next.delete(selectedSlot.id);
      else next.add(selectedSlot.id);
      return next;
    });
  }

  const selectedDateEfemerides = useMemo(() => {
    if (!selectedSlot || catalogEvents.length === 0) return [];
    const [, month, day] = selectedSlot.date.split("-").map(Number);
    return catalogEventsForDate(catalogEvents, month - 1, day);
  }, [selectedSlot, catalogEvents]);

  const pillarCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const slot of activeSlots) {
      const names = parsePillars(slot.pillar);
      if (names.length === 0) {
        counts[slot.pillar] = (counts[slot.pillar] || 0) + 1;
        continue;
      }
      for (const name of names) {
        counts[name] = (counts[name] || 0) + 1;
      }
    }
    return counts;
  }, [activeSlots]);

  function updateSlot(id: string, patch: Partial<GrillaSlot>) {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (isPublishedSlot(s)) return s;
        return { ...s, ...patch };
      })
    );
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
        if (isPublishedSlot(s)) return s;
        return { ...createSlot(s.date, slotDefaults), id: s.id };
      })
    );
  }

  function removeSlot(id: string) {
    setSlots((prev) => {
      const target = prev.find((s) => s.id === id);
      if (!target || isPublishedSlot(target)) return prev;
      const sameDay = prev.filter((s) => s.date === target.date);
      if (sameDay.length <= 1) return prev;

      const next = prev.filter((s) => s.id !== id);
      setSelectedId((current) => {
        if (current !== id) return current;
        const remaining = next.filter((s) => s.date === target.date);
        return remaining[remaining.length - 1]?.id ?? remaining[0]?.id ?? null;
      });
      return next;
    });
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

  function finishPublishAndViewGrid() {
    if (!publishSuccess) {
      onOpenChange(false);
      return;
    }
    const targetMonth = publishSuccess.month;
    setPublishSuccess(null);
    onOpenChange(false);
    router.push(
      `/org/${orgId}/grilla?month=${encodeURIComponent(targetMonth)}`
    );
    router.refresh();
  }

  function selectDate(date: string) {
    if (!activeDates.has(date)) return;
    const daySlots = slots.filter((s) => s.date === date);
    if (daySlots.length === 0) return;
    const next =
      daySlots.find(
        (s) => !isPublishedSlot(s) && !slotHasContent(s, slotDefaults)
      ) ??
      daySlots.find((s) => !isPublishedSlot(s)) ??
      daySlots.find((s) => slotHasContent(s, slotDefaults)) ??
      daySlots[0];
    setSelectedId(next.id);
  }

  async function handleSave() {
    if (newSlotsToPublish.length === 0) {
      setError(
        publishedSlotCount > 0
          ? "No hay posts nuevos para publicar — completa más días o agrega Otro post"
          : "Agrega contenido en al menos un día"
      );
      return;
    }

    setLoading(true);
    setError(null);

    const contentCreatorId = resolveDraftContentCreatorId({
      creatorId,
      authorId: draftMeta?.authorId,
      draftUpdatedBy: draftMeta?.updatedBy,
      defaultCreatorId: assignmentOptions.defaultCreatorId,
      fallbackUserId: currentUserId,
    });

    const result = await bulkCreatePosts(
      orgId,
      newSlotsToPublish.map(slotToBulkInput),
      {
        content_creator_id: contentCreatorId,
        assigned_to: designerId || undefined,
        community_manager_id: communityManagerId || undefined,
      }
    );

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if ((result.count ?? 0) === 0) {
      setError(
        "No se crearon posts nuevos — ya existían con el mismo título y fecha"
      );
      setLoading(false);
      return;
    }

    const publishedMonths = [
      ...new Set(newSlotsToPublish.map((slot) => slot.date.slice(0, 7))),
    ];
    for (const publishedMonth of publishedMonths) {
      invalidateGrillaPostsCache(orgId, publishedMonth);
    }

    const targetMonth =
      publishedMonths[0] ||
      (isValidMonthParam(month) ? month : currentMonthValue());

    await deleteGrillaDraft(orgId, period, periodKey);
    setPublishSuccess({
      count: result.count ?? newSlotsToPublish.length,
      month: targetMonth,
    });
    setLoading(false);
  }

  return (
    <GrillaModal open={open}>
      <div className="flex h-[95vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
        {publishSuccess ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={36} strokeWidth={1.75} />
            </div>
            <div className="max-w-sm space-y-2">
              <h2 className="text-lg font-semibold tracking-tight">
                Grilla publicada
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                Se publicaron {publishSuccess.count} post
                {publishSuccess.count !== 1 ? "s" : ""} nuevo
                {publishSuccess.count !== 1 ? "s" : ""} para{" "}
                <span className="font-medium capitalize text-foreground">
                  {monthLabel(publishSuccess.month)}
                </span>
                . Los posts que ya estaban en la grilla no se modificaron.
              </p>
            </div>
            <Button type="button" size="sm" onClick={finishPublishAndViewGrid}>
              OK
            </Button>
          </div>
        ) : (
          <>
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
                            await loadPeriod(period, nextMonth, weekStart, quincena, dates);
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
                  Check = ya en la grilla · punto = borrador por publicar
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
                      <div className="mt-2 flex flex-wrap gap-1">
                        {slotsForSelectedDate.map((slot, index) => (
                          <div
                            key={slot.id}
                            className={`inline-flex items-center overflow-hidden rounded-md border text-[11px] transition-colors ${
                              slot.id === selectedId
                                ? "border-accent bg-accent text-accent-foreground"
                                : "border-border bg-background text-muted"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedId(slot.id)}
                              className={`px-2 py-0.5 ${
                                slot.id === selectedId
                                  ? ""
                                  : "hover:text-foreground"
                              }`}
                            >
                              Post {index + 1}
                              {isPublishedSlot(slot)
                                ? " ✓"
                                : slotHasContent(slot, slotDefaults)
                                  ? ""
                                  : " (vacío)"}
                            </button>
                            {!isPublishedSlot(slot) && (
                              <button
                                type="button"
                                onClick={() => removeSlot(slot.id)}
                                className={`border-l px-1.5 py-0.5 ${
                                  slot.id === selectedId
                                    ? "border-accent-foreground/20 hover:bg-accent-foreground/10"
                                    : "border-border hover:bg-destructive/10 hover:text-destructive"
                                }`}
                                aria-label={`Eliminar post ${index + 1}`}
                                title="Eliminar este post"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!selectedIsPublished &&
                      slotsForSelectedDate.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSlot(selectedSlot.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 size={12} />
                        Eliminar
                      </Button>
                    )}
                    {!selectedIsPublished &&
                      slotHasContent(selectedSlot, slotDefaults) && (
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

                {selectedIsPublished && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    Ya en la grilla — solo lectura. Usa “Otro post” para agregar
                    más contenido ese día.
                  </div>
                )}

                <fieldset
                  disabled={selectedIsPublished}
                  className={`space-y-4 ${selectedIsPublished ? "opacity-70" : ""}`}
                >
                <div className="space-y-4">
                  <PostPillarField
                    options={pillarOptions}
                    selected={
                      parsePillars(selectedSlot.pillar).length > 0
                        ? parsePillars(selectedSlot.pillar)
                        : [selectedSlot.pillar].filter(Boolean)
                    }
                    onChange={(pillars) =>
                      updateSlot(selectedSlot.id, {
                        pillar: formatPillars(pillars),
                      })
                    }
                  />
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

                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted">Copy y caption</p>
                  <Button
                    type="button"
                    variant={selectedBilingual ? "secondary" : "ghost"}
                    size="sm"
                    onClick={toggleBilingualForSelected}
                    disabled={selectedIsPublished}
                  >
                    <Languages size={12} />
                    {selectedBilingual ? "Un idioma" : "Otro idioma"}
                  </Button>
                </div>

                <GrillaCopyEditor
                  key={`${selectedSlot.id}-${selectedSlot.format}-${selectedBilingual ? "bi" : "mono"}`}
                  format={selectedSlot.format}
                  value={selectedSlot.copy}
                  onChange={(value) =>
                    handleCopyChange(
                      selectedSlot.id,
                      value,
                      selectedSlot.autoTitle
                    )
                  }
                  bilingual={selectedBilingual}
                  valueEn={selectedSlot.copyEn}
                  onChangeEn={(value) =>
                    updateSlot(selectedSlot.id, { copyEn: value })
                  }
                />

                <div className="space-y-1.5">
                  <label className="text-sm text-muted">Caption</label>
                  {selectedBilingual ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-muted">
                          Español
                        </span>
                        <CaptionEditor
                          value={selectedSlot.caption}
                          onChange={(value) =>
                            updateSlot(selectedSlot.id, { caption: value })
                          }
                          hashtagGroups={hashtagGroups}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-muted">
                          English
                        </span>
                        <CaptionEditor
                          value={selectedSlot.captionEn}
                          onChange={(value) =>
                            updateSlot(selectedSlot.id, { captionEn: value })
                          }
                          hashtagGroups={hashtagGroups}
                        />
                      </div>
                    </div>
                  ) : (
                    <CaptionEditor
                      value={selectedSlot.caption}
                      onChange={(value) =>
                        updateSlot(selectedSlot.id, { caption: value })
                      }
                      hashtagGroups={hashtagGroups}
                    />
                  )}
                </div>

                <PostIdentifierField
                  orgId={orgId}
                  config={identifierConfig}
                  identifiers={identifiers}
                  selectedIds={
                    selectedSlot.orgIdentifierIds?.length
                      ? selectedSlot.orgIdentifierIds
                      : selectedSlot.orgIdentifierId
                        ? [selectedSlot.orgIdentifierId]
                        : []
                  }
                  onChange={({ ids, id, value, photoUrl }) =>
                    updateSlot(selectedSlot.id, {
                      orgIdentifierIds: ids,
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
                </fieldset>
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
            {!error && !draftMessage && !draftSaving && (
              <p className="text-xs text-muted">
                {publishedSlotCount > 0 && (
                  <>
                    {publishedSlotCount} ya en la grilla
                    {newSlotsToPublish.length > 0 ? " · " : ""}
                  </>
                )}
                {newSlotsToPublish.length > 0 && (
                  <>
                    {newSlotsToPublish.length} nuevo
                    {newSlotsToPublish.length !== 1 ? "s" : ""} por publicar
                  </>
                )}
                {publishedSlotCount === 0 &&
                  newSlotsToPublish.length === 0 &&
                  activeSlots.length === 0 &&
                  "Sin contenido aún"}
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
              disabled={newSlotsToPublish.length === 0 || draftLoading}
              onClick={handleSave}
            >
              Publicar grilla ({newSlotsToPublish.length})
            </Button>
          </div>
        </div>
          </>
        )}
      </div>
    </GrillaModal>
  );
}
