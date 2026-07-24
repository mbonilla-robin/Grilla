"use client";

import { formatPillars, togglePillarSelection } from "@/lib/pillars";
import { cn } from "@/lib/utils";

interface PostPillarFieldProps {
  options: string[];
  selected: string[];
  onChange: (pillars: string[]) => void;
  disabled?: boolean;
  label?: string;
  compact?: boolean;
}

export function PostPillarField({
  options,
  selected,
  onChange,
  disabled = false,
  label = "Pilares",
  compact = false,
}: PostPillarFieldProps) {
  function toggle(pillar: string) {
    if (disabled) return;
    const next = togglePillarSelection(selected, pillar);
    // Always keep at least one when options exist
    if (next.length === 0 && options.length > 0) return;
    onChange(next);
  }

  return (
    <div className={cn("space-y-1.5", compact && "space-y-1")}>
      {(label || selected.length > 1) && (
        <div className="flex items-baseline justify-between gap-2">
          {label ? (
            <label
              className={cn(
                compact ? "text-xs text-muted" : "text-sm text-muted"
              )}
            >
              {label}
            </label>
          ) : (
            <span />
          )}
          {selected.length > 1 && (
            <span className="text-[10px] text-muted">
              {selected.length} seleccionados
            </span>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {options.map((pillar) => {
          const isOn = selected.includes(pillar);
          return (
            <button
              key={pillar}
              type="button"
              disabled={disabled}
              onClick={() => toggle(pillar)}
              aria-pressed={isOn}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                compact && "px-2 py-0.5",
                isOn
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-surface text-muted hover:text-foreground hover:border-foreground/20",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {pillar}
            </button>
          );
        })}
      </div>
      {selected.length > 1 && (
        <p className={cn("text-muted", compact ? "text-[10px]" : "text-[11px]")}>
          Se guardan juntos: {formatPillars(selected)}
        </p>
      )}
    </div>
  );
}
