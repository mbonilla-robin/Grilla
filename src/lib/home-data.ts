import { createClient } from "@/lib/supabase/server";
import {
  collectEditorialRoles,
} from "@/lib/editorial-cadence";
import { fetchQuincenaBoardSnapshots } from "@/lib/editorial-cadence-data";
import type { QuincenaBoardSnapshot } from "@/lib/editorial-quincena";
import {
  filterUrgentTasks,
  sortByDueAt,
  type TaskWithPost,
} from "@/lib/task-due";
import { filterOpenTasks, pruneDuplicateTasks } from "@/lib/task-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_GLOBAL_SLOTS,
  MAX_SLOT_WIDGETS,
  type HomeWidgetsConfig,
  resolveOrgSlots,
} from "@/lib/widget-config";
import type {
  Organization,
  OrganizationMember,
  Post,
  Task,
  Profile,
  MemberRole,
  PostFormat,
} from "@/lib/types";

export interface HomeStats {
  pending: number;
  inReview: number;
  thisMonth: number;
  tasksOpen: number;
  needsDesign: number;
}

export type HomePostPreview = Pick<
  Post,
  "id" | "title" | "scheduled_at" | "status" | "format" | "organization_id"
>;

export interface OrgSnapshot {
  id: string;
  name: string;
  role: MemberRole;
  pending: number;
  inReview: number;
  needsDesign: number;
}

export interface ReviewPostItem {
  id: string;
  title: string;
  format: PostFormat;
  organization_id: string;
  organization_name: string;
  scheduled_at: string | null;
  cover_url: string | null;
  cover_type: "image" | "video" | null;
}

export interface CalendarPostItem {
  id: string;
  title: string;
  format: PostFormat;
  organization_id: string;
  organization_name: string;
  scheduled_at: string;
  status: string;
}

export interface UserBrand {
  id: string;
  name: string;
  role: MemberRole;
  slug: string;
}

export interface TeamMemberPreview {
  id: string;
  user_id: string;
  role: MemberRole;
  extra_roles: MemberRole[];
  name: string;
  avatar_url?: string | null;
}

export interface DesignerOption {
  user_id: string;
  name: string;
}

export interface DayActivity {
  label: string;
  count: number;
  isToday: boolean;
}

function monthRangeUtc() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

function isDesignerRole(role: MemberRole, extra: MemberRole[] = []) {
  return role === "designer" || extra.includes("designer");
}

function isCommunityManagerRole(role: MemberRole, extra: MemberRole[] = []) {
  return role === "community_manager" || extra.includes("community_manager");
}

