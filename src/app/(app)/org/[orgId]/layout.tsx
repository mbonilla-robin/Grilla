import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { getUnreadNotificationCount } from "@/lib/notifications-data";
import type { Organization, OrganizationMember } from "@/lib/types";

export default async function OrgLayout({
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

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("*, organizations(*)")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    redirect("/dashboard");
  }

  const currentMembership = memberships.find(
    (m) => (m.organizations as unknown as Organization).id === orgId
  );

  if (!currentMembership) notFound();

  const formattedMemberships = memberships.map((m) => ({
    ...m,
    organizations: m.organizations as unknown as Organization,
  })) as (OrganizationMember & { organizations: Organization })[];

  const unreadNotifications = await getUnreadNotificationCount(user.id);

  return (
    <AppShell
      memberships={formattedMemberships}
      currentOrgId={orgId}
      userId={user.id}
      unreadNotifications={unreadNotifications}
    >
      {children}
    </AppShell>
  );
}
