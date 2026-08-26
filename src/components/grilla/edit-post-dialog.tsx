"use client";

import { useState } from "react";
import { Languages, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePost } from "@/lib/actions";
import { CaptionEditor } from "@/components/grilla/caption-editor";
import { GrillaCopyEditor } from "@/components/grilla/grilla-copy-editor";
import { toDateInputValue } from "@/lib/utils";
import { PostIdentifierField } from "@/components/grilla/post-identifier-field";
import { PostPillarField } from "@/components/grilla/post-pillar-field";
import { formatPillars, parsePillars } from "@/lib/pillars";
import { selectedIdentifierIdsFromPost } from "@/lib/resolve-post-identifier";
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

function initialPillars(
  pillar: string | null,
  options: string[]
): string[] {
  const parsed = parsePillars(pillar);
  if (parsed.length > 0) return parsed;
  return options[0] ? [options[0]] : PILLAR_OPTIONS[0] ? [PILLAR_OPTIONS[0]] : [];
}

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
  const [pillars, setPillars] = useState(() =>
    initialPillars(post.pillar, pillarOptions)
  );
  const [scheduledAt, setScheduledAt] = useState(
    toDateInputValue(post.scheduled_at)
  );
  const [copy, setCopy] = useState(post.copy || "");
  const [copyEn, setCopyEn] = useState(post.copy_en || "");
  const [caption, setCaption] = useState(post.caption || "");
  const [captionEn, setCaptionEn] = useState(post.caption_en || "");
  const [plate, setPlate] = useState(post.plate || "");
  const [references, setReferences] = useState(post.references_text || "");
  const [bilingual, setBilingual] = useState(
    () => !!(post.copy_en?.trim() || post.caption_en?.trim())
  );
  const [orgIdentifierIds, setOrgIdentifierIds] = useState<string[]>(() =>
    selectedIdentifierIdsFromPost(post, identifiers)
  );
  const [orgIdentifierId, setOrgIdentifierId] = useState<string | null>(
    post.org_identifier_id
  );
  const [identifierPhotoUrl, setIdentifierPhotoUrl] = useState<string | null>(
    post.identifier_photo_url
  );

  function handleOpen() {
    setTitle(post.title);
    setFormat(post.format);
    setPillars(initialPillars(post.pillar, pillarOptions));
    setScheduledAt(toDateInputValue(post.scheduled_at));
    setCopy(post.copy || "");
    setCopyEn(post.copy_en || "");
    setCaption(post.caption || "");
    setCaptionEn(post.caption_en || "");
    setPlate(post.plate || "");
    setReferences(post.references_text || "");
    setBilingual(!!(post.copy_en?.trim() || post.caption_en?.trim()));
    setOrgIdentifierIds(selectedIdentifierIdsFromPost(post, identifiers));
    setOrgIdentifierId(post.org_identifier_id);
    setIdentifierPhotoUrl(post.identifier_photo_url);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const pillarValue = formatPillars(pillars) || null;
    const nextCopyEn = bilingual ? copyEn || null : null;
    const nextCaptionEn = bilingual ? captionEn || null : null;

    const result = await updatePost(orgId, post.id, {
      title: title.trim() || post.title,
      format,
      pillar: pillarValue,
      scheduled_at: scheduledAt || null,
      copy: copy || null,
      copy_en: nextCopyEn,
      caption: caption || null,
      caption_en: nextCaptionEn,
      plate: plate || null,
      org_identifier_id: orgIdentifierId,
      identifier_photo_url: identifierPhotoUrl,
      references_text: references || null,
    });

    if (!result.error) {
      onSaved?.({
        title: title.trim() || post.title,
        format,
        pillar: pillarValue,
        scheduled_at: scheduledAt || null,
        copy: copy || null,
        copy_en: nextCopyEn,
        caption: caption || null,
        caption_en: nextCaptionEn,
        plate: plate || null,
        org_identifier_id: orgIdentifierId,
        identifier_photo_url: identifierPhotoUrl,
        references_text: references || null,
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
              <Input
                label="Fecha"
                type="date"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />

              <PostPillarField
                options={pillarOptions}
                selected={pillars}
                onChange={setPillars}
                compact
              />

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

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted">Copy y caption</p>
                <Button
                  type="button"
                  variant={bilingual ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setBilingual((v) => !v)}
                >
                  <Languages size={12} />
                  {bilingual ? "Un idioma" : "Otro idioma"}
                </Button>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted">
                  Copy (texto en slides / video)
                </label>
                <GrillaCopyEditor
                  key={`${post.id}-${format}-${bilingual ? "bi" : "mono"}`}
                  format={format}
                  value={copy}
                  onChange={setCopy}
                  bilingual={bilingual}
                  valueEn={copyEn}
                  onChangeEn={setCopyEn}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted">Caption</label>
                {bilingual ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-muted">
                        Español
                      </span>
                      <CaptionEditor
                        value={caption}
                        onChange={setCaption}
                        hashtagGroups={hashtagGroups}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-muted">
                        English
                      </span>
                      <CaptionEditor
                        value={captionEn}
                        onChange={setCaptionEn}
                        hashtagGroups={hashtagGroups}
                      />
                    </div>
                  </div>
                ) : (
                  <CaptionEditor
                    value={caption}
                    onChange={setCaption}
                    hashtagGroups={hashtagGroups}
                  />
                )}
              </div>

              <PostIdentifierField
                orgId={orgId}
                config={identifierConfig}
                identifiers={identifiers}
                selectedIds={orgIdentifierIds}
                onChange={({ ids, id, value, photoUrl }) => {
                  setOrgIdentifierIds(ids);
                  setOrgIdentifierId(id);
                  setPlate(value);
                  setIdentifierPhotoUrl(photoUrl);
                }}
              />

              <div className="space-y-1">
                <label className="text-xs text-muted">Referencias</label>
                <textarea
                  value={references}
                  onChange={(e) => setReferences(e.target.value)}
                  rows={2}
                  placeholder="Links, inspiración, notas internas..."
                  className="flex w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-foreground/10 resize-none"
                />
              </div>

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
