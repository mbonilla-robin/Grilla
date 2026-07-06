import Link from "next/link";
import { formatTaskLabel } from "@/lib/post-display";
import {
  formatTaskShortDate,
  type TaskWithPost,
} from "@/lib/task-due";
import { effectiveTaskStatus } from "@/lib/task-sync";
import { taskStatusCardStyles } from "@/lib/status-colors";
import { TASK_STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

function DayRailSectionHeader({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2">
      <h2 className="min-w-0 text-title-section leading-tight">{title}</h2>
      <span className="shrink-0 flex h-7 min-w-7 items-center justify-center rounded-full border border-border bg-foreground px-2 text-xs font-semibold tabular-nums text-background">
        {count}
      </span>
    </div>
  );
}

function DayRailTaskCard({
  task,
  href,
  isLast = false,
}: {
  task: TaskWithPost;
  href?: string;
  isLast?: boolean;
}) {
  const taskStatus = effectiveTaskStatus(task);
  const status = TASK_STATUS_LABELS[taskStatus];
  const statusStyle = taskStatusCardStyles[taskStatus];
  const dueDate = formatTaskShortDate(task.due_at || task.post?.scheduled_at);

  const card = (
    <div className="relative flex gap-3">
      <div className="flex w-3 shrink-0 flex-col items-center pt-4">
        <div
          className={cn(
            "h-2.5 w-2.5 rounded-full ring-2",
            taskStatus === "contenido" && "bg-white ring-border",
            taskStatus === "brief_listo" && "bg-brand-muted ring-brand/30",
            taskStatus === "en_revision" && "bg-brand ring-brand-dark/50",
            taskStatus === "aprobado" && "bg-brand-dark ring-foreground/20"
          )}
        />
        {!isLast && (
          <div className="mt-1 w-px flex-1 bg-brand-dark/30" />
        )}
      </div>

      <div
        className={cn(
          "min-w-0 flex-1 rounded-xl border p-2.5 shadow-sm space-y-2",
          statusStyle.card
        )}
      >
        {task.organization?.name && (
          <p className="text-[10px] text-muted truncate">{task.organization.name}</p>
        )}

        <p className="text-body text-xs line-clamp-2">{formatTaskLabel(task)}</p>

        <span
          className={cn(
            "inline-flex text-micro rounded-full border px-2 py-0.5",
            statusStyle.pill
          )}
        >
          {status}
        </span>

        {dueDate && (
          <p className="text-caption">Entrega {dueDate}</p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90 transition-opacity">
        {card}
      </Link>
    );
  }

  return card;
}

function DayRailTaskList({
  tasks,
  emptyText,
  getTaskHref,
}: {
  tasks: TaskWithPost[];
  emptyText: string;
  getTaskHref?: (task: TaskWithPost) => string | undefined;
}) {
  if (tasks.length === 0) {
    return <p className="text-caption px-1">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task, i) => (
        <DayRailTaskCard
          key={task.id}
          task={task}
          href={getTaskHref?.(task)}
          isLast={i === tasks.length - 1}
        />
      ))}
    </div>
  );
}

interface DayRailSidebarProps {
  tuDiaTasks: TaskWithPost[];
  upcomingTasks: TaskWithPost[];
  getTaskHref?: (task: TaskWithPost) => string | undefined;
}

export function DayRailSidebar({
  tuDiaTasks,
  upcomingTasks,
  getTaskHref,
}: DayRailSidebarProps) {
  return (
    <div className="flex h-full flex-col bg-neutral-50/80">
      <DayRailSectionHeader title="Tu día" count={tuDiaTasks.length} />

      <div className="px-3 pb-3">
        <DayRailTaskList
          tasks={tuDiaTasks}
          emptyText="Nada urgente en los próximos 5 días."
          getTaskHref={getTaskHref}
        />
      </div>

      <div className="mx-3 border-t border-border" />

      <DayRailSectionHeader title="Próximas entregas" count={upcomingTasks.length} />

      <div className="flex-1 overflow-auto px-3 pb-3">
        <DayRailTaskList
          tasks={upcomingTasks}
          emptyText="Sin próximas entregas."
          getTaskHref={getTaskHref}
        />
      </div>
    </div>
  );
}
