import type { CatalogEvent } from "@/lib/calendar-types";
import { catalogShortName } from "@/lib/calendar-types";

interface CatalogLegendProps {
  events: CatalogEvent[];
}

export function CatalogLegend({ events }: CatalogLegendProps) {
  const catalogs = new Map<string, { name: string; color: string }>();

  for (const e of events) {
    if (!catalogs.has(e.catalog_name)) {
      catalogs.set(e.catalog_name, {
        name: e.catalog_name,
        color: e.catalog_color,
      });
    }
  }

  const items = Array.from(catalogs.values());
  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {items.map((c) => (
        <span
          key={c.name}
          title={c.name}
          className="inline-flex flex-1 min-w-0 items-center justify-center gap-1 rounded-full px-1.5 py-1 text-[11px] font-medium border"
          style={{
            borderColor: `${c.color}40`,
            backgroundColor: `${c.color}12`,
            color: c.color,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ backgroundColor: c.color }}
          />
          <span className="truncate">{catalogShortName(c.name)}</span>
        </span>
      ))}
    </div>
  );
}
