"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Tag,
  HardDrive,
  Hash,
  ImageIcon,
  Layers,
  Film,
  Grid3x3,
  Play,
  Circle,
  Check,
  Copy,
  ExternalLink,
  Trash2,
  Pencil,
  Palette,
  Languages,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { updatePost, updatePostStatus, deletePost } from "@/lib/actions";
import { PostAssetUploader } from "@/components/grilla/post-asset-uploader";
import { DownloadAllAssetsButton } from "@/components/grilla/download-all-assets-button";
import { BriefPanel } from "@/components/grilla/brief-panel";
import { CreativeBriefForm } from "@/components/grilla/creative-brief-form";
import { PostMetricsForm } from "@/components/grilla/post-metrics-form";
import { PostComments } from "@/components/grilla/post-comments";
import { CaptionEditor } from "@/components/grilla/caption-editor";
import {
  FORMAT_LABELS,
  type Post,
  type PostAsset,
  type PostFormat,
  type PostMetrics,
  type PostComment,
  type BriefHistoryEntry,
} from "@/lib/types";
import { IdentifierReferencesList } from "@/components/grilla/identifier-reference-panel";
import type { OrgIdentifierConfig } from "@/lib/org-identifier";
import {
  type ResolvedPostIdentifier,
  parseIdentifierValues,
} from "@/lib/resolve-post-identifier";
import {
  formatDate,
  parseDesignerCopy,
  sortPostAssets,
} from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  detectContentLanguage,
  languageLabel,
  type ContentLang,
} from "@/lib/bilingual-copy";
import { PostPhaseTimeline } from "@/components/grilla/post-phase-timeline";
import { HeaderBanner } from "@/components/layout/header-banner-context";
import {
  WORKFLOW_PHASES,
  SUSPENDED_STATUS,
  effectivePostStatus,
  representativeStatusForPhase,
  statusSelectValueFromStatus,
  type StatusSelectValue,
} from "@/lib/post-progress";

const formatIcons: Record<PostFormat, typeof ImageIcon> = {
  image: ImageIcon,
  carousel: Layers,
  video_carousel: Film,
  feed: Grid3x3,
  reel: Play,
  story: Circle,
};

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] font-medium text-muted uppercase tracking-wider shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-center gap-x-4 gap-y-1 text-sm min-h-[28px]">
      <span className="text-muted text-xs">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

interface PostDetailProps {
  post: Post;
  orgId: string;
  orgName: string;
  assets: PostAsset[];
  metrics?: PostMetrics | null;
  comments?: PostComment[];
  members?: { user_id: string; name: string }[];
  currentUserId?: string;
  isAdmin?: boolean;
  briefHistory?: BriefHistoryEntry[];
  identifierConfig?: OrgIdentifierConfig;
  identifierReferences?: ResolvedPostIdentifier[];
}

