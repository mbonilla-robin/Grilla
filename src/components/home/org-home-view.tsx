import { PendientesList } from "./pendientes-list";
import {
  OrgHomeHeader,
  HomeDayRailLayout,
  SectionCard,
} from "./home-ui";
import { DayRailSidebar } from "./day-rail-sidebar";
import { OrgQuickNav } from "./org-quick-nav";
import { ReviewGallery } from "./review-gallery";
import { HomeAlertBanner } from "./home-alert-banner";
import { TeamAvatarRow } from "./team-avatar-row";
import { FeaturedTaskCards } from "./featured-task-cards";
import { filterUpcomingTasks, filterUrgentTasks, type TaskWithPost } from "@/lib/task-due";
import type { HomeStats, ReviewPostItem, TeamMemberPreview } from "@/lib/home-data";

interface OrgHomeViewProps {
  orgId: string;
  orgName: string;
  stats: HomeStats;
  tasks: TaskWithPost[];
  urgentTasks: TaskWithPost[];
  reviewPosts: ReviewPostItem[];
  teamMembers?: TeamMemberPreview[];
}

export function OrgHomeView({
  orgId,
  orgName,
  stats,
  tasks = [],
  urgentTasks = [],
  reviewPosts = [],
  teamMembers = [],
}: OrgHomeViewProps) {
  const featuredTasks = urgentTasks.length > 0 ? urgentTasks : tasks;
  const tuDiaTasks = filterUrgentTasks(tasks);
  const upcomingTasks = filterUpcomingTasks(tasks);

  return (
    <HomeDayRailLayout
      dayPanel={
        <DayRailSidebar
          tuDiaTasks={tuDiaTasks}
          upcomingTasks={upcomingTasks}
          getTaskHref={(task) =>
            task.post_id ? `/org/${orgId}/grilla/${task.post_id}` : undefined
          }
        />
      }
    >
      <OrgHomeHeader
        orgName={orgName}
        teamRow={
          teamMembers.length > 0 ? (
            <TeamAvatarRow
              members={teamMembers}
              teamHref={`/org/${orgId}/team`}
              label="Equipo"
            />
          ) : undefined
        }
      />

      <HomeAlertBanner
        urgentCount={urgentTasks.length}
        pendingCount={stats.tasksOpen}
        storageKey={`org-home-alert-${orgId}`}
      />

      <OrgQuickNav orgId={orgId} />

      {featuredTasks.length > 0 && (
        <SectionCard title="Destacadas">
          <FeaturedTaskCards tasks={featuredTasks} />
        </SectionCard>
      )}

      <SectionCard title="En revisión">
        <ReviewGallery posts={reviewPosts} />
      </SectionCard>

      <SectionCard title="Pendientes">
        <PendientesList tasks={tasks} />
      </SectionCard>
    </HomeDayRailLayout>
  );
}
