"use client";

import { useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Images,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResolvedPostIdentifier } from "@/lib/resolve-post-identifier";
import { cn } from "@/lib/utils";

type IdentifierWithPhoto = ResolvedPostIdentifier & {
  photoUrl: string;
  value: string;
};

async function fetchImageBlob(photoUrl: string): Promise<Blob> {
  const response = await fetch(photoUrl);
  if (!response.ok) throw new Error("fetch failed");
  return response.blob();
}

async function copyImageBlob(blob: Blob) {
  await navigator.clipboard.write([
    new ClipboardItem({ [blob.type || "image/png"]: blob }),
  ]);
}

async function copyAllImageBlobs(blobs: Blob[]) {
  await navigator.clipboard.write(
    blobs.map(
      (blob) =>
        new ClipboardItem({ [blob.type || "image/png"]: blob })
    )
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
    (ref): ref is IdentifierWithPhoto => !!ref.photoUrl && !!ref.value
  );

  const [index, setIndex] = useState(0);
  const [copiedCurrent, setCopiedCurrent] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (withPhotos.length === 0) return null;

  const current = withPhotos[index];
  const hasMultiple = withPhotos.length > 1;

  function goPrev() {
    setIndex((prev) => (prev === 0 ? withPhotos.length - 1 : prev - 1));
  }

  function goNext() {
    setIndex((prev) => (prev === withPhotos.length - 1 ? 0 : prev + 1));
  }

  async function copyCurrentImage() {
    setError(null);
    try {
      const blob = await fetchImageBlob(current.photoUrl);
      await copyImageBlob(blob);
      setCopiedCurrent(true);
      setTimeout(() => setCopiedCurrent(false), 2000);
    } catch {
      setError("No se pudo copiar la imagen.");
    }
  }

  async function copyAllImages() {
    setError(null);
    try {
      const blobs = await Promise.all(
        withPhotos.map((ref) => fetchImageBlob(ref.photoUrl))
      );
      await copyAllImageBlobs(blobs);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      setError(
        hasMultiple
          ? "No se pudieron copiar todas las imágenes. Prueba copiar una por una."
          : "No se pudo copiar la imagen."
      );
    }
  }

  return (
    <section className="rounded-lg border border-border overflow-hidden bg-surface">
      <div className="space-y-3 border-b border-border px-4 py-3 bg-background/50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Fotos de referencia
            </p>
            <p className="text-sm font-semibold leading-snug mt-0.5 truncate">
              {label}: {current.value}
            </p>
            {hasMultiple && (
              <p className="text-[11px] text-muted mt-0.5">
                {index + 1} de {withPhotos.length}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={copyCurrentImage}
            title="Copiar imagen actual al portapapeles"
            className="flex-1"
          >
            {copiedCurrent ? <Check size={13} /> : <ImageIcon size={13} />}
            {copiedCurrent ? "Copiada" : "Copiar imagen"}
          </Button>

          {hasMultiple && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={copyAllImages}
              title="Copiar todas las imágenes al portapapeles"
              className="flex-1"
            >
              {copiedAll ? <Check size={13} /> : <Images size={13} />}
              {copiedAll ? "Copiadas" : "Copiar todas"}
            </Button>
          )}
        </div>
      </div>

      <div className="relative bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.photoUrl}
          alt={`${label} ${current.value}`}
          className="w-full max-h-80 object-contain"
        />

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-border bg-surface/95 p-1.5 text-foreground shadow-sm transition-colors hover:bg-surface"
              aria-label="Placa anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-border bg-surface/95 p-1.5 text-foreground shadow-sm transition-colors hover:bg-surface"
              aria-label="Placa siguiente"
            >
              <ChevronRight size={18} />
            </button>

            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {withPhotos.map((ref, i) => (
                <button
                  key={`${ref.catalogId ?? ref.value}`}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Ver ${ref.value}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === index
                      ? "w-4 bg-foreground"
                      : "w-1.5 bg-foreground/30 hover:bg-foreground/50"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="px-4 py-2 text-xs text-destructive border-t border-border">
          {error}
        </p>
      )}
    </section>
  );
}
