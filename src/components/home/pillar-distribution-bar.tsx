"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { homeStaggerDelay } from "@/lib/home-motion";
import { cn } from "@/lib/utils";

export interface PillarBarSegment {
  name: string;
  actualPct: number;
  color: string;
}

function segmentCenterPct(
  segments: Array<{ widthPct: number }>,
  index: number
): number {
  let left = 0;
  for (let i = 0; i < index; i += 1) {
    left += segments[i].widthPct;
  }
  return left + segments[index].widthPct / 2;
}

function withBarWidths(segments: PillarBarSegment[]) {
  const total = segments.reduce((sum, segment) => sum + Math.max(segment.actualPct, 0), 0);
  if (total <= 0) {
    return segments.map((segment) => ({ ...segment, widthPct: 0 }));
  }
  return segments.map((segment) => ({
    ...segment,
    widthPct: (Math.max(segment.actualPct, 0) / total) * 100,
  }));
}

function PillarBarTooltip({
  name,
  pct,
  leftPct,
}: {
  name: string;
  pct: number;
  leftPct: number;
}) {
  return (
    <div
      role="tooltip"
      className={cn(
        "pointer-events-none absolute bottom-full z-50 mb-2 -translate-x-1/2",
        "whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5",
        "text-[11px] font-medium leading-none text-foreground shadow-lg"
      )}
      style={{ left: `${leftPct}%` }}
    >
      <span>{name}</span>
      <span className="text-muted"> · {pct}%</span>
      <span
        className="absolute left-1/2 top-full -translate-x-1/2 border-[5px] border-transparent border-t-surface"
        aria-hidden
      />
    </div>
  );
}

function PillarBarSegmentItem({
  segment,
  widthPct,
  segmentIndex,
  barIndex,
  active,
  onActivate,
  onDeactivate,
}: {
  segment: PillarBarSegment;
  widthPct: number;
  segmentIndex: number;
  barIndex: number;
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  return (
    <div
      className="relative h-full min-w-0 cursor-pointer"
      style={{ flexGrow: widthPct, flexBasis: 0 }}
      onMouseEnter={onActivate}
      onMouseLeave={onDeactivate}
      onFocus={onActivate}
      onBlur={onDeactivate}
      onClick={(event) => {
        event.stopPropagation();
        onActivate();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate();
        }
        if (event.key === "Escape") onDeactivate();
      }}
      tabIndex={0}
      role="button"
      aria-label={`${segment.name}: ${segment.actualPct}%`}
      aria-pressed={active}
    >
      <div
        className={cn(
          "h-full w-full ring-1 ring-inset ring-black/10 home-animate-bar transition-[filter,opacity] duration-150",
          active ? "brightness-110 saturate-125 opacity-100" : "opacity-90 hover:opacity-100"
        )}
        style={{
          backgroundColor: segment.color,
          animationDelay: homeStaggerDelay(
            segmentIndex,
            0.35 + barIndex * 0.05,
            0.08
          ),
        }}
      />
    </div>
  );
}

export function PillarDistributionBar({
  segments,
  barIndex = 0,
}: {
  segments: PillarBarSegment[];
  barIndex?: number;
}) {
  const barId = useId();
  const [activeSegment, setActiveSegment] = useState<string | null>(null);

  const sizedSegments = useMemo(() => withBarWidths(segments), [segments]);

  const activeIndex = useMemo(
    () => sizedSegments.findIndex((segment) => segment.name === activeSegment),
    [sizedSegments, activeSegment]
  );

  const activeData = activeIndex >= 0 ? sizedSegments[activeIndex] : null;

  useEffect(() => {
    if (!activeSegment) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest(`[data-pillar-bar="${barId}"]`)) {
        setActiveSegment(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [activeSegment, barId]);

  if (segments.length === 0) return null;

  return (
    <div
      className="relative overflow-visible py-7"
      data-pillar-bar={barId}
    >
      {activeData && activeIndex >= 0 ? (
        <PillarBarTooltip
          name={activeData.name}
          pct={activeData.actualPct}
          leftPct={segmentCenterPct(sizedSegments, activeIndex)}
        />
      ) : null}

      <div className="flex h-4 overflow-hidden rounded-full bg-neutral-100">
        {sizedSegments.map((segment, segmentIndex) => (
          <PillarBarSegmentItem
            key={segment.name}
            segment={segment}
            widthPct={segment.widthPct}
            segmentIndex={segmentIndex}
            barIndex={barIndex}
            active={activeSegment === segment.name}
            onActivate={() => setActiveSegment(segment.name)}
            onDeactivate={() => setActiveSegment(null)}
          />
        ))}
      </div>

      <p
        className={cn(
          "mt-2 text-center text-[11px] font-medium leading-none sm:hidden",
          activeData ? "text-foreground" : "text-transparent select-none"
        )}
        aria-live="polite"
      >
        {activeData ? `${activeData.name} · ${activeData.actualPct}%` : "\u00a0"}
      </p>
    </div>
  );
}
