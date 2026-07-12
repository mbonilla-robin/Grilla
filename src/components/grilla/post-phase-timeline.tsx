"use client";

import { cn } from "@/lib/utils";
import type { PostStatus } from "@/lib/types";
import { currentPhaseIndex, WORKFLOW_PHASES } from "@/lib/post-progress";

interface PostPhaseTimelineProps {
  status: PostStatus;
  className?: string;
}

const PHASE_BAR_STYLES = [
  "bg-white border border-border",
  "bg-brand-muted",
  "bg-brand",
  "bg-amber-200 border border-amber-300",
  "bg-brand-dark",
] as const;

export function PostPhaseTimeline({ status, className }: PostPhaseTimelineProps) {
  const activeIdx = currentPhaseIndex(status);

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[10px] text-muted uppercase tracking-wide">Progreso del post</p>
      <div className="relative flex gap-1">
        {WORKFLOW_PHASES.map((phase, i) => {
          const isPast = i < activeIdx;
          const isActive = i === activeIdx;
          const isFuture = i > activeIdx;

          return (
            <div key={phase.key} className="flex-1 min-w-0 space-y-1.5">
              <div
                className={cn(
                  "h-2 rounded-full transition-colors",
                  (isPast || isActive) && PHASE_BAR_STYLES[i],
                  isFuture && "bg-neutral-100"
                )}
              />
              <p
                className={cn(
                  "text-[10px] truncate text-center",
                  isActive ? "font-medium text-foreground" : "text-muted"
                )}
              >
                {phase.label}
              </p>
            </div>
          );
        })}
        <div
          className="absolute top-0 h-2 w-0.5 bg-destructive/60 rounded-full -translate-x-1/2 pointer-events-none"
          style={{
            left: `${((activeIdx + 0.5) / WORKFLOW_PHASES.length) * 100}%`,
          }}
          aria-hidden
        />
      </div>
    </div>
  );
}
