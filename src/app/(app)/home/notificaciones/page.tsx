import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubPageHeader, SectionCard } from "@/components/home/home-ui";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { getNotifications } from "@/lib/notifications-data";
import type { Notification } from "@/lib/types";

export default async function NotificacionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const notifications = (await getNotifications(user.id, 50)) as Notification[];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <SubPageHeader title="Notificaciones" />
      <SectionCard title="Actividad reciente">
        <NotificationsList notifications={notifications} />
      </SectionCard>
    </div>
  );
}
