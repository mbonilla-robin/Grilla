import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  SettingsNav,
  SettingsHub,
  SettingsMobileHeader,
  SettingsDesktopRedirect,
} from "@/components/settings/settings-nav";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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

  const isAdmin = membership.role === "admin";

  return (
    <div className="flex flex-1 w-full min-w-0 min-h-full flex-col md:flex-row">
      <SettingsDesktopRedirect orgId={orgId} />
      <SettingsNav orgId={orgId} isAdmin={isAdmin} />
      <div className="flex-1 min-w-0 flex flex-col">
        <SettingsMobileHeader orgId={orgId} />
        {children}
      </div>
    </div>
  );
}
