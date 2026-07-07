"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bulkCreatePosts } from "@/lib/actions";
import {
  downloadGrillaTemplate,
  excelRowToBulkInput,
  formatLabelsList,
  parseGrillaExcelFile,
  type ExcelGrillaRow,
} from "@/lib/grilla-excel";
import { PillarDistributionBar, type PillarTarget } from "@/components/grilla/pillar-distribution-bar";
import { PostAssignmentFields } from "@/components/grilla/post-assignment-fields";
import { GrillaModal } from "@/components/grilla/grilla-modal";
import {
  FORMAT_LABELS,
  PILLAR_OPTIONS,
  type ContentPillar,
  type PostFormat,
} from "@/lib/types";
import type { PostAssignmentOptions } from "@/lib/team-assignments";

interface GrillaExcelImportDialogProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentOptions: PostAssignmentOptions;
  currentUserId: string;
  pillarOptions?: string[];
  pillars?: ContentPillar[];
  allowedFormats?: PostFormat[];
}

export function GrillaExcelImportDialog({
  orgId,
  open,
  onOpenChange,
  assignmentOptions,
  currentUserId,
  pillarOptions = [...PILLAR_OPTIONS],
  pillars = [],
  allowedFormats = ["image", "carousel", "reel", "story"],
}: GrillaExcelImportDialogProps) {
  const [rows, setRows] = useState<ExcelGrillaRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState("");
  const [designerId, setDesignerId] = useState("");
  const [communityManagerId, setCommunityManagerId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const pillarTargets: PillarTarget[] = useMemo(() => {
    if (pillars.length > 0) {
      return pillars.map((p) => ({ name: p.name, targetPct: p.target_pct }));
    }
    return pillarOptions.map((name) => ({
      name,
      targetPct: Math.round(100 / pillarOptions.length),
    }));
  }, [pillars, pillarOptions]);

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidCount = rows.length - validRows.length;

  const pillarCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of validRows) {
      counts[row.pillar] = (counts[row.pillar] || 0) + 1;
    }
    return counts;
  }, [validRows]);

  useEffect(() => {
    if (open) {
      setRows([]);
      setFileName(null);
      setError(null);
      setCreatorId(
        assignmentOptions.defaultCreatorId ||
          (assignmentOptions.creators.length === 0 ? currentUserId : "")
      );
      setDesignerId(assignmentOptions.defaultDesignerId || "");
      setCommunityManagerId(assignmentOptions.defaultCommunityManagerId || "");
    }
  }, [open, assignmentOptions, currentUserId]);

  function updateRow(id: string, patch: Partial<ExcelGrillaRow>) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        const errors: string[] = [];
        if (!next.date) errors.push("Fecha inválida o vacía");
        if (
          next.pillar &&
          !pillarOptions.some((p) => p.toLowerCase() === next.pillar.toLowerCase())
        ) {
          errors.push(`Pilar desconocido: ${next.pillar}`);
        }
        if (!next.title && !next.copy && !next.caption) {
          errors.push("Falta título, copy o caption");
        }
        return { ...next, errors };
      })
    );
  }

  async function handleFile(file: File) {
    setParsing(true);
    setError(null);
    setFileName(file.name);

    try {
      const parsed = await parseGrillaExcelFile(file, {
        pillarOptions,
        allowedFormats,
      });
      if (parsed.length === 0) {
        setError("El archivo está vacío o no tiene filas de datos");
        setRows([]);
      } else {
        setRows(parsed);
      }
    } catch {
      setError("No se pudo leer el archivo. Usa .xlsx o .csv");
      setRows([]);
    }

    setParsing(false);
  }

  async function handleSave() {
    if (validRows.length === 0) {
      setError("No hay filas válidas para importar");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await bulkCreatePosts(
      orgId,
      validRows.map(excelRowToBulkInput),
      {
        content_creator_id: creatorId || currentUserId,
        assigned_to: designerId || undefined,
        community_manager_id: communityManagerId || undefined,
      }
    );

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onOpenChange(false);
    router.refresh();
    setLoading(false);
  }

  return (
    <GrillaModal open={open}>
      <div className="flex h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-6">
          <div>
            <h2 className="text-sm font-semibold">Importar Excel</h2>
            <p className="text-xs text-muted mt-0.5">
              Sube tu hoja, revisa el preview y confirma
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted hover:text-foreground"
            type="button"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
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
              loading={parsing}
            >
              <Upload size={13} />
              Subir archivo
            </Button>
            <Button size="sm" variant="ghost" onClick={() => downloadGrillaTemplate()}>
              <Download size={13} />
              Descargar plantilla
            </Button>
            {fileName && (
              <span className="text-xs text-muted truncate max-w-[200px]">
                {fileName}
              </span>
            )}
          </div>

          <div className="flex items-start gap-2 text-[11px] text-muted bg-background/50 rounded-md border border-border p-3">
            <FileSpreadsheet size={14} className="shrink-0 mt-0.5" />
            <div>
              <p>
                Columnas: Fecha, Pilar, Formato, Título, Copy, Caption, Placa,
                Drive, Referencias
              </p>
              <p className="mt-1">
                Formatos válidos: {formatLabelsList(allowedFormats)}
              </p>
            </div>
          </div>

          {rows.length > 0 && (
            <>
              <PillarDistributionBar
                pillars={pillarTargets}
                counts={pillarCounts}
              />

              <PostAssignmentFields
                assignmentOptions={assignmentOptions}
                creatorId={creatorId}
                designerId={designerId}
                communityManagerId={communityManagerId}
                onCreatorChange={setCreatorId}
                onDesignerChange={setDesignerId}
                onCommunityManagerChange={setCommunityManagerId}
              />

              {invalidCount > 0 && (
                <p className="text-xs text-amber-700">
                  {invalidCount} fila{invalidCount !== 1 ? "s" : ""} con errores
                  — corrígelas abajo o se omitirán al importar
                </p>
              )}

              <div className="border border-border rounded-lg overflow-x-auto">
                <table className="w-full text-xs min-w-[900px]">
                  <thead>
                    <tr className="border-b border-border bg-background/50">
                      <th className="text-left font-medium text-muted px-3 py-2">Fecha</th>
                      <th className="text-left font-medium text-muted px-3 py-2">Pilar</th>
                      <th className="text-left font-medium text-muted px-3 py-2">Formato</th>
                      <th className="text-left font-medium text-muted px-3 py-2">Título</th>
                      <th className="text-left font-medium text-muted px-3 py-2">Copy</th>
                      <th className="text-left font-medium text-muted px-3 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className={`border-b border-border/60 ${
                          row.errors.length > 0 ? "bg-amber-50/50" : ""
                        }`}
                      >
                        <td className="px-3 py-2">
                          <input
                            value={row.date}
                            onChange={(e) =>
                              updateRow(row.id, { date: e.target.value })
                            }
                            className="w-28 h-7 rounded border border-border bg-surface px-2 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.pillar}
                            onChange={(e) =>
                              updateRow(row.id, { pillar: e.target.value })
                            }
                            className="h-7 rounded border border-border bg-surface px-2 text-xs"
                          >
                            {pillarOptions.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.format}
                            onChange={(e) =>
                              updateRow(row.id, {
                                format: e.target.value as PostFormat,
                              })
                            }
                            className="h-7 rounded border border-border bg-surface px-2 text-xs"
                          >
                            {allowedFormats.map((f) => (
                              <option key={f} value={f}>
                                {FORMAT_LABELS[f]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={row.title}
                            onChange={(e) =>
                              updateRow(row.id, { title: e.target.value })
                            }
                            className="w-36 h-7 rounded border border-border bg-surface px-2 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 max-w-[200px]">
                          <p className="truncate text-muted" title={row.copy}>
                            {row.copy || "—"}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          {row.errors.length === 0 ? (
                            <span className="text-emerald-600">OK</span>
                          ) : (
                            <span className="text-amber-700" title={row.errors.join(", ")}>
                              {row.errors[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
          <div className="min-w-0">
            {error && <p className="text-xs text-destructive">{error}</p>}
            {!error && validRows.length > 0 && (
              <p className="text-xs text-muted">
                {validRows.length} post{validRows.length !== 1 ? "s" : ""} listo
                {validRows.length !== 1 ? "s" : ""} para importar
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              loading={loading}
              disabled={validRows.length === 0}
              onClick={handleSave}
            >
              Importar ({validRows.length})
            </Button>
          </div>
        </div>
      </div>
    </GrillaModal>
  );
}
