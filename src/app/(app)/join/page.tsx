import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JoinOrganization } from "@/components/onboarding/join-organization";
import type { Invitation, Organization } from "@/lib/types";
import Link from "next/link";

export default async function JoinPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: invitations } = await supabase
    .from("invitations")
    .select("*, organizations(*)")
    .eq("status", "pending")
    .ilike("email", user.email || "");

  const pendingInvitations = (invitations || []).map((inv) => ({
    ...inv,
    organization: inv.organizations as unknown as Organization,
  })) as (Invitation & { organization?: Organization })[];

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  const hasOrgs = (memberships?.length || 0) > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4">
        {hasOrgs && (
          <Link
            href={`/org/${memberships![0].organization_id}/grilla`}
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            ← Volver
          </Link>
        )}
        <div className="text-center space-y-2">
          <h1 className="text-title-sub">Unirme a una organización</h1>
          <p className="text-sm text-muted">
            Acepta una invitación para trabajar con un equipo
          </p>
        </div>
        <JoinOrganization
          pendingInvitations={pendingInvitations}
          userEmail={user.email || ""}
        />
      </div>
    </div>
  );
}
