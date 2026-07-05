import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WidgetsPage } from "@/components/home/widgets-page";
import { getOrgHomeData } from "@/lib/home-data";

export default async function OrgWidgetsPage({
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
    .select("organization_id")
    .eq("user_id", user!.id)
    .eq("organization_id", orgId)
    .single();

  if (!membership) notFound();

  const data = await getOrgHomeData(user!.id, orgId);

  return (
    <WidgetsPage
      scope="org"
      activeWidgets={data.slotWidgets}
      backHref={`/org/${orgId}/home`}
      title={`Widgets · ${data.orgName}`}
      orgId={orgId}
    />
  );
}
