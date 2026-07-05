import { createClient } from "@/lib/supabase/server";
import type { CatalogEvent, CalendarCatalog } from "@/lib/calendar-types";
import type { FertileOrgContext } from "@/lib/fertile-recommendations";
import type { PostFormat } from "@/lib/types";

export type { CatalogEvent, CalendarCatalog } from "@/lib/calendar-types";
export type { FertileOrgContext } from "@/lib/fertile-recommendations";

export async function getAllCalendarCatalogs(): Promise<CalendarCatalog[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("calendar_catalogs")
    .select("*")
    .order("sort_order", { ascending: true });

  return (data ?? []) as CalendarCatalog[];
}

export async function getOrgCalendarSubscriptions(
  orgId: string
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_calendar_subscriptions")
    .select("catalog_id")
    .eq("organization_id", orgId);

  return (data ?? []).map((r) => r.catalog_id);
}

export async function getOrgCatalogEvents(
  orgId: string
): Promise<CatalogEvent[]> {
  const supabase = await createClient();

  const { data: subs } = await supabase
    .from("organization_calendar_subscriptions")
    .select("catalog_id")
    .eq("organization_id", orgId);

  if (!subs?.length) return [];

  const catalogIds = subs.map((s) => s.catalog_id);

  const { data: events } = await supabase
    .from("calendar_catalog_events")
    .select(
      `
      id,
      catalog_id,
      month,
      day,
      name,
      description,
      calendar_catalogs ( name, color )
    `
    )
    .in("catalog_id", catalogIds);

  return (events ?? []).map((e) => {
    const catalog = e.calendar_catalogs as unknown as {
      name: string;
      color: string;
    } | null;
    return {
      id: e.id,
      catalog_id: e.catalog_id,
      catalog_ids: [e.catalog_id],
      catalog_name: catalog?.name ?? "",
      catalog_color: catalog?.color ?? "#6366f1",
      month: e.month,
      day: e.day,
      name: e.name,
      description: e.description,
    };
  });
}

export async function getUserCatalogEvents(
  userId: string
): Promise<CatalogEvent[]> {
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId);

  if (!memberships?.length) return [];

  const orgIds = memberships.map((m) => m.organization_id);

  const { data: subs } = await supabase
    .from("organization_calendar_subscriptions")
    .select("catalog_id")
    .in("organization_id", orgIds);

  if (!subs?.length) return [];

  const catalogIds = [...new Set(subs.map((s) => s.catalog_id))];

  const { data: events } = await supabase
    .from("calendar_catalog_events")
    .select(
      `
      id,
      catalog_id,
      month,
      day,
      name,
      description,
      calendar_catalogs ( name, color )
    `
    )
    .in("catalog_id", catalogIds);

  const byKey = new Map<string, CatalogEvent>();

  for (const e of events ?? []) {
    const key = `${e.month}-${e.day}-${e.name}`;
    const catalog = e.calendar_catalogs as unknown as {
      name: string;
      color: string;
    } | null;

    const existing = byKey.get(key);
    if (existing) {
      if (!existing.catalog_ids.includes(e.catalog_id)) {
        existing.catalog_ids.push(e.catalog_id);
      }
      continue;
    }

    byKey.set(key, {
      id: e.id,
      catalog_id: e.catalog_id,
      catalog_ids: [e.catalog_id],
      catalog_name: catalog?.name ?? "",
      catalog_color: catalog?.color ?? "#6366f1",
      month: e.month,
      day: e.day,
      name: e.name,
      description: e.description,
    });
  }

  return Array.from(byKey.values());
}

export async function getUserFertileOrgContexts(
  userId: string
): Promise<FertileOrgContext[]> {
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(id, name, post_formats)")
    .eq("user_id", userId);

  if (!memberships?.length) return [];

  const orgIds = memberships.map((m) => m.organization_id);

  const { data: subs } = await supabase
    .from("organization_calendar_subscriptions")
    .select("organization_id, catalog_id, calendar_catalogs(name)")
    .in("organization_id", orgIds);

  const subsByOrg = new Map<
    string,
    { catalogIds: string[]; catalogNames: string[] }
  >();
  for (const s of subs ?? []) {
    const entry = subsByOrg.get(s.organization_id) ?? {
      catalogIds: [],
      catalogNames: [],
    };
    entry.catalogIds.push(s.catalog_id);
    const cat = s.calendar_catalogs as unknown as { name: string } | null;
    if (cat?.name) entry.catalogNames.push(cat.name);
    subsByOrg.set(s.organization_id, entry);
  }

  return memberships.map((m) => {
    const orgRaw = m.organizations as unknown;
    const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as {
      id: string;
      name: string;
      post_formats: PostFormat[] | null;
    } | null;

    const orgId = m.organization_id;
    const sub = subsByOrg.get(orgId) ?? { catalogIds: [], catalogNames: [] };
    const formats = org?.post_formats?.length
      ? org.post_formats
      : (["image", "carousel", "reel", "story"] as PostFormat[]);

    return {
      id: orgId,
      name: org?.name ?? "Organización",
      catalogIds: sub.catalogIds,
      catalogNames: sub.catalogNames,
      postFormats: formats,
    };
  });
}

