"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { reschedulePost } from "@/lib/actions";
import { formatPostLabel } from "@/lib/post-display";
import { STATUS_LABELS, type PostStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { CatalogEvent } from "@/lib/calendar-types";
import { catalogEventsForDate } from "@/lib/calendar-types";
import {
  FertileBadgeButton,
  useFertileEventModal,
} from "@/components/home/fertile-event-modal";

export interface CalendarPost {
  id: string;
  title: string;
  format: string;
  organization_id: string;
  organization_name?: string;
  scheduled_at: string;
  status: string;
  pillar?: string | null;
}

interface InteractiveCalendarProps {
  posts: CalendarPost[];
  orgId?: string;
  enableDragDrop?: boolean;
  catalogEvents?: CatalogEvent[];
}

type ViewMode = "month" | "week";

const WEEKDAY_HEADERS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function utcDateKey(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

function toDateInputValue(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfWeekUtc(date: Date) {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function isTodayUtc(day: Date) {
  const now = new Date();
  return (
    day.getUTCFullYear() === now.getUTCFullYear() &&
    day.getUTCMonth() === now.getUTCMonth() &&
    day.getUTCDate() === now.getUTCDate()
  );
}

const statusColors: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  brief_ready: "bg-blue-50 text-blue-800",
  in_design: "bg-amber-50 text-amber-800",
  review: "bg-purple-50 text-purple-800",
  approved: "bg-green-50 text-green-800",
  scheduled: "bg-sky-50 text-sky-800",
  published: "bg-neutral-200 text-neutral-800",
};

export function InteractiveCalendar({
  posts: initialPosts,
  orgId,
  enableDragDrop = false,
  catalogEvents = [],
}: InteractiveCalendarProps) {
  const router = useRouter();
  const { modal: fertileModal, openEvent } = useFertileEventModal(orgId);
  const [posts, setPosts] = useState(initialPosts);
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);

  const postsByDay = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();
    for (const p of posts) {
      const key = utcDateKey(p.scheduled_at);
      const list = map.get(key) || [];
      list.push(p);
      map.set(key, list);
    }
    return map;
  }, [posts]);

  const periodLabel = useMemo(() => {
    if (view === "month") {
      return new Intl.DateTimeFormat("es", {
        month: "long",
        year: "numeric",
      }).format(cursor);
    }
    const start = startOfWeekUtc(cursor);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    const fmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
    const year = new Intl.DateTimeFormat("es", { year: "numeric" }).format(start);
    return `${fmt.format(start)} – ${fmt.format(end)}, ${year}`;
  }, [cursor, view]);

  const monthDays = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(Date.UTC(year, month, 1));
    const last = new Date(Date.UTC(year, month + 1, 0));
    const startPad = (first.getUTCDay() + 6) % 7;
    const days: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= last.getUTCDate(); d++) {
      days.push(new Date(Date.UTC(year, month, d)));
    }
    return days;
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = startOfWeekUtc(cursor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      return d;
    });
  }, [cursor]);

  function shift(dir: -1 | 1) {
    setCursor((prev) => {
      const d = new Date(prev);
      if (view === "month") d.setMonth(d.getMonth() + dir);
      else d.setDate(d.getDate() + dir * 7);
      return d;
    });
  }

  async function handleDrop(day: Date, postId: string) {
    if (!enableDragDrop || !orgId) return;
    const newDate = toDateInputValue(day);
    const post = posts.find((p) => p.id === postId);
    if (
      !post ||
      utcDateKey(post.scheduled_at) === utcDateKey(day.toISOString())
    )
      return;

    setRescheduling(true);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              scheduled_at: new Date(`${newDate}T12:00:00.000Z`).toISOString(),
            }
          : p
      )
    );

    await reschedulePost(orgId, postId, newDate);
    setRescheduling(false);
    setDraggingId(null);
    setDropTarget(null);
    router.refresh();
  }

  function PostChip({
    post,
    variant = "compact",
  }: {
    post: CalendarPost;
    variant?: "compact" | "full";
  }) {
    const status = post.status in STATUS_LABELS ? post.status : "draft";
    const href = `/org/${post.organization_id}/grilla/${post.id}`;

    return (
      <div
        draggable={enableDragDrop}
        onDragStart={(e) => {
          if (!enableDragDrop) return;
          e.dataTransfer.setData("text/post-id", post.id);
          setDraggingId(post.id);
        }}
        onDragEnd={() => {
          setDraggingId(null);
          setDropTarget(null);
        }}
        className={cn(
          enableDragDrop && "cursor-grab active:cursor-grabbing",
          draggingId === post.id && "opacity-50"
        )}
      >
        <Link
          href={href}
          onClick={(e) => draggingId && e.preventDefault()}
          className={cn(
            "block rounded-md hover:opacity-80 transition-opacity",
            statusColors[status] || statusColors.draft,
            variant === "compact"
              ? "text-[11px] leading-snug truncate px-1.5 py-0.5"
              : "p-3 border border-border"
          )}
          title={STATUS_LABELS[status as PostStatus]}
        >
          {variant === "compact" ? (
            formatPostLabel(
              post.format as Parameters<typeof formatPostLabel>[0],
              post.title
            )
          ) : (
            <>
              <p className="text-sm font-medium truncate">{post.title}</p>
              {post.organization_name && (
                <p className="text-xs text-muted truncate mt-0.5">
                  {post.organization_name}
                </p>
              )}
            </>
          )}
        </Link>
      </div>
    );
  }

  function MonthDayCell({ day }: { day: Date }) {
    const key = utcDateKey(day.toISOString());
    const dayPosts = postsByDay.get(key) || [];
    const events = catalogEventsForDate(
      catalogEvents,
      day.getUTCMonth(),
      day.getUTCDate()
    );
    const isDropTarget = dropTarget === key;
    const today = isTodayUtc(day);

    return (
      <div
        className={cn(
          "bg-surface min-h-[108px] p-1.5 transition-colors",
          isDropTarget && enableDragDrop && "bg-purple-50 ring-2 ring-purple-200 ring-inset",
          rescheduling && "opacity-60"
        )}
        onDragOver={(e) => {
          if (!enableDragDrop) return;
          e.preventDefault();
          setDropTarget(key);
        }}
        onDragLeave={() => setDropTarget(null)}
        onDrop={(e) => {
          e.preventDefault();
          const postId = e.dataTransfer.getData("text/post-id");
          if (postId) handleDrop(day, postId);
        }}
      >
        <p
          className={cn(
            "text-xs tabular-nums mb-1 w-6 h-6 flex items-center justify-center rounded-full",
            today
              ? "bg-foreground text-background font-semibold"
              : dayPosts.length > 0
                ? "bg-neutral-200 text-foreground font-medium"
                : "text-muted font-medium"
          )}
        >
          {day.getUTCDate()}
        </p>

        {events.length > 0 && (
          <div className="mb-1 space-y-0.5">
            {events.map((ev) => (
              <FertileBadgeButton
                key={`${ev.id}-${ev.name}`}
                event={ev}
                size="sm"
                onClick={() => openEvent(ev, day.getUTCFullYear())}
              />
            ))}
          </div>
        )}

        <div className="space-y-0.5">
          {dayPosts.slice(0, 3).map((p) => (
            <PostChip key={p.id} post={p} variant="compact" />
          ))}
          {dayPosts.length > 3 && (
            <p className="text-[11px] text-muted px-1">
              +{dayPosts.length - 3} posts
            </p>
          )}
        </div>
      </div>
    );
  }

  function WeekDayRow({ day }: { day: Date }) {
    const key = utcDateKey(day.toISOString());
    const dayPosts = postsByDay.get(key) || [];
    const events = catalogEventsForDate(
      catalogEvents,
      day.getUTCMonth(),
      day.getUTCDate()
    );
    const today = isTodayUtc(day);
    const weekday = new Intl.DateTimeFormat("es", { weekday: "long" }).format(
      day
    );
    const dateLabel = new Intl.DateTimeFormat("es", {
      day: "numeric",
      month: "long",
    }).format(day);
    const isDropTarget = dropTarget === key;
    const isEmpty = events.length === 0 && dayPosts.length === 0;

    return (
      <div
        className={cn(
          "rounded-lg border border-border overflow-hidden transition-colors",
          isDropTarget && enableDragDrop && "ring-2 ring-purple-200",
          rescheduling && "opacity-60"
        )}
        onDragOver={(e) => {
          if (!enableDragDrop) return;
          e.preventDefault();
          setDropTarget(key);
        }}
        onDragLeave={() => setDropTarget(null)}
        onDrop={(e) => {
          e.preventDefault();
          const postId = e.dataTransfer.getData("text/post-id");
          if (postId) handleDrop(day, postId);
        }}
      >
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-3 border-b border-border",
            today ? "bg-foreground/5" : "bg-neutral-50"
          )}
        >
          <span
            className={cn(
              "text-sm font-semibold capitalize",
              today && "text-foreground"
            )}
          >
            {weekday}
          </span>
          <span className="text-sm text-muted">{dateLabel}</span>
          {today && (
            <span className="text-[11px] font-medium bg-foreground text-background rounded-full px-2 py-0.5 ml-auto">
              Hoy
            </span>
          )}
        </div>

        <div className="p-4 space-y-4">
          {events.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
                Fértiles
              </p>
              <div className="flex flex-wrap gap-2">
                {events.map((ev) => (
                  <FertileBadgeButton
                    key={`${ev.id}-${ev.name}`}
                    event={ev}
                    size="md"
                    onClick={() => openEvent(ev, day.getUTCFullYear())}
                  />
                ))}
              </div>
            </div>
          )}

          {dayPosts.length > 0 && (
            <div>
              {events.length > 0 && (
                <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
                  Posts
                </p>
              )}
              <div className="space-y-2">
                {dayPosts.map((p) => (
                  <PostChip key={p.id} post={p} variant="full" />
                ))}
              </div>
            </div>
          )}

          {isEmpty && (
            <p className="text-sm text-muted">Sin eventos ni posts.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            className="p-2 rounded-md hover:bg-neutral-100 text-muted"
            aria-label="Anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            className="p-2 rounded-md hover:bg-neutral-100 text-muted"
            aria-label="Siguiente"
          >
            <ChevronRight size={18} />
          </button>
          <h2 className="text-base font-semibold capitalize ml-1">
            {periodLabel}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {enableDragDrop && (
            <span className="text-xs text-muted hidden sm:inline">
              Arrastra posts para reprogramar
            </span>
          )}
          <div className="flex rounded-lg border border-border p-0.5 bg-neutral-50">
            {(["month", "week"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors",
                  view === v
                    ? "bg-white shadow-sm text-foreground"
                    : "text-muted hover:text-foreground"
                )}
              >
                {v === "month" ? "Mes" : "Semana"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "month" ? (
        <div className="grid grid-cols-7 gap-px rounded-lg border border-border overflow-hidden bg-border">
          {WEEKDAY_HEADERS.map((d) => (
            <div
              key={d}
              className="bg-neutral-50 px-2 py-2.5 text-center text-xs font-semibold text-muted"
            >
              {d}
            </div>
          ))}
          {monthDays.map((day, i) => {
            if (!day) {
              return (
                <div key={`empty-${i}`} className="bg-surface min-h-[108px]" />
              );
            }
            return (
              <MonthDayCell key={utcDateKey(day.toISOString())} day={day} />
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {weekDays.map((day) => (
            <WeekDayRow key={utcDateKey(day.toISOString())} day={day} />
          ))}
        </div>
      )}
      {fertileModal}
    </div>
  );
}
