"use client";

import type { BrandTextCasing } from "@/lib/types";
import type { TextCasingRule } from "@/lib/brand-text-casing";
import { cn } from "@/lib/utils";

const CASING_FIELDS: Array<{ key: keyof BrandTextCasing; label: string; hint?: string }> = [
  { key: "title", label: "Títulos" },
  { key: "subtitle", label: "Subtítulos cortos" },
  { key: "body", label: "Párrafos / texto largo", hint: "Estilo oración" },
  { key: "bullet", label: "Bullets / listas" },
  { key: "cta", label: "CTA" },
];

function CasingToggle({
  value,
  onChange,
  disabled,
}: {
  value: TextCasingRule;
  onChange: (value: TextCasingRule) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex rounded-md border border-border overflow-hidden shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("uppercase")}
        className={cn(
          "px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-colors disabled:opacity-60",
          value === "uppercase"
            ? "bg-foreground text-background"
            : "bg-surface text-muted hover:text-foreground"
        )}
      >
        MAYÚSC
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("sentence")}
        className={cn(
          "px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-60",
          value === "sentence"
            ? "bg-foreground text-background"
            : "bg-surface text-muted hover:text-foreground"
        )}
      >
        Oración
      </button>
    </div>
  );
}

interface BrandTextCasingSectionProps {
  value: BrandTextCasing;
  onChange: (value: BrandTextCasing) => void;
  disabled?: boolean;
}

export function BrandTextCasingSection({
  value,
  onChange,
  disabled,
}: BrandTextCasingSectionProps) {
  return (
    <div className="space-y-2.5">
      <div>
        <label className="text-sm text-muted">Capitalización en briefs</label>
        <p className="text-[11px] text-muted/80 mt-0.5">
          Define si el copy va en MAYÚSCULAS o estilo oración. La IA lo aplica al generar briefs.
        </p>
      </div>
      <div className="rounded-lg border border-border divide-y divide-border bg-surface">
        {CASING_FIELDS.map(({ key, label, hint }) => (
          <div key={key} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{label}</p>
              {hint && <p className="text-[10px] text-muted">{hint}</p>}
            </div>
            <CasingToggle
              value={value[key]}
              disabled={disabled}
              onChange={(rule) => onChange({ ...value, [key]: rule })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
