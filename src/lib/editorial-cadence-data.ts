import { createClient } from "@/lib/supabase/server";
import type { MemberRole } from "@/lib/types";
import { getQuincenaContexts } from "@/lib/editorial-cadence";
import {
  buildQuincenaSnapshots,
  getCadencePublishRange,
  type CadencePost,
  type QuincenaBoardSnapshot,
} from "@/lib/editorial-quincena";

function displayName(p: {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
} | null): string | null {
  if (!p) return null;
  return (
    [p.first_name, p.last_name].filter(Boolean).join(" ") ||
    p.full_name ||
    null
  );
}

export async function fetchQuincenaBoardSnapshots(
  orgs: { id: string; name: string }[],
  now = new Date()
): Promise<QuincenaBoardSnapshot[]> {
  if (orgs.length === 0) return [];

  const supabase = await createClient();
  const orgIds = orgs.map((o) => o.id);
  const range = getCadencePublishRange(now);
  const contexts = getQuincenaContexts(now);

  const [{ data: posts }, { data: members }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, organization_id, status, scheduled_at, created_by")
      .in("organization_id", orgIds)
      .not("scheduled_at", "is", null)
      .gte("scheduled_at", range.start)
      .lte("scheduled_at", range.end),
    supabase
      .from("organization_members")
      .select(
        "organization_id, user_id, role, extra_roles, profiles(first_name, last_name, full_name)"
      )
      .in("organization_id", orgIds),
  ]);

  const creatorsByOrg = new Map<string, { userId: string; name: string | null } | null>();
  for (const orgId of orgIds) {
    const orgMembers = (members || []).filter((m) => m.organization_id === orgId);
    const creator = orgMembers.find(
      (m) =>
        m.role === "creator" ||
        ((m.extra_roles as MemberRole[] | null) ?? []).includes("creator")
    );
    const profile = creator?.profiles as {
      first_name?: string | null;
      last_name?: string | null;
      full_name?: string | null;
    } | null;
    creatorsByOrg.set(
      orgId,
      creator
        ? { userId: creator.user_id, name: displayName(profile) }
        : null
    );
  }

  const cadencePosts = (posts || []) as CadencePost[];

  return buildQuincenaSnapshots({
    orgs,
    posts: cadencePosts,
    creatorsByOrg,
    contexts: contexts.map((ctx) => ({
      id: ctx.id,
      publishYear: ctx.publishYear,
      publishMonth: ctx.publishMonth,
    })),
  });
}
