import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { BrandPillarProgress } from "@/lib/pillars-data";
import { resolvePillarDisplayColor } from "@/lib/pillar-colors";
import { homeStaggerDelay } from "@/lib/home-motion";
import { PillarDistributionBar } from "./pillar-distribution-bar";
import { EmptyState } from "./home-ui";

function BrandRow({ brand, index = 0 }: { brand: BrandPillarProgress; index?: number }) {
  const pillars = brand.distribution.filter((d) => d.name !== "Sin pilar");
  const hasPillars = pillars.length > 0;
  const active = brand.distribution.filter((d) => d.count > 0);

  return (
    <div
      className="space-y-2.5 home-animate-in overflow-visible"
      style={{ animationDelay: homeStaggerDelay(index, 0.12, 0.1) }}
    >
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/org/${brand.orgId}/home`}
          className="text-body hover:underline truncate"
        >
          {brand.orgName}
        </Link>
        <span className="text-micro shrink-0 tabular-nums">
          {brand.totalPosts} post{brand.totalPosts !== 1 ? "s" : ""} este mes
        </span>
      </div>

      {hasPillars ? (
        <>
          {brand.totalPosts === 0 ? (
            <div className="h-4 rounded-full bg-neutral-100" />
          ) : (
            <PillarDistributionBar
              barIndex={index}
              segments={active.map((d) => {
                const pillarIndex = pillars.findIndex((p) => p.name === d.name);
                return {
                  name: d.name,
                  actualPct: d.actualPct,
                  color: resolvePillarDisplayColor(
                    pillarIndex >= 0 ? pillarIndex : 0
                  ),
                };
              })}
            />
          )}

          <div
            className="hidden sm:grid w-full"
            style={{ gridTemplateColumns: `repeat(${pillars.length}, minmax(0, 1fr))` }}
          >
            {pillars.map((d, i) => {
              const color = resolvePillarDisplayColor(i);
              return (
                <span
                  key={d.name}
                  className="flex items-center justify-center gap-1.5 text-caption min-w-0 px-1"
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate">{d.name}</span>
                  <span className="tabular-nums shrink-0">{d.actualPct}%</span>
                </span>
              );
            })}
          </div>
        </>
      ) : (
        <p className="text-caption">Sin pilares configurados.</p>
      )}
    </div>
  );
}

export function BrandPillarsChart({ brands }: { brands: BrandPillarProgress[] }) {
  if (brands.length === 0) {
    return <EmptyState text="No tienes marcas activas." />;
  }

  return (
    <div className="space-y-5">
      {brands.map((brand, i) => (
        <div
          key={brand.orgId}
          className={i > 0 ? "pt-5 border-t border-border" : undefined}
        >
          <BrandRow brand={brand} index={i} />
        </div>
      ))}
      <Link
        href="/home/marcas"
        className="inline-flex items-center gap-0.5 text-caption hover:text-foreground"
      >
        Ver todas las marcas
        <ChevronRight size={12} />
      </Link>
    </div>
  );
}
