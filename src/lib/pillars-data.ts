import { createClient } from "@/lib/supabase/server";
import type { ContentPillar, PostMetrics, PostStatus } from "@/lib/types";

export interface PillarDistribution {
  name: string;
  color: string;
  targetPct: number;
  count: number;
  actualPct: number;
}

export interface PostWithMetrics {
  id: string;
  title: string;
  pillar: string | null;
  scheduled_at: string | null;
  status: PostStatus;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  engagement: number;
}

export interface OrgStatsData {
  pillars: ContentPillar[];
  distribution: PillarDistribution[];
  totalPosts: number;
  publishedCount: number;
  totalReach: number;
  totalLikes: number;
  totalComments: number;
  totalSaves: number;
  avgEngagement: number;
  topPosts: PostWithMetrics[];
  balanceAlerts: string[];
}

function monthRangeUtc() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getOrgPillars(orgId: string): Promise<ContentPillar[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_pillars")
    .select("*")
    .eq("organization_id", orgId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("getOrgPillars error:", error.message);
    return [];
  }

  return (data || []) as ContentPillar[];
}

export async function getOrgStatsData(orgId: string): Promise<OrgStatsData> {
  const supabase = await createClient();
  const { start, end } = monthRangeUtc();

  const [
    { data: pillars, error: pillarsError },
    { data: monthPosts, error: monthError },
    { data: publishedPosts, error: publishedError },
  ] = await Promise.all([
    supabase
      .from("content_pillars")
      .select("*")
      .eq("organization_id", orgId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("posts")
      .select("id, pillar, status")
      .eq("organization_id", orgId)
      .gte("scheduled_at", start)
      .lt("scheduled_at", end),
    supabase
      .from("posts")
      .select("id, title, pillar, scheduled_at, status")
      .eq("organization_id", orgId)
      .eq("status", "published")
      .order("scheduled_at", { ascending: false })
      .limit(50),
  ]);

  if (pillarsError) console.error("getOrgStatsData pillars:", pillarsError.message);
  if (monthError) console.error("getOrgStatsData monthPosts:", monthError.message);
  if (publishedError) console.error("getOrgStatsData published:", publishedError.message);

  const publishedIds = (publishedPosts || []).map((p) => p.id);
  const metricsByPost = new Map<string, PostMetrics>();

  if (publishedIds.length > 0) {
    const { data: metricsRows, error: metricsError } = await supabase
      .from("post_metrics")
      .select("*")
      .in("post_id", publishedIds);

    if (metricsError) {
      console.error("getOrgStatsData metrics:", metricsError.message);
    } else {
      for (const row of metricsRows || []) {
        metricsByPost.set(row.post_id, row as PostMetrics);
      }
    }
  }

  const pillarList = (pillars || []) as ContentPillar[];
  const posts = monthPosts || [];
  const totalPosts = posts.length;

  const countByPillar = new Map<string, number>();
  for (const p of posts) {
    const key = p.pillar || "Sin pilar";
    countByPillar.set(key, (countByPillar.get(key) || 0) + 1);
  }

  const distribution: PillarDistribution[] = pillarList.map((pillar) => {
    const count = countByPillar.get(pillar.name) || 0;
    return {
      name: pillar.name,
      color: pillar.color,
      targetPct: pillar.target_pct,
      count,
      actualPct: totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0,
    };
  });

  const uncategorized = countByPillar.get("Sin pilar") || 0;
  if (uncategorized > 0) {
    distribution.push({
      name: "Sin pilar",
      color: "#a3a3a3",
      targetPct: 0,
      count: uncategorized,
      actualPct: totalPosts > 0 ? Math.round((uncategorized / totalPosts) * 100) : 0,
    });
  }

  const balanceAlerts: string[] = [];
  for (const d of distribution) {
    if (d.name === "Sin pilar") continue;
    const diff = d.actualPct - d.targetPct;
    if (diff > 15) {
      balanceAlerts.push(
        `${d.name}: ${d.actualPct}% del mes (meta ${d.targetPct}%) — considera reducir`
      );
    } else if (d.targetPct > 0 && d.actualPct < d.targetPct - 15 && totalPosts >= 4) {
      balanceAlerts.push(
        `${d.name}: solo ${d.actualPct}% del mes (meta ${d.targetPct}%) — falta contenido`
      );
    }
  }

  const topPosts: PostWithMetrics[] = (publishedPosts || []).map((p) => {
    const m = metricsByPost.get(p.id) ?? null;
    const likes = m?.likes ?? 0;
    const comments = m?.comments ?? 0;
    const saves = m?.saves ?? 0;
    const engagement = likes + comments + saves;
    return {
      id: p.id,
      title: p.title,
      pillar: p.pillar,
      scheduled_at: p.scheduled_at,
      status: p.status,
      reach: m?.reach ?? null,
      likes: m?.likes ?? null,
      comments: m?.comments ?? null,
      saves: m?.saves ?? null,
      engagement,
    };
  });

  topPosts.sort((a, b) => b.engagement - a.engagement);

  const withMetrics = topPosts.filter((p) => p.engagement > 0);
  const totalReach = withMetrics.reduce((s, p) => s + (p.reach || 0), 0);
  const totalLikes = withMetrics.reduce((s, p) => s + (p.likes || 0), 0);
  const totalComments = withMetrics.reduce((s, p) => s + (p.comments || 0), 0);
  const totalSaves = withMetrics.reduce((s, p) => s + (p.saves || 0), 0);
  const avgEngagement =
    withMetrics.length > 0
      ? Math.round(
          withMetrics.reduce((s, p) => s + p.engagement, 0) / withMetrics.length
        )
      : 0;

  return {
    pillars: pillarList,
    distribution,
    totalPosts,
    publishedCount: (publishedPosts || []).length,
    totalReach,
    totalLikes,
    totalComments,
    totalSaves,
    avgEngagement,
    topPosts: topPosts.slice(0, 5),
    balanceAlerts,
  };
}

export interface BrandPillarProgress {
  orgId: string;
  orgName: string;
  totalPosts: number;
  distribution: PillarDistribution[];
}

export async function getBrandsPillarProgress(
  brands: { id: string; name: string }[]
): Promise<BrandPillarProgress[]> {
  if (brands.length === 0) return [];

  const supabase = await createClient();
  const { start, end } = monthRangeUtc();
  const orgIds = brands.map((b) => b.id);

  const [{ data: allPillars }, { data: monthPosts }] = await Promise.all([
    supabase
      .from("content_pillars")
      .select("*")
      .in("organization_id", orgIds)
      .order("sort_order", { ascending: true }),
    supabase
      .from("posts")
      .select("organization_id, pillar")
      .in("organization_id", orgIds)
      .gte("scheduled_at", start)
      .lt("scheduled_at", end),
  ]);

  const pillarsByOrg = new Map<string, ContentPillar[]>();
  for (const pillar of (allPillars || []) as ContentPillar[]) {
    const list = pillarsByOrg.get(pillar.organization_id) || [];
    list.push(pillar);
    pillarsByOrg.set(pillar.organization_id, list);
  }

  const postsByOrg = new Map<string, { pillar: string | null }[]>();
  for (const post of monthPosts || []) {
    const list = postsByOrg.get(post.organization_id) || [];
    list.push({ pillar: post.pillar });
    postsByOrg.set(post.organization_id, list);
  }

  return brands.map((brand) => {
    const posts = postsByOrg.get(brand.id) || [];
    const totalPosts = posts.length;
    const pillarList = pillarsByOrg.get(brand.id) || [];

    const countByPillar = new Map<string, number>();
    for (const p of posts) {
      const key = p.pillar || "Sin pilar";
      countByPillar.set(key, (countByPillar.get(key) || 0) + 1);
    }

    const distribution: PillarDistribution[] = pillarList.map((pillar) => {
      const count = countByPillar.get(pillar.name) || 0;
      return {
        name: pillar.name,
        color: pillar.color,
        targetPct: pillar.target_pct,
        count,
        actualPct: totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0,
      };
    });

    const uncategorized = countByPillar.get("Sin pilar") || 0;
    if (uncategorized > 0) {
      distribution.push({
        name: "Sin pilar",
        color: "#a3a3a3",
        targetPct: 0,
        count: uncategorized,
        actualPct: totalPosts > 0 ? Math.round((uncategorized / totalPosts) * 100) : 0,
      });
    }

    return { orgId: brand.id, orgName: brand.name, totalPosts, distribution };
  });
}

export async function getOrgCalendarPosts(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("id, title, format, scheduled_at, status, organization_id, pillar")
    .eq("organization_id", orgId)
    .not("scheduled_at", "is", null)
    .order("scheduled_at", { ascending: true });

  return (data || []).map((p) => ({
    ...p,
    organization_name: "",
  }));
}

export async function getOrgHashtagGroups(orgId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_hashtag_groups")
    .select("*")
    .eq("organization_id", orgId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("getOrgHashtagGroups error:", error.message);
    return [];
  }

  return data || [];
}
