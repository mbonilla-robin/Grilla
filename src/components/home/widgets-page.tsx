"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { updateHomeWidgets } from "@/lib/actions";
import {
  getWidgetDef,
  slotWidgetsForScope,
  MAX_SLOT_WIDGETS,
  type WidgetScope,
} from "@/lib/widget-config";
import { cn } from "@/lib/utils";

interface WidgetsPageProps {
  scope: WidgetScope;
  activeWidgets: string[];
  backHref: string;
  title: string;
  orgId?: string;
}

export function WidgetsPage({
  scope,
  activeWidgets,
  backHref,
  title,
  orgId,
}: WidgetsPageProps) {
  const [selected, setSelected] = useState<string[]>(
    (activeWidgets ?? []).slice(0, MAX_SLOT_WIDGETS)
  );
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const available = slotWidgetsForScope(scope);

  async function handleSave() {
    setSaving(true);
    await updateHomeWidgets(scope, selected.slice(0, MAX_SLOT_WIDGETS), orgId);
    router.push(backHref);
    router.refresh();
  }

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((w) => w !== id);
      if (prev.length >= MAX_SLOT_WIDGETS) return prev;
      return [...prev, id];
    });
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <header className="space-y-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Volver
        </Link>
        <h1 className="text-title-sub">{title}</h1>
        <p className="text-sm text-muted">
          Elige hasta {MAX_SLOT_WIDGETS} widgets para la fila horizontal de tu inicio.
        </p>
        <p className="text-xs text-muted">
          {selected.length}/{MAX_SLOT_WIDGETS} seleccionados
        </p>
      </header>

      <div className="space-y-2">
        {available.map((w) => {
          const def = getWidgetDef(w.id)!;
          const on = selected.includes(w.id);
          const disabled = !on && selected.length >= MAX_SLOT_WIDGETS;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => toggle(w.id)}
              disabled={disabled}
              className={cn(
                "w-full text-left rounded-lg border px-4 py-3 transition-colors",
                on
                  ? "border-foreground bg-neutral-50"
                  : "border-border bg-surface hover:border-foreground/20",
                disabled && "opacity-40 cursor-not-allowed"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{def.label}</p>
                  <p className="text-xs text-muted mt-0.5">{def.description}</p>
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

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-md bg-foreground text-background py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {saving ? "Guardando…" : "Guardar"}
      </button>
    </div>
  );
}