async function fetchWidgetConfig(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<HomeWidgetsConfig> {
  const { data } = await supabase
    .from("profiles")
    .select("home_widgets")
    .eq("id", userId)
    .single();

  const raw = data?.home_widgets as HomeWidgetsConfig | null;
  return {
    global: raw?.global?.length
      ? raw.global.slice(0, MAX_SLOT_WIDGETS)
      : DEFAULT_GLOBAL_SLOTS,
    orgs: raw?.orgs || {},
  };
}

function mapTaskRows(
  rows: unknown[] | null
): TaskWithPost[] {
  return (rows || []).map((t) => {
    const row = t as Task & {
      organizations?: { name: string; id: string } | null;
      posts?: {
        format?: PostFormat;
        title?: string;
        scheduled_at?: string | null;
        status?: string;
      } | null;
    };
    const { organizations, posts, ...task } = row;
    return {
      ...task,
      organization: organizations ?? undefined,
      post: posts ?? null,
    };
  });
}

async function loadAssignedOpenTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<TaskWithPost[]> {
  const admin = createAdminClient();
  if (admin) {
    await pruneDuplicateTasks(admin);
  }

  const { data: taskData } = await supabase
    .from("tasks")
    .select("*, organizations(name, id), posts(format, title, scheduled_at, status)")
    .eq("assigned_to", userId)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(50);

  return filterOpenTasks(mapTaskRows(taskData));
}

export async function getGlobalHomeData(userId: string) {
  const supabase = await createClient();

  const [{ data: profile }, { data: memberships }, widgetConfig] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", userId)
        .single(),
      supabase
        .from("organization_members")
        .select("role, extra_roles, organizations(*)")
        .eq("user_id", userId),
      fetchWidgetConfig(supabase, userId),
    ]);

  const organizations = (memberships || []).map((m) => ({
    ...(m.organizations as unknown as Organization),
    role: m.role as MemberRole,
  }));

  const orgIds = organizations.map((o) => o.id);

  let tasks: TaskWithPost[] = [];
  let orgSnapshots: OrgSnapshot[] = [];

  if (orgIds.length > 0) {
    tasks = await loadAssignedOpenTasks(supabase, userId);

    orgSnapshots = await Promise.all(
      organizations.map(async (org) => {
        const { count: pending } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id)
          .in("status", ["draft", "brief_ready", "in_design", "review"]);

        const { count: inReview } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id)
          .eq("status", "review");

        const { data: designCandidates } = await supabase
          .from("posts")
          .select("id, post_assets(id)")
          .eq("organization_id", org.id)
          .in("status", ["draft", "brief_ready", "in_design"]);

        const needsDesign = (designCandidates || []).filter(
          (p) => !(p.post_assets as { id: string }[] | null)?.length
        ).length;

        return {
          id: org.id,
          name: org.name,
          role: org.role,
          pending: pending ?? 0,
          inReview: inReview ?? 0,
          needsDesign,
        };
      })
    );
  }

  const profileName =
    (profile as Profile | null)?.first_name ||
    (profile as { first_name?: string } | null)?.first_name ||
    "";

  const urgentTasks = filterUrgentTasks(tasks);
  const pendingTasks = sortByDueAt(tasks);

  const myDay = {
    urgentes: urgentTasks.length,
    pendientes: tasks.length,
    brands: organizations.length,
  };

  let collaborators: TeamMemberPreview[] = [];
  let quincenaBoards: QuincenaBoardSnapshot[] = [];

  if (orgIds.length > 0) {
    quincenaBoards = await fetchQuincenaBoardSnapshots(
      organizations.map((o) => ({ id: o.id, name: o.name }))
    );

    const { data: memberRows } = await supabase
      .from("organization_members")
      .select(
        "id, user_id, role, extra_roles, profiles(first_name, last_name, full_name, avatar_url)"
      )
      .in("organization_id", orgIds)
      .neq("user_id", userId);

    const seen = new Set<string>();
    collaborators = (memberRows || [])
      .map((m) => {
        const p = m.profiles as {
          first_name?: string;
          last_name?: string;
          full_name?: string;
          avatar_url?: string | null;
        } | null;
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
      .filter((m) => {
        if (seen.has(m.user_id)) return false;
        seen.add(m.user_id);
        return true;
      })
      .slice(0, 12);
  }

  const editorialRoles = [
    ...new Set(
      (memberships || []).flatMap((m) =>
        collectEditorialRoles(
          m.role as MemberRole,
          (m.extra_roles as MemberRole[] | null) ?? []
        )
      )
    ),
  ];

  return {
    profileName,
    editorialRoles,
    quincenaBoards,
    currentUserId: userId,
    organizations,
    orgSnapshots,
    tasks: pendingTasks,
    urgentTasks,
    myDay,
    collaborators,
    brands: organizations.map((o) => ({
      id: o.id,
      name: o.name,
      role: o.role,
      slug: o.slug,
    })) as UserBrand[],
    widgetConfig,
    slotWidgets: widgetConfig.global,
  };
}

export async function getCalendarPosts(userId: string) {
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organizations(id)")
    .eq("user_id", userId);

  const orgIds = (memberships || [])
    .map((m) => {
      const orgRaw = m.organizations as unknown;
      const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as {
        id: string;
      } | null;
      return org?.id;
    })
    .filter(Boolean) as string[];

  if (orgIds.length === 0) return [];

  const { data } = await supabase
    .from("posts")
    .select("id, title, format, scheduled_at, status, organization_id, organizations(name)")
    .in("organization_id", orgIds)
    .not("scheduled_at", "is", null)
    .order("scheduled_at", { ascending: true });

  return (data || []).map((p) => {
    const orgRaw = p.organizations as unknown;
    const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as {
      name: string;
    } | null;
    return {
      id: p.id,
      title: p.title,
      format: p.format as PostFormat,
      organization_id: p.organization_id,
      organization_name: org?.name || "",
      scheduled_at: p.scheduled_at!,
      status: p.status,
    };
  }) as CalendarPostItem[];
}

export async function getUserBrands(userId: string) {
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("role, extra_roles, organizations(*)")
    .eq("user_id", userId);

  return (memberships || []).map((m) => {
    const org = m.organizations as unknown as Organization;
    return {
      id: org.id,
      name: org.name,
      role: m.role as MemberRole,
      slug: org.slug,
    };
  }) as UserBrand[];
}

function mapReviewPosts(
  rows: unknown[] | null,
  orgName: string
): ReviewPostItem[] {
  return (rows || []).map((p) => {
    const row = p as {
      id: string;
      title: string;
      format: PostFormat;
      organization_id: string;
      scheduled_at: string | null;
      post_assets?: {
        file_url: string;
        file_type: string;
        sort_order: number;
      }[];
    };
    const assets = (row.post_assets || []).sort(
      (a, b) => a.sort_order - b.sort_order
    );
    const cover = assets[0];
    return {
      id: row.id,
      title: row.title,
      format: row.format,
      organization_id: row.organization_id,
      organization_name: orgName,
      scheduled_at: row.scheduled_at,
      cover_url: cover?.file_url ?? null,
      cover_type: cover
        ? cover.file_type === "video"
          ? "video"
          : "image"
        : null,
    };
  });
}

export async function getOrgHomeData(userId: string, orgId: string) {
  const supabase = await createClient();
  const admin = createAdminClient();
  if (admin) {
    await pruneDuplicateTasks(admin);
  }

  const [
    { data: profile },
    { data: memberships },
    widgetConfig,
    { data: membership },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", userId)
      .single(),
    supabase
      .from("organization_members")
      .select("role, extra_roles, organizations(*)")
      .eq("user_id", userId),
    fetchWidgetConfig(supabase, userId),
    supabase
      .from("organization_members")
      .select("role, extra_roles")
      .eq("user_id", userId)
      .eq("organization_id", orgId)
      .single(),
  ]);

  const organizations = (memberships || []).map((m) => ({
    ...(m.organizations as unknown as Organization),
    role: m.role as MemberRole,
  }));

  const org = organizations.find((o) => o.id === orgId);
  const orgName = org?.name || "";
  const role = (membership?.role as MemberRole) || "creator";
  const extraRoles = (membership?.extra_roles as MemberRole[] | null) ?? [];

  const { start, end } = monthRangeUtc();

  const [
    { data: monthPosts },
    { data: reviewData },
    { data: designCandidates },
    { data: pendingData },
    { data: taskData },
    { data: members },
    { count: pendingCount },
    { count: reviewCount },
    { count: monthCount },
  ] = await Promise.all([
    supabase
      .from("posts")
      .select("id, title, scheduled_at, status, format, organization_id")
      .eq("organization_id", orgId)
      .gte("scheduled_at", start)
      .lt("scheduled_at", end)
      .order("scheduled_at", { ascending: true })
      .limit(8),
    supabase
      .from("posts")
      .select(
        "id, title, format, scheduled_at, organization_id, post_assets(file_url, file_type, sort_order)"
      )
      .eq("organization_id", orgId)
      .eq("status", "review")
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("posts")
      .select("id, title, scheduled_at, status, format, organization_id, post_assets(id)")
      .eq("organization_id", orgId)
      .in("status", ["draft", "brief_ready", "in_design"])
      .order("scheduled_at", { ascending: true })
      .limit(20),
    supabase
      .from("posts")
      .select("*, organizations(name, id)")
      .eq("organization_id", orgId)
      .in("status", ["draft", "brief_ready", "in_design", "review"])
      .order("scheduled_at", { ascending: true })
      .limit(8),
    supabase
      .from("tasks")
      .select("*, organizations(name, id), posts(format, title, scheduled_at, status)")
      .eq("organization_id", orgId)
      .eq("assigned_to", userId)
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(40),
    supabase
      .from("organization_members")
      .select("id, user_id, role, extra_roles, profiles(first_name, last_name, full_name, avatar_url)")
      .eq("organization_id", orgId),
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .in("status", ["draft", "brief_ready", "in_design", "review"]),
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "review"),
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("scheduled_at", start)
      .lt("scheduled_at", end),
  ]);

  const needingDesign = (designCandidates || []).filter(
    (p) => !(p.post_assets as { id: string }[] | null)?.length
  );

  const teamMembers: TeamMemberPreview[] = (members || []).map((m) => {
    const p = m.profiles as {
      first_name?: string;
      last_name?: string;
      full_name?: string;
      avatar_url?: string | null;
    } | null;
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
  });

  const openTasks = filterOpenTasks(mapTaskRows(taskData));

  const quincenaBoards = await fetchQuincenaBoardSnapshots([
    { id: orgId, name: orgName },
  ]);

  const stats: HomeStats = {
    pending: pendingCount ?? 0,
    inReview: reviewCount ?? 0,
    thisMonth: monthCount ?? 0,
    tasksOpen: openTasks.length,
    needsDesign: needingDesign.length,
  };

  const profileName =
    (profile as Profile | null)?.first_name ||
    (profile as { first_name?: string } | null)?.first_name ||
    "";

  const editorialRoles = collectEditorialRoles(role, extraRoles);

  return {
    profileName,
    editorialRoles,
    quincenaBoards,
    currentUserId: userId,
    orgName,
    orgId,
    role,
    extraRoles,
    stats,
    upcomingPosts: (monthPosts || []) as HomePostPreview[],
    reviewPosts: mapReviewPosts(reviewData, orgName),
    postsNeedingDesign: needingDesign.slice(0, 6).map(
      ({ post_assets: _, ...post }) => post as HomePostPreview
    ),
    pendingPosts: (pendingData || []).map((p) => ({
      ...p,
      organization: p.organizations as unknown as Organization,
    })) as (Post & { organization?: Organization })[],
    tasks: sortByDueAt(openTasks),
    urgentTasks: filterUrgentTasks(openTasks),
    teamMembers,
    widgetConfig,
    slotWidgets: resolveOrgSlots(widgetConfig, orgId),
    organizations,
    memberships: (memberships || []) as unknown as (OrganizationMember & {
      organizations: Organization;
    })[],
  };
}

