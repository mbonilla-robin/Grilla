import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCalendarPosts, getGlobalHomeData } from "@/lib/home-data";
import { InteractiveCalendar } from "@/components/home/interactive-calendar";
import { CatalogLegend } from "@/components/home/catalog-legend";
import { CalendarTodaySection } from "@/components/home/calendar-today-section";
import { SubPageHeader, SectionCard } from "@/components/home/home-ui";
import { getUserCatalogEvents } from "@/lib/calendar-data";

export default async function CalendarioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [posts, catalogEvents, homeData] = await Promise.all([
    getCalendarPosts(user.id),
    getUserCatalogEvents(user.id),
    getGlobalHomeData(user.id),
  ]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <SubPageHeader title="Calendario" />

      {catalogEvents.length > 0 && <CatalogLegend events={catalogEvents} />}

      <SectionCard title="Posts planificados">
        <InteractiveCalendar posts={posts} catalogEvents={catalogEvents} />
      </SectionCard>

      <CalendarTodaySection
        posts={posts}
        tasks={homeData.tasks}
        tasksHref="/home"
      />
    </div>
  );
}
