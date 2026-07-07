import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostStatus } from "@/lib/types";

const STATUS_RANK: Record<PostStatus, number> = {
  draft: 1,
  brief_ready: 2,
  in_design: 3,
  review: 4,
  approved: 5,
  scheduled: 6,
  published: 7,
};

type PostRow = {
  id: string;
  organization_id: string;
  title: string;
  scheduled_at: string | null;
  status: string;
  brief: unknown;
  assigned_to: string | null;
  updated_at: string;
  post_assets?: { id: string }[] | null;
};

export function postFingerprint(post: {
  organization_id: string;
  title: string;
  scheduled_at: string | null;
}): string {
  const day = post.scheduled_at
    ? post.scheduled_at.slice(0, 10)
    : "__no_date__";
  return `${post.organization_id}|${post.title.trim().toLowerCase()}|${day}`;
}

function postScore(post: PostRow): number {
  const statusRank = STATUS_RANK[post.status as PostStatus] ?? 0;
  const assetCount = post.post_assets?.length ?? 0;
  const hasBrief = post.brief ? 1 : 0;
  const hasAssignee = post.assigned_to ? 1 : 0;
  const updated = new Date(post.updated_at).getTime() || 0;
  return (
    statusRank * 1_000_000_000_000 +
    assetCount * 1_000_000_000 +
    hasBrief * 10_000_000 +
    hasAssignee * 1_000_000 +
    updated
  );
}

function pickKeeper(posts: PostRow[]): PostRow {
  return posts.reduce((best, current) =>
    postScore(current) > postScore(best) ? current : best
  );
}

export async function pruneDuplicatePosts(
  supabase: SupabaseClient,
  orgId?: string
): Promise<number> {
  let query = supabase
    .from("posts")
    .select(
      "id, organization_id, title, scheduled_at, status, brief, assigned_to, updated_at, post_assets(id)"
    )
    .order("updated_at", { ascending: false });

  if (orgId) {
    query = query.eq("organization_id", orgId);
  }

  const { data: posts, error } = await query;
  if (error || !posts?.length) return 0;

  const groups = new Map<string, PostRow[]>();
  for (const post of posts as PostRow[]) {
    const key = postFingerprint(post);
    const list = groups.get(key) || [];
    list.push(post);
    groups.set(key, list);
  }

  const toDelete: string[] = [];
  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    const keeper = pickKeeper(group);
    for (const post of group) {
      if (post.id !== keeper.id) toDelete.push(post.id);
    }
  }

  if (toDelete.length === 0) return 0;

  const { error: deleteError } = await supabase
    .from("posts")
    .delete()
    .in("id", toDelete);

  if (deleteError) {
    console.error("[pruneDuplicatePosts]", deleteError.message);
    return 0;
  }

  return toDelete.length;
}

export async function findExistingPost(
  supabase: SupabaseClient,
  orgId: string,
  title: string,
  scheduledAt: string | null
) {
  if (!scheduledAt) return null;

  const day = scheduledAt.slice(0, 10);
  const nextDay = new Date(`${day}T00:00:00.000Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const end = nextDay.toISOString();

  const { data } = await supabase
    .from("posts")
    .select("id, title, scheduled_at, status, organization_id")
    .eq("organization_id", orgId)
    .gte("scheduled_at", `${day}T00:00:00.000Z`)
    .lt("scheduled_at", end)
    .order("updated_at", { ascending: false });

  const target = postFingerprint({
    organization_id: orgId,
    title,
    scheduled_at: scheduledAt,
  });

  return (
    (data || []).find(
      (post) =>
        postFingerprint({
          organization_id: post.organization_id,
          title: post.title,
          scheduled_at: post.scheduled_at,
        }) === target
    ) ?? null
  );
}
