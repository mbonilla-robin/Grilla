"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPost } from "@/lib/actions";
import { CaptionEditor } from "@/components/grilla/caption-editor";
import { PostAssignmentFields } from "@/components/grilla/post-assignment-fields";
import { GrillaModal } from "@/components/grilla/grilla-modal";
import { PostIdentifierField } from "@/components/grilla/post-identifier-field";
import { PILLAR_OPTIONS, FORMAT_LABELS, type PostFormat, type OrgHashtagGroup, type OrgIdentifier } from "@/lib/types";
import type { OrgIdentifierConfig } from "@/lib/org-identifier";
import type { PostAssignmentOptions } from "@/lib/team-assignments";

interface NewPostDialogProps {
  orgId: string;
  assignmentOptions: PostAssignmentOptions;
  currentUserId: string;
  pillarOptions?: string[];
  hashtagGroups?: OrgHashtagGroup[];
  identifierConfig?: OrgIdentifierConfig;
  identifiers?: OrgIdentifier[];
  allowedFormats?: PostFormat[];
  triggerClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

const ALL_FORMATS: PostFormat[] = [
  "image",
  "carousel",
  "video_carousel",
  "feed",
  "reel",
  "story",
];

function titleFromCopy(copy: string): string {
  const match = copy.match(/(?:Título|Title|Slide 1)[:\s]*([^\n]+)/i);
  if (match) return match[1].trim().slice(0, 120);
  const first = copy.trim().split("\n")[0];
  return first ? first.slice(0, 80) : "";
}

export function NewPostDialog({
  orgId,
  assignmentOptions,
  currentUserId,
  pillarOptions = [...PILLAR_OPTIONS],
  hashtagGroups = [],
  identifierConfig = { label: null, allowPhoto: false, placeholder: null },
  identifiers = [],
  allowedFormats,
  triggerClassName,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: NewPostDialogProps) {
  const formats = (allowedFormats ?? ALL_FORMATS).map((value) => ({
    value,
    label: FORMAT_LABELS[value],
  }));
  const [open, setOpen] = useState(false);
  const isOpen = controlledOpen ?? open;
  const setIsOpen = onOpenChange ?? setOpen;
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [autoTitle, setAutoTitle] = useState(true);
  const [format, setFormat] = useState<PostFormat>(formats[0]?.value ?? "image");
  const [pillar, setPillar] = useState<string>(pillarOptions[0] || PILLAR_OPTIONS[0]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [copy, setCopy] = useState("");
  const [caption, setCaption] = useState("");
  const [plate, setPlate] = useState("");
  const [orgIdentifierId, setOrgIdentifierId] = useState<string | null>(null);
  const [identifierPhotoUrl, setIdentifierPhotoUrl] = useState<string | null>(null);
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
    if (isOpen) resetAssignments();
  }, [isOpen, assignmentOptions, currentUserId]);

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
    setPillar(pillarOptions[0] || PILLAR_OPTIONS[0]);
    setScheduledAt("");
    setCopy("");
    setCaption("");
    setPlate("");
    setOrgIdentifierId(null);
    setIdentifierPhotoUrl(null);
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
      org_identifier_id: orgIdentifierId || undefined,
      identifier_photo_url: identifierPhotoUrl || undefined,
      references_text: references || undefined,
      content_creator_id: creatorId || currentUserId,
      assigned_to: designerId || undefined,
      community_manager_id: communityManagerId || undefined,
    });

    if (!result.error) {
      setIsOpen(false);
      resetForm();
      router.refresh();
    }

    setLoading(false);
  }

  if (!isOpen) {
    if (hideTrigger) return null;
    return (
      <Button size="sm" onClick={() => setIsOpen(true)} className={triggerClassName}>
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
    <GrillaModal open={isOpen}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-surface p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Nuevo post</h2>
          <button
            onClick={() => setIsOpen(false)}
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
                {pillarOptions.map((p) => (
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
            <CaptionEditor
              value={caption}
              onChange={setCaption}
              hashtagGroups={hashtagGroups}
            />
          </div>

          <PostIdentifierField
            orgId={orgId}
            config={identifierConfig}
            identifiers={identifiers}
            selectedId={orgIdentifierId}
            onChange={({ id, value, photoUrl }) => {
              setOrgIdentifierId(id);
              setPlate(value);
              setIdentifierPhotoUrl(photoUrl);
            }}
          />

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
            <PostAssignmentFields
              assignmentOptions={assignmentOptions}
              creatorId={creatorId}
              designerId={designerId}
              communityManagerId={communityManagerId}
              onCreatorChange={setCreatorId}
              onDesignerChange={setDesignerId}
              onCommunityManagerChange={setCommunityManagerId}
            />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={loading}>
              Crear
            </Button>
          </div>
        </form>
      </div>
    </GrillaModal>
  );
}
