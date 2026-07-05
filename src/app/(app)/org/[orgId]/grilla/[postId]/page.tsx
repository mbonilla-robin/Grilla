import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostDetail } from "@/components/grilla/post-detail";
import { getPostComments } from "@/lib/notifications-data";
import { getOrgTeamMembers } from "@/lib/team-data";
import { sortPostAssets } from "@/lib/utils";
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

  const [{ data: post }, { data: metrics }, { data: org }] = await Promise.all([
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
    supabase.from("organizations").select("name").eq("id", orgId).single(),
  ]);

  if (!post) notFound();

  const [comments, members] = await Promise.all([
    getPostComments(postId),
    getOrgTeamMembers(supabase, orgId),
  ]);

  const assets = sortPostAssets((post.post_assets as PostAsset[]) || []);
  const { post_assets: _, ...postData } = post;

  return (
    <PostDetail
      post={postData as Post}
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
    />
  );
}
