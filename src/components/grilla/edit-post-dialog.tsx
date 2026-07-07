"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePost } from "@/lib/actions";
import { CaptionEditor } from "@/components/grilla/caption-editor";
import { toDateInputValue } from "@/lib/utils";
import { PostIdentifierField } from "@/components/grilla/post-identifier-field";
import {
  PILLAR_OPTIONS,
  FORMAT_LABELS,
  type PostFormat,
  type PostWithAssets,
  type OrgHashtagGroup,
  type OrgIdentifier,
} from "@/lib/types";
import type { OrgIdentifierConfig } from "@/lib/org-identifier";

interface EditPostDialogProps {
  post: PostWithAssets;
  orgId: string;
  onSaved?: (updates: Partial<PostWithAssets>) => void;
  pillarOptions?: string[];
  hashtagGroups?: OrgHashtagGroup[];
  identifierConfig?: OrgIdentifierConfig;
  identifiers?: OrgIdentifier[];
}

const formats = Object.entries(FORMAT_LABELS) as [PostFormat, string][];

export function EditPostDialog({
  post,
  orgId,
  onSaved,
  pillarOptions = [...PILLAR_OPTIONS],
  hashtagGroups = [],
  identifierConfig = { label: null, allowPhoto: false, placeholder: null },
  identifiers = [],
}: EditPostDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [format, setFormat] = useState<PostFormat>(post.format);
  const [pillar, setPillar] = useState(post.pillar || pillarOptions[0] || PILLAR_OPTIONS[0]);
  const [scheduledAt, setScheduledAt] = useState(
    toDateInputValue(post.scheduled_at)
  );
  const [copy, setCopy] = useState(post.copy || "");
  const [caption, setCaption] = useState(post.caption || "");
  const [plate, setPlate] = useState(post.plate || "");
  const [orgIdentifierId, setOrgIdentifierId] = useState<string | null>(
    post.org_identifier_id
  );
  const [identifierPhotoUrl, setIdentifierPhotoUrl] = useState<string | null>(
    post.identifier_photo_url
  );

  function handleOpen() {
    setTitle(post.title);
    setFormat(post.format);
    setPillar(post.pillar || pillarOptions[0] || PILLAR_OPTIONS[0]);
    setScheduledAt(toDateInputValue(post.scheduled_at));
    setCopy(post.copy || "");
    setCaption(post.caption || "");
    setPlate(post.plate || "");
    setOrgIdentifierId(post.org_identifier_id);
    setIdentifierPhotoUrl(post.identifier_photo_url);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await updatePost(orgId, post.id, {
      title: title.trim() || post.title,
      format,
      pillar: pillar || null,
      scheduled_at: scheduledAt || null,
      copy: copy || null,
      caption: caption || null,
      plate: plate || null,
      org_identifier_id: orgIdentifierId,
      identifier_photo_url: identifierPhotoUrl,
    });

    if (!result.error) {
      onSaved?.({
        title: title.trim() || post.title,
        format,
        pillar: pillar || null,
        scheduled_at: scheduledAt || null,
        copy: copy || null,
        caption: caption || null,
        plate: plate || null,
        org_identifier_id: orgIdentifierId,
        identifier_photo_url: identifierPhotoUrl,
      });
      setOpen(false);
    }

    setLoading(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleOpen();
        }}
        className="shrink-0 p-1 rounded text-muted hover:text-foreground hover:bg-neutral-100 transition-colors"
        title="Editar post"
      >
        <Pencil size={12} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-title-section">Editar post</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Fecha"
                  type="date"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <div className="space-y-1">
                  <label className="text-xs text-muted">Pilar</label>
                  <select
                    value={pillar}
                    onChange={(e) => setPillar(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-border bg-surface px-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/10"
                  >
                    {pillarOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Input
                label="Título"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <div className="space-y-1">
                <label className="text-xs text-muted">Formato</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as PostFormat)}
                  className="flex h-8 w-full rounded-md border border-border bg-surface px-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/10"
                >
                  {formats.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted">Caption</label>
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

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" loading={loading}>
                  Guardar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
