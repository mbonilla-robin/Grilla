import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductionBrandBar } from "@/components/layout/production-brand-bar";
import { NewPostDialog } from "@/components/grilla/new-post-dialog";
import { GrillaCards } from "@/components/grilla/grilla-cards";
import { GrillaMonthFilter } from "@/components/grilla/grilla-month-filter";
import { getAvailableMonths, sortPostAssets } from "@/lib/utils";
import { getPostAssignmentOptions } from "@/lib/team-assignments";
import { enrichPostsWithTeam } from "@/lib/post-team";
import { getOrgPillars, getOrgHashtagGroups } from "@/lib/pillars-data";
import {
  PILLAR_OPTIONS,
  type Organization,
  type OrgHashtagGroup,
  type PostAsset,
  type PostFormat,
  type PostWithAssets,
} from "@/lib/types";

function monthRange(month: string) {
  const [year, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, m - 1, 1));
  const end = new Date(Date.UTC(year, m, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

export default async function GrillaPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { orgId } = await params;
  const { month = "all" } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  async function fetchPosts() {
    let postsQuery = supabase
      .from("posts")
      .select("*, post_assets(*)")
      .eq("organization_id", orgId)
      .order("scheduled_at", { ascending: true, nullsFirst: false });

    if (month !== "all") {
      const { start, end } = monthRange(month);
      postsQuery = postsQuery.gte("scheduled_at", start).lt("scheduled_at", end);
    }

    return postsQuery;
  }

  const [
    { data: posts, error },
    { data: monthPosts },
    { data: org },
    assignmentOptions,
    pillars,
    hashtagGroups,
    { data: memberships },
  ] = await Promise.all([
    fetchPosts(),
    supabase
      .from("posts")
      .select("scheduled_at")
      .eq("organization_id", orgId)
      .not("scheduled_at", "is", null),
    supabase.from("organizations").select("post_formats").eq("id", orgId).single(),
    getPostAssignmentOptions(orgId),
    getOrgPillars(orgId),
    getOrgHashtagGroups(orgId),
    supabase
      .from("organization_members")
      .select("organizations(*)")
      .eq("user_id", user.id),
  ]);

  const organizations = (memberships || []).map(
    (m) => m.organizations as unknown as Organization
  );

  if (error) {
    console.error("Grilla query error:", error.message);
  }

  const availableMonths = getAvailableMonths(
    (monthPosts || []).map((p) => p.scheduled_at)
  );

  const postsWithAssets: PostWithAssets[] = (posts || []).map((p) => {
    const { post_assets, ...rest } = p;
    return {
      ...rest,
      assets: sortPostAssets((post_assets as PostAsset[]) || []),
    };
  });

  const enrichedPosts = await enrichPostsWithTeam(postsWithAssets);
  const pillarNames =
    pillars.length > 0 ? pillars.map((p) => p.name) : [...PILLAR_OPTIONS];
  const allowedFormats = (org?.post_formats as PostFormat[] | null)?.length
    ? (org!.post_formats as PostFormat[])
    : (["image", "carousel", "reel", "story"] as PostFormat[]);

  return (
    <>
      <ProductionBrandBar
        organizations={organizations}
        currentOrgId={orgId}
        page="grilla"
      />
      <div className="p-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold">Grilla</h1>
              <p className="text-xs text-muted mt-0.5">
                Tarjetas editoriales · conectadas al Feed
              </p>
            </div>
            {availableMonths.length > 0 && (
              <Suspense fallback={null}>
                <GrillaMonthFilter months={availableMonths} />
              </Suspense>
            )}
          </div>
          <NewPostDialog
            orgId={orgId}
            assignmentOptions={assignmentOptions}
            currentUserId={user.id}
            pillarOptions={pillarNames}
            hashtagGroups={hashtagGroups as OrgHashtagGroup[]}
            allowedFormats={allowedFormats}
          />
        </div>
        <GrillaCards
          posts={enrichedPosts}
          orgId={orgId}
          pillarOptions={pillarNames}
          hashtagGroups={hashtagGroups as OrgHashtagGroup[]}
        />
      </div>
    </>
  );
}
