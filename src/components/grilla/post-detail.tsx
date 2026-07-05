"use client";

import { useState } from "react";
import {
  Sparkles,
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
  Palette,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { updatePost, updatePostStatus } from "@/lib/actions";
import { PostAssetUploader } from "@/components/grilla/post-asset-uploader";
import {
  STATUS_LABELS,
  FORMAT_LABELS,
  type Post,
  type DesignBrief,
  type PostAsset,
  type PostFormat,
  type PostStatus,
} from "@/lib/types";
import {
  formatDate,
  parseDesignerCopy,
  sortPostAssets,
} from "@/lib/utils";
import { cn } from "@/lib/utils";

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
  assets: PostAsset[];
}

export function PostDetail({ post, orgId, assets: initialAssets }: PostDetailProps) {
  const [brief, setBrief] = useState<DesignBrief | null>(post.brief);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState(post.status);
  const [inDrive, setInDrive] = useState(post.in_drive);
  const [driveLoading, setDriveLoading] = useState(false);
  const [assets, setAssets] = useState(initialAssets);
  const FormatIcon = formatIcons[post.format] || ImageIcon;
  const designer = parseDesignerCopy(post.copy);
  const hasDesignerContent =
    designer.slides.length > 0 ||
    designer.title ||
    designer.subtitle ||
    designer.body;

  async function generateBrief() {
    setGenerating(true);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, orgId }),
      });
      const data = await res.json();
      if (data.brief) {
        setBrief(data.brief);
        setStatus("brief_ready");
      }
    } catch {
      // silent
    }
    setGenerating(false);
  }

  async function handleStatusChange(newStatus: PostStatus) {
    setStatus(newStatus);
    await updatePostStatus(post.id, newStatus, orgId);
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

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link
        href={`/org/${orgId}/grilla`}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft size={14} />
        Grilla
      </Link>

      <div className="space-y-1 border-b border-border pb-6 mb-8">
        <PropertyRow label="Estado">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as PostStatus)}
            className="h-7 rounded-md border border-border bg-surface px-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/10"
          >
            {(
              [
                "draft",
                "brief_ready",
                "in_design",
                "review",
                "approved",
                "scheduled",
                "published",
              ] as const
            ).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
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

        {post.plate && (
          <PropertyRow label="Placa">
            <span className="inline-flex items-center gap-1.5 text-sm">
              <Hash size={13} className="text-muted opacity-60" />
              {post.plate}
            </span>
          </PropertyRow>
        )}
      </div>

      <h1 className="text-2xl font-semibold tracking-tight leading-tight mb-8">
        {post.title}
      </h1>

      {post.caption && (
        <section className="mb-8">
          <h2 className="text-[11px] font-medium text-muted uppercase tracking-wide mb-3">
            Caption
          </h2>
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
            {post.caption}
          </p>
        </section>
      )}

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-medium text-muted uppercase tracking-wide">
            Archivos
          </h2>
          <Link
            href={`/org/${orgId}/feed?post=${post.id}`}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
          >
            <ExternalLink size={11} />
            Ver en Feed
          </Link>
        </div>
        <PostAssetUploader
          postId={post.id}
          orgId={orgId}
          assets={sortPostAssets(assets)}
          onAssetsChanged={setAssets}
          onStatusChanged={setStatus}
        />
      </section>

      {post.references_text && (
        <section className="mb-8">
          <h2 className="text-[11px] font-medium text-muted uppercase tracking-wide mb-3">
            Referencias
          </h2>
          <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">
            {post.references_text}
          </p>
        </section>
      )}

      {hasDesignerContent && (
        <>
          <SectionDivider label="Para diseño" />

          <section className="space-y-4 mb-8">
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
        </>
      )}

      <SectionDivider label="Brief de diseño" />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted inline-flex items-center gap-1.5">
            <Palette size={12} />
            Generado con IA para el diseñador
          </p>
          {!brief && (
            <Button size="sm" onClick={generateBrief} loading={generating}>
              <Sparkles size={13} />
              Generar brief
            </Button>
          )}
        </div>

        {brief ? (
          <div className="space-y-3">
            {brief.slides.map((slide) => (
              <div
                key={slide.slide}
                className="rounded-lg border border-border px-4 py-3 space-y-1.5 bg-neutral-50/50"
              >
                <p className="text-[10px] font-medium text-muted uppercase tracking-wide">
                  Slide {slide.slide}
                </p>
                {slide.title && (
                  <p className="text-sm font-semibold">{slide.title}</p>
                )}
                {slide.subtitle && (
                  <p className="text-sm text-muted">{slide.subtitle}</p>
                )}
                {slide.body && (
                  <p className="text-sm leading-relaxed">{slide.body}</p>
                )}
                {slide.image_prompt && (
                  <p className="text-xs text-muted border border-border rounded px-2 py-1.5 bg-surface mt-2">
                    {slide.image_prompt}
                  </p>
                )}
                {slide.colors && slide.colors.length > 0 && (
                  <div className="flex gap-1.5 pt-1">
                    {slide.colors.map((color) => (
                      <div
                        key={color}
                        className="h-5 w-5 rounded-full border border-border"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {brief.notes && (
              <p className="text-xs text-muted px-1">{brief.notes}</p>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={generateBrief}
              loading={generating}
            >
              Regenerar
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Genera un brief visual basado en el copy y el brand kit
          </p>
        )}
      </section>
    </div>
  );
}
