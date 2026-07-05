import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubPageHeader } from "@/components/home/home-ui";
import { ReviewQueue } from "@/components/revision/review-queue";
import { sortPostAssets } from "@/lib/utils";
import type { PostAsset, PostWithAssets } from "@/lib/types";

export default async function RevisionPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role, extra_roles")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .single();

  if (!membership) notFound();
  if (membership.role === "client") notFound();

  const { data: posts } = await supabase
    .from("posts")
    .select("*, post_assets(*)")
    .eq("organization_id", orgId)
    .eq("status", "review")
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  const postsWithAssets: PostWithAssets[] = (posts || []).map((p) => ({
    ...p,
    assets: sortPostAssets((p.post_assets as PostAsset[]) || []),
  }));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <SubPageHeader
        title="Cola de revisión"
        backHref={`/org/${orgId}/home`}
        backLabel="Inicio"
      />
      <p className="text-sm text-muted -mt-4">
        Aprueba o solicita cambios en posts pendientes de revisión
      </p>
      <ReviewQueue orgId={orgId} posts={postsWithAssets} />
    </div>
  );
}
