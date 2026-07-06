import Link from "next/link";
import { formatTaskLabel } from "@/lib/post-display";
import { formatTaskShortDate, type TaskWithPost } from "@/lib/task-due";
import { effectiveTaskStatus } from "@/lib/task-sync";
import { taskStatusCardStyles } from "@/lib/status-colors";
import { TASK_STATUS_LABELS } from "@/lib/types";
import { taskStatusProgress } from "@/lib/post-progress";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: TaskWithPost;
  showOrg?: boolean;
  showStatus?: boolean;
  compact?: boolean;
  size?: "default" | "sm";
}

export function TaskCard({
  task,
  showOrg = false,
  showStatus = true,
  compact = false,
  size = "default",
}: TaskCardProps) {
  const href =
    task.post_id && task.organization_id
      ? `/org/${task.organization_id}/grilla/${task.post_id}`
      : null;

  const status = effectiveTaskStatus(task);
  const progress = taskStatusProgress(status);
  const statusLabel = TASK_STATUS_LABELS[status];
  const statusStyle = taskStatusCardStyles[status];
  const dueDate = formatTaskShortDate(task.due_at || task.post?.scheduled_at);

  const isSmall = size === "sm" || compact;

  const content = (
    <div
      className={cn(
        "rounded-xl border transition-colors shadow-sm",
        isSmall ? "space-y-1.5 p-2.5" : "space-y-2 p-3.5 sm:rounded-2xl",
        statusStyle.card
      )}
    >
      {showOrg && task.organization?.name && (
        <p className="text-[10px] text-muted truncate">{task.organization.name}</p>
      )}

      <p className={cn("line-clamp-2", isSmall ? "text-xs font-medium leading-snug" : "text-body")}>
        {formatTaskLabel(task)}
      </p>

      {showStatus && (
        <span
          className={cn(
            "inline-flex rounded-full border px-2 py-0.5",
            isSmall ? "text-[9px]" : "text-micro",
            statusStyle.pill
          )}
        >
          {statusLabel}
        </span>
      )}

      {dueDate && (
        <p className={cn(isSmall ? "text-[10px] text-muted" : "text-caption")}>
          Entrega {dueDate}
        </p>
      )}

      {!compact && (
        <div className={cn("pt-0.5", isSmall ? "space-y-0.5" : "space-y-1")}>
          <div
            className={cn(
              "flex items-center justify-between",
              isSmall ? "text-[9px] text-muted" : "text-micro"
            )}
          >
            <span>Progreso</span>
            <span className="tabular-nums font-medium text-foreground">
              {progress}%
            </span>
          </div>
          <div
            className={cn(
              "rounded-full bg-brand-foreground/15 overflow-hidden",
              isSmall ? "h-0.5" : "h-1"
            )}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all",
                statusStyle.progress
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
