"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ExternalLink,
  HardDrive,
  Hash,
  ImagePlus,
  Tag,
  Copy,
} from "lucide-react";
import { EditPostDialog } from "@/components/grilla/edit-post-dialog";
import { PostAssetUploader } from "@/components/grilla/post-asset-uploader";
import { PostStatusBadge } from "@/components/grilla/post-status-badge";
import { duplicatePost } from "@/lib/actions";
import {
  formatDate,
  parseCopyFields,
  captionExcerpt,
  sortPostAssets,
} from "@/lib/utils";
import { type PostWithAssets, type OrgHashtagGroup } from "@/lib/types";
import { formatPostLabel } from "@/lib/post-display";

interface GrillaCardProps {
  post: PostWithAssets;
  orgId: string;
  pillarOptions?: string[];
  hashtagGroups?: OrgHashtagGroup[];
}

export function GrillaCard({
  post: initialPost,
  orgId,
  pillarOptions,
  hashtagGroups,
}: GrillaCardProps) {
  const router = useRouter();
  const [post, setPost] = useState(initialPost);
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  async function handleDuplicate(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDuplicating(true);
    const result = await duplicatePost(orgId, post.id);
    setDuplicating(false);
    if (result.data?.id) {
      router.push(`/org/${orgId}/grilla/${result.data.id}`);
    }
  }

  const assets = sortPostAssets(post.assets || []);
  const cover = assets[0];
  const detailHref = `/org/${orgId}/grilla/${post.id}`;
  const { subtitle } = parseCopyFields(post.copy);
  const excerpt = captionExcerpt(post.caption);

  return (
    <article className="group flex flex-col rounded-lg border border-border bg-surface overflow-hidden hover:border-foreground/15 transition-colors">
      <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
        <PostStatusBadge status={post.status} />
        <div className="flex items-center gap-0.5">
          <EditPostDialog
            post={post}
            orgId={orgId}
            pillarOptions={pillarOptions}
            hashtagGroups={hashtagGroups}
            onSaved={(updates) => setPost((p) => ({ ...p, ...updates }))}
          />
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={duplicating}
            className="p-1 rounded text-muted hover:text-foreground hover:bg-neutral-100 transition-colors disabled:opacity-50"
            title="Duplicar post"
          >
            <Copy size={12} />
          </button>
          <Link
            href={`/org/${orgId}/feed?post=${post.id}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded text-muted hover:text-foreground hover:bg-neutral-100 transition-colors"
            title="Ver en Feed"
          >
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      <Link
        href={detailHref}
        className="flex gap-2.5 px-2.5 pb-2 cursor-pointer hover:bg-neutral-50/60 transition-colors"
      >
        <div className="relative h-[90px] w-[72px] shrink-0 overflow-hidden rounded-md border border-border bg-neutral-900">
          {cover ? (
            cover.file_type === "video" ? (
              <video
                src={cover.file_url}
                className="h-full w-full object-cover"
                muted
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover.file_url}
                alt={post.title}
                className="h-full w-full object-cover"
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center">
              <ImagePlus size={16} className="text-muted/30" />
            </div>
          )}
          {assets.length > 1 && (
            <span className="absolute bottom-0.5 right-0.5 rounded bg-black/65 px-1 text-[8px] text-white">
              +{assets.length - 1}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 flex flex-col">
          <h3 className="text-[13px] font-semibold leading-tight text-foreground line-clamp-2 group-hover:underline">
            {formatPostLabel(post.format, post.title)}
          </h3>

          {subtitle && (
            <p className="mt-0.5 text-[11px] text-muted leading-snug line-clamp-2">
              {subtitle}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-muted">
            <span className="inline-flex items-center gap-1">
              <Calendar size={10} className="opacity-50" />
              {formatDate(post.scheduled_at)}
            </span>
            {post.pillar && (
              <span className="inline-flex items-center gap-1">
                <Tag size={10} className="opacity-50" />
                {post.pillar}
              </span>
            )}
            {post.in_drive && (
              <span className="inline-flex items-center gap-1">
                <HardDrive size={10} className="opacity-50" />
                Drive
              </span>
            )}
            {post.plate && (
              <span className="inline-flex items-center gap-1">
                <Hash size={10} className="opacity-50" />
                {post.plate}
              </span>
            )}
          </div>

          {excerpt && (
            <p className="mt-1 text-[10px] text-muted/70 leading-snug line-clamp-2">
              {excerpt}
            </p>
          )}

          {(post.creator_name || post.designer_name || post.community_name) && (
            <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-muted">
              {post.creator_name && (
                <span>Contenido: {post.creator_name}</span>
              )}
              {post.designer_name ? (
                <span>Diseño: {post.designer_name}</span>
              ) : (
                <span className="text-amber-600/80">Sin diseñador</span>
              )}
              {post.community_name && (
                <span>CM: {post.community_name}</span>
              )}
            </div>
          )}
        </div>
      </Link>

      <div className="border-t border-border/50 px-2.5 py-1.5">
        <PostAssetUploader
          postId={post.id}
          orgId={orgId}
          assets={assets}
          mini
          uploadOnly
          onAssetsChanged={(next) =>
            setPost((p) => ({ ...p, assets: next }))
          }
          onStatusChanged={(status) => setPost((p) => ({ ...p, status }))}
        />
      </div>
    </article>
  );
}