export async function getOrgDesigners(orgId: string): Promise<DesignerOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("user_id, role, extra_roles, profiles(first_name, last_name, full_name)")
    .eq("organization_id", orgId);

  return (data || [])
    .filter((m) =>
      isDesignerRole(m.role as MemberRole, (m.extra_roles as MemberRole[]) || [])
    )
    .map((m) => {
      const p = m.profiles as {
        first_name?: string;
        last_name?: string;
        full_name?: string;
      } | null;
      return {
        user_id: m.user_id,
        name:
          [p?.first_name, p?.last_name].filter(Boolean).join(" ") ||
          p?.full_name ||
          "Diseñador",
      };
    });
}

export async function getOrgCommunityManagers(
  orgId: string
): Promise<DesignerOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("user_id, role, extra_roles, profiles(first_name, last_name, full_name)")
    .eq("organization_id", orgId);

  return (data || [])
    .filter((m) =>
      isCommunityManagerRole(
        m.role as MemberRole,
        (m.extra_roles as MemberRole[]) || []
      )
    )
    .map((m) => {
      const p = m.profiles as {
        first_name?: string;
        last_name?: string;
        full_name?: string;
      } | null;
      return {
        user_id: m.user_id,
        name:
          [p?.first_name, p?.last_name].filter(Boolean).join(" ") ||
          p?.full_name ||
          "Community Manager",
      };
    });
}

export async function getHomeData(userId: string, orgId?: string) {
  if (orgId) return getOrgHomeData(userId, orgId);
  return getGlobalHomeData(userId);
}

export async function getOrgWeeklyActivity(orgId: string): Promise<DayActivity[]> {
  const supabase = await createClient();
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6)
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );

  const { data } = await supabase
    .from("posts")
    .select("scheduled_at")
    .eq("organization_id", orgId)
    .not("scheduled_at", "is", null)
    .gte("scheduled_at", start.toISOString())
    .lt("scheduled_at", end.toISOString());

  const counts = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6 + i)
    );
    counts.set(d.toISOString().slice(0, 10), 0);
  }

  for (const row of data || []) {
    if (!row.scheduled_at) continue;
    const key = row.scheduled_at.slice(0, 10);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  const todayKey = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
    .toISOString()
    .slice(0, 10);

  return Array.from(counts.entries()).map(([dateKey, count]) => ({
    label: String(new Date(dateKey + "T12:00:00Z").getUTCDate()),
    count,
    isToday: dateKey === todayKey,
  }));
}
