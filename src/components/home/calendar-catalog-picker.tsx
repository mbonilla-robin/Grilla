"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, CalendarPlus } from "lucide-react";
import { updateOrgCalendarSubscriptions } from "@/lib/actions";
import type { CalendarCatalog } from "@/lib/calendar-types";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  comercial: "Comercial",
  industria: "Industria",
  deportes: "Deportes",
  profesiones: "Profesiones",
  cultural: "Cultural",
  social: "Social",
};

interface CalendarCatalogPickerProps {
  orgId: string;
  catalogs: CalendarCatalog[];
  subscribedIds: string[];
  canEdit?: boolean;
}

export function CalendarCatalogPicker({
  orgId,
  catalogs,
  subscribedIds,
  canEdit = true,
}: CalendarCatalogPickerProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(subscribedIds);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const grouped = useMemo(() => {
    const map = new Map<string, CalendarCatalog[]>();
    for (const c of catalogs) {
      const list = map.get(c.category) ?? [];
      list.push(c);
      map.set(c.category, list);
    }
    return map;
  }, [catalogs]);

  const subscribedCatalogs = catalogs.filter((c) =>
    subscribedIds.includes(c.id)
  );

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    setSaving(true);
    await updateOrgCalendarSubscriptions(orgId, selected);
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  function handleOpen() {
    setSelected(subscribedIds);
    setOpen(true);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {subscribedCatalogs.length > 0 ? (
          subscribedCatalogs.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border"
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
              {c.name}
            </span>
          ))
        ) : (
          <p className="text-xs text-muted">
            Sin calendarios de fértiles. Agrega los que te interesen.
          </p>
        )}

        {canEdit && (
          <button
            type="button"
            onClick={handleOpen}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-neutral-50 transition-colors"
          >
            <CalendarPlus size={13} />
            Agregar calendarios
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
          />
          <div className="relative w-full sm:max-w-lg max-h-[85vh] overflow-hidden bg-surface rounded-t-xl sm:rounded-xl shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-base font-semibold">Calendarios de fértiles</h2>
                <p className="text-xs text-muted mt-0.5">
                  Marca los calendarios relevantes para tu organización
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md hover:bg-neutral-100 text-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-wrap px-5 py-4 space-y-5 flex-1">
              {Array.from(grouped.entries()).map(([category, items]) => (
                <div key={category}>
                  <p className="text-[10px] font-medium text-muted uppercase tracking-wide mb-2">
                    {CATEGORY_LABELS[category] ?? category}
                  </p>
                  <div className="space-y-1.5">
                    {items.map((c) => {
                      const on = selected.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggle(c.id)}
                          className={cn(
                            "w-full text-left rounded-lg border px-3 py-2.5 transition-colors",
                            on
                              ? "border-foreground/30 bg-neutral-50"
                              : "border-border hover:border-foreground/20"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span
                                className="h-3 w-3 rounded-full shrink-0 mt-0.5"
                                style={{ backgroundColor: c.color }}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{c.name}</p>
                                <p className="text-xs text-muted mt-0.5 line-clamp-2">
                                  {c.description}
                                </p>
                              </div>
                            </div>
                            {on && (
                              <span className="h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center shrink-0">
                                <Check size={11} />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
              <p className="text-xs text-muted">
                {selected.length} calendario{selected.length !== 1 ? "s" : ""}{" "}
                seleccionado{selected.length !== 1 ? "s" : ""}
              </p>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
