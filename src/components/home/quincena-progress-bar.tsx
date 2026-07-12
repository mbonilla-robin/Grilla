"use client";

import { useEffect, useRef } from "react";
import { WORKFLOW_PHASES } from "@/lib/post-progress";
import type { WorkflowPhaseKey } from "@/lib/post-progress";
import type { QuincenaProgressCard } from "@/lib/quincena-progress";
import {
  PHASE_COLORS,
  QUINCENA_BAR_ANIMATION_MS,
  easeOutCubic,
  quincenaBarFillStyle,
  quincenaProgressPhase,
} from "@/lib/quincena-bar-motion";
import { homeStaggerDelay } from "@/lib/home-motion";
import { cn } from "@/lib/utils";

const PHASE_DOT_COLOR: Record<WorkflowPhaseKey, string> = {
  contenido: "bg-neutral-300",
  brief_listo: "bg-brand/70",
  en_revision: "bg-brand",
  ajustes: "bg-amber-400",
  aprobado: "bg-brand-dark",
};

function runBarAnimation(
  el: HTMLDivElement,
  pct: number,
  delayMs: number
): () => void {
  if (pct <= 0) return () => {};

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    const final = quincenaBarFillStyle(pct);
    el.style.width = final.width as string;
    el.style.backgroundColor = final.backgroundColor as string;
    return () => {};
  }

  let frame = 0;
  let timeout = 0;
  let cancelled = false;

  const start = () => {
    el.style.transition = "background-color 0.35s ease";
    el.style.width = "0%";
    el.style.backgroundColor = PHASE_COLORS.contenido;

    const startedAt = performance.now();
    let lastPhase = quincenaProgressPhase(0);

    const tick = (now: number) => {
      if (cancelled) return;

      const elapsed = now - startedAt;
      const t = Math.min(elapsed / QUINCENA_BAR_ANIMATION_MS, 1);
      const width = easeOutCubic(t) * pct;

      el.style.width = `${width}%`;

      const phase = quincenaProgressPhase(width);
      if (phase !== lastPhase) {
        lastPhase = phase;
        el.style.backgroundColor = PHASE_COLORS[phase];
      }

      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        const final = quincenaBarFillStyle(pct);
        el.style.width = final.width as string;
        el.style.backgroundColor = final.backgroundColor as string;
      }
    };

    frame = requestAnimationFrame(tick);
  };

  if (delayMs > 0) {
    timeout = window.setTimeout(start, delayMs * 1000);
  } else {
    start();
  }

  return () => {
    cancelled = true;
    cancelAnimationFrame(frame);
    clearTimeout(timeout);
  };
}

export function QuincenaProgressBar({
  card,
  index = 0,
  animKey = 0,
}: {
  card: QuincenaProgressCard;
  index?: number;
  animKey?: number;
}) {
  const pct = card.averageProgressPct;
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el || pct <= 0) return;

    const delay =
      animKey > 0 ? 0 : parseFloat(homeStaggerDelay(index, 0.28, 0.1));

    return runBarAnimation(el, pct, delay);
  }, [pct, index, animKey]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5">
        <div className="relative h-2 w-full flex-1 overflow-hidden rounded-full bg-neutral-200">
          {pct > 0 ? (
            <div
              ref={barRef}
              className="h-full rounded-full will-change-[width,background-color]"
              style={{
                width: "0%",
                backgroundColor: PHASE_COLORS.contenido,
              }}
            />
          ) : null}
        </div>
        <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted">
          {pct}%
        </span>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {WORKFLOW_PHASES.map((phase) => {
          const count = card.phases[phase.key];
          if (count === 0) return null;

          return (
            <span
              key={phase.key}
              className="inline-flex items-center gap-1.5 text-[10px] text-muted"
            >
              <span
                className={cn("h-1.5 w-1.5 rounded-full", PHASE_DOT_COLOR[phase.key])}
              />
              {count} {phase.label.toLowerCase()}
            </span>
          );
        })}
      </div>
    </div>
  );
}
