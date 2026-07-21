import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostStatus } from "@/lib/types";
import { effectivePostStatus, PRE_REVIEW_ASSET_STATUSES } from "@/lib/post-progress";

/** Sincroniza post.status con post_assets (subida / borrado de diseños). */
export async function syncPostStatusFromAssets(
  supabase: SupabaseClient,
  postId: string,
  orgId?: string
): Promise<string | null> {
  const [{ data: post }, { count }] = await Promise.all([
    supabase
      .from("posts")
      .select("status, title, organization_id, brief")
      .eq("id", postId)
      .single(),
    supabase
      .from("post_assets")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId),
  ]);

  if (!post) return null;

  const assetCount = count ?? 0;
  let newStatus: string | null = null;

  if (assetCount > 0 && PRE_REVIEW_ASSET_STATUSES.includes(post.status as PostStatus)) {
    newStatus = "review";
    const { error } = await supabase
      .from("posts")
      .update({ status: newStatus })
      .eq("id", postId);
    if (error) {
      console.error("[syncPostStatusFromAssets] update failed:", error.message);
      return null;
    }
  } else if (assetCount === 0 && post.status === "review") {
    newStatus = post.brief ? "brief_ready" : "draft";
    const { error } = await supabase
      .from("posts")
      .update({ status: newStatus })
      .eq("id", postId);
    if (error) {
      console.error("[syncPostStatusFromAssets] update failed:", error.message);
      return null;
    }
  }

  const { syncTasksForPost } = await import("@/lib/task-sync");
  await syncTasksForPost(supabase, postId, post.status);

  if (newStatus === "review") {
    const resolvedOrgId = orgId ?? post.organization_id;
    const { notifyPostStatusChange } = await import("@/lib/notifications");
    await notifyPostStatusChange(
      postId,
      resolvedOrgId,
      newStatus,
      post.title
    );
  }

  const resolvedOrgId = orgId ?? post.organization_id;
  const { revalidatePath } = await import("next/cache");
  if (resolvedOrgId) {
    revalidatePath(`/org/${resolvedOrgId}/grilla/${postId}`);
    revalidatePath(`/org/${resolvedOrgId}/grilla`);
    revalidatePath(`/org/${resolvedOrgId}/home`);
  }
  revalidatePath("/home");
  revalidatePath("/home/calendario");

  return newStatus;
}

type PostWithAssetCount = {
  id: string;
  status: PostStatus;
  assets?: unknown[] | null;
};

/** Corrige posts con diseños cargados pero status desactualizado (p. ej. tras regenerar brief). */
export async function syncStalePostStatusesFromAssets<T extends PostWithAssetCount>(
  supabase: SupabaseClient,
  posts: T[]
): Promise<T[]> {
  const stale = posts.filter(
    (p) =>
      effectivePostStatus(p.status, p.assets?.length ?? 0) !== p.status
  );
  if (stale.length === 0) return posts;

  await Promise.all(
    stale.map((p) =>
      supabase.from("posts").update({ status: "review" }).eq("id", p.id)
    )
  );

  const { syncTasksForPost } = await import("@/lib/task-sync");
  await Promise.all(
    stale.map((p) => syncTasksForPost(supabase, p.id, p.status))
  );

  const staleIds = new Set(stale.map((p) => p.id));
  return posts.map((p) =>
    staleIds.has(p.id) ? { ...p, status: "review" as PostStatus } : p
  );
}
