import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostDetail } from "@/components/grilla/post-detail";
import { sortPostAssets } from "@/lib/utils";
import type { Post, PostAsset } from "@/lib/types";

export default async function PostPage({
  params,
}: {
  params: Promise<{ orgId: string; postId: string }>;
}) {
  const { orgId, postId } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select("*, post_assets(*)")
    .eq("id", postId)
    .eq("organization_id", orgId)
    .single();

  if (!post) notFound();

  const assets = sortPostAssets((post.post_assets as PostAsset[]) || []);
  const { post_assets: _, ...postData } = post;

  return (
    <PostDetail
      post={postData as Post}
      orgId={orgId}
      assets={assets}
    />
  );
}
