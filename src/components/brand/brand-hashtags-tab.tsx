"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveHashtagGroup, deleteHashtagGroup } from "@/lib/actions";
import type { OrgHashtagGroup } from "@/lib/types";

type GroupRow = OrgHashtagGroup | {
  id: string;
  category: string;
  tags: string[];
  isNew?: true;
};

interface BrandHashtagsTabProps {
  orgId: string;
  groups: OrgHashtagGroup[];
  canEdit: boolean;
}

export function BrandHashtagsTab({
  orgId,
  groups: initialGroups,
  canEdit,
}: BrandHashtagsTabProps) {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupRow[]>(initialGroups);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function addGroup() {
    setGroups((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, category: "", tags: [], isNew: true as const },
    ]);
  }

  function updateGroup(index: number, patch: Partial<GroupRow>) {
    setGroups((prev) =>
      prev.map((g, i) => (i === index ? { ...g, ...patch } : g))
    );
  }

  async function removeGroup(index: number) {
    const group = groups[index];
    if ("isNew" in group && group.isNew) {
      setGroups((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    const result = await deleteHashtagGroup(orgId, group.id);
    if (result.error) {
      setError(result.error);
      return;
    }
    setGroups((prev) => prev.filter((_, i) => i !== index));
    router.refresh();
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    setSaved(false);

    for (const group of groups) {
      if (!group.category.trim()) continue;
      const tags = group.tags
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith("#") ? t : `#${t}`));

      const isNew = "isNew" in group && group.isNew;
      const result = await saveHashtagGroup(orgId, {
        id: isNew ? undefined : group.id,
        category: group.category.trim(),
        tags,
      });
      if (result.error) {
        setError(result.error);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section className="home-card p-5 space-y-4 max-w-2xl">
      <div>
        <h2 className="text-sm font-medium">Grupos de hashtags</h2>
        <p className="text-xs text-muted mt-1">
          Presets de hashtags por categoría para usar en captions.
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted py-4 text-center">
          Sin grupos de hashtags configurados.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group, i) => (
            <div key={group.id} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={group.category}
                  disabled={!canEdit}
                  onChange={(e) => updateGroup(i, { category: e.target.value })}
                  placeholder="Categoría (ej: Marca)"
                />
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => removeGroup(i)}
                    className="text-muted hover:text-foreground p-1 shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <textarea
                value={group.tags.join(" ")}
                disabled={!canEdit}
                onChange={(e) =>
                  updateGroup(i, {
                    tags: e.target.value.split(/\s+/).filter(Boolean),
                  })
                }
                rows={2}
                placeholder="#marca #sector #campaña"
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm font-mono placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none disabled:opacity-60"
              />
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <button
          type="button"
          onClick={addGroup}
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
        >
          <Plus size={12} /> Agregar grupo
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
          Solo admins y creadores pueden editar hashtags.
        </p>
      )}
    </section>
  );
}
