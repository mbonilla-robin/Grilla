"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  copyEditorMode,
  parseCopyParts,
  serializeCopyParts,
} from "@/lib/grilla-slot-utils";
import type { PostFormat } from "@/lib/types";

interface GrillaCopyEditorProps {
  format: PostFormat;
  value: string;
  onChange: (value: string) => void;
  /** When set with onChangeEn, shows ES | EN columns with synced slide count. */
  bilingual?: boolean;
  valueEn?: string;
  onChangeEn?: (value: string) => void;
}

const textareaClass =
  "flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none";

function alignParts(primary: string[], secondary: string[]): string[] {
  const len = Math.max(primary.length, secondary.length, 1);
  return Array.from({ length: len }, (_, i) => secondary[i] ?? "");
}

export function GrillaCopyEditor({
  format,
  value,
  onChange,
  bilingual = false,
  valueEn = "",
  onChangeEn,
}: GrillaCopyEditorProps) {
  const mode = copyEditorMode(format);
  const [parts, setParts] = useState<string[]>(() =>
    parseCopyParts(value, format)
  );
  const [partsEn, setPartsEn] = useState<string[]>(() =>
    alignParts(parseCopyParts(value, format), parseCopyParts(valueEn, format))
  );

  useEffect(() => {
    const next = parseCopyParts(value, format);
    setParts(next);
    if (bilingual && onChangeEn) {
      setPartsEn((prev) => alignParts(next, prev.length ? prev : parseCopyParts(valueEn, format)));
    }
    // Only re-sync when format/slot identity changes via remount (key) or external value swap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format]);

  function emitBoth(nextEs: string[], nextEn: string[]) {
    const len = Math.max(nextEs.length, nextEn.length, 1);
    const es = Array.from({ length: len }, (_, i) => nextEs[i] ?? "");
    const en = Array.from({ length: len }, (_, i) => nextEn[i] ?? "");
    setParts(es);
    setPartsEn(en);
    onChange(serializeCopyParts(es, format));
    onChangeEn?.(serializeCopyParts(en, format));
  }

  function emit(nextParts: string[]) {
    setParts(nextParts);
    onChange(serializeCopyParts(nextParts, format));
  }

  function updatePart(index: number, text: string) {
    if (bilingual && onChangeEn) {
      const nextEs = [...parts];
      nextEs[index] = text;
      emitBoth(nextEs, partsEn);
      return;
    }
    const next = [...parts];
    next[index] = text;
    emit(next);
  }

  function updatePartEn(index: number, text: string) {
    if (!onChangeEn) return;
    const nextEn = [...partsEn];
    nextEn[index] = text;
    emitBoth(parts, nextEn);
  }

  function addPart() {
    if (bilingual && onChangeEn) {
      emitBoth([...parts, ""], [...partsEn, ""]);
      return;
    }
    emit([...parts, ""]);
  }

  function removePart(index: number) {
    if (bilingual && onChangeEn) {
      if (parts.length <= 1) {
        emitBoth([""], [""]);
        return;
      }
      emitBoth(
        parts.filter((_, i) => i !== index),
        partsEn.filter((_, i) => i !== index)
      );
      return;
    }
    if (parts.length <= 1) {
      emit([""]);
      return;
    }
    emit(parts.filter((_, i) => i !== index));
  }

  const showBilingual = bilingual && !!onChangeEn;

  if (mode === "single") {
    if (showBilingual) {
      return (
        <div className="space-y-1.5">
          <label className="text-sm text-muted">Contenido del slide</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted">Español</span>
              <textarea
                value={parts[0] ?? ""}
                onChange={(e) => updatePart(0, e.target.value)}
                rows={5}
                placeholder="¿Qué va a contener este slide?"
                className={`${textareaClass} font-mono text-xs`}
              />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted">English</span>
              <textarea
                value={partsEn[0] ?? ""}
                onChange={(e) => updatePartEn(0, e.target.value)}
                rows={5}
                placeholder="What goes in this slide?"
                className={`${textareaClass} font-mono text-xs`}
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-1.5">
        <label className="text-sm text-muted">Contenido del slide</label>
        <textarea
          value={parts[0] ?? ""}
          onChange={(e) => updatePart(0, e.target.value)}
          rows={5}
          placeholder="¿Qué va a contener este slide?"
          className={`${textareaClass} font-mono text-xs`}
        />
      </div>
    );
  }

  const itemLabel = mode === "stories" ? "Story" : "Slide";
  const addLabel =
    mode === "stories" ? "Añadir otro story" : "Añadir otro slide";

  return (
    <div className="space-y-2">
      <label className="text-sm text-muted">
        {mode === "stories" ? "Stories" : "Slides del carrusel"}
      </label>
      <div className="space-y-2">
        {parts.map((part, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-background/40 p-3 space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted">
                {itemLabel} {index + 1}
              </span>
              {parts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePart(index)}
                  className="text-muted hover:text-foreground"
                  aria-label={`Quitar ${itemLabel} ${index + 1}`}
                >
                  <X size={12} />
                </button>
              )}
            </div>
            {showBilingual ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-muted">
                    Español
                  </span>
                  <textarea
                    value={part}
                    onChange={(e) => updatePart(index, e.target.value)}
                    rows={3}
                    placeholder={
                      mode === "stories"
                        ? `¿Qué va en el story ${index + 1}?`
                        : `¿Qué va en el slide ${index + 1}?`
                    }
                    className={`${textareaClass} font-mono text-xs`}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-muted">
                    English
                  </span>
                  <textarea
                    value={partsEn[index] ?? ""}
                    onChange={(e) => updatePartEn(index, e.target.value)}
                    rows={3}
                    placeholder={
                      mode === "stories"
                        ? `What goes in story ${index + 1}?`
                        : `What goes in slide ${index + 1}?`
                    }
                    className={`${textareaClass} font-mono text-xs`}
                  />
                </div>
              </div>
            ) : (
              <textarea
                value={part}
                onChange={(e) => updatePart(index, e.target.value)}
                rows={3}
                placeholder={
                  mode === "stories"
                    ? `¿Qué va en el story ${index + 1}?`
                    : `¿Qué va en el slide ${index + 1}?`
                }
                className={`${textareaClass} font-mono text-xs`}
              />
            )}
          </div>
        ))}
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={addPart}>
        <Plus size={12} />
        {addLabel}
      </Button>
    </div>
  );
}
