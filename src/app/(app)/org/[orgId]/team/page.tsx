import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgTeamMembers } from "@/lib/team-data";
import { notFound } from "next/navigation";
import { TeamPanel } from "@/components/team/team-panel";
import type { MemberRole } from "@/lib/types";

export default async function TeamPage({
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
    supabase.from("organizations").select("name").eq("id", orgId).single(),
  ]);

  if (!membership) notFound();

  let teamMembers = await getOrgTeamMembers(supabase, orgId);

  if (teamMembers.length === 0) {
    const admin = createAdminClient();
    if (admin) {
      teamMembers = await getOrgTeamMembers(admin, orgId);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <header className="space-y-3">
        <Link
          href={`/org/${orgId}/home`}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Volver a {org?.name || "marca"}
        </Link>
        <h1 className="text-xl font-semibold">Equipo</h1>
        <p className="text-sm text-muted">
          Define quién trabaja en {org?.name || "esta marca"} y con qué rol.
        </p>
      </header>

      <TeamPanel
        orgId={orgId}
        currentUserId={user!.id}
        role={membership.role as MemberRole}
        teamMembers={teamMembers}
      />
    </div>
  );
}
