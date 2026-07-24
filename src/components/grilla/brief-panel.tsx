"use client";

import { useRef, useState } from "react";
import { Sparkles, Download, History, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BriefDisplay } from "@/components/grilla/brief-display";
import type { DesignBrief, BriefHistoryEntry, PostStatus } from "@/lib/types";

interface BriefPanelProps {
  postId: string;
  orgId: string;
  postTitle?: string;
  initialBrief: DesignBrief | null;
  initialHistory?: BriefHistoryEntry[];
  onStatusChange?: (status: PostStatus) => void;
}

function exportBriefPdf(
  source: HTMLElement,
  meta: { title: string; generatedAt: string }
) {
  const existing = document.querySelector(".brief-print-portal");
  existing?.remove();

  const portal = document.createElement("div");
  portal.className = "brief-print-portal";

  const header = document.createElement("div");
  header.className = "brief-print-header";
  header.innerHTML = `<h1>Brief de diseño</h1><p>${escapeHtml(meta.title)} · Generado ${escapeHtml(
    new Date(meta.generatedAt).toLocaleDateString("es", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  )}</p>`;
  portal.appendChild(header);

  const clone = source.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".no-print").forEach((el) => el.remove());
  portal.appendChild(clone);
  document.body.appendChild(portal);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.body.classList.remove("printing-brief");
    portal.remove();
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  document.body.classList.add("printing-brief");

  // Let the browser paint the portal before opening the print dialog
  requestAnimationFrame(() => {
    window.print();
    // Fallback if afterprint never fires (some browsers)
    setTimeout(cleanup, 60_000);
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function BriefPanel({
  postId,
  orgId,
  postTitle,
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
  const briefRef = useRef<HTMLDivElement>(null);

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

  function handleExportPdf() {
    if (!displayBrief || !briefRef.current) return;
    exportBriefPdf(briefRef.current, {
      title: postTitle?.trim() || displayBrief.execution_title || postId,
      generatedAt: displayBrief.generated_at,
    });
  }

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
          <div className="no-print space-y-3">
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
              <Button size="sm" variant="secondary" onClick={handleExportPdf}>
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
          </div>

          {displayBrief && (
            <div ref={briefRef}>
              <BriefDisplay brief={displayBrief} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
