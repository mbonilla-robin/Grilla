"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatPostLabel } from "@/lib/post-display";
import { cn } from "@/lib/utils";
import type { CalendarPostItem } from "@/lib/home-data";

interface CalendarViewProps {
  posts: CalendarPostItem[];
}

type ViewMode = "month" | "week";

function utcDateKey(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

function startOfWeekUtc(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export function CalendarView({ posts }: CalendarViewProps) {
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => new Date());

  const postsByDay = useMemo(() => {
    const map = new Map<string, CalendarPostItem[]>();
    for (const p of posts) {
      const key = utcDateKey(p.scheduled_at);
      const list = map.get(key) || [];
      list.push(p);
      map.set(key, list);
    }
    return map;
  }, [posts]);

  const monthLabel = new Intl.DateTimeFormat("es", {
    month: "long",
    year: "numeric",
  }).format(cursor);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            className="p-1.5 rounded-md hover:bg-neutral-100 text-muted"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            className="p-1.5 rounded-md hover:bg-neutral-100 text-muted"
          >
            <ChevronRight size={18} />
          </button>
          <h2 className="text-sm font-medium capitalize ml-2">{monthLabel}</h2>
        </div>

        <div className="flex rounded-lg border border-border p-0.5 bg-neutral-50">
          {(["month", "week"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize",
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

      {view === "month" ? (
        <div className="grid grid-cols-7 gap-px rounded-lg border border-border overflow-hidden bg-border">
          {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
            <div
              key={d}
              className="bg-neutral-50 px-1 py-2 text-center text-[10px] font-medium text-muted"
            >
              {d}
            </div>
          ))}
          {monthDays.map((day, i) => {
            if (!day) {
              return <div key={`empty-${i}`} className="bg-surface min-h-[88px]" />;
            }
            const key = utcDateKey(day.toISOString());
            const dayPosts = postsByDay.get(key) || [];
            return (
              <div key={key} className="bg-surface min-h-[88px] p-1">
                <p className="text-[10px] text-muted tabular-nums mb-1">
                  {day.getUTCDate()}
                </p>
                <div className="space-y-0.5">
                  {dayPosts.slice(0, 3).map((p) => (
                    <Link
                      key={p.id}
                      href={`/org/${p.organization_id}/grilla/${p.id}`}
                      className="block text-[9px] leading-tight truncate rounded px-1 py-0.5 bg-purple-50 text-purple-800 hover:bg-purple-100"
                    >
                      {formatPostLabel(p.format, p.title)}
                    </Link>
                  ))}
                  {dayPosts.length > 3 && (
                    <p className="text-[9px] text-muted px-1">+{dayPosts.length - 3}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const key = utcDateKey(day.toISOString());
            const dayPosts = postsByDay.get(key) || [];
            const label = new Intl.DateTimeFormat("es", {
              weekday: "short",
              day: "numeric",
            }).format(day);
            return (
              <div key={key} className="min-w-0">
                <p className="text-[10px] font-medium text-muted uppercase mb-2 text-center">
                  {label}
                </p>
                <div className="space-y-1.5 min-h-[120px]">
                  {dayPosts.map((p) => (
                    <Link
                      key={p.id}
                      href={`/org/${p.organization_id}/grilla/${p.id}`}
                      className="block rounded-md border border-border p-2 hover:bg-neutral-50 transition-colors"
                    >
                      <p className="text-[10px] text-muted truncate">
                        {p.organization_name}
                      </p>
                      <p className="text-xs font-medium truncate mt-0.5">
                        {formatPostLabel(p.format, p.title)}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
