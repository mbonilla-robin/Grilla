"use client";

import Link from "next/link";
import { formatTaskLabel, taskActionLabel } from "@/lib/post-display";
import { taskDueAt, formatTaskDue, type TaskWithPost } from "@/lib/task-due";
import { normalizeTaskStatus } from "@/lib/task-sync";
import { TASK_STATUS_LABELS } from "@/lib/types";
import { EmptyState } from "./home-ui";

function RowLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 py-2 border-b border-border last:border-0 hover:bg-neutral-50 -mx-1 px-1 rounded transition-colors"
    >
      {children}
    </Link>
  );
}

export function PendientesList({
  tasks = [],
  compact = false,
}: {
  tasks?: TaskWithPost[];
  compact?: boolean;
}) {
  if (!tasks.length) {
    return <EmptyState text="Nada pendiente por ahora." />;
  }

  const shown = compact ? tasks.slice(0, 5) : tasks;

  return (
    <div>
      {shown.map((task) => {
        const action = taskActionLabel(task.title);
        const label = formatTaskLabel(task);
        const due = taskDueAt(task);
        const href =
          task.post_id && task.organization_id
            ? `/org/${task.organization_id}/grilla/${task.post_id}`
            : undefined;

        const meta = [
          action && label !== task.title ? action : null,
          task.organization?.name,
          due ? `Límite ${formatTaskDue(task)}` : null,
          compact ? null : TASK_STATUS_LABELS[normalizeTaskStatus(task.status)],
        ]
          .filter(Boolean)
          .join(" · ");

        const content = (
          <div className="min-w-0 flex-1">
            <p className={compact ? "text-xs truncate" : "text-sm font-medium truncate"}>
              {label}
            </p>
            {meta ? (
              <p className="text-[10px] text-muted mt-0.5">{meta}</p>
            ) : null}
          </div>
        );

        if (href) {
          return (
            <RowLink key={task.id} href={href}>
              {content}
            </RowLink>
          );
        }

        return (
          <div key={task.id} className="py-2 border-b border-border last:border-0">
            {content}
          </div>
        );
      })}
    </div>
  );
}
