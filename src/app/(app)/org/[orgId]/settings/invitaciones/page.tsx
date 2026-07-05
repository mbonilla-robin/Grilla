import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrgInviteLink } from "@/components/org/org-invite-link";
import type { Organization } from "@/lib/types";

export default async function InvitationsSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: membership }, { data: org }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", user!.id)
      .single(),
    supabase.from("organizations").select("*").eq("id", orgId).single(),
  ]);

  if (membership?.role !== "admin") {
    redirect(`/org/${orgId}/settings/perfil`);
  }

  const organization = org as Organization;

  if (!organization?.invite_token) {
    return (
      <div className="p-6 max-w-lg">
        <h1 className="text-title-sub mb-2">Invitaciones</h1>
        <p className="text-sm text-muted">
          No hay enlace de invitación disponible para esta organización.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-title-sub mb-2">Invitaciones</h1>
      <p className="text-sm text-muted mb-6">
        Comparte un enlace para que nuevos miembros se unan a {organization.name}.
      </p>

      <OrgInviteLink
        orgName={organization.name}
        inviteToken={organization.invite_token}
        defaultRole={organization.default_invite_role}
      />
    </div>
  );
}
