import { createClient } from "@/lib/supabase/client";
import { sortPostAssets } from "@/lib/utils";
import type { PostAsset, PostWithAssets } from "@/lib/types";

function monthRange(month: string) {
  const [year, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, m - 1, 1));
  const end = new Date(Date.UTC(year, m, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

const cache = new Map<string, PostWithAssets[]>();
const inflight = new Map<string, Promise<PostWithAssets[]>>();

function cacheKey(orgId: string, month: string) {
  return `${orgId}:${month}`;
}

export function seedGrillaPostsCache(
  orgId: string,
  month: string,
  posts: PostWithAssets[]
) {
  cache.set(cacheKey(orgId, month), posts);
}

export function getCachedGrillaPosts(orgId: string, month: string) {
  return cache.get(cacheKey(orgId, month));
}

export async function fetchGrillaPostsClient(
  orgId: string,
  month: string
): Promise<PostWithAssets[]> {
  const key = cacheKey(orgId, month);
  const hit = cache.get(key);
  if (hit) return hit;

  const pending = inflight.get(key);
  if (pending) return pending;

  const request = (async () => {
    const supabase = createClient();
    const { start, end } = monthRange(month);

    const { data, error } = await supabase
      .from("posts")
      .select("*, post_assets(*)")
      .eq("organization_id", orgId)
      .gte("scheduled_at", start)
      .lt("scheduled_at", end)
      .order("scheduled_at", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("fetchGrillaPostsClient:", error.message);
      return [];
    }

    const posts: PostWithAssets[] = (data || []).map((p) => {
      const { post_assets, ...rest } = p;
      return {
        ...rest,
        assets: sortPostAssets((post_assets as PostAsset[]) || []),
      };
    });

    cache.set(key, posts);
    return posts;
  })();

  inflight.set(key, request);
  try {
    return await request;
  } finally {
    inflight.delete(key);
  }
}
