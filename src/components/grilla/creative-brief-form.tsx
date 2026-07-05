"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePost } from "@/lib/actions";
import type { Post } from "@/lib/types";

interface CreativeBriefFormProps {
  post: Post;
  orgId: string;
}

export function CreativeBriefForm({ post, orgId }: CreativeBriefFormProps) {
  const [objective, setObjective] = useState(post.objective || "");
  const [cta, setCta] = useState(post.cta || "");
  const [references, setReferences] = useState(post.references_text || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const result = await updatePost(orgId, post.id, {
      objective: objective || null,
      cta: cta || null,
      references_text: references || null,
    });
    setSaving(false);
    if (!result.error) setSaved(true);
  }

  return (
    <section className="mb-8 space-y-4">
      <div>
        <h2 className="text-[11px] font-medium text-muted uppercase tracking-wide mb-1">
          Brief creativo
        </h2>
        <p className="text-xs text-muted">
          Contexto estratégico para el diseñador antes de producir
        </p>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border">
        <div className="p-4 space-y-1.5">
          <label className="text-[10px] font-medium text-muted uppercase tracking-wide">
            Objetivo del post
          </label>
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            rows={2}
            placeholder="¿Qué queremos lograr? Ej: Generar leads, educar sobre el producto..."
            className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-foreground/10"
          />
        </div>

        <div className="p-4 space-y-1.5">
          <label className="text-[10px] font-medium text-muted uppercase tracking-wide">
            Call to Action (CTA)
          </label>
          <Input
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            placeholder="Ej: Escríbenos al DM, Link en bio, Comenta SÍ..."
          />
        </div>

        <div className="p-4 space-y-1.5">
          <label className="text-[10px] font-medium text-muted uppercase tracking-wide">
            Referencias visuales
          </label>
          <textarea
            value={references}
            onChange={(e) => setReferences(e.target.value)}
            rows={3}
            placeholder="Links a Behance, Pinterest, moodboards..."
            className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-foreground/10"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleSave} loading={saving}>
          Guardar brief
        </Button>
        {saved && (
          <span className="text-xs text-emerald-600">Guardado</span>
        )}
      </div>
    </section>
  );
}
