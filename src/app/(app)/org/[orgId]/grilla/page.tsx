import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pruneDuplicatePosts } from "@/lib/post-dedupe";
import { syncStalePostStatusesFromAssets } from "@/lib/post-status-sync";
import { ProductionOrgContext } from "@/components/layout/production-org-context";
import { AddToGrillaButton } from "@/components/grilla/add-to-grilla-button";
import { GrillaCards } from "@/components/grilla/grilla-cards";
import { GrillaMonthFilter } from "@/components/grilla/grilla-month-filter";
import { getAvailableMonths, sortPostAssets } from "@/lib/utils";
import { getPostAssignmentOptions } from "@/lib/team-assignments";
import { enrichPostsWithTeam } from "@/lib/post-team";
import { getOrgPillars, getOrgHashtagGroups } from "@/lib/pillars-data";
import { getOrgIdentifierConfig } from "@/lib/org-identifier";
import { getOrgIdentifiers } from "@/lib/org-identifiers-data";
import { getOrgCatalogEvents } from "@/lib/calendar-data";
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

  const admin = createAdminClient();
  if (admin) {
    await pruneDuplicatePosts(admin, orgId);
  }

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
    identifiers,
    catalogEvents,
  ] = await Promise.all([
    fetchPosts(),
    supabase
      .from("posts")
      .select("scheduled_at")
      .eq("organization_id", orgId)
      .not("scheduled_at", "is", null),
    supabase.from("organizations").select("post_formats, identifier_label, identifier_allow_photo, identifier_placeholder").eq("id", orgId).single(),
    getPostAssignmentOptions(orgId),
    getOrgPillars(orgId),
    getOrgHashtagGroups(orgId),
    supabase
      .from("organization_members")
      .select("organizations(*)")
      .eq("user_id", user.id),
    getOrgIdentifiers(orgId),
    getOrgCatalogEvents(orgId),
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

  const syncedPosts = await syncStalePostStatusesFromAssets(
    supabase,
    postsWithAssets
  );

  const enrichedPosts = await enrichPostsWithTeam(syncedPosts);
  const pillarNames =
    pillars.length > 0 ? pillars.map((p) => p.name) : [...PILLAR_OPTIONS];
  const allowedFormats = (org?.post_formats as PostFormat[] | null)?.length
    ? (org!.post_formats as PostFormat[])
    : (["image", "carousel", "reel", "story"] as PostFormat[]);
  const identifierConfig = org ? getOrgIdentifierConfig(org) : { label: null, allowPhoto: false, placeholder: null };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-2 pb-4 sm:px-6 sm:pt-3 sm:pb-6">
      <div className="mb-6">
        <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex w-full flex-col items-center gap-3 md:w-auto md:flex-row md:items-center md:gap-4">
            <div className="min-w-0 text-center md:text-left">
              <ProductionOrgContext
                organizations={organizations}
                currentOrgId={orgId}
                page="grilla"
                className="mb-1 md:mb-0.5"
              />
              <h1 className="text-title-sub">Grilla</h1>
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
          <div className="w-full md:w-auto">
            <AddToGrillaButton
              orgId={orgId}
              assignmentOptions={assignmentOptions}
              currentUserId={user.id}
              pillarOptions={pillarNames}
              pillars={pillars}
              hashtagGroups={hashtagGroups as OrgHashtagGroup[]}
              identifierConfig={identifierConfig}
              identifiers={identifiers}
              allowedFormats={allowedFormats}
              catalogEvents={catalogEvents}
              triggerClassName="w-full md:w-auto"
            />
          </div>
        </div>
      </div>
      <GrillaCards
        posts={enrichedPosts}
        orgId={orgId}
        pillarOptions={pillarNames}
        hashtagGroups={hashtagGroups as OrgHashtagGroup[]}
        identifierConfig={identifierConfig}
        identifiers={identifiers}
      />
    </div>
  );
}
