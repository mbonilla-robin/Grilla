"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { upsertContentPillar } from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { ContentPillar } from "@/lib/types";
import type { OrgStatsData } from "@/lib/pillars-data";

interface PillarsDashboardProps {
  orgId: string;
  data: OrgStatsData;
  isAdmin: boolean;
}

function DonutChart({ distribution }: { distribution: OrgStatsData["distribution"] }) {
  const total = distribution.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted">
        Sin posts este mes
      </div>
    );
  }

  let cumulative = 0;
  const segments = distribution
    .filter((d) => d.count > 0)
    .map((d) => {
      const pct = (d.count / total) * 100;
      const start = cumulative;
      cumulative += pct;
      return { ...d, start, end: cumulative };
    });

  const gradient = segments
    .map((s) => `${s.color} ${s.start}% ${s.end}%`)
    .join(", ");

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div
        className="relative h-36 w-36 rounded-full shrink-0"
        style={{
          background: gradient ? `conic-gradient(${gradient})` : "#e5e5e5",
        }}
      >
        <div className="absolute inset-4 rounded-full bg-surface flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{total}</span>
          <span className="text-[10px] text-muted uppercase">posts</span>
        </div>
      </div>

      <div className="flex-1 space-y-2 w-full">
        {distribution.map((d) => (
          <div key={d.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                {d.name}
              </span>
              <span className="text-muted tabular-nums">
                {d.count} ({d.actualPct}%)
                {d.targetPct > 0 && (
                  <span className="text-[10px] ml-1">meta {d.targetPct}%</span>
                )}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(d.actualPct, 100)}%`,
                  backgroundColor: d.color,
                }}
              />
              {d.targetPct > 0 && (
                <div
                  className="relative -mt-1.5 h-1.5 border-r-2 border-dashed border-neutral-400"
                  style={{ width: `${d.targetPct}%` }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PillarsDashboard({ orgId, data, isAdmin }: PillarsDashboardProps) {
  const [pillars, setPillars] = useState(data.pillars);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function savePillars() {
    setSaving(true);
    for (const [i, pillar] of pillars.entries()) {
      await upsertContentPillar(orgId, {
        id: pillar.id,
        name: pillar.name,
        color: pillar.color,
        target_pct: pillar.target_pct,
        sort_order: i,
      });
    }
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="space-y-6">
      {data.balanceAlerts.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Balance de contenido
          </p>
          <div className="space-y-1.5">
            {data.balanceAlerts.map((alert) => {
              const [pillar, detail] = alert.split(/:\s(.+)/);
              return (
                <div
                  key={alert}
                  className="flex items-baseline justify-between gap-4 text-sm"
                >
                  <span className="text-foreground/80">{pillar}</span>
                  <span className="text-xs text-muted text-right shrink-0">
                    {detail}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <section className="home-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium">Distribución por pilares</h2>
          <span className="text-xs text-muted">Este mes</span>
        </div>
        <DonutChart distribution={data.distribution} />
      </section>

      <section className="home-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="text-muted" />
          <h2 className="text-sm font-medium">Rendimiento de la cuenta</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Alcance total", value: data.totalReach.toLocaleString() },
            { label: "Likes", value: data.totalLikes.toLocaleString() },
            { label: "Comentarios", value: data.totalComments.toLocaleString() },
            { label: "Engagement prom.", value: data.avgEngagement.toLocaleString() },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-neutral-50 p-3">
              <p className="text-[10px] text-muted uppercase tracking-wide">
                {stat.label}
              </p>
              <p className="text-xl font-semibold tabular-nums mt-1">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {data.topPosts.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-muted" />
              <p className="text-xs font-medium text-muted">Top posts por engagement</p>
            </div>
            <div className="divide-y divide-border rounded-lg border border-border">
              {data.topPosts.map((post, i) => (
                <Link
                  key={post.id}
                  href={`/org/${orgId}/grilla/${post.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors"
                >
                  <span className="text-xs font-medium text-muted w-4">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{post.title}</p>
                    <p className="text-[10px] text-muted">
                      {post.pillar || "Sin pilar"}
                      {post.engagement > 0 && (
                        <> · {post.engagement} interacciones</>
                      )}
                    </p>
                  </div>
                  {post.engagement > 0 && (
                    <span className="text-xs font-medium tabular-nums text-emerald-600">
                      {post.engagement}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Registra métricas en posts publicados para ver el rendimiento aquí.
          </p>
        )}
      </section>

      {isAdmin && (
        <section className="home-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium">Configurar pilares</h2>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => (editing ? savePillars() : setEditing(true))}
              loading={saving}
            >
              {editing ? "Guardar" : "Editar"}
            </Button>
          </div>

          <div className="space-y-3">
            {pillars.map((pillar, i) => (
              <div
                key={pillar.id}
                className={cn(
                  "grid grid-cols-[1fr_80px_60px] gap-3 items-center",
                  !editing && "opacity-80"
                )}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={pillar.color}
                    disabled={!editing}
                    onChange={(e) => {
                      const next = [...pillars];
                      next[i] = { ...pillar, color: e.target.value };
                      setPillars(next);
                    }}
                    className="h-7 w-7 rounded border border-border cursor-pointer disabled:cursor-default"
                  />
                  {editing ? (
                    <Input
                      value={pillar.name}
                      onChange={(e) => {
                        const next = [...pillars];
                        next[i] = { ...pillar, name: e.target.value };
                        setPillars(next);
                      }}
                    />
                  ) : (
                    <span className="text-sm">{pillar.name}</span>
                  )}
                </div>
                {editing ? (
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={pillar.target_pct}
                    onChange={(e) => {
                      const next = [...pillars];
                      next[i] = {
                        ...pillar,
                        target_pct: parseInt(e.target.value, 10) || 0,
                      };
                      setPillars(next);
                    }}
                  />
                ) : (
                  <span className="text-sm text-muted text-center">
                    {pillar.target_pct}%
                  </span>
                )}
                <span className="text-[10px] text-muted text-right">meta</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
