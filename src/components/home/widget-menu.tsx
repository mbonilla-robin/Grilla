"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LayoutGrid, Settings2 } from "lucide-react";
import { getWidgetDef } from "@/lib/widget-config";
import { WidgetMenuSection, type SlotWidgetData } from "./widget-slot";
import { cn } from "@/lib/utils";

interface WidgetMenuProps {
  activeWidgets: string[];
  data: SlotWidgetData;
  customizeHref: string;
}

export function WidgetMenu({
  activeWidgets = [],
  data,
  customizeHref,
}: WidgetMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const widgets = activeWidgets.slice(0, 4);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
          open
            ? "border-foreground bg-neutral-100 text-foreground"
            : "border-border text-muted hover:text-foreground hover:bg-neutral-50"
        )}
      >
        <LayoutGrid size={14} />
        Widgets
        {widgets.length > 0 && (
          <span className="text-[10px] bg-neutral-200 rounded-full px-1.5 py-0.5 tabular-nums">
            {widgets.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border bg-neutral-50/80">
            <p className="text-xs font-medium">Widgets</p>
            <p className="text-[10px] text-muted mt-0.5">
              Accesos rápidos personalizables
            </p>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {widgets.length > 0 ? (
              widgets.map((id) => {
                const def = getWidgetDef(id);
                if (!def) return null;
                return (
                  <div key={id} className="border-b border-border last:border-0">
                    <p className="px-3 pt-2.5 pb-1 text-[10px] font-medium text-muted uppercase tracking-wide">
                      {def.label}
                    </p>
                    <div className="px-3 pb-2.5">
                      <WidgetMenuSection id={id} data={data} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="px-3 py-6 text-xs text-muted text-center">
                Sin widgets activos
              </p>
            )}
          </div>

          <Link
            href={customizeHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted hover:text-foreground hover:bg-neutral-50 border-t border-border transition-colors"
          >
            <Settings2 size={13} />
            Personalizar widgets
          </Link>
        </div>
      )}
    </div>
  );
}
