import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { NewPostDialog } from "@/components/grilla/new-post-dialog";
import { GrillaCards } from "@/components/grilla/grilla-cards";
import { GrillaMonthFilter } from "@/components/grilla/grilla-month-filter";
import { getAvailableMonths, sortPostAssets } from "@/lib/utils";
import { getPostAssignmentOptions } from "@/lib/team-assignments";
import { enrichPostsWithTeam } from "@/lib/post-team";
import type { PostAsset, PostWithAssets } from "@/lib/types";

function monthRange(month: string) {
  const [year, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, m - 1, 1));
  const end = new Date(Date.UTC(year, m, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

export default async function GrillaPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { orgId } = await params;
  const { month = "all" } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("posts")
    .select("*, post_assets(*)")
    .eq("organization_id", orgId)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  if (month !== "all") {
    const { start, end } = monthRange(month);
    query = query.gte("scheduled_at", start).lt("scheduled_at", end);
  }

  const [{ data: posts, error }, { data: monthPosts }, assignmentOptions] =
    await Promise.all([
      query,
      supabase
        .from("posts")
        .select("scheduled_at")
        .eq("organization_id", orgId)
        .not("scheduled_at", "is", null),
      getPostAssignmentOptions(orgId),
    ]);

  if (error) {
    console.error("Grilla query error:", error.message);
  }

  const availableMonths = getAvailableMonths(
    (monthPosts || []).map((p) => p.scheduled_at)
  );

  const postsWithAssets: PostWithAssets[] = (posts || []).map((p) => {
    const { post_assets, ...rest } = p;
    return {
      ...rest,
      assets: sortPostAssets((post_assets as PostAsset[]) || []),
    };
  });

  const enrichedPosts = await enrichPostsWithTeam(postsWithAssets);

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold">Grilla</h1>
            <p className="text-xs text-muted mt-0.5">
              Tarjetas editoriales · conectadas al Feed
            </p>
          </div>
          {availableMonths.length > 0 && (
            <Suspense fallback={null}>
              <GrillaMonthFilter months={availableMonths} />
            </Suspense>
          )}
        </div>
        <NewPostDialog
          orgId={orgId}
          assignmentOptions={assignmentOptions}
          currentUserId={user!.id}
        />
      </div>
      <GrillaCards posts={enrichedPosts} orgId={orgId} />
    </div>
  );
}