export async function getOrgFertileContext(
  orgId: string
): Promise<FertileOrgContext | null> {
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, post_formats")
    .eq("id", orgId)
    .single();

  if (!org) return null;

  const { data: subs } = await supabase
    .from("organization_calendar_subscriptions")
    .select("catalog_id, calendar_catalogs(name)")
    .eq("organization_id", orgId);

  const catalogIds: string[] = [];
  const catalogNames: string[] = [];
  for (const s of subs ?? []) {
    catalogIds.push(s.catalog_id);
    const cat = s.calendar_catalogs as unknown as { name: string } | null;
    if (cat?.name) catalogNames.push(cat.name);
  }

  const formats = (org.post_formats as PostFormat[] | null)?.length
    ? (org.post_formats as PostFormat[])
    : (["image", "carousel", "reel", "story"] as PostFormat[]);

  return {
    id: org.id,
    name: org.name,
    catalogIds,
    catalogNames,
    postFormats: formats,
  };
}

export async function getFertileRecommendationsForEvent(
  eventId: string,
  options?: { orgId?: string }
) {
  const { generatePostRecommendations } = await import(
    "@/lib/fertile-recommendations"
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: eventRow } = await supabase
    .from("calendar_catalog_events")
    .select(
      "id, catalog_id, month, day, name, description, calendar_catalogs(name, color)"
    )
    .eq("id", eventId)
    .single();

  if (!eventRow) return [];

  const catalogRaw = eventRow.calendar_catalogs as unknown;
  const catalog = (Array.isArray(catalogRaw) ? catalogRaw[0] : catalogRaw) as {
    name: string;
    color: string;
  } | null;

  const { data: siblingEvents } = await supabase
    .from("calendar_catalog_events")
    .select("catalog_id")
    .eq("month", eventRow.month)
    .eq("day", eventRow.day)
    .eq("name", eventRow.name);

  const catalogIds = [
    ...new Set((siblingEvents ?? []).map((e) => e.catalog_id)),
  ];

  let subsQuery = supabase
    .from("organization_calendar_subscriptions")
    .select("organization_id")
    .in("catalog_id", catalogIds);

  if (options?.orgId) {
    subsQuery = subsQuery.eq("organization_id", options.orgId);
  } else {
    const { data: memberships } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id);

    const orgIds = (memberships ?? []).map((m) => m.organization_id);
    if (!orgIds.length) return [];
    subsQuery = subsQuery.in("organization_id", orgIds);
  }

  const { data: subs } = await subsQuery;
  if (!subs?.length) return [];

  const uniqueOrgIds = [...new Set(subs.map((s) => s.organization_id))];

  const { data: orgRows } = await supabase
    .from("organizations")
    .select("id, name, post_formats")
    .in("id", uniqueOrgIds);

  const orgById = new Map(
    (orgRows ?? []).map((o) => [o.id, o])
  );

  const catalogEvent: CatalogEvent = {
    id: eventRow.id,
    catalog_id: eventRow.catalog_id,
    catalog_ids: catalogIds,
    catalog_name: catalog?.name ?? "",
    catalog_color: catalog?.color ?? "#6366f1",
    month: eventRow.month,
    day: eventRow.day,
    name: eventRow.name,
    description: eventRow.description,
  };

  const orgs: FertileOrgContext[] = [];

  for (const orgId of uniqueOrgIds) {
    const org = orgById.get(orgId);
    if (!org) continue;

    const formats = (org.post_formats as PostFormat[] | null)?.length
      ? (org.post_formats as PostFormat[])
      : (["image", "carousel", "reel", "story"] as PostFormat[]);

    orgs.push({
      id: orgId,
      name: org.name,
      catalogIds,
      catalogNames: catalog?.name ? [catalog.name] : [],
      postFormats: formats,
    });
  }

  return generatePostRecommendations(catalogEvent, orgs);
}