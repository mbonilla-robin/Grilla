import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCalendarPosts } from "@/lib/home-data";
import { CalendarView } from "@/components/home/calendar-view";
import { SubPageHeader, SectionCard } from "@/components/home/home-ui";

export default async function CalendarioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const posts = await getCalendarPosts(user.id);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <SubPageHeader title="Calendario" />
      <SectionCard title="Posts planificados">
        <CalendarView posts={posts} />
      </SectionCard>
    </div>
  );
}
