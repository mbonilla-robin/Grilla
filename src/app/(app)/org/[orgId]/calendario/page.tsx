import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubPageHeader, SectionCard } from "@/components/home/home-ui";
import { InteractiveCalendar } from "@/components/home/interactive-calendar";
import { CalendarCatalogPicker } from "@/components/home/calendar-catalog-picker";
import { CalendarTodaySection } from "@/components/home/calendar-today-section";
import { getOrgCalendarPosts } from "@/lib/pillars-data";
import { getOrgHomeData } from "@/lib/home-data";
import {
  getAllCalendarCatalogs,
  getOrgCalendarSubscriptions,
  getOrgCatalogEvents,
} from "@/lib/calendar-data";

export default async function OrgCalendarioPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user!.id)
    .eq("organization_id", orgId)
    .single();

  if (!membership) notFound();

  const canEdit = membership.role !== "client";

  const [posts, catalogs, subscribedIds, catalogEvents, homeData] = await Promise.all([
    getOrgCalendarPosts(orgId),
    getAllCalendarCatalogs(),
    getOrgCalendarSubscriptions(orgId),
    getOrgCatalogEvents(orgId),
    getOrgHomeData(user!.id, orgId),
  ]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <SubPageHeader
        title="Calendario"
        backHref={`/org/${orgId}/home`}
        backLabel="Inicio"
      />

      <SectionCard title="Tus calendarios de fértiles">
        <CalendarCatalogPicker
          orgId={orgId}
          catalogs={catalogs}
          subscribedIds={subscribedIds}
          canEdit={canEdit}
        />
      </SectionCard>

      <SectionCard title="Posts planificados">
        <InteractiveCalendar
          posts={posts}
          orgId={orgId}
          enableDragDrop
          catalogEvents={catalogEvents}
        />
      </SectionCard>

      <CalendarTodaySection
        posts={posts}
        tasks={homeData.tasks}
        tasksHref={`/org/${orgId}/home`}
      />
    </div>
  );
}
