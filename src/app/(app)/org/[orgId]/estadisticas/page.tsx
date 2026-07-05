import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubPageHeader, SectionCard } from "@/components/home/home-ui";
import { PillarsDashboard } from "@/components/pillars/pillars-dashboard";
import { WeeklyActivityChart } from "@/components/home/weekly-activity-chart";
import { getOrgStatsData } from "@/lib/pillars-data";
import { getOrgWeeklyActivity } from "@/lib/home-data";

export default async function EstadisticasPage({
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

  const [data, weeklyActivity] = await Promise.all([
    getOrgStatsData(orgId),
    getOrgWeeklyActivity(orgId),
  ]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <SubPageHeader
        title="Estadísticas"
        backHref={`/org/${orgId}/home`}
        backLabel="Inicio"
      />
      <p className="text-sm text-muted -mt-4">
        Pilares de contenido y rendimiento de la cuenta
      </p>

      <SectionCard title="Actividad de la semana">
        <p className="text-xs text-muted mb-3">Posts programados por día</p>
        <WeeklyActivityChart days={weeklyActivity} />
      </SectionCard>

      <PillarsDashboard
        orgId={orgId}
        data={data}
        isAdmin={membership.role === "admin"}
      />
    </div>
  );
}
