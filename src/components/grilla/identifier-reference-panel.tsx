"use client";

import { useState } from "react";
import { Check, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResolvedPostIdentifier } from "@/lib/resolve-post-identifier";

interface IdentifierReferencePanelProps {
  label: string;
  value: string;
  photoUrl: string;
}

export function IdentifierReferencePanel({
  label,
  value,
  photoUrl,
}: IdentifierReferencePanelProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copyImage() {
    setError(null);
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No se pudo copiar la imagen.");
    }
  }

  return (
    <section className="rounded-lg border border-border overflow-hidden bg-surface">
      <div className="space-y-3 border-b border-border px-4 py-3 bg-background/50">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Foto de referencia
          </p>
          <p className="text-sm font-semibold leading-snug mt-0.5">
            {label}: {value}
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={copyImage}
          title="Copiar imagen al portapapeles"
          className="w-full"
        >
          {copied ? <Check size={13} /> : <ImageIcon size={13} />}
          {copied ? "Copiada" : "Copiar imagen"}
        </Button>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl}
        alt={`${label} ${value}`}
        className="w-full max-h-80 object-contain bg-neutral-100"
      />

      {error && (
        <p className="px-4 py-2 text-xs text-destructive border-t border-border">
          {error}
        </p>
      )}
    </section>
  );
}

interface IdentifierReferencesListProps {
  label: string;
  references: ResolvedPostIdentifier[];
}

export function IdentifierReferencesList({
  label,
  references,
}: IdentifierReferencesListProps) {
  const withPhotos = references.filter(
    (ref): ref is ResolvedPostIdentifier & { photoUrl: string; value: string } =>
      !!ref.photoUrl && !!ref.value
  );

  if (withPhotos.length === 0) return null;

  return (
    <div className="space-y-4">
      {withPhotos.map((ref) => (
        <IdentifierReferencePanel
          key={`${ref.catalogId ?? ref.value}`}
          label={label}
          value={ref.value}
          photoUrl={ref.photoUrl}
        />
      ))}
    </div>
  );
}
