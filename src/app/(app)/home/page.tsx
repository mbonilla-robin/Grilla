import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GlobalHomeView } from "@/components/home/global-home-view";
import { getGlobalHomeData } from "@/lib/home-data";
import { getBrandsPillarProgress } from "@/lib/pillars-data";

export default async function GlobalHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const data = await getGlobalHomeData(user.id);
  const brandPillars = await getBrandsPillarProgress(
    data.brands.map((b) => ({ id: b.id, name: b.name }))
  );

  return (
    <GlobalHomeView
      profileName={data.profileName}
      editorialRoles={data.editorialRoles}
      quincenaBoards={data.quincenaBoards}
      currentUserId={data.currentUserId}
      tasks={data.tasks}
      urgentTasks={data.urgentTasks}
      brandPillars={brandPillars}
      myDay={data.myDay}
      orgSnapshots={data.orgSnapshots}
      collaborators={data.collaborators}
    />
  );
}
