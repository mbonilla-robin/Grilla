"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createOrgAssetLink, deleteOrgAssetLink } from "@/lib/actions";
import type { OrgAssetLink } from "@/lib/types";
import { EmptyState } from "@/components/home/home-ui";
import { cn } from "@/lib/utils";

const SUGGESTED_CATEGORIES = ["Drive", "Referencias", "Herramientas", "General"];

interface AssetLinksManagerProps {
  orgId: string;
  links: OrgAssetLink[];
  isAdmin: boolean;
}

function normalizeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function AssetLinksManager({
  orgId,
  links: initialLinks,
  isAdmin,
}: AssetLinksManagerProps) {
  const [links, setLinks] = useState(initialLinks);
  const [showAdd, setShowAdd] = useState(false);
  const [category, setCategory] = useState("General");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, OrgAssetLink[]>();
    for (const link of links) {
      const cat = link.category.trim() || "General";
      const list = map.get(cat) || [];
      list.push(link);
      map.set(cat, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "es"));
  }, [links]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!label.trim() || !url.trim()) {
      setError("Nombre y URL son obligatorios.");
      return;
    }

    setSaving(true);
    const result = await createOrgAssetLink(orgId, {
      category: category.trim() || "General",
      label: label.trim(),
      url: normalizeUrl(url),
    });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.link) {
      setLinks((prev) => [...prev, result.link!]);
      setLabel("");
      setUrl("");
      setShowAdd(false);
    }
  }

  async function handleDelete(linkId: string) {
    setDeletingId(linkId);
    const result = await deleteOrgAssetLink(orgId, linkId);
    if (!result.error) {
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    }
    setDeletingId(null);
  }

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setShowAdd((v) => !v);
              setError(null);
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              showAdd
                ? "border-foreground/20 bg-neutral-100 text-foreground"
                : "border-border text-muted hover:text-foreground hover:bg-neutral-50"
            )}
          >
            {showAdd ? <X size={12} /> : <Plus size={12} />}
            {showAdd ? "Cerrar" : "Agregar link"}
          </button>
        </div>
      )}

      {showAdd && isAdmin && (
        <form
          onSubmit={handleAdd}
          className="space-y-3 rounded-lg border border-dashed border-border bg-neutral-50/50 p-4"
        >
          <div className="space-y-1.5">
            <label className="text-xs text-muted">Categoría</label>
            <input
              list="asset-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="General"
              className="flex h-8 w-full rounded-md border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
            <datalist id="asset-categories">
              {SUGGESTED_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Nombre"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Carpeta de diseños"
            />
            <Input
              label="URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="drive.google.com/..."
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button type="submit" size="sm" loading={saving}>
            Guardar
          </Button>
        </form>
      )}

      {grouped.length === 0 ? (
        <EmptyState
          text={
            isAdmin
              ? "Sin links todavía. Usa «Agregar link» para crear botones."
              : "Sin links disponibles por ahora."
          }
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([cat, catLinks]) => (
            <section key={cat}>
              <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
                {cat}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {catLinks.map((link) => (
                  <div key={link.id} className="relative group">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-lg border border-border bg-surface",
                        "px-4 py-3 text-sm font-medium hover:bg-neutral-50 hover:border-foreground/15 transition-colors",
                        isAdmin && "pr-10"
                      )}
                    >
                      <ExternalLink size={14} className="text-muted shrink-0" />
                      <span className="truncate">{link.label}</span>
                    </a>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(link.id)}
                        disabled={deletingId === link.id}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md text-muted hover:text-destructive hover:bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
