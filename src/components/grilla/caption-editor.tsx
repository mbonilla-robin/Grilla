"use client";

import { useMemo, useState, useRef, useLayoutEffect } from "react";
import { Eye, X, ArrowLeft, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  INSTAGRAM_CAPTION_LIMIT,
  parseCaption,
  combineCaption,
  countCaptionChars,
  captionCharStatus,
} from "@/lib/caption-utils";
import type { OrgHashtagGroup } from "@/lib/types";

interface CaptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  hashtagGroups?: OrgHashtagGroup[];
  className?: string;
  accountName?: string;
}

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={1}
      placeholder={placeholder}
      className={cn(
        "flex w-full resize-none overflow-hidden border-0 bg-transparent focus:outline-none focus:ring-0",
        className
      )}
    />
  );
}

function CaptionPreviewPanel({
  body,
  tags,
  accountName,
  onClose,
}: {
  body: string;
  tags: string;
  accountName?: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col rounded-xl border border-border bg-surface shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            Volver
          </button>
          <h3 className="text-sm font-medium">Vista previa</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground p-1"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          <div className="rounded-xl border border-border bg-white">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shrink-0" />
              <span className="text-base font-semibold">
                {accountName || "tu_marca"}
              </span>
            </div>
            <div className="px-5 py-5">
              {body ? (
                <p className="text-[15px] whitespace-pre-wrap leading-[1.6]">
                  {body}
                </p>
              ) : (
                <p className="text-base text-muted italic">Sin texto</p>
              )}
              {tags && (
                <p className="text-[15px] whitespace-pre-wrap leading-[1.6] mt-4 text-blue-600">
                  {tags}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CaptionEditor({
  value,
  onChange,
  hashtagGroups = [],
  className,
  accountName,
}: CaptionEditorProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { body, tags } = useMemo(() => parseCaption(value), [value]);
  const charCount = countCaptionChars(value);
  const charStatus = captionCharStatus(charCount);
  const hasContent = Boolean(body.trim() || tags.trim());

  function updateBody(newBody: string) {
    onChange(combineCaption(newBody, tags));
  }

  function updateTags(newTags: string) {
    onChange(combineCaption(body, newTags));
  }

  function insertHashtag(tag: string) {
    const normalized = tag.startsWith("#") ? tag : `#${tag}`;
    const current = tags.trim();
    const next = current ? `${current} ${normalized}` : normalized;
    updateTags(next);
  }

  async function handleCopy() {
    const text = combineCaption(body, tags);
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent
    }
  }

  return (
    <>
      <div className={cn("space-y-4", className)}>
        <div className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-neutral-50/60">
            <span className="text-sm text-muted">Texto del caption</span>
            <span
              className={cn(
                "text-xs tabular-nums font-medium",
                charStatus === "over" && "text-red-600",
                charStatus === "warn" && "text-amber-600",
                charStatus === "ok" && "text-muted"
              )}
            >
              {charCount} / {INSTAGRAM_CAPTION_LIMIT}
            </span>
          </div>

          <AutoResizeTextarea
            value={body}
            onChange={updateBody}
            placeholder="Escribe el texto principal del post..."
            className="px-4 py-4 text-[15px] leading-[1.6] placeholder:text-muted/60"
          />

          <div className="border-t border-border px-4 py-3 bg-neutral-50/30">
            <label className="text-xs font-medium text-muted uppercase tracking-wide">
              Hashtags
            </label>
            <AutoResizeTextarea
              value={tags}
              onChange={updateTags}
              placeholder="#marca #sector #campaña"
              className="mt-2 py-1 text-sm leading-relaxed font-mono placeholder:text-muted/60"
            />
          </div>
        </div>

        {hashtagGroups.length > 0 && (
          <details className="group rounded-lg border border-border bg-neutral-50/40">
            <summary className="cursor-pointer list-none px-3 py-2 text-[10px] font-medium text-muted uppercase tracking-wide select-none [&::-webkit-details-marker]:hidden">
              Banco de hashtags
              <span className="ml-1 normal-case font-normal text-muted/80">
                ({hashtagGroups.reduce((n, g) => n + g.tags.length, 0)})
              </span>
            </summary>
            <div className="border-t border-border px-3 py-2.5 space-y-2">
              {hashtagGroups.map((group) => (
                <div key={group.id}>
                  <p className="text-[10px] text-muted mb-1">{group.category}</p>
                  <div className="flex flex-wrap gap-1">
                    {group.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => insertHashtag(tag)}
                        className="rounded-full bg-white border border-border px-2 py-0.5 text-[10px] text-foreground hover:bg-purple-50 hover:border-purple-200 transition-colors"
                      >
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setPreviewOpen(true)}
            disabled={!hasContent}
          >
            <Eye size={13} />
            Vista previa
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleCopy}
            disabled={!hasContent}
            title="Copiar caption"
            aria-label="Copiar caption"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
      </div>

      {previewOpen && (
        <CaptionPreviewPanel
          body={body}
          tags={tags}
          accountName={accountName}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  );
}
