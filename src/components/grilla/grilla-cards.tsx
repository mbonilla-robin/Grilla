import Link from "next/link";
import { GrillaCard, type PostTimingLabel } from "@/components/grilla/grilla-card";
import { formatPostLabel } from "@/lib/post-display";
import { isSuspendedStatus } from "@/lib/post-progress";
import { scheduledAtToDate } from "@/lib/grilla-slot-utils";
import { formatDate } from "@/lib/utils";
import type { OrgHashtagGroup, OrgIdentifier, PostWithAssets } from "@/lib/types";
import type { OrgIdentifierConfig } from "@/lib/org-identifier";

interface GrillaCardsProps {
  posts: PostWithAssets[];
  orgId: string;
  pillarOptions?: string[];
  hashtagGroups?: OrgHashtagGroup[];
  identifierConfig?: OrgIdentifierConfig;
  identifiers?: OrgIdentifier[];
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function timingLabelsByPostId(
  posts: PostWithAssets[]
): Map<string, PostTimingLabel> {
  const today = localDateKey();
  const labels = new Map<string, PostTimingLabel>();

  const dated = posts
    .map((post) => ({
      id: post.id,
      day: post.scheduled_at ? scheduledAtToDate(post.scheduled_at) : null,
      at: post.scheduled_at || "",
    }))
    .filter((post): post is { id: string; day: string; at: string } => !!post.day)
    .sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));

  for (const post of dated) {
    if (post.day === today) labels.set(post.id, "hoy");
  }

  const next = dated.find((post) => post.day > today);
  if (next) labels.set(next.id, "siguiente");

  return labels;
}

function SuspendedPostButton({
  post,
  orgId,
}: {
  post: PostWithAssets;
  orgId: string;
}) {
  return (
    <Link
      href={`/org/${orgId}/grilla/${post.id}`}
      className="flex h-9 min-w-0 items-center gap-2 rounded-xl border border-border bg-neutral-50 px-3 text-left transition-colors hover:border-brand/40 hover:bg-neutral-100/80"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-muted">
        {formatPostLabel(post.format, post.title)}
      </span>
      <span className="shrink-0 text-[10px] text-muted/70">
        {formatDate(post.scheduled_at)}
      </span>
    </Link>
  );
}

export function GrillaCards({
  posts,
  orgId,
  pillarOptions,
  hashtagGroups,
  identifierConfig,
  identifiers,
}: GrillaCardsProps) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted">Sin posts en este período</p>
        <p className="text-xs text-muted/60 mt-1">
          Crea un post o cambia el filtro de mes
        </p>
      </div>
    );
  }

  const activePosts = posts.filter((post) => !isSuspendedStatus(post.status));
  const suspendedPosts = posts.filter((post) => isSuspendedStatus(post.status));
  const timingLabels = timingLabelsByPostId(activePosts);

  return (
    <div className="space-y-6">
      {activePosts.length > 0 && (
        <div className="grid items-stretch gap-2 md:grid-cols-2 xl:grid-cols-3">
          {activePosts.map((post) => (
            <GrillaCard
              key={post.id}
              post={post}
              orgId={orgId}
              pillarOptions={pillarOptions}
              hashtagGroups={hashtagGroups}
              identifierConfig={identifierConfig}
              identifiers={identifiers}
              timingLabel={timingLabels.get(post.id)}
            />
          ))}
        </div>
      )}

      {suspendedPosts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-medium tracking-wide text-muted">
            Posts suspendidos
          </h2>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {suspendedPosts.map((post) => (
              <SuspendedPostButton
                key={post.id}
                post={post}
                orgId={orgId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
