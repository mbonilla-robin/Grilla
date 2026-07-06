import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsHub } from "@/components/settings/settings-nav";

export default async function SettingsPage({
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
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/home");

  return <SettingsHub orgId={orgId} isAdmin={membership.role === "admin"} />;
}
