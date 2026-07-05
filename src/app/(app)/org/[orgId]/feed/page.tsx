import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { FeedPreview } from "@/components/feed/feed-preview";
import { sortPostAssets } from "@/lib/utils";
import type { PostAsset, PostWithAssets } from "@/lib/types";

function FeedContent({
  posts,
  accountName,
  initialPostId,
}: {
  posts: PostWithAssets[];
  accountName: string;
  initialPostId?: string;
}) {
  return (
    <FeedPreview
      posts={posts}
      accountName={accountName}
      initialPostId={initialPostId}
    />
  );
}

export default async function FeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ post?: string }>;
}) {
  const { orgId } = await params;
  const { post: initialPostId } = await searchParams;
  const supabase = await createClient();

  const [{ data: posts }, { data: org }] = await Promise.all([
    supabase
      .from("posts")
      .select("*, post_assets(*)")
      .eq("organization_id", orgId)
      .order("scheduled_at", { ascending: false, nullsFirst: false }),
    supabase.from("organizations").select("name").eq("id", orgId).single(),
  ]);

  const postsWithAssets: PostWithAssets[] = (posts || []).map((p) => ({
    ...p,
    assets: sortPostAssets((p.post_assets as PostAsset[]) || []),
  }));

  return (
    <div className="p-6 flex flex-col items-center">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Feed</h1>
        <p className="text-xs text-muted mt-0.5">
          Preview de Instagram · portada = archivo 1 · caption de la grilla
        </p>
      </div>
      <Suspense fallback={null}>
        <FeedContent
          posts={postsWithAssets}
          accountName={org?.name || "cuenta"}
          initialPostId={initialPostId}
        />
      </Suspense>
    </div>
  );
}
