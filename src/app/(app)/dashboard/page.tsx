import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/layout/logo";
import { OnboardingChoice } from "@/components/onboarding/onboarding-choice";
import type { Invitation, Organization } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(*)")
    .eq("user_id", user.id);

  if (memberships && memberships.length > 0) {
    redirect("/home");
  }

  const { data: invitations } = await supabase
    .from("invitations")
    .select("*, organizations(*)")
    .eq("status", "pending")
    .ilike("email", user.email || "");

  const pendingInvitations = (invitations || []).map((inv) => ({
    ...inv,
    organization: inv.organizations as unknown as Organization,
  })) as (Invitation & { organization?: Organization })[];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8">
        <Logo size="lg" />
      </div>
      <div className="w-full max-w-md">
        <OnboardingChoice
          pendingInvitations={pendingInvitations}
          userEmail={user.email || ""}
        />
      </div>
    </div>
  );
}
