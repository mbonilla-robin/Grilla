"use client";

import { useState } from "react";
import { Languages } from "lucide-react";

function ColorSwatch({ hex }: { hex: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 align-middle rounded-md border border-border/80 bg-surface px-1 py-0.5 mr-0.5 mb-0.5"
      title={hex}
    >
      <span
        className="h-3.5 w-3.5 rounded-sm border border-black/10 shrink-0"
        style={{ backgroundColor: hex }}
      />
      <span className="text-[10px] font-mono text-muted">{hex}</span>
    </span>
  );
}

function ColorRichText({ text }: { text: string }) {
  const parts = text.split(/(#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})\b)/g);

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (/^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(part)) {
          return <ColorSwatch key={`${part}-${i}`} hex={part} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

interface VisualConceptDisplayProps {
  text: string;
}

export function VisualConceptDisplay({ text }: VisualConceptDisplayProps) {
  const [lang, setLang] = useState<"en" | "es">("en");
  const [spanish, setSpanish] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggleLanguage() {
    if (lang === "es") {
      setLang("en");
      return;
    }

    if (spanish) {
      setLang("es");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, from: "en", to: "es" }),
      });
      const data = await res.json();
      if (data.translation) {
        setSpanish(data.translation);
        setLang("es");
      }
    } catch {
      // silent
    }
    setLoading(false);
  }

  const displayText = lang === "en" ? text : spanish ?? text;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-semibold text-foreground">Concepto Visual:</p>
        <button
          type="button"
          onClick={toggleLanguage}
          disabled={loading}
          title={lang === "en" ? "Ver en español" : "Ver en inglés"}
          className="inline-flex items-center gap-0.5 rounded border border-border/70 bg-surface px-1 py-px text-[9px] font-medium uppercase tracking-wide text-muted hover:text-foreground hover:border-border disabled:opacity-50 transition-colors"
        >
          <Languages size={9} strokeWidth={2} />
          {loading ? "…" : lang === "en" ? "ES" : "EN"}
        </button>
      </div>
      <div className="text-sm leading-relaxed text-foreground/90">
        <ColorRichText text={displayText} />
      </div>
    </div>
  );
}
