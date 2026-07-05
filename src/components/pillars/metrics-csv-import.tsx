"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importPostMetricsCsv } from "@/lib/actions";

interface MetricsCsvImportProps {
  orgId: string;
}

function parseCsv(text: string) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const hasHeader =
    header.includes("titulo") ||
    header.includes("title") ||
    header.includes("alcance") ||
    header.includes("reach");

  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const cols = line.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    return {
      title: cols[0] || "",
      reach: cols[1] ? parseInt(cols[1], 10) : undefined,
      likes: cols[2] ? parseInt(cols[2], 10) : undefined,
      comments: cols[3] ? parseInt(cols[3], 10) : undefined,
      saves: cols[4] ? parseInt(cols[4], 10) : undefined,
    };
  }).filter((r) => r.title);
}

export function MetricsCsvImport({ orgId }: MetricsCsvImportProps) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setImporting(true);
    setResult(null);

    const text = await file.text();
    const rows = parseCsv(text);

    if (rows.length === 0) {
      setResult({ imported: 0, errors: ["CSV vacío o formato inválido"] });
      setImporting(false);
      return;
    }

    const res = await importPostMetricsCsv(orgId, rows);
    setImporting(false);

    if (res.error) {
      setResult({ imported: 0, errors: [res.error] });
    } else {
      setResult({ imported: res.imported || 0, errors: res.errors || [] });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          loading={importing}
        >
          <Upload size={13} />
          Importar CSV
        </Button>
        <span className="text-[10px] text-muted">
          Formato: título, alcance, likes, comentarios, guardados
        </span>
      </div>

      {result && (
        <div className="text-xs space-y-1">
          {result.imported > 0 && (
            <p className="text-emerald-600">
              {result.imported} post{result.imported !== 1 ? "s" : ""} importado
              {result.imported !== 1 ? "s" : ""}
            </p>
          )}
          {result.errors.map((err) => (
            <p key={err} className="text-amber-700">
              {err}
            </p>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 text-[10px] text-muted bg-neutral-50 rounded-md p-3">
        <FileSpreadsheet size={14} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-foreground/70 mb-1">Ejemplo CSV:</p>
          <pre className="font-mono text-[9px] leading-relaxed">
            {`titulo,alcance,likes,comentarios,guardados
Post de lanzamiento,5000,320,45,28
Carrusel tips,3200,180,12,55`}
          </pre>
        </div>
      </div>
    </div>
  );
}
