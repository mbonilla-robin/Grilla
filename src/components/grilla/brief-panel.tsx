"use client";

import { useState } from "react";
import { Sparkles, Download, History, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BriefDisplay } from "@/components/grilla/brief-display";
import type { DesignBrief, BriefHistoryEntry, PostStatus } from "@/lib/types";

interface BriefPanelProps {
  postId: string;
  orgId: string;
  initialBrief: DesignBrief | null;
  initialHistory?: BriefHistoryEntry[];
  onStatusChange?: (status: PostStatus) => void;
}

function exportBriefPdf(brief: DesignBrief, postTitle: string) {
  const slidesHtml = (brief.slides || [])
    .map(
      (s) => `
      <div style="margin-bottom:24px;padding:16px;border:1px solid #e5e5e5;border-radius:8px;">
        <h3 style="margin:0 0 8px;font-size:14px;">Slide ${s.slide}${s.focus ? ` — ${s.focus}` : ""}</h3>
        ${s.visual_concept ? `<p><strong>Concepto Visual:</strong> ${s.visual_concept}</p>` : ""}
        ${s.text_instructions ? `<p><strong>Instrucciones de Texto:</strong><br/>${s.text_instructions.replace(/\n/g, "<br/>")}</p>` : ""}
        ${s.image_treatment ? `<p><strong>Tratamiento:</strong> ${s.image_treatment}</p>` : ""}
        ${s.layout ? `<p><strong>Layout:</strong> ${s.layout}</p>` : ""}
      </div>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Brief — ${postTitle}</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#171717;line-height:1.6}
h1{font-size:20px;margin-bottom:4px}h2{font-size:16px;margin-top:32px}
.meta{color:#737373;font-size:12px;margin-bottom:24px}
.note{background:#fffbeb;border:1px solid #fde68a;padding:12px;border-radius:8px;margin-top:16px;font-size:13px}
@media print{body{margin:20px}}</style></head><body>
<h1>Brief de diseño</h1>
<p class="meta">${postTitle} · Generado ${new Date(brief.generated_at).toLocaleDateString("es")}</p>
${brief.execution_title ? `<h2>🎨 ${brief.execution_title}</h2>` : ""}
${slidesHtml}
${brief.strategic_note ? `<div class="note"><strong>Nota estratégica:</strong> ${brief.strategic_note}</div>` : ""}
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

export function BriefPanel({
  postId,
  orgId,
  initialBrief,
  initialHistory = [],
  onStatusChange,
}: BriefPanelProps) {
  const [brief, setBrief] = useState<DesignBrief | null>(initialBrief);
  const [history, setHistory] = useState<BriefHistoryEntry[]>(initialHistory);
  const [generating, setGenerating] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<number | null>(null);

  async function generateBrief() {
    setGenerating(true);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          orgId,
          instructions: instructions.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.brief) {
        if (brief) {
          setHistory((prev) => [
            { ...brief, archived_at: new Date().toISOString() },
            ...prev,
          ]);
        }
        setBrief(data.brief);
        setInstructions("");
        onStatusChange?.("brief_ready");
      }
    } catch {
      // silent
    }
    setGenerating(false);
  }

  const displayBrief =
    selectedHistory !== null ? history[selectedHistory] : brief;

  return (
    <section className="space-y-4">
      {!brief && (
        <div className="space-y-3">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            placeholder="Instrucciones opcionales: ej. 'más minimalista', 'cambia el CTA'..."
            className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={generateBrief} loading={generating}>
              <Sparkles size={13} />
              Generar brief
            </Button>
          </div>
        </div>
      )}

      {brief && (
        <div className="space-y-3">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            placeholder="Instrucciones para regenerar: ej. 'usa más el color naranja', 'hazlo más corporativo'..."
            className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={generateBrief}
              loading={generating}
            >
              <Sparkles size={13} />
              Regenerar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => brief && exportBriefPdf(brief, postId)}
            >
              <Download size={13} />
              Exportar PDF
            </Button>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowHistory(!showHistory);
                  setSelectedHistory(null);
                }}
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
              >
                <History size={12} />
                Historial ({history.length})
                {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>

          {showHistory && history.length > 0 && (
            <div className="rounded-lg border border-border divide-y divide-border">
              {history.map((entry, i) => (
                <button
                  key={entry.generated_at + i}
                  type="button"
                  onClick={() =>
                    setSelectedHistory(selectedHistory === i ? null : i)
                  }
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 transition-colors ${
                    selectedHistory === i ? "bg-neutral-50 font-medium" : ""
                  }`}
                >
                  Versión {history.length - i} ·{" "}
                  {new Date(entry.archived_at).toLocaleDateString("es", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {entry.execution_title && ` — ${entry.execution_title}`}
                </button>
              ))}
            </div>
          )}

          {selectedHistory !== null && (
            <p className="text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1">
              Viendo versión anterior.{" "}
              <button
                type="button"
                onClick={() => setSelectedHistory(null)}
                className="underline"
              >
                Volver a la actual
              </button>
            </p>
          )}

          {displayBrief && <BriefDisplay brief={displayBrief} />}
        </div>
      )}
    </section>
  );
}
