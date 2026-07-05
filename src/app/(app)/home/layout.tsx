import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { getUnreadNotificationCount } from "@/lib/notifications-data";
import type { Organization, OrganizationMember } from "@/lib/types";

export default async function GlobalHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("*, organizations(*)")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    redirect("/dashboard");
  }

  const formattedMemberships = memberships.map((m) => ({
    ...m,
    organizations: m.organizations as unknown as Organization,
  })) as (OrganizationMember & { organizations: Organization })[];

  const currentOrgId = formattedMemberships[0].organizations.id;
  const unreadNotifications = await getUnreadNotificationCount(user.id);

  return (
    <AppShell
      memberships={formattedMemberships}
      currentOrgId={currentOrgId}
      userId={user.id}
      unreadNotifications={unreadNotifications}
    >
      {children}
    </AppShell>
  );
}
