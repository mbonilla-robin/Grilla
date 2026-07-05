import type { SupabaseClient } from "@supabase/supabase-js";
import type { TeamMemberPreview } from "@/lib/home-data";
import type { MemberRole } from "@/lib/types";

const ROLE_ORDER: MemberRole[] = [
  "admin",
  "creator",
  "community_manager",
  "designer",
  "client",
];

export async function getOrgTeamMembers(
  supabase: SupabaseClient,
  orgId: string
): Promise<TeamMemberPreview[]> {
  const { data: members, error: membersError } = await supabase
    .from("organization_members")
    .select("id, user_id, role, extra_roles")
    .eq("organization_id", orgId);

  if (membersError || !members?.length) {
    return [];
  }

  const userIds = members.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, full_name, avatar_url")
    .in("id", userIds);

  const profileById = new Map((profiles || []).map((p) => [p.id, p]));

  return members
    .map((m) => {
      const p = profileById.get(m.user_id);
      const name =
        [p?.first_name, p?.last_name].filter(Boolean).join(" ") ||
        p?.full_name ||
        "Sin nombre";

      return {
        id: m.id,
        user_id: m.user_id,
        role: m.role as MemberRole,
        extra_roles: (m.extra_roles as MemberRole[] | null) ?? [],
        name,
        avatar_url: p?.avatar_url ?? null,
      };
    })
    .sort((a, b) => {
      const roleDiff = ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
      if (roleDiff !== 0) return roleDiff;
      return a.name.localeCompare(b.name, "es");
    });
}
