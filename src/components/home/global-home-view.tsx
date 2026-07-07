import {
  GlobalHomeHeader,
  HomeDayRailLayout,
  SectionCard,
} from "./home-ui";
import { DayRailSidebar } from "./day-rail-sidebar";
import { HomeQuickNav } from "./home-quick-nav";
import { BrandPillarsChart } from "./brand-pillars-chart";
import { BrandsProductionOverview } from "./brands-production-overview";
import { EditorialCadenceAlerts } from "./editorial-cadence-alerts";
import { TeamAvatarRow } from "./team-avatar-row";
import { QuincenaProgressCards } from "./quincena-progress-cards";
import { buildQuincenaProgressCards } from "@/lib/quincena-progress";
import { filterUpcomingTasks, filterUrgentTasks, type TaskWithPost } from "@/lib/task-due";
import type { BrandPillarProgress } from "@/lib/pillars-data";
import type { OrgSnapshot, TeamMemberPreview } from "@/lib/home-data";
import type { QuincenaBoardSnapshot } from "@/lib/editorial-quincena";
import type { MemberRole } from "@/lib/types";

interface GlobalHomeViewProps {
  profileName: string;
  editorialRoles: MemberRole[];
  quincenaBoards: QuincenaBoardSnapshot[];
  currentUserId: string;
  tasks: TaskWithPost[];
  urgentTasks: TaskWithPost[];
  brandPillars: BrandPillarProgress[];
  myDay: { urgentes: number; pendientes: number; brands: number };
  orgSnapshots: OrgSnapshot[];
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
  editorialRoles,
  quincenaBoards,
  currentUserId,
  tasks = [],
  urgentTasks = [],
  brandPillars = [],
  myDay,
  orgSnapshots = [],
  collaborators = [],
}: GlobalHomeViewProps) {
  const quincenaCards = buildQuincenaProgressCards({
    boards: quincenaBoards,
    roles: editorialRoles,
    maxPerOrg: 2,
  });
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

      <EditorialCadenceAlerts
        firstName={profileName}
        roles={editorialRoles}
        quincenaBoards={quincenaBoards}
        currentUserId={currentUserId}
        brandCount={myDay.brands}
        urgentTaskCount={myDay.urgentes}
        pendingTaskCount={myDay.pendientes}
      />

      <HomeQuickNav />

      <div className="md:hidden">
        <SectionCard title="Tu día">
          <DayRailSidebar
            tuDiaTasks={tuDiaTasks}
            upcomingTasks={upcomingTasks}
            getTaskHref={taskHref}
            compact
          />
        </SectionCard>
      </div>

      {quincenaCards.length > 0 && (
        <SectionCard title="Quincena en curso">
          <QuincenaProgressCards cards={quincenaCards} />
        </SectionCard>
      )}

      <SectionCard title="Pilares del mes">
        <BrandPillarsChart brands={brandPillars} />
      </SectionCard>

      <SectionCard
        title="Tus marcas"
        action={{ label: "Ver todas", href: "/home/marcas" }}
      >
        <BrandsProductionOverview snapshots={orgSnapshots} />
      </SectionCard>
    </HomeDayRailLayout>
  );
}
