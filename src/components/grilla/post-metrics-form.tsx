"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { savePostMetrics } from "@/lib/actions";
import type { PostMetrics } from "@/lib/types";

interface PostMetricsFormProps {
  postId: string;
  orgId: string;
  initial?: PostMetrics | null;
  isPublished: boolean;
}

export function PostMetricsForm({
  postId,
  orgId,
  initial,
  isPublished,
}: PostMetricsFormProps) {
  const [reach, setReach] = useState(initial?.reach?.toString() || "");
  const [likes, setLikes] = useState(initial?.likes?.toString() || "");
  const [comments, setComments] = useState(initial?.comments?.toString() || "");
  const [saves, setSaves] = useState(initial?.saves?.toString() || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isPublished && !initial) return null;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const result = await savePostMetrics(orgId, postId, {
      reach: reach ? parseInt(reach, 10) : null,
      likes: likes ? parseInt(likes, 10) : null,
      comments: comments ? parseInt(comments, 10) : null,
      saves: saves ? parseInt(saves, 10) : null,
    });
    setSaving(false);
    if (!result.error) setSaved(true);
  }

  const engagement =
    (parseInt(likes, 10) || 0) +
    (parseInt(comments, 10) || 0) +
    (parseInt(saves, 10) || 0);

  return (
    <section className="mb-8 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 size={14} className="text-muted" />
        <h2 className="text-[11px] font-medium text-muted uppercase tracking-wide">
          Resultados post-publicación
        </h2>
      </div>

      {!isPublished && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-md px-3 py-2">
          Este post aún no está publicado. Puedes registrar métricas anticipadas.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Input
          label="Alcance"
          type="number"
          min={0}
          value={reach}
          onChange={(e) => setReach(e.target.value)}
          placeholder="0"
        />
        <Input
          label="Likes"
          type="number"
          min={0}
          value={likes}
          onChange={(e) => setLikes(e.target.value)}
          placeholder="0"
        />
        <Input
          label="Comentarios"
          type="number"
          min={0}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="0"
        />
        <Input
          label="Guardados"
          type="number"
          min={0}
          value={saves}
          onChange={(e) => setSaves(e.target.value)}
          placeholder="0"
        />
      </div>

      {engagement > 0 && (
        <p className="text-xs text-muted">
          Engagement total:{" "}
          <span className="font-medium text-foreground">{engagement}</span>
          {reach && parseInt(reach, 10) > 0 && (
            <>
              {" "}
              · Tasa:{" "}
              <span className="font-medium text-foreground">
                {((engagement / parseInt(reach, 10)) * 100).toFixed(1)}%
              </span>
            </>
          )}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleSave} loading={saving}>
          Guardar métricas
        </Button>
        {saved && <span className="text-xs text-emerald-600">Guardado</span>}
      </div>
    </section>
  );
}
