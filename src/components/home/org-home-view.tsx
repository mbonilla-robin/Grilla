import { PendientesList } from "./pendientes-list";
import {
  OrgHomeHeader,
  SectionCard,
  StatRow,
  TimelineItem,
  EmptyState,
} from "./home-ui";
import { OrgQuickNav } from "./org-quick-nav";
import { ReviewGallery } from "./review-gallery";
import { HomeAlertBanner } from "./home-alert-banner";
import { TeamAvatarRow } from "./team-avatar-row";
import { FeaturedTaskCards } from "./featured-task-cards";
import { formatTaskLabel, taskActionLabel } from "@/lib/post-display";
import { formatTaskDue, type TaskWithPost } from "@/lib/task-due";
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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
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

      <SectionCard title="Tu día">
        <StatRow
          items={[
            { label: "Urgentes", value: urgentTasks.length },
            { label: "Pendientes", value: stats.tasksOpen },
            { label: "Revisión", value: stats.inReview },
          ]}
        />
        <div className="mt-4">
          {urgentTasks.length > 0 ? (
            urgentTasks.map((task, i) => (
              <TimelineItem
                key={task.id}
                href={
                  task.post_id
                    ? `/org/${orgId}/grilla/${task.post_id}`
                    : undefined
                }
                title={formatTaskLabel(task)}
                subtitle={
                  taskActionLabel(task.title) && task.post
                    ? taskActionLabel(task.title)!
                    : undefined
                }
                meta={formatTaskDue(task) ? `Límite ${formatTaskDue(task)}` : undefined}
                isLast={i === urgentTasks.length - 1}
              />
            ))
          ) : (
            <EmptyState text="Nada urgente en los próximos 5 días." />
          )}
        </div>
      </SectionCard>

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
    </div>
  );
}
