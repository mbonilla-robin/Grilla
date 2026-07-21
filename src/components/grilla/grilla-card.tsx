"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, ImagePlus } from "lucide-react";
import { EditPostDialog } from "@/components/grilla/edit-post-dialog";
import { PostAssetUploader } from "@/components/grilla/post-asset-uploader";
import { PostStatusBadge } from "@/components/grilla/post-status-badge";
import {
  formatDate,
  parseCopyFields,
  captionExcerpt,
  sortPostAssets,
} from "@/lib/utils";
import {
  type PostWithAssets,
  type OrgHashtagGroup,
  type OrgIdentifier,
} from "@/lib/types";
import type { OrgIdentifierConfig } from "@/lib/org-identifier";
import { formatPostLabel } from "@/lib/post-display";
import { effectivePostStatus } from "@/lib/post-progress";
import { parseIdentifierValues } from "@/lib/resolve-post-identifier";

interface GrillaCardProps {
  post: PostWithAssets;
  orgId: string;
  pillarOptions?: string[];
  hashtagGroups?: OrgHashtagGroup[];
  identifierConfig?: OrgIdentifierConfig;
  identifiers?: OrgIdentifier[];
}

export function GrillaCard({
  post: initialPost,
  orgId,
  pillarOptions,
  hashtagGroups,
  identifierConfig,
  identifiers,
}: GrillaCardProps) {
  const [post, setPost] = useState(initialPost);

  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  const assets = sortPostAssets(post.assets || []);
  const cover = assets[0];
  const detailHref = `/org/${orgId}/grilla/${post.id}`;
  const { subtitle } = parseCopyFields(post.copy);
  const excerpt = captionExcerpt(post.caption);

  const plateLabel = post.plate
    ? parseIdentifierValues(post.plate)
        .map((plate) => `# ${plate}`)
        .join(" · ")
    : null;

  const metaParts = [
    formatDate(post.scheduled_at),
    post.pillar || null,
    post.in_drive ? "Drive" : null,
    plateLabel,
  ].filter(Boolean);

  return (
    <article className="group grid h-full min-w-0 grid-rows-[auto_1fr_auto] rounded-2xl border border-border bg-surface overflow-hidden shadow-sm hover:border-brand/40 transition-colors">
      <div className="flex shrink-0 items-center justify-between px-2.5 pt-2 pb-1">
        <PostStatusBadge status={post.status} assetCount={assets.length} />
        <div className="flex items-center gap-0.5">
          <EditPostDialog
            post={post}
            orgId={orgId}
            pillarOptions={pillarOptions}
            hashtagGroups={hashtagGroups}
            identifierConfig={identifierConfig}
            identifiers={identifiers}
            onSaved={(updates) => setPost((p) => ({ ...p, ...updates }))}
          />
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
        className="flex h-full min-h-0 min-w-0 w-full items-start gap-2.5 overflow-hidden px-2.5 pb-2 cursor-pointer hover:bg-neutral-50/60 transition-colors"
      >
        <div className="relative h-[84px] w-[68px] shrink-0 overflow-hidden rounded-md border border-border bg-neutral-900">
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

        <div className="min-w-0 flex-1 overflow-hidden space-y-1">
          <h3 className="break-words text-[13px] font-semibold leading-snug text-foreground line-clamp-2 group-hover:underline">
            {formatPostLabel(post.format, post.title)}
          </h3>

          {subtitle && (
            <p className="break-words text-[11px] text-muted leading-snug line-clamp-2">
              {subtitle}
            </p>
          )}

          {metaParts.length > 0 && (
            <p className="break-words text-[10px] text-muted leading-snug line-clamp-2">
              {metaParts.join(" · ")}
            </p>
          )}

          {excerpt && (
            <p className="break-words text-[10px] text-muted/70 leading-snug line-clamp-2">
              {excerpt}
            </p>
          )}

          <p className="break-words pt-0.5 text-[9px] leading-snug text-muted line-clamp-2">
            {[
              post.creator_name ? `Contenido: ${post.creator_name}` : null,
              post.designer_name ? `Diseño: ${post.designer_name}` : "Sin diseñador",
              post.community_name ? `CM: ${post.community_name}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </Link>

      <div className="flex h-9 shrink-0 items-center border-t border-border/50 px-2.5">
        <PostAssetUploader
          postId={post.id}
          orgId={orgId}
          assets={assets}
          mini
          uploadOnly
          onAssetsChanged={(next) =>
            setPost((p) => ({
              ...p,
              assets: next,
              status: effectivePostStatus(p.status, next.length),
            }))
          }
          onStatusChanged={(status) => setPost((p) => ({ ...p, status }))}
        />
      </div>
    </article>
  );
}