export function PostDetail({
  post,
  orgId,
  orgName,
  assets: initialAssets,
  metrics,
  comments = [],
  members = [],
  currentUserId = "",
  isAdmin = false,
  briefHistory = [],
  identifierConfig = { label: null, allowPhoto: false, placeholder: null },
  identifierReferences = [],
}: PostDetailProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [designPanelOpen, setDesignPanelOpen] = useState(false);
  const [contentEditOpen, setContentEditOpen] = useState(false);
  const [status, setStatus] = useState(() =>
    effectivePostStatus(post.status, initialAssets.length)
  );
  const [inDrive, setInDrive] = useState(post.in_drive);
  const [driveLoading, setDriveLoading] = useState(false);
  const [assets, setAssets] = useState(initialAssets);
  const [caption, setCaption] = useState(post.caption || "");
  const [captionEn, setCaptionEn] = useState(post.caption_en || "");
  // Caption dual UI only when EN caption exists or the user opts in — not because copy is bilingual.
  const [bilingualCaption, setBilingualCaption] = useState(
    () => !!(post.caption_en?.trim())
  );
  const [captionSaving, setCaptionSaving] = useState(false);
  const [captionSaved, setCaptionSaved] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const FormatIcon = formatIcons[post.format] || ImageIcon;

  const hasCopyEsField = !!post.copy?.trim();
  const hasCopyEnField = !!post.copy_en?.trim();
  // English-only orgs (e.g. Petroequip) store EN in `copy` with no `copy_en`.
  const monoPrimaryIsEnglish =
    hasCopyEsField &&
    !hasCopyEnField &&
    detectContentLanguage(post.copy!) === "en";
  const copyEsSource = monoPrimaryIsEnglish ? null : post.copy;
  const copyEnSource = monoPrimaryIsEnglish
    ? post.copy
    : post.copy_en;
  const designer = parseDesignerCopy(copyEsSource);
  const designerEn = parseDesignerCopy(copyEnSource);
  const hasDesignerEs =
    !!(
      designer.slides.length > 0 ||
      designer.title ||
      designer.subtitle ||
      designer.body
    );
  const hasDesignerEn =
    !!(
      designerEn.slides.length > 0 ||
      designerEn.title ||
      designerEn.subtitle ||
      designerEn.body
    );
  const hasDesignerContent = hasDesignerEs || hasDesignerEn;
  const isBilingualCopy = hasDesignerEs && hasDesignerEn;

  const displayPlates =
    identifierReferences.length > 0
      ? identifierReferences
          .map((ref) => ref.value)
          .filter((value): value is string => !!value)
      : parseIdentifierValues(post.plate || "");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!designPanelOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [designPanelOpen]);

  async function handleStatusSelectChange(value: StatusSelectValue) {
    const newStatus =
      value === SUSPENDED_STATUS
        ? SUSPENDED_STATUS
        : representativeStatusForPhase(value);
    setStatus(newStatus);
    await updatePostStatus(post.id, newStatus, orgId);
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar este post? Esta acción no se puede deshacer.")) return;
    setDeleting(true);
    const result = await deletePost(orgId, post.id);
    setDeleting(false);
    if (!result.error) {
      router.push(`/org/${orgId}/grilla`);
    }
  }

  async function handleCaptionSave() {
    setCaptionSaving(true);
    setCaptionSaved(false);
    const result = await updatePost(orgId, post.id, {
      caption: caption || null,
      caption_en: bilingualCaption ? captionEn || null : post.caption_en,
    });
    setCaptionSaving(false);
    if (!result.error) setCaptionSaved(true);
  }

  async function toggleDrive() {
    setDriveLoading(true);
    const next = !inDrive;
    const result = await updatePost(orgId, post.id, { in_drive: next });
    if (!result.error) {
      setInDrive(next);
    }
    setDriveLoading(false);
  }

  const metadataSection = (
    <div className="space-y-1 border-b border-border pb-6">
      <PropertyRow label="Estado">
        <select
          value={statusSelectValueFromStatus(status)}
          onChange={(e) =>
            handleStatusSelectChange(e.target.value as StatusSelectValue)
          }
          className="h-7 rounded-md border border-border bg-surface px-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/10"
        >
          {WORKFLOW_PHASES.map((phase) => (
            <option key={phase.key} value={phase.key}>
              {phase.label}
            </option>
          ))}
          <option value={SUSPENDED_STATUS}>Suspendido</option>
        </select>
      </PropertyRow>

      <PropertyRow label="Fecha">
        <span className="inline-flex items-center gap-1.5 text-sm">
          <Calendar size={13} className="text-muted opacity-60" />
          {formatDate(post.scheduled_at)}
        </span>
      </PropertyRow>

      <PropertyRow label="Formato">
        <span className="inline-flex items-center gap-1.5 text-sm">
          <FormatIcon size={13} className="text-muted opacity-60" />
          {FORMAT_LABELS[post.format]}
        </span>
      </PropertyRow>

      {post.pillar && (
        <PropertyRow label="Pilar">
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Tag size={13} className="text-muted opacity-60" />
            {post.pillar.replace(/\s*\/\s*/g, " · ")}
          </span>
        </PropertyRow>
      )}

      <PropertyRow label="Drive">
        <button
          type="button"
          onClick={toggleDrive}
          disabled={driveLoading}
          className={cn(
            "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
            inDrive
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-border bg-surface text-muted hover:text-foreground hover:border-foreground/20"
          )}
        >
          <HardDrive size={12} />
          <span
            className={cn(
              "flex h-3.5 w-3.5 items-center justify-center rounded border",
              inDrive
                ? "border-emerald-400 bg-emerald-500 text-white"
                : "border-border bg-surface"
            )}
          >
            {inDrive && <Check size={9} strokeWidth={3} />}
          </span>
          {inDrive ? "En Drive" : "Marcar en Drive"}
        </button>
      </PropertyRow>

      {identifierConfig.label && displayPlates.length > 0 && (
        <PropertyRow label={identifierConfig.label}>
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Hash size={13} className="text-muted opacity-60 shrink-0" />
            <span>{displayPlates.join(" · ")}</span>
          </span>
        </PropertyRow>
      )}
    </div>
  );

  const captionHasEs = !!caption.trim();
  const captionHasEn = !!captionEn.trim();
  const captionMonoLang: ContentLang | null =
    captionHasEs && !captionHasEn
      ? detectContentLanguage(caption)
      : !captionHasEs && captionHasEn
        ? "en"
        : null;

  function getCaptionCopyText() {
    if (!captionHasEs && !captionHasEn) return "";
    if (bilingualCaption || (captionHasEs && captionHasEn)) {
      const parts = [
        captionHasEs ? caption.trim() : "",
        captionHasEn ? captionEn.trim() : "",
      ].filter(Boolean);
      return parts.join("\n\n");
    }
    if (captionHasEn && !captionHasEs) return captionEn.trim();
    return caption.trim();
  }

  async function handleCopyCaption() {
    const text = getCaptionCopyText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2000);
    } catch {
      // silent
    }
  }

  const captionReadOnlySection = (
    <section>
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-label">Caption</h2>
        {(captionHasEs || captionHasEn) && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleCopyCaption}
            title="Copiar caption con hashtags"
          >
            {captionCopied ? <Check size={13} /> : <Copy size={13} />}
            {captionCopied ? "Copiado" : "Copiar"}
          </Button>
        )}
      </div>
      {!captionHasEs && !captionHasEn ? (
        <p className="text-sm text-muted">Sin caption aún.</p>
      ) : bilingualCaption || (captionHasEs && captionHasEn) ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {captionHasEs && (
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted">Español</span>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {caption}
              </p>
            </div>
          )}
          {captionHasEn && (
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted">English</span>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {captionEn}
              </p>
            </div>
          )}
        </div>
      ) : captionHasEn && !captionHasEs ? (
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-muted">English</span>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {captionEn}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-muted">
            {languageLabel(captionMonoLang || "es")}
          </span>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {caption}
          </p>
        </div>
      )}
    </section>
  );

  const captionSection = (
    <section>
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-label">Caption</h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={bilingualCaption ? "secondary" : "ghost"}
            onClick={() => setBilingualCaption((v) => !v)}
          >
            <Languages size={12} />
            {bilingualCaption ? "Un idioma" : "Otro idioma"}
          </Button>
          {captionSaved && (
            <span className="text-xs text-emerald-600">Guardado</span>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCaptionSave}
            loading={captionSaving}
          >
            Guardar caption
          </Button>
        </div>
      </div>
      {bilingualCaption ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted">Español</span>
            <CaptionEditor
              value={caption}
              onChange={setCaption}
              accountName={orgName}
            />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted">English</span>
            <CaptionEditor
              value={captionEn}
              onChange={setCaptionEn}
              accountName={orgName}
            />
          </div>
        </div>
      ) : captionHasEn && !captionHasEs ? (
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-muted">English</span>
          <CaptionEditor
            value={captionEn}
            onChange={setCaptionEn}
            accountName={orgName}
          />
        </div>
      ) : (
        <div className="space-y-1">
          {(captionHasEs || captionHasEn) && (
            <span className="text-[11px] font-medium text-muted">
              {languageLabel(captionMonoLang || "es")}
            </span>
          )}
          <CaptionEditor
            value={caption}
            onChange={setCaption}
            accountName={orgName}
          />
        </div>
      )}
    </section>
  );

  const assetsSection = (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-label">
          Archivos
        </h2>
        <div className="flex items-center gap-2">
          <DownloadAllAssetsButton
            assets={assets}
            zipFileName={post.title || undefined}
          />
          <Link
            href={`/org/${orgId}/feed?post=${post.id}`}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
          >
            <ExternalLink size={11} />
            Ver en Feed
          </Link>
        </div>
      </div>
      <PostAssetUploader
        postId={post.id}
        orgId={orgId}
        assets={sortPostAssets(assets)}
        onAssetsChanged={(next) => {
          setAssets(next);
          setStatus((s) => effectivePostStatus(s, next.length));
        }}
        onStatusChanged={setStatus}
      />
    </section>
  );

  function LangPair({
    es,
    en,
    className,
  }: {
    es?: string | null;
    en?: string | null;
    className?: string;
  }) {
    const hasEs = !!es?.trim();
    const hasEn = !!en?.trim();
    if (!hasEs && !hasEn) return null;
    if (hasEs && hasEn) {
      return (
        <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted">Español</span>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{es}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted">English</span>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{en}</p>
          </div>
        </div>
      );
    }
    const lang: ContentLang = hasEn ? "en" : "es";
    const text = hasEn ? en : es;
    return (
      <div className={cn("space-y-1", className)}>
        <span className="text-[11px] font-medium text-muted">
          {languageLabel(lang)}
        </span>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
      </div>
    );
  }

  const designerSlideNumbers = Array.from(
    new Set([
      ...designer.slides.map((s) => s.slide),
      ...designerEn.slides.map((s) => s.slide),
    ])
  ).sort((a, b) => a - b);

  const designerContentSection = hasDesignerContent ? (
    <section className="space-y-4">
      <p className="text-xs text-muted leading-relaxed">
        Contenido que dejó el creador para producir el post
        {isBilingualCopy
          ? " · bilingüe (ES / EN)"
          : hasDesignerEn && !hasDesignerEs
            ? " · English"
            : hasDesignerEs && !hasDesignerEn
              ? ` · ${languageLabel(monoPrimaryIsEnglish ? "en" : "es")}`
              : ""}
      </p>

      {(designer.title ||
        designer.subtitle ||
        designer.body ||
        designerEn.title ||
        designerEn.subtitle ||
        designerEn.body) && (
        <div className="rounded-lg border border-border divide-y divide-border">
          {(designer.title || designerEn.title) && (
            <div className="px-4 py-3 space-y-2">
              <p className="text-[10px] font-medium text-muted uppercase tracking-wide">
                Título
              </p>
              <LangPair es={designer.title} en={designerEn.title} />
            </div>
          )}
          {(designer.subtitle || designerEn.subtitle) && (
            <div className="px-4 py-3 space-y-2">
              <p className="text-[10px] font-medium text-muted uppercase tracking-wide">
                Subtítulo
              </p>
              <LangPair es={designer.subtitle} en={designerEn.subtitle} />
            </div>
          )}
          {(designer.body || designerEn.body) && (
            <div className="px-4 py-3 space-y-2">
              <p className="text-[10px] font-medium text-muted uppercase tracking-wide">
                Cuerpo
              </p>
              <LangPair es={designer.body} en={designerEn.body} />
            </div>
          )}
        </div>
      )}

      {designerSlideNumbers.map((slideNum) => {
        const slideEs = designer.slides.find((s) => s.slide === slideNum);
        const slideEn = designerEn.slides.find((s) => s.slide === slideNum);
        return (
          <div
            key={slideNum}
            className="rounded-lg border border-border px-4 py-3 space-y-2"
          >
            <p className="text-[10px] font-medium text-muted uppercase tracking-wide">
              Slide {slideNum}
              {(slideEs?.label || slideEn?.label) && (
                <span className="normal-case font-normal">
                  {" "}
                  · {slideEs?.label || slideEn?.label}
                </span>
              )}
            </p>
            <LangPair es={slideEs?.content} en={slideEn?.content} />
          </div>
        );
      })}
    </section>
  ) : null;

  const briefSection = (
    <>
      <SectionDivider label="Brief de diseño" />
      <BriefPanel
        postId={post.id}
        orgId={orgId}
        postTitle={post.title}
        initialBrief={post.brief}
        initialHistory={briefHistory}
        onStatusChange={(next) =>
          setStatus((prev) => (prev === "suspendido" ? prev : next))
        }
      />
    </>
  );

  const mainContentSections = (
    <>
      {contentEditOpen && (
        <CreativeBriefForm post={post} orgId={orgId} />
      )}
      {contentEditOpen ? captionSection : captionReadOnlySection}
      {assetsSection}
      <PostMetricsForm
        postId={post.id}
        orgId={orgId}
        initial={metrics}
        isPublished={status === "published"}
      />
    </>
  );

  const designPanelContent = (
    <>
      {identifierConfig.label && identifierReferences.length > 0 && (
        <IdentifierReferencesList
          label={identifierConfig.label}
          references={identifierReferences}
        />
      )}

      {designerContentSection}
      {briefSection}
    </>
  );

  const mobileDesignPanel =
    mounted && designPanelOpen
      ? createPortal(
          <div className="fixed inset-0 z-[60] md:hidden">
            <div className="absolute inset-0 flex flex-col bg-surface animate-slide-in-from-right">
              <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
                <button
                  type="button"
                  onClick={() => setDesignPanelOpen(false)}
                  className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
                >
                  <ArrowLeft size={16} />
                  Volver
                </button>
                <h2 className="text-label flex-1 text-center pr-16">
                  Para diseño
                </h2>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 space-y-8 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
                {designPanelContent}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <HeaderBanner message={contentEditOpen ? "Estás editando" : null} />
      {mobileDesignPanel}
      <div className="grid h-full min-h-0 w-full max-w-6xl mx-auto grid-cols-1 md:grid-cols-2 md:divide-x divide-border">
      <div className="min-h-0 overflow-y-auto px-4 md:px-6 py-6 space-y-8">
        <Link
          href={`/org/${orgId}/grilla`}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Grilla
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-title-sub leading-tight">
              {post.title}
            </h1>
            {orgName && (
              <p className="text-sm text-muted mt-1">{orgName}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setContentEditOpen((open) => !open)}
              title={contentEditOpen ? "Cerrar edición" : "Editar contenido"}
              className={
                contentEditOpen
                  ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 hover:text-amber-950"
                  : undefined
              }
            >
              <Pencil size={13} />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setDesignPanelOpen(true)}
              className="md:hidden"
            >
              <Palette size={13} />
              Diseño
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleDelete}
                loading={deleting}
                title="Eliminar post"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 size={13} />
              </Button>
            )}
          </div>
        </div>

        <PostPhaseTimeline status={status} />

        {metadataSection}
        {currentUserId && (
          <div className="border-b border-border pb-6">
            <PostComments
              postId={post.id}
              orgId={orgId}
              initialComments={comments}
              members={members}
              currentUserId={currentUserId}
            />
          </div>
        )}
        {mainContentSections}
      </div>

      <div className="hidden md:block min-h-0 overflow-y-auto px-6 py-6 space-y-8">
        <h2 className="text-label">
          Para diseño
        </h2>

        {designPanelContent}
      </div>
    </div>
    </>
  );
}
