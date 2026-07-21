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
  ExternalLink,
  Trash2,
  Palette,
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
import { PostPhaseTimeline } from "@/components/grilla/post-phase-timeline";
import {
  WORKFLOW_PHASES,
  effectivePostStatus,
  representativeStatusForPhase,
  workflowPhaseFromStatus,
  type WorkflowPhaseKey,
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
  const [status, setStatus] = useState(() =>
    effectivePostStatus(post.status, initialAssets.length)
  );
  const [inDrive, setInDrive] = useState(post.in_drive);
  const [driveLoading, setDriveLoading] = useState(false);
  const [assets, setAssets] = useState(initialAssets);
  const [caption, setCaption] = useState(post.caption || "");
  const [captionSaving, setCaptionSaving] = useState(false);
  const [captionSaved, setCaptionSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const FormatIcon = formatIcons[post.format] || ImageIcon;
  const designer = parseDesignerCopy(post.copy);
  const hasDesignerContent =
    designer.slides.length > 0 ||
    designer.title ||
    designer.subtitle ||
    designer.body;

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

  async function handlePhaseChange(phase: WorkflowPhaseKey) {
    const newStatus = representativeStatusForPhase(phase);
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
    const result = await updatePost(orgId, post.id, { caption: caption || null });
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
          value={workflowPhaseFromStatus(status)}
          onChange={(e) =>
            handlePhaseChange(e.target.value as WorkflowPhaseKey)
          }
          className="h-7 rounded-md border border-border bg-surface px-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/10"
        >
          {WORKFLOW_PHASES.map((phase) => (
            <option key={phase.key} value={phase.key}>
              {phase.label}
            </option>
          ))}
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
            {post.pillar}
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

  const captionSection = (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-label">
          Caption
        </h2>
        <div className="flex items-center gap-2">
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
      <CaptionEditor
        value={caption}
        onChange={setCaption}
        accountName={orgName}
      />
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

  const designerContentSection = hasDesignerContent ? (
    <section className="space-y-4">
      <p className="text-xs text-muted leading-relaxed">
        Contenido que dejó el creador para producir el post
      </p>

      {(designer.title || designer.subtitle || designer.body) && (
        <div className="rounded-lg border border-border divide-y divide-border">
          {designer.title && (
            <div className="px-4 py-3">
              <p className="text-[10px] font-medium text-muted uppercase tracking-wide mb-1">
                Título
              </p>
              <p className="text-sm font-semibold leading-snug">
                {designer.title}
              </p>
            </div>
          )}
          {designer.subtitle && (
            <div className="px-4 py-3">
              <p className="text-[10px] font-medium text-muted uppercase tracking-wide mb-1">
                Subtítulo
              </p>
              <p className="text-sm text-muted leading-relaxed">
                {designer.subtitle}
              </p>
            </div>
          )}
          {designer.body && (
            <div className="px-4 py-3">
              <p className="text-[10px] font-medium text-muted uppercase tracking-wide mb-1">
                Cuerpo
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {designer.body}
              </p>
            </div>
          )}
        </div>
      )}

      {designer.slides.map((slide) => (
        <div
          key={slide.slide}
          className="rounded-lg border border-border px-4 py-3 space-y-2"
        >
          <p className="text-[10px] font-medium text-muted uppercase tracking-wide">
            Slide {slide.slide}
            {slide.label && (
              <span className="normal-case font-normal">
                {" "}
                · {slide.label}
              </span>
            )}
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {slide.content}
          </p>
        </div>
      ))}
    </section>
  ) : null;

  const briefSection = (
    <>
      <SectionDivider label="Brief de diseño" />
      <BriefPanel
        postId={post.id}
        orgId={orgId}
        initialBrief={post.brief}
        initialHistory={briefHistory}
        onStatusChange={setStatus}
      />
    </>
  );

  const mainContentSections = (
    <>
      <CreativeBriefForm post={post} orgId={orgId} />
      {captionSection}
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
