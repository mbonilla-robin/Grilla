"use client";

import { cn } from "@/lib/utils";

export interface DayActivity {
  label: string;
  count: number;
  isToday: boolean;
}

interface WeeklyActivityChartProps {
  days: DayActivity[];
  className?: string;
}

export function WeeklyActivityChart({ days, className }: WeeklyActivityChartProps) {
  const maxCount = Math.max(...days.map((d) => d.count), 1);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-end gap-2 h-32">
        {days.map((day) => {
          const heightPct = day.count === 0 ? 8 : Math.max(12, (day.count / maxCount) * 100);

          return (
            <div key={day.label} className="flex-1 flex flex-col items-center gap-1.5 h-full">
              {day.count > 0 && (
                <span className="text-[10px] text-muted tabular-nums">{day.count}</span>
              )}
              <div className="flex-1 w-full flex items-end">
                <div
                  className={cn(
                    "w-full rounded-md transition-all",
                    day.isToday
                      ? "bg-foreground"
                      : day.count > 0
                        ? "bg-neutral-200"
                        : "bg-neutral-50 border border-dashed border-border"
                  )}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] tabular-nums",
                  day.isToday ? "font-semibold text-foreground" : "text-muted"
                )}
              >
                {day.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
