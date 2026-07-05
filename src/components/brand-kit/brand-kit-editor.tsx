"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { BrandKit } from "@/lib/types";

interface BrandKitEditorProps {
  brandKit: BrandKit;
  orgId: string;
}

export function BrandKitEditor({ brandKit, orgId }: BrandKitEditorProps) {
  const [name, setName] = useState(brandKit.name);
  const [colors, setColors] = useState<string[]>(
    brandKit.colors.length > 0 ? brandKit.colors : ["#171717", "#fafafa"]
  );
  const [headingFont, setHeadingFont] = useState(brandKit.fonts.heading || "Inter");
  const [bodyFont, setBodyFont] = useState(brandKit.fonts.body || "Inter");
  const [tone, setTone] = useState(brandKit.tone_of_voice || "");
  const [objective, setObjective] = useState(brandKit.objective || "");
  const [guidelines, setGuidelines] = useState(brandKit.guidelines || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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

    await supabase
      .from("brand_kits")
      .update({
        name,
        colors,
        fonts: { heading: headingFont, body: bodyFont },
        tone_of_voice: tone || null,
        objective: objective || null,
        guidelines: guidelines || null,
      })
      .eq("id", brandKit.id);

    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-lg">
      <Input
        label="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="space-y-2">
        <label className="text-sm text-muted">Colores</label>
        <div className="space-y-2">
          {colors.map((color, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => updateColor(i, e.target.value)}
                className="h-8 w-8 rounded border border-border cursor-pointer"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => updateColor(i, e.target.value)}
                className="flex h-8 w-28 rounded-md border border-border bg-surface px-2 text-xs font-mono"
              />
              <button
                onClick={() => removeColor(i)}
                className="text-muted hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addColor}
          className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
        >
          <Plus size={12} /> Agregar color
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Tipografía títulos"
          value={headingFont}
          onChange={(e) => setHeadingFont(e.target.value)}
        />
        <Input
          label="Tipografía cuerpo"
          value={bodyFont}
          onChange={(e) => setBodyFont(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-muted">Tono de voz</label>
        <textarea
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          rows={2}
          placeholder="Profesional, cercano, divertido..."
          className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-muted">Objetivo de marca</label>
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          rows={2}
          placeholder="Posicionamiento, metas de comunicación..."
          className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-muted">Guías de marca</label>
        <textarea
          value={guidelines}
          onChange={(e) => setGuidelines(e.target.value)}
          rows={4}
          placeholder="Reglas de uso del logo, espaciado, estilo visual..."
          className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleSave} loading={saving}>
          Guardar
        </Button>
        {saved && <span className="text-xs text-success">Guardado</span>}
      </div>
    </div>
  );
}
