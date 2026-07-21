import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostDetail } from "@/components/grilla/post-detail";
import { getPostComments } from "@/lib/notifications-data";
import { getOrgTeamMembers } from "@/lib/team-data";
import { sortPostAssets } from "@/lib/utils";
import { syncStalePostStatusesFromAssets } from "@/lib/post-status-sync";
import { getOrgIdentifiers } from "@/lib/org-identifiers-data";
import { getOrgIdentifierConfig } from "@/lib/org-identifier";
import { resolvePostIdentifierReferences } from "@/lib/resolve-post-identifier";
import type { Post, PostAsset, PostMetrics, PostComment } from "@/lib/types";

export default async function PostPage({
  params,
}: {
  params: Promise<{ orgId: string; postId: string }>;
}) {
  const { orgId, postId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: post }, { data: metrics }, { data: org }, { data: membership }] = await Promise.all([
    supabase
      .from("posts")
      .select("*, post_assets(*)")
      .eq("id", postId)
      .eq("organization_id", orgId)
      .single(),
    supabase
      .from("post_metrics")
      .select("*")
      .eq("post_id", postId)
      .maybeSingle(),
    supabase.from("organizations").select("name, identifier_label, identifier_allow_photo, identifier_placeholder").eq("id", orgId).single(),
    supabase
      .from("organization_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", orgId)
      .single(),
  ]);

  if (!post) notFound();

  const [comments, members, identifiers] = await Promise.all([
    getPostComments(postId),
    getOrgTeamMembers(supabase, orgId),
    getOrgIdentifiers(orgId),
  ]);

  const assets = sortPostAssets((post.post_assets as PostAsset[]) || []);
  const { post_assets: _, ...postData } = post;

  const [syncedPost] = await syncStalePostStatusesFromAssets(supabase, [
    { ...(postData as Post), assets },
  ]);
  const resolvedPost = syncedPost ?? (postData as Post);
  const identifierConfig = org
    ? getOrgIdentifierConfig(org)
    : { label: null, allowPhoto: false, placeholder: null };
  const identifierReferences = resolvePostIdentifierReferences(
    resolvedPost,
    identifiers
  );

  return (
    <PostDetail
      post={resolvedPost}
      orgId={orgId}
      orgName={org?.name ?? ""}
      assets={assets}
      metrics={(metrics as PostMetrics | null) ?? null}
      comments={comments as PostComment[]}
      members={members.map((m) => ({
          user_id: m.user_id,
          name: m.name,
          avatar_url: m.avatar_url,
        }))}
      currentUserId={user.id}
      isAdmin={membership?.role === "admin"}
      briefHistory={(post.brief_history as Post["brief_history"]) || []}
      identifierConfig={identifierConfig}
      identifierReferences={identifierReferences}
    />
  );
}
