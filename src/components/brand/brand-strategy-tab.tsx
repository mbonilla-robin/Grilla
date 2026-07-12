"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateBrandStrategy } from "@/lib/actions";
import type { BrandKit, BrandTextCasing } from "@/lib/types";
import {
  DEFAULT_BRAND_TEXT_CASING,
  normalizeBrandTextCasing,
} from "@/lib/brand-text-casing";
import { BrandTextCasingSection } from "@/components/brand/brand-text-casing-section";

interface BrandStrategyTabProps {
  orgId: string;
  orgName: string;
  brandKit: BrandKit;
  canEdit: boolean;
}

export function BrandStrategyTab({
  orgId,
  orgName,
  brandKit,
  canEdit,
}: BrandStrategyTabProps) {
  const router = useRouter();
  const [tone, setTone] = useState(brandKit.tone_of_voice || "");
  const [objective, setObjective] = useState(brandKit.objective || "");
  const [textCasing, setTextCasing] = useState<BrandTextCasing>(
    normalizeBrandTextCasing(brandKit.text_casing ?? DEFAULT_BRAND_TEXT_CASING)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setError("");
    setSaving(true);
    setSaved(false);

    const result = await updateBrandStrategy(orgId, {
      tone_of_voice: tone,
      objective,
      text_casing: textCasing,
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
    <section className="home-card p-5 space-y-4 max-w-2xl">
      <div>
        <h2 className="text-title-section">Estrategia de marca</h2>
        <p className="text-xs text-muted mt-1">
          Define cómo comunica {orgName} y hacia dónde va el contenido.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-muted">Tono comunicacional</label>
        <textarea
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          disabled={!canEdit}
          rows={3}
          placeholder="Profesional, técnico, cercano, inspirador..."
          className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none disabled:opacity-60"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-muted">Objetivo de la marca</label>
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          disabled={!canEdit}
          rows={3}
          placeholder="Posicionamiento, metas de comunicación, público objetivo..."
          className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none disabled:opacity-60"
        />
      </div>

      <BrandTextCasingSection
        value={textCasing}
        onChange={setTextCasing}
        disabled={!canEdit}
      />

      {canEdit ? (
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={handleSave} loading={saving}>
            Guardar cambios
          </Button>
          {saved && <span className="text-xs text-success">Guardado</span>}
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      ) : (
        <p className="text-xs text-muted">
          Solo admins y creadores pueden editar la estrategia.
        </p>
      )}
    </section>
  );
}
