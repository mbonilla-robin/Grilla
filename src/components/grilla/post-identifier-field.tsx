"use client";

import Link from "next/link";
import type { OrgIdentifier } from "@/lib/types";
import type { OrgIdentifierConfig } from "@/lib/org-identifier";
import { selectionFromIdentifierIds } from "@/lib/resolve-post-identifier";
import { cn } from "@/lib/utils";

interface PostIdentifierFieldProps {
  orgId: string;
  config: OrgIdentifierConfig;
  identifiers: OrgIdentifier[];
  selectedIds: string[];
  onChange: (selection: {
    ids: string[];
    id: string | null;
    value: string;
    photoUrl: string | null;
  }) => void;
  disabled?: boolean;
}

export function PostIdentifierField({
  orgId,
  config,
  identifiers,
  selectedIds,
  onChange,
  disabled = false,
}: PostIdentifierFieldProps) {
  if (!config.label) return null;

  const selected = identifiers.filter((item) => selectedIds.includes(item.id));

  function emit(ids: string[]) {
    const selection = selectionFromIdentifierIds(ids, identifiers);
    onChange({ ids, ...selection });
  }

  function toggle(id: string) {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      emit(selectedIds.filter((item) => item !== id));
    } else {
      emit([...selectedIds, id]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <label className="text-sm text-muted">{config.label}</label>
          {selectedIds.length > 0 && (
            <span className="text-[10px] text-muted">
              {selectedIds.length} seleccionad
              {selectedIds.length === 1 ? "o" : "os"}
            </span>
          )}
        </div>

        {identifiers.length === 0 ? (
          <p className="text-[11px] text-muted rounded-md border border-dashed border-border px-3 py-2">
            Sin {config.label.toLowerCase()}s — agrégalas en Marca
          </p>
        ) : (
          <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-surface p-1.5 space-y-0.5">
            {identifiers.map((item) => {
              const isOn = selectedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(item.id)}
                  aria-pressed={isOn}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    isOn
                      ? "bg-accent/15 text-foreground"
                      : "text-muted hover:bg-background hover:text-foreground",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                      isOn
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-surface"
                    )}
                    aria-hidden
                  >
                    {isOn ? "✓" : ""}
                  </span>
                  <span className="min-w-0 truncate font-medium">{item.value}</span>
                  {item.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.photo_url}
                      alt=""
                      className="ml-auto h-6 w-6 shrink-0 rounded object-cover border border-border"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected.length === 1 && selected[0].photo_url && (
        <div className="space-y-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selected[0].photo_url}
            alt={selected[0].value}
            className="h-28 w-auto max-w-full rounded-lg border border-border object-cover"
          />
          <p className="text-[11px] text-muted">
            Esta foto se usa en el brief de diseño.
          </p>
        </div>
      )}

      {selected.length > 1 && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-2">
            {selected
              .filter((item) => item.photo_url)
              .map((item) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={item.id}
                  src={item.photo_url!}
                  alt={item.value}
                  className="h-16 w-16 rounded-lg border border-border object-cover"
                  title={item.value}
                />
              ))}
          </div>
          <p className="text-[11px] text-muted">
            Varios {config.label.toLowerCase()}s: las fotos del catálogo se usan
            en el brief.
          </p>
        </div>
      )}

      {identifiers.length === 0 && (
        <p className="text-[11px] text-muted">
          Crea {config.label.toLowerCase()}s con foto en{" "}
          <Link
            href={`/org/${orgId}/marca?tab=identificador`}
            className="text-foreground underline"
          >
            Marca → Identificador
          </Link>
          .
        </p>
      )}
    </div>
  );
}
