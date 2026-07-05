import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductionBrandBar } from "@/components/layout/production-brand-bar";
import type { Organization } from "@/lib/types";

async function getUserOrganizations() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organizations(*)")
    .eq("user_id", user.id);

  return (memberships || []).map(
    (m) => m.organizations as unknown as Organization
  );
}

export default async function FeedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const organizations = await getUserOrganizations();

  return (
    <>
      <ProductionBrandBar
        organizations={organizations}
        currentOrgId={orgId}
        page="feed"
      />
      {children}
    </>
  );
}
