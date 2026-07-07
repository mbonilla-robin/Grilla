"use client";

import Link from "next/link";
import type { OrgIdentifier } from "@/lib/types";
import type { OrgIdentifierConfig } from "@/lib/org-identifier";

interface PostIdentifierFieldProps {
  orgId: string;
  config: OrgIdentifierConfig;
  identifiers: OrgIdentifier[];
  selectedId: string | null;
  onChange: (selection: {
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
  selectedId,
  onChange,
  disabled = false,
}: PostIdentifierFieldProps) {
  if (!config.label) return null;

  const selected = identifiers.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm text-muted">{config.label}</label>
        <select
          value={selectedId || ""}
          onChange={(e) => {
            const id = e.target.value || null;
            const item = identifiers.find((row) => row.id === id);
            onChange({
              id,
              value: item?.value || "",
              photoUrl: item?.photo_url || null,
            });
          }}
          disabled={disabled}
          className="flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        >
          <option value="">
            {identifiers.length === 0
              ? `Sin ${config.label.toLowerCase()}s — agrégalas en Marca`
              : `Seleccionar ${config.label.toLowerCase()}…`}
          </option>
          {identifiers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.value}
            </option>
          ))}
        </select>
      </div>

      {selected?.photo_url && (
        <div className="space-y-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selected.photo_url}
            alt={selected.value}
            className="h-28 w-auto max-w-full rounded-lg border border-border object-cover"
          />
          <p className="text-[11px] text-muted">
            Esta foto se usa en el brief de diseño.
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
