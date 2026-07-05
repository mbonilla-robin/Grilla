import { PendientesList } from "./pendientes-list";
import {
  GlobalHomeHeader,
  SectionCard,
  StatRow,
  TimelineItem,
  EmptyState,
} from "./home-ui";
import { HomeQuickNav } from "./home-quick-nav";
import { BrandPillarsChart } from "./brand-pillars-chart";
import { HomeAlertBanner } from "./home-alert-banner";
import { TeamAvatarRow } from "./team-avatar-row";
import { FeaturedTaskCards } from "./featured-task-cards";
import { formatTaskLabel, taskActionLabel } from "@/lib/post-display";
import { formatTaskDue, type TaskWithPost } from "@/lib/task-due";
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

export function GlobalHomeView({
  profileName,
  tasks = [],
  urgentTasks = [],
  brandPillars = [],
  myDay,
  collaborators = [],
}: GlobalHomeViewProps) {
  const featuredTasks = urgentTasks.length > 0 ? urgentTasks : tasks;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
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

      <SectionCard title="Tu día">
        <StatRow
          items={[
            { label: "Urgentes", value: myDay.urgentes },
            { label: "Pendientes", value: myDay.pendientes },
            { label: "Marcas", value: myDay.brands },
          ]}
        />
        <div className="mt-4">
          {urgentTasks.length > 0 ? (
            urgentTasks.map((task, i) => (
              <TimelineItem
                key={task.id}
                href={
                  task.post_id && task.organization_id
                    ? `/org/${task.organization_id}/grilla/${task.post_id}`
                    : undefined
                }
                title={formatTaskLabel(task)}
                subtitle={
                  [
                    taskActionLabel(task.title) && task.post
                      ? taskActionLabel(task.title)
                      : null,
                    task.organization?.name,
                  ]
                    .filter(Boolean)
                    .join(" · ") || undefined
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

      <SectionCard title="Pilares del mes">
        <BrandPillarsChart brands={brandPillars} />
      </SectionCard>

      <SectionCard title="Pendientes">
        <PendientesList tasks={tasks} />
      </SectionCard>
    </div>
  );
}
