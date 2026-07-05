"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPost } from "@/lib/actions";
import { PILLAR_OPTIONS, type PostFormat } from "@/lib/types";
import type { PostAssignmentOptions } from "@/lib/team-assignments";

interface NewPostDialogProps {
  orgId: string;
  assignmentOptions: PostAssignmentOptions;
  currentUserId: string;
}

const formats: { value: PostFormat; label: string }[] = [
  { value: "image", label: "Imagen" },
  { value: "carousel", label: "Carrusel" },
  { value: "video_carousel", label: "Video carrusel" },
  { value: "feed", label: "Feed" },
  { value: "reel", label: "Reel" },
  { value: "story", label: "Story" },
];

function titleFromCopy(copy: string): string {
  const match = copy.match(/(?:Título|Title|Slide 1)[:\s]*([^\n]+)/i);
  if (match) return match[1].trim().slice(0, 120);
  const first = copy.trim().split("\n")[0];
  return first ? first.slice(0, 80) : "";
}

function memberName(options: PostAssignmentOptions, userId: string, role: "creators" | "designers" | "communityManagers") {
  return options[role].find((m) => m.user_id === userId)?.name || "Sin nombre";
}

export function NewPostDialog({
  orgId,
  assignmentOptions,
  currentUserId,
}: NewPostDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [autoTitle, setAutoTitle] = useState(true);
  const [format, setFormat] = useState<PostFormat>("image");
  const [pillar, setPillar] = useState<string>(PILLAR_OPTIONS[0]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [copy, setCopy] = useState("");
  const [caption, setCaption] = useState("");
  const [plate, setPlate] = useState("");
  const [inDrive, setInDrive] = useState(false);
  const [references, setReferences] = useState("");
  const [creatorId, setCreatorId] = useState("");
  const [designerId, setDesignerId] = useState("");
  const [communityManagerId, setCommunityManagerId] = useState("");
  const router = useRouter();

  function resetAssignments() {
    setCreatorId(
      assignmentOptions.defaultCreatorId ||
        (assignmentOptions.creators.length === 0 ? currentUserId : "")
    );
    setDesignerId(assignmentOptions.defaultDesignerId || "");
    setCommunityManagerId(assignmentOptions.defaultCommunityManagerId || "");
  }

  useEffect(() => {
    if (open) resetAssignments();
  }, [open, assignmentOptions, currentUserId]);

  function handleCopyChange(value: string) {
    setCopy(value);
    if (autoTitle) {
      const generated = titleFromCopy(value);
      if (generated) setTitle(generated);
    }
  }

  function resetForm() {
    setTitle("");
    setAutoTitle(true);
    setFormat("image");
    setPillar(PILLAR_OPTIONS[0]);
    setScheduledAt("");
    setCopy("");
    setCaption("");
    setPlate("");
    setInDrive(false);
    setReferences("");
    resetAssignments();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const finalTitle =
      title.trim() || titleFromCopy(copy) || `Post — ${scheduledAt || "sin fecha"}`;

    const result = await createPost(orgId, {
      title: finalTitle,
      format,
      pillar: pillar || undefined,
      scheduled_at: scheduledAt || undefined,
      copy: copy || undefined,
      caption: caption || undefined,
      plate: plate || undefined,
      in_drive: inDrive,
      references_text: references || undefined,
      content_creator_id: creatorId || currentUserId,
      assigned_to: designerId || undefined,
      community_manager_id: communityManagerId || undefined,
    });

    if (!result.error) {
      setOpen(false);
      resetForm();
      router.refresh();
    }

    setLoading(false);
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} />
        Nuevo post
      </Button>
    );
  }

  const hasTeamSection =
    assignmentOptions.creators.length > 0 ||
    assignmentOptions.designers.length > 0 ||
    assignmentOptions.communityManagers.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-surface p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Nuevo post</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha"
              type="date"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
            <div className="space-y-1.5">
              <label className="text-sm text-muted">Pilar</label>
              <select
                value={pillar}
                onChange={(e) => setPillar(e.target.value)}
                className="flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              >
                {PILLAR_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted">Formato</label>
            <div className="flex flex-wrap gap-2">
              {formats.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFormat(f.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    format === f.value
                      ? "bg-accent text-accent-foreground"
                      : "bg-background text-muted hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted">Título</label>
              <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoTitle}
                  onChange={(e) => setAutoTitle(e.target.checked)}
                  className="rounded border-border"
                />
                Auto desde copy
              </label>
            </div>
            <input
              value={title}
              onChange={(e) => {
                setAutoTitle(false);
                setTitle(e.target.value);
              }}
              placeholder="Se genera del copy si está activo"
              className="flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted">Copy (texto en slides / video)</label>
            <textarea
              value={copy}
              onChange={(e) => handleCopyChange(e.target.value)}
              rows={5}
              placeholder="Slide 1: ...&#10;Slide 2: ..."
              className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted">Caption (publicación)</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              placeholder="Texto del caption con hashtags..."
              className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Placa / Publicado"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="Ej: 73UCAA"
            />
            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="flex items-center gap-2 text-sm cursor-pointer h-9">
                <input
                  type="checkbox"
                  checked={inDrive}
                  onChange={(e) => setInDrive(e.target.checked)}
                  className="rounded border-border"
                />
                <span>En Drive</span>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted">Referencias</label>
            <textarea
              value={references}
              onChange={(e) => setReferences(e.target.value)}
              rows={2}
              placeholder="Links, inspiración, notas internas..."
              className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
            />
          </div>

          {hasTeamSection && (
            <div className="space-y-3 rounded-md border border-border bg-background/50 p-3">
              <p className="text-xs font-medium">Equipo en este post</p>

              {assignmentOptions.creators.length > 0 && (
                <RoleAssignmentField
                  label="Creadora de contenido"
                  pick={assignmentOptions.pickCreator}
                  value={creatorId}
                  onChange={setCreatorId}
                  options={assignmentOptions.creators}
                  autoName={
                    assignmentOptions.defaultCreatorId
                      ? memberName(
                          assignmentOptions,
                          assignmentOptions.defaultCreatorId,
                          "creators"
                        )
                      : undefined
                  }
                />
              )}

              {assignmentOptions.designers.length > 0 && (
                <RoleAssignmentField
                  label="Diseñador"
                  pick={assignmentOptions.pickDesigner}
                  value={designerId}
                  onChange={setDesignerId}
                  options={assignmentOptions.designers}
                  autoName={
                    assignmentOptions.defaultDesignerId
                      ? memberName(
                          assignmentOptions,
                          assignmentOptions.defaultDesignerId,
                          "designers"
                        )
                      : undefined
                  }
                />
              )}

              {assignmentOptions.communityManagers.length > 0 && (
                <RoleAssignmentField
                  label="Community Manager"
                  pick={assignmentOptions.pickCommunityManager}
                  value={communityManagerId}
                  onChange={setCommunityManagerId}
                  options={assignmentOptions.communityManagers}
                  autoName={
                    assignmentOptions.defaultCommunityManagerId
                      ? memberName(
                          assignmentOptions,
                          assignmentOptions.defaultCommunityManagerId,
                          "communityManagers"
                        )
                      : undefined
                  }
                />
              )}

              <p className="text-[11px] text-muted">
                Si hay una sola persona en el rol, se asigna sola. Si hay varias, tú eliges. A cada una le llega su tarea en Inicio.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={loading}>
              Crear
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoleAssignmentField({
  label,
  pick,
  value,
  onChange,
  options,
  autoName,
}: {
  label: string;
  pick: boolean;
  value: string;
  onChange: (value: string) => void;
  options: { user_id: string; name: string }[];
  autoName?: string;
}) {
  if (!pick && autoName) {
    return (
      <p className="text-xs text-muted">
        <span className="text-foreground font-medium">{label}:</span> {autoName}{" "}
        <span className="text-muted">(automático)</span>
      </p>
    );
  }

  if (pick) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm text-muted">{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        >
          <option value="">Elegir {label.toLowerCase()}</option>
          {options.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return null;
}
