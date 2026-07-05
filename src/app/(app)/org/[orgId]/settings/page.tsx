import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "@/components/settings/profile-editor";
import { OrgInviteLink } from "@/components/org/org-invite-link";
import { SettingsActions } from "@/components/settings/settings-actions";
import { ROLE_LABELS, type Organization, type Profile, type MemberRole } from "@/lib/types";

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

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("*, organizations(*)")
    .eq("user_id", user!.id);

  const organizations = (memberships || []).map((m) => ({
    org: m.organizations as unknown as Organization,
    role: m.role,
  }));

  const organization = org as Organization;
  const isAdmin = memberships?.find((m) => m.organization_id === orgId)?.role === "admin";

  return (
    <div className="p-6 max-w-lg space-y-10">
      <section>
        <h1 className="text-lg font-semibold mb-6">Perfil</h1>
        <ProfileEditor
          profile={(profile as Profile) || { id: user!.id, first_name: "", last_name: "", full_name: "", phone: null, job_title: null, avatar_url: null, created_at: "", updated_at: "" }}
          email={user?.email || ""}
        />
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-4">Organizaciones</h2>
        <SettingsActions />
        <div className="border border-border rounded-lg divide-y divide-border mt-4">
          {organizations.map(({ org: o, role }) => (
            <div
              key={o.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{o.name}</p>
                <p className="text-xs text-muted">{ROLE_LABELS[role as MemberRole]}</p>
              </div>
              {o.id === orgId ? (
                <span className="text-xs text-muted">Activa</span>
              ) : (
                <a
                  href={`/org/${o.id}/home`}
                  className="text-xs text-foreground hover:underline"
                >
                  Cambiar
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      {isAdmin && organization?.invite_token && (
        <section>
          <h2 className="text-sm font-semibold mb-4">Invitar al equipo</h2>
          <OrgInviteLink
            orgName={organization.name}
            inviteToken={organization.invite_token}
            defaultRole={organization.default_invite_role}
          />
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold mb-4">Organización activa</h2>
        <p className="text-sm font-medium">{organization?.name}</p>
      </section>
    </div>
  );
}
