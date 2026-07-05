import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { BrandPillarProgress } from "@/lib/pillars-data";
import { EmptyState } from "./home-ui";

function BrandRow({ brand }: { brand: BrandPillarProgress }) {
  const pillars = brand.distribution.filter((d) => d.name !== "Sin pilar");
  const hasPillars = pillars.length > 0;
  const active = brand.distribution.filter((d) => d.count > 0);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/org/${brand.orgId}/home`}
          className="text-sm font-medium hover:underline truncate"
        >
          {brand.orgName}
        </Link>
        <span className="text-[10px] text-muted shrink-0 tabular-nums">
          {brand.totalPosts} post{brand.totalPosts !== 1 ? "s" : ""} este mes
        </span>
      </div>

      {hasPillars ? (
        <>
          <div className="h-4 rounded-full overflow-hidden flex bg-neutral-100">
            {brand.totalPosts === 0 ? null : (
              active.map((d) => (
                <div
                  key={d.name}
                  className="h-full"
                  style={{
                    width: `${d.actualPct}%`,
                    backgroundColor: d.color,
                  }}
                  title={`${d.name}: ${d.actualPct}%`}
                />
              ))
            )}
          </div>

          <div
            className="grid w-full"
            style={{ gridTemplateColumns: `repeat(${pillars.length}, minmax(0, 1fr))` }}
          >
            {pillars.map((d) => (
              <span
                key={d.name}
                className="flex items-center justify-center gap-1.5 text-xs text-muted min-w-0 px-1"
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="truncate">{d.name}</span>
                <span className="tabular-nums shrink-0">{d.actualPct}%</span>
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted">Sin pilares configurados.</p>
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
          <BrandRow brand={brand} />
        </div>
      ))}
      <Link
        href="/home/marcas"
        className="inline-flex items-center gap-0.5 text-xs text-muted hover:text-foreground"
      >
        Ver todas las marcas
        <ChevronRight size={12} />
      </Link>
    </div>
  );
}
