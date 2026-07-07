"use client";

import { useState } from "react";
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
}

const textareaClass =
  "flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none";

export function GrillaCopyEditor({
  format,
  value,
  onChange,
}: GrillaCopyEditorProps) {
  const mode = copyEditorMode(format);
  const [parts, setParts] = useState<string[]>(() => parseCopyParts(value, format));

  function emit(nextParts: string[]) {
    setParts(nextParts);
    onChange(serializeCopyParts(nextParts, format));
  }

  function updatePart(index: number, text: string) {
    const next = [...parts];
    next[index] = text;
    emit(next);
  }

  function addPart() {
    emit([...parts, ""]);
  }

  function removePart(index: number) {
    if (parts.length <= 1) {
      emit([""]);
      return;
    }
    emit(parts.filter((_, i) => i !== index));
  }

  if (mode === "single") {
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
        ))}
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={addPart}>
        <Plus size={12} />
        {addLabel}
      </Button>
    </div>
  );
}
