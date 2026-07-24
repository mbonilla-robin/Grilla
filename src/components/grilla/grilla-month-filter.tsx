"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MonthOption } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface GrillaMonthFilterProps {
  months: MonthOption[];
}

const WINDOW_SIZE = 5;

function currentMonthValue(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonthValue(monthValue: string, delta: number): string {
  const [year, month] = monthValue.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shortMonthLabel(monthValue: string): string {
  const [year, month] = monthValue.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es", { month: "short" }).format(
    new Date(year, month - 1, 1)
  );
  return label.replace(/\.$/, "").replace(/^./, (c) => c.toUpperCase());
}

function buildWindow(start: string): string[] {
  return Array.from({ length: WINDOW_SIZE }, (_, i) =>
    shiftMonthValue(start, i)
  );
}

export function GrillaMonthFilter({ months }: GrillaMonthFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const now = currentMonthValue();
  const selected = searchParams.get("month") || now;
  const windowStart = searchParams.get("from") || now;

  const counts = useMemo(() => {
    const map = new Map(months.map((m) => [m.value, m.count]));
    return map;
  }, [months]);

  const windowMonths = useMemo(() => buildWindow(windowStart), [windowStart]);

  function navigate(nextMonth: string, nextFrom?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", nextMonth);
    const from = nextFrom ?? windowStart;
    if (from === now) params.delete("from");
    else params.set("from", from);
    router.push(`${pathname}?${params.toString()}`);
  }

  function selectMonth(value: string) {
    navigate(value);
  }

  function shiftWindow(delta: number) {
    const nextFrom = shiftMonthValue(windowStart, delta);
    const stillVisible = buildWindow(nextFrom).includes(selected);
    navigate(stillVisible ? selected : nextFrom, nextFrom);
  }

  if (months.length === 0) return null;

  return (
    <div className="flex w-full items-center gap-1 md:gap-2">
      <button
        type="button"
        onClick={() => shiftWindow(-1)}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted hover:bg-neutral-50 hover:text-foreground transition-colors"
        aria-label="Meses anteriores"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      <div className="grid min-w-0 flex-1 grid-cols-5 gap-1 md:gap-2">
        {windowMonths.map((value) => {
          const isActive = selected === value;
          const count = counts.get(value) ?? 0;
          return (
            <button
              key={value}
              type="button"
              onClick={() => selectMonth(value)}
              className={cn(
                "inline-flex h-7 min-w-0 w-full items-center justify-center rounded-md border px-1 text-[11px] font-medium transition-colors sm:text-xs",
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-surface text-muted hover:bg-neutral-50 hover:text-foreground"
              )}
              title={`${shortMonthLabel(value)} · ${count} post${count === 1 ? "" : "s"}`}
            >
              <span className="truncate leading-none">{shortMonthLabel(value)}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => shiftWindow(1)}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted hover:bg-neutral-50 hover:text-foreground transition-colors"
        aria-label="Meses siguientes"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
