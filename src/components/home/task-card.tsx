import Link from "next/link";
import { formatTaskLabel, taskActionLabel } from "@/lib/post-display";
import { formatTaskDue, type TaskWithPost } from "@/lib/task-due";
import { normalizeTaskStatus } from "@/lib/task-sync";
import { taskStatusCardStyles } from "@/lib/status-colors";
import { TASK_STATUS_LABELS } from "@/lib/types";
import { postStatusProgress } from "@/lib/post-progress";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: TaskWithPost;
  showOrg?: boolean;
  showStatus?: boolean;
  compact?: boolean;
}

export function TaskCard({
  task,
  showOrg = false,
  showStatus = true,
  compact = false,
}: TaskCardProps) {
  const href =
    task.post_id && task.organization_id
      ? `/org/${task.organization_id}/grilla/${task.post_id}`
      : null;

  const progress = postStatusProgress(task.post?.status);
  const action = taskActionLabel(task.title);
  const due = formatTaskDue(task);
  const status = normalizeTaskStatus(task.status);
  const statusLabel = TASK_STATUS_LABELS[status];
  const statusStyle = taskStatusCardStyles[status];

  const content = (
    <div
      className={cn(
        "rounded-2xl border space-y-2.5 transition-colors shadow-sm",
        statusStyle.card,
        compact ? "p-2.5" : "p-3.5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn("text-body line-clamp-2", compact && "text-xs")}>
            {formatTaskLabel(task)}
          </p>
          {action && <p className="text-micro mt-0.5 truncate">{action}</p>}
        </div>
        {due && (
          <span className="text-micro shrink-0 tabular-nums whitespace-nowrap">
            {due}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {showOrg && task.organization?.name && (
          <span className="text-micro truncate max-w-full">
            {task.organization.name}
          </span>
        )}
        {showStatus && (
          <span
            className={cn(
              "text-micro rounded-full border px-2 py-0.5",
              statusStyle.pill
            )}
          >
            {statusLabel}
          </span>
        )}
      </div>

      {task.post?.status && !compact && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-micro">
            <span>Progreso</span>
            <span className="tabular-nums font-medium text-foreground">
              {progress}%
            </span>
          </div>
          <div className="h-1 rounded-full bg-brand-foreground/15 overflow-hidden">
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
