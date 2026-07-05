import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgTeamMembers } from "@/lib/team-data";
import type { TeamMemberPreview } from "@/lib/home-data";
import type { MemberRole } from "@/lib/types";

export interface MemberOption {
  user_id: string;
  name: string;
}

export interface PostAssignmentOptions {
  creators: MemberOption[];
  designers: MemberOption[];
  communityManagers: MemberOption[];
  defaultCreatorId: string | null;
  defaultDesignerId: string | null;
  defaultCommunityManagerId: string | null;
  pickCreator: boolean;
  pickDesigner: boolean;
  pickCommunityManager: boolean;
}

export function memberHasRole(
  member: Pick<TeamMemberPreview, "role" | "extra_roles">,
  role: MemberRole
) {
  return member.role === role || (member.extra_roles ?? []).includes(role);
}

function toMemberOption(member: TeamMemberPreview): MemberOption {
  return { user_id: member.user_id, name: member.name };
}

export function buildPostAssignmentOptions(
  members: TeamMemberPreview[]
): PostAssignmentOptions {
  const creators = members
    .filter((m) => memberHasRole(m, "creator"))
    .map(toMemberOption);
  const designers = members
    .filter((m) => memberHasRole(m, "designer"))
    .map(toMemberOption);
  const communityManagers = members
    .filter((m) => memberHasRole(m, "community_manager"))
    .map(toMemberOption);

  return {
    creators,
    designers,
    communityManagers,
    defaultCreatorId: creators.length === 1 ? creators[0].user_id : null,
    defaultDesignerId: designers.length === 1 ? designers[0].user_id : null,
    defaultCommunityManagerId:
      communityManagers.length === 1 ? communityManagers[0].user_id : null,
    pickCreator: creators.length > 1,
    pickDesigner: designers.length > 1,
    pickCommunityManager: communityManagers.length > 1,
  };
}

export async function getPostAssignmentOptions(
  orgId: string
): Promise<PostAssignmentOptions> {
  const supabase = await createClient();
  let members = await getOrgTeamMembers(supabase, orgId);

  if (members.length === 0) {
    const admin = createAdminClient();
    if (admin) {
      members = await getOrgTeamMembers(admin, orgId);
    }
  }

  return buildPostAssignmentOptions(members);
}

export function resolvePostAssignments(
  options: PostAssignmentOptions,
  picks: {
    creatorId?: string;
    designerId?: string;
    communityManagerId?: string;
    fallbackCreatorId: string;
  }
) {
  const contentCreatorId =
    picks.creatorId ||
    options.defaultCreatorId ||
    (options.creators.length === 0 ? picks.fallbackCreatorId : null);

  const designerId =
    picks.designerId || options.defaultDesignerId || null;

  const communityManagerId =
    picks.communityManagerId || options.defaultCommunityManagerId || null;

  return { contentCreatorId, designerId, communityManagerId };
}
