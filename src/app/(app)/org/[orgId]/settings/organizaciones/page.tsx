import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SettingsActions } from "@/components/settings/settings-actions";
import { ROLE_LABELS, type Organization, type MemberRole } from "@/lib/types";

export default async function OrganizationsSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("*, organizations(*)")
    .eq("user_id", user!.id);

  const organizations = (memberships || []).map((m) => ({
    org: m.organizations as unknown as Organization,
    role: m.role,
  }));

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-lg font-semibold mb-2">Organizaciones</h1>
      <p className="text-sm text-muted mb-6">
        Administra las marcas a las que perteneces.
      </p>

      <SettingsActions />

      <div className="border border-border rounded-lg divide-y divide-border mt-4">
        {organizations.map(({ org, role }) => (
          <div
            key={org.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium">{org.name}</p>
              <p className="text-xs text-muted">{ROLE_LABELS[role as MemberRole]}</p>
            </div>
            {org.id === orgId ? (
              <span className="text-xs text-muted">Activa</span>
            ) : (
              <Link
                href={`/org/${org.id}/home`}
                className="text-xs text-foreground hover:underline"
              >
                Cambiar
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
