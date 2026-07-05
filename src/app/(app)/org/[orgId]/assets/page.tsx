import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssetLinksManager } from "@/components/assets/asset-links-manager";
import { SubPageHeader } from "@/components/home/home-ui";
import type { OrgAssetLink } from "@/lib/types";

export default async function OrgAssetsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user!.id)
    .eq("organization_id", orgId)
    .single();

  if (!membership) notFound();

  const { data: links } = await supabase
    .from("org_asset_links")
    .select("*")
    .eq("organization_id", orgId)
    .order("category")
    .order("sort_order");

  const isAdmin = membership.role === "admin";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <SubPageHeader title="Assets" backHref={`/org/${orgId}/home`} backLabel="Marca" />
      <AssetLinksManager
        orgId={orgId}
        links={(links || []) as OrgAssetLink[]}
        isAdmin={isAdmin}
      />
    </div>
  );
}
