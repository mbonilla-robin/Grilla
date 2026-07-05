import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GlobalHomeView } from "@/components/home/global-home-view";
import { getGlobalHomeData } from "@/lib/home-data";

export default async function GlobalHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const data = await getGlobalHomeData(user.id);

  return (
    <GlobalHomeView
      profileName={data.profileName}
      tasks={data.tasks}
      urgentTasks={data.urgentTasks}
      reviewPosts={data.reviewPosts}
      myDay={data.myDay}
    />
  );
}
