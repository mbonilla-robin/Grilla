import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductionOrgContext } from "@/components/layout/production-org-context";
import { FeedPreview } from "@/components/feed/feed-preview";
import { sortPostAssets } from "@/lib/utils";
import type { Organization, PostAsset, PostWithAssets } from "@/lib/types";

function FeedContent({
  posts,
  accountName,
  bio,
  initialPostId,
}: {
  posts: PostWithAssets[];
  accountName: string;
  bio?: string;
  initialPostId?: string;
}) {
  return (
    <FeedPreview
      posts={posts}
      accountName={accountName}
      bio={bio}
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: posts }, { data: org }, { data: brandKit }, { data: memberships }] =
    await Promise.all([
    supabase
      .from("posts")
      .select("*, post_assets(*)")
      .eq("organization_id", orgId)
      .order("scheduled_at", { ascending: false, nullsFirst: false }),
    supabase.from("organizations").select("name").eq("id", orgId).single(),
    supabase.from("brand_kits").select("objective, tone_of_voice").eq("organization_id", orgId).single(),
    supabase
      .from("organization_members")
      .select("organizations(*)")
      .eq("user_id", user.id),
  ]);

  const organizations = (memberships || []).map(
    (m) => m.organizations as unknown as Organization
  );

  const postsWithAssets: PostWithAssets[] = (posts || []).map((p) => ({
    ...p,
    assets: sortPostAssets((p.post_assets as PostAsset[]) || []),
  }));

  return (
    <div className="w-full px-4 pt-2 pb-4 sm:px-6 sm:pt-3 sm:pb-6 flex flex-col items-center">
      <div className="w-full max-w-lg mb-6">
        <div className="text-center">
          <ProductionOrgContext
            organizations={organizations}
            currentOrgId={orgId}
            page="feed"
            className="mb-1 justify-center"
          />
          <h1 className="text-title-sub">Feed</h1>
        </div>
      </div>
      <Suspense fallback={null}>
        <FeedContent
          posts={postsWithAssets}
          accountName={org?.name || "cuenta"}
          bio={brandKit?.objective || brandKit?.tone_of_voice || undefined}
          initialPostId={initialPostId}
        />
      </Suspense>
    </div>
  );
}
