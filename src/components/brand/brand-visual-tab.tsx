"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateBrandKit } from "@/lib/actions";
import type { BrandKit } from "@/lib/types";

interface BrandVisualTabProps {
  orgId: string;
  brandKit: BrandKit;
  canEdit: boolean;
}

export function BrandVisualTab({ orgId, brandKit, canEdit }: BrandVisualTabProps) {
  const router = useRouter();
  const [name, setName] = useState(brandKit.name);
  const [colors, setColors] = useState<string[]>(
    brandKit.colors.length > 0 ? brandKit.colors : ["#171717", "#fafafa"]
  );
  const [headingFont, setHeadingFont] = useState(brandKit.fonts.heading || "Inter");
  const [bodyFont, setBodyFont] = useState(brandKit.fonts.body || "Inter");
  const [guidelines, setGuidelines] = useState(brandKit.guidelines || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function addColor() {
    setColors([...colors, "#000000"]);
  }

  function updateColor(index: number, value: string) {
    const updated = [...colors];
    updated[index] = value;
    setColors(updated);
  }

  function removeColor(index: number) {
    setColors(colors.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");

    const result = await updateBrandKit(orgId, {
      name,
      colors,
      fonts: { heading: headingFont, body: bodyFont },
      guidelines: guidelines || null,
    });

    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section className="home-card p-5 space-y-5 max-w-lg">
      <div>
        <h2 className="text-sm font-medium">Identidad visual</h2>
        <p className="text-xs text-muted mt-1">
          Colores, tipografías y guías que usa la IA al generar briefs.
        </p>
      </div>

      <Input
        label="Nombre del kit"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={!canEdit}
      />

      <div className="space-y-2">
        <label className="text-sm text-muted">Colores</label>
        <div className="space-y-2">
          {colors.map((color, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                disabled={!canEdit}
                onChange={(e) => updateColor(i, e.target.value)}
                className="h-8 w-8 rounded border border-border cursor-pointer disabled:cursor-default"
              />
              <input
                type="text"
                value={color}
                disabled={!canEdit}
                onChange={(e) => updateColor(i, e.target.value)}
                className="flex h-8 w-28 rounded-md border border-border bg-surface px-2 text-xs font-mono disabled:opacity-60"
              />
              {canEdit && (
                <button
                  type="button"
                  onClick={() => removeColor(i)}
                  className="text-muted hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={addColor}
            className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
          >
            <Plus size={12} /> Agregar color
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Tipografía títulos"
          value={headingFont}
          disabled={!canEdit}
          onChange={(e) => setHeadingFont(e.target.value)}
        />
        <Input
          label="Tipografía cuerpo"
          value={bodyFont}
          disabled={!canEdit}
          onChange={(e) => setBodyFont(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-muted">Guías de marca</label>
        <textarea
          value={guidelines}
          onChange={(e) => setGuidelines(e.target.value)}
          disabled={!canEdit}
          rows={4}
          placeholder="Reglas de uso del logo, espaciado, estilo visual..."
          className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none disabled:opacity-60"
        />
      </div>

      {brandKit.logo_url && (
        <div className="space-y-1.5">
          <label className="text-sm text-muted">Logo</label>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brandKit.logo_url}
            alt="Logo"
            className="h-16 w-auto rounded border border-border"
          />
        </div>
      )}

      {canEdit ? (
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={handleSave} loading={saving}>
            Guardar
          </Button>
          {saved && <span className="text-xs text-success">Guardado</span>}
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      ) : (
        <p className="text-xs text-muted">
          Solo admins, creadores y diseñadores pueden editar la identidad visual.
        </p>
      )}
    </section>
  );
}
