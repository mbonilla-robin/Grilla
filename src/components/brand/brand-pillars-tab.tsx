"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteContentPillar,
  upsertContentPillar,
} from "@/lib/actions";
import type { ContentPillar } from "@/lib/types";

const PILLAR_COLORS = ["#3b82f6", "#ef4444", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899"];

type PillarRow = ContentPillar | {
  id: string;
  name: string;
  color: string;
  target_pct: number;
  isNew?: true;
};

interface BrandPillarsTabProps {
  orgId: string;
  orgName: string;
  pillars: ContentPillar[];
  canEdit: boolean;
}

export function BrandPillarsTab({
  orgId,
  orgName,
  pillars: initialPillars,
  canEdit,
}: BrandPillarsTabProps) {
  const router = useRouter();
  const [pillars, setPillars] = useState<PillarRow[]>(initialPillars);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function addPillar() {
    setPillars((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: "",
        color: PILLAR_COLORS[prev.length % PILLAR_COLORS.length],
        target_pct: 25,
        isNew: true as const,
      },
    ]);
  }

  function updatePillar(index: number, patch: Partial<PillarRow>) {
    setPillars((prev) =>
      prev.map((pillar, i) => (i === index ? { ...pillar, ...patch } : pillar))
    );
  }

  function removePillar(index: number) {
    const pillar = pillars[index];
    if (!("isNew" in pillar && pillar.isNew)) {
      setRemovedIds((prev) => [...prev, pillar.id]);
    }
    setPillars((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    setSaved(false);

    for (const pillarId of removedIds) {
      const result = await deleteContentPillar(orgId, pillarId);
      if (result.error) {
        setError(result.error);
        setSaving(false);
        return;
      }
    }

    const validPillars = pillars.filter((p) => p.name.trim());
    if (validPillars.length === 0) {
      setError("Agrega al menos un pilar de contenido.");
      setSaving(false);
      return;
    }

    for (const [i, pillar] of validPillars.entries()) {
      const isNew = "isNew" in pillar && pillar.isNew;
      const result = await upsertContentPillar(orgId, {
        id: isNew ? undefined : pillar.id,
        name: pillar.name.trim(),
        color: pillar.color,
        target_pct: pillar.target_pct,
        sort_order: i,
      });
      if (result.error) {
        setError(result.error);
        setSaving(false);
        return;
      }
    }

    setRemovedIds([]);
    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section className="home-card p-5 space-y-4 max-w-2xl">
      <div>
        <h2 className="text-sm font-medium">Pilares de contenido</h2>
        <p className="text-xs text-muted mt-1">
          Temas que guían el contenido de {orgName}. Ajusta nombre, color y meta mensual.
        </p>
      </div>

      {pillars.length === 0 ? (
        <p className="text-sm text-muted py-4 text-center">
          Sin pilares configurados.
        </p>
      ) : (
        <div className="space-y-2">
          {pillars.map((pillar, i) => (
            <div
              key={pillar.id}
              className="grid grid-cols-[auto_1fr_72px_auto] gap-2 items-center"
            >
              <input
                type="color"
                value={pillar.color}
                disabled={!canEdit}
                onChange={(e) => updatePillar(i, { color: e.target.value })}
                className="h-9 w-9 rounded border border-border cursor-pointer disabled:cursor-default disabled:opacity-60"
              />
              <Input
                value={pillar.name}
                disabled={!canEdit}
                onChange={(e) => updatePillar(i, { name: e.target.value })}
                placeholder="Nombre del pilar"
              />
              <Input
                type="number"
                min={0}
                max={100}
                disabled={!canEdit}
                value={pillar.target_pct}
                onChange={(e) =>
                  updatePillar(i, {
                    target_pct: parseInt(e.target.value, 10) || 0,
                  })
                }
                placeholder="%"
              />
              {canEdit && (
                <button
                  type="button"
                  onClick={() => removePillar(i)}
                  className="text-muted hover:text-foreground p-1"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <button
          type="button"
          onClick={addPillar}
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
        >
          <Plus size={12} /> Agregar pilar
        </button>
      )}

      {canEdit ? (
        <div className="flex items-center gap-3 pt-2">
          <Button size="sm" onClick={handleSave} loading={saving}>
            Guardar cambios
          </Button>
          {saved && <span className="text-xs text-success">Guardado</span>}
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      ) : (
        <p className="text-xs text-muted">
          Solo admins y creadores pueden editar pilares.
        </p>
      )}
    </section>
  );
}
