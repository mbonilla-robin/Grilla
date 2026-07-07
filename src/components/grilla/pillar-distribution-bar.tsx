"use client";

import { resolvePillarDisplayColor } from "@/lib/pillar-colors";
import { PILLAR_DEFAULTS } from "@/lib/pillar-colors";

export interface PillarTarget {
  name: string;
  targetPct: number;
}

interface PillarDistributionBarProps {
  pillars: PillarTarget[];
  counts: Record<string, number>;
}

function defaultPillars(): PillarTarget[] {
  return PILLAR_DEFAULTS.map((p) => ({ name: p.name, targetPct: p.target_pct }));
}

export function PillarDistributionBar({
  pillars,
  counts,
}: PillarDistributionBarProps) {
  const targets = pillars.length > 0 ? pillars : defaultPillars();
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  const distribution = targets.map((pillar, index) => {
    const count = counts[pillar.name] || 0;
    const actualPct = total > 0 ? Math.round((count / total) * 100) : 0;
    const delta = actualPct - pillar.targetPct;
    return { ...pillar, count, actualPct, delta, colorIndex: index };
  });

  const active = distribution.filter((d) => d.count > 0);

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">Distribución de pilares</p>
        <span className="text-[11px] text-muted tabular-nums">
          {total} post{total !== 1 ? "s" : ""} planificado{total !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="h-3 rounded-full overflow-hidden flex bg-neutral-100">
        {total === 0 ? (
          <div className="h-full w-full bg-neutral-100" />
        ) : (
          active.map((d) => (
            <div
              key={d.name}
              className="h-full transition-all duration-300"
              style={{
                width: `${d.actualPct}%`,
                backgroundColor: resolvePillarDisplayColor(d.colorIndex),
              }}
              title={`${d.name}: ${d.actualPct}%`}
            />
          ))
        )}
      </div>

      <div
        className="grid w-full gap-x-2 gap-y-1"
        style={{
          gridTemplateColumns: `repeat(${Math.min(targets.length, 4)}, minmax(0, 1fr))`,
        }}
      >
        {distribution.map((d) => {
          const onTarget = total === 0 || Math.abs(d.delta) <= 5;
          return (
            <div key={d.name} className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px]">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: resolvePillarDisplayColor(d.colorIndex),
                  }}
                />
                <span className="truncate text-muted">{d.name}</span>
              </div>
              <p className="text-[11px] tabular-nums mt-0.5 pl-3.5">
                <span className={onTarget ? "text-foreground" : "text-amber-600"}>
                  {d.actualPct}%
                </span>
                <span className="text-muted"> / obj. {d.targetPct}%</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
