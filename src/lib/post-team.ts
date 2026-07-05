import { createClient } from "@/lib/supabase/server";
import type { PostWithAssets } from "@/lib/types";

function displayName(p: {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
} | null) {
  if (!p) return null;
  return (
    [p.first_name, p.last_name].filter(Boolean).join(" ") ||
    p.full_name ||
    null
  );
}

export async function enrichPostsWithTeam(
  posts: PostWithAssets[]
): Promise<PostWithAssets[]> {
  if (posts.length === 0) return posts;

  const userIds = new Set<string>();
  for (const p of posts) {
    if (p.created_by) userIds.add(p.created_by);
    if (p.assigned_to) userIds.add(p.assigned_to);
    if (p.community_manager_id) userIds.add(p.community_manager_id);
  }

  if (userIds.size === 0) return posts;

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, full_name")
    .in("id", [...userIds]);

  const byId = new Map(
    (profiles || []).map((p) => [p.id, displayName(p)])
  );

  return posts.map((p) => ({
    ...p,
    creator_name: byId.get(p.created_by) ?? null,
    designer_name: p.assigned_to ? byId.get(p.assigned_to) ?? null : null,
    community_name: p.community_manager_id
      ? byId.get(p.community_manager_id) ?? null
      : null,
  }));
}
