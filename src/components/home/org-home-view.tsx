import { PendientesList } from "./pendientes-list";
import {
  OrgHomeHeader,
  SectionCard,
  StatRow,
  TimelineItem,
  EmptyState,
} from "./home-ui";
import { OrgQuickNav } from "./org-quick-nav";
import { formatTaskLabel, taskActionLabel } from "@/lib/post-display";
import { formatTaskDue, type TaskWithPost } from "@/lib/task-due";
import type { HomeStats } from "@/lib/home-data";

interface OrgHomeViewProps {
  orgId: string;
  orgName: string;
  stats: HomeStats;
  tasks: TaskWithPost[];
  urgentTasks: TaskWithPost[];
}

export function OrgHomeView({
  orgId,
  orgName,
  stats,
  tasks = [],
  urgentTasks = [],
}: OrgHomeViewProps) {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <OrgHomeHeader orgName={orgName} />
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

      <SectionCard title="Pendientes">
        <PendientesList tasks={tasks} />
      </SectionCard>
    </div>
  );
}
