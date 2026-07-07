"use client";

import {
  WEEKDAYS_MONDAY_START,
  buildMonthCalendar,
  slotHasContent,
  type GrillaSlot,
} from "@/lib/grilla-slot-utils";
import { resolvePillarDisplayColor } from "@/lib/pillar-colors";
import type { PostFormat } from "@/lib/types";

interface GrillaBuilderCalendarProps {
  month: string;
  slots: GrillaSlot[];
  selectedId: string | null;
  pillarOptions: string[];
  slotDefaults: { pillar: string; format: PostFormat };
  activeDates: Set<string>;
  view: "week" | "quincena" | "month";
  weekDates?: string[];
  onSelectDate: (date: string) => void;
}

function DayCell({
  date,
  day,
  daySlots,
  isSelected,
  isActive,
  pillarOptions,
  slotDefaults,
  onSelectDate,
}: {
  date: string;
  day: number;
  daySlots: GrillaSlot[];
  isSelected: boolean;
  isActive: boolean;
  pillarOptions: string[];
  slotDefaults: { pillar: string; format: PostFormat };
  onSelectDate: (date: string) => void;
}) {
  const hasContent = daySlots.some((s) => slotHasContent(s, slotDefaults));
  const primarySlot =
    daySlots.find((s) => slotHasContent(s, slotDefaults)) ?? daySlots[0];
  const pillarIndex = primarySlot
    ? pillarOptions.indexOf(primarySlot.pillar)
    : -1;
  const postCount = daySlots.filter((s) => slotHasContent(s, slotDefaults)).length;

  if (!isActive) {
    return (
      <div className="aspect-square rounded-lg border border-transparent opacity-30 flex items-center justify-center">
        <span className="text-sm tabular-nums text-muted">{day}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelectDate(date)}
      className={`relative aspect-square rounded-lg border text-sm transition-colors flex flex-col items-center justify-center gap-0.5 ${
        isSelected
          ? "border-accent bg-accent/10 ring-1 ring-accent/30 font-semibold"
          : hasContent
            ? "border-border bg-background hover:border-accent/40"
            : "border-border/60 bg-background/40 text-muted hover:border-border hover:bg-background/70"
      }`}
    >
      <span className="tabular-nums">{day}</span>
      {hasContent && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor: resolvePillarDisplayColor(
              pillarIndex >= 0 ? pillarIndex : 0
            ),
          }}
        />
      )}
      {postCount > 1 && (
        <span className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full bg-foreground text-background text-[9px] font-medium flex items-center justify-center px-0.5">
          {postCount}
        </span>
      )}
    </button>
  );
}

export function GrillaBuilderCalendar({
  month,
  slots,
  selectedId,
  pillarOptions,
  slotDefaults,
  activeDates,
  view,
  weekDates = [],
  onSelectDate,
}: GrillaBuilderCalendarProps) {
  const weeks = buildMonthCalendar(month);
  const selectedSlot = slots.find((s) => s.id === selectedId) ?? null;
  const selectedDate = selectedSlot?.date ?? null;

  const slotsByDate = slots.reduce<Record<string, GrillaSlot[]>>((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  const header = (
    <div className="grid grid-cols-7 gap-1">
      {WEEKDAYS_MONDAY_START.map((label) => (
        <div
          key={label}
          className="text-center text-[10px] font-medium text-muted py-1"
        >
          {label}
        </div>
      ))}
    </div>
  );

  if (view === "week") {
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-7 gap-1">
          {weekDates.map((date) => {
            const day = Number(date.split("-")[2]);
            return (
              <DayCell
                key={date}
                date={date}
                day={day}
                daySlots={slotsByDate[date] || []}
                isSelected={selectedDate === date}
                isActive
                pillarOptions={pillarOptions}
                slotDefaults={slotDefaults}
                onSelectDate={onSelectDate}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {header}
      <div className="space-y-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((cell, cellIndex) => {
              if (!cell.date || cell.day === null) {
                return <div key={cellIndex} className="aspect-square" />;
              }

              return (
                <DayCell
                  key={cell.date}
                  date={cell.date}
                  day={cell.day}
                  daySlots={slotsByDate[cell.date] || []}
                  isSelected={selectedDate === cell.date}
                  isActive={activeDates.has(cell.date)}
                  pillarOptions={pillarOptions}
                  slotDefaults={slotDefaults}
                  onSelectDate={onSelectDate}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
