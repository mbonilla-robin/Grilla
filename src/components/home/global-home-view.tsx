import { PendientesList } from "./pendientes-list";
import {
  GlobalHomeHeader,
  HomeDayRailLayout,
  SectionCard,
} from "./home-ui";
import { DayRailSidebar } from "./day-rail-sidebar";
import { HomeQuickNav } from "./home-quick-nav";
import { BrandPillarsChart } from "./brand-pillars-chart";
import { HomeAlertBanner } from "./home-alert-banner";
import { TeamAvatarRow } from "./team-avatar-row";
import { FeaturedTaskCards } from "./featured-task-cards";
import { filterUpcomingTasks, filterUrgentTasks, type TaskWithPost } from "@/lib/task-due";
import type { BrandPillarProgress } from "@/lib/pillars-data";
import type { TeamMemberPreview } from "@/lib/home-data";

interface GlobalHomeViewProps {
  profileName: string;
  tasks: TaskWithPost[];
  urgentTasks: TaskWithPost[];
  brandPillars: BrandPillarProgress[];
  myDay: { urgentes: number; pendientes: number; brands: number };
  collaborators?: TeamMemberPreview[];
}

function taskHref(task: TaskWithPost) {
  if (task.post_id && task.organization_id) {
    return `/org/${task.organization_id}/grilla/${task.post_id}`;
  }
  return undefined;
}

export function GlobalHomeView({
  profileName,
  tasks = [],
  urgentTasks = [],
  brandPillars = [],
  myDay,
  collaborators = [],
}: GlobalHomeViewProps) {
  const featuredTasks = urgentTasks.length > 0 ? urgentTasks : tasks;
  const tuDiaTasks = filterUrgentTasks(tasks);
  const upcomingTasks = filterUpcomingTasks(tasks);

  return (
    <HomeDayRailLayout
      dayPanel={
        <DayRailSidebar
          tuDiaTasks={tuDiaTasks}
          upcomingTasks={upcomingTasks}
          getTaskHref={taskHref}
        />
      }
    >
      <GlobalHomeHeader
        profileName={profileName || undefined}
        teamRow={
          collaborators.length > 0 ? (
            <TeamAvatarRow members={collaborators} label="Colaboradores" />
          ) : undefined
        }
      />

      <HomeAlertBanner
        urgentCount={myDay.urgentes}
        pendingCount={myDay.pendientes}
      />

      <HomeQuickNav />

      {featuredTasks.length > 0 && (
        <SectionCard title="Destacadas">
          <FeaturedTaskCards tasks={featuredTasks} />
        </SectionCard>
      )}

      <SectionCard title="Pilares del mes">
        <BrandPillarsChart brands={brandPillars} />
      </SectionCard>

      <SectionCard title="Pendientes">
        <PendientesList tasks={tasks} />
      </SectionCard>
    </HomeDayRailLayout>
  );
}
