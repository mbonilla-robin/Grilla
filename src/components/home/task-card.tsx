import Link from "next/link";
import { formatTaskLabel, taskActionLabel } from "@/lib/post-display";
import { formatTaskDue, type TaskWithPost } from "@/lib/task-due";
import { normalizeTaskStatus } from "@/lib/task-sync";
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
  const statusLabel = TASK_STATUS_LABELS[normalizeTaskStatus(task.status)];

  const content = (
    <div
      className={cn(
        "rounded-lg border border-border bg-neutral-50/80 space-y-2.5 hover:border-foreground/20 hover:bg-neutral-50 transition-colors",
        compact ? "p-2.5" : "p-3.5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "font-medium leading-snug line-clamp-2",
              compact ? "text-xs" : "text-sm"
            )}
          >
            {formatTaskLabel(task)}
          </p>
          {action && (
            <p className="text-[10px] text-muted mt-0.5 truncate">{action}</p>
          )}
        </div>
        {due && (
          <span className="text-[10px] text-muted shrink-0 tabular-nums whitespace-nowrap">
            {due}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {showOrg && task.organization?.name && (
          <span className="text-[10px] text-muted truncate max-w-full">
            {task.organization.name}
          </span>
        )}
        {showStatus && (
          <span className="text-[10px] rounded-full bg-surface border border-border px-2 py-0.5 text-muted">
            {statusLabel}
          </span>
        )}
      </div>

      {task.post?.status && !compact && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted">
            <span>Progreso</span>
            <span className="tabular-nums font-medium text-foreground">{progress}%</span>
          </div>
          <div className="h-1 rounded-full bg-neutral-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-foreground/60 transition-all"
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
