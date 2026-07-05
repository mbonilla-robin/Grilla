import { PendientesList } from "./pendientes-list";
import {
  GlobalHomeHeader,
  SectionCard,
  StatRow,
  TimelineItem,
  EmptyState,
} from "./home-ui";
import { HomeQuickNav } from "./home-quick-nav";
import { ReviewGallery } from "./review-gallery";
import { formatTaskLabel, taskActionLabel } from "@/lib/post-display";
import { formatTaskDue, type TaskWithPost } from "@/lib/task-due";
import type { ReviewPostItem } from "@/lib/home-data";

interface GlobalHomeViewProps {
  profileName: string;
  tasks: TaskWithPost[];
  urgentTasks: TaskWithPost[];
  reviewPosts: ReviewPostItem[];
  myDay: { urgentes: number; pendientes: number; brands: number };
}

export function GlobalHomeView({
  profileName,
  tasks = [],
  urgentTasks = [],
  reviewPosts = [],
  myDay,
}: GlobalHomeViewProps) {
  const greeting = profileName ? `Hola, ${profileName}` : "Hola";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <GlobalHomeHeader greeting={greeting} />
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

      <SectionCard title="En revisión">
        <ReviewGallery posts={reviewPosts} />
      </SectionCard>

      <SectionCard title="Pendientes">
        <PendientesList tasks={tasks} />
      </SectionCard>
    </div>
  );
}
