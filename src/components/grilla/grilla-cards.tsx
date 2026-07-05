import { GrillaCard } from "@/components/grilla/grilla-card";
import type { OrgHashtagGroup, PostWithAssets } from "@/lib/types";

interface GrillaCardsProps {
  posts: PostWithAssets[];
  orgId: string;
  pillarOptions?: string[];
  hashtagGroups?: OrgHashtagGroup[];
}

export function GrillaCards({
  posts,
  orgId,
  pillarOptions,
  hashtagGroups,
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

  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {posts.map((post) => (
        <GrillaCard
          key={post.id}
          post={post}
          orgId={orgId}
          pillarOptions={pillarOptions}
          hashtagGroups={hashtagGroups}
        />
      ))}
    </div>
  );
}
