import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WidgetsPage } from "@/components/home/widgets-page";
import { getGlobalHomeData } from "@/lib/home-data";

export default async function GlobalWidgetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const data = await getGlobalHomeData(user.id);

  return (
    <WidgetsPage
      scope="global"
      activeWidgets={data.slotWidgets}
      backHref="/home"
      title="Widgets del inicio"
    />
  );
}
