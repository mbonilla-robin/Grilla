"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatTaskLabel } from "@/lib/post-display";
import { formatTaskDue, type TaskWithPost } from "@/lib/task-due";
import { cn } from "@/lib/utils";
import { EmptyState } from "./home-ui";

interface OrgGroup {
  orgId: string;
  orgName: string;
  tasks: TaskWithPost[];
}

function groupTasksByOrg(tasks: TaskWithPost[]): OrgGroup[] {
  const map = new Map<string, OrgGroup>();

  for (const task of tasks) {
    const orgId = task.organization_id || task.organization?.id || "unknown";
    const orgName = task.organization?.name || "Sin marca";

    const existing = map.get(orgId);
    if (existing) {
      existing.tasks.push(task);
    } else {
      map.set(orgId, { orgId, orgName, tasks: [task] });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.orgName.localeCompare(b.orgName, "es")
  );
}

function orgColumnsClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 sm:grid-cols-2";
  return "grid-cols-1 md:grid-cols-2 2xl:grid-cols-3";
}

function PendienteMiniCard({
  task,
  compact,
}: {
  task: TaskWithPost;
  compact?: boolean;
}) {
  const href =
    task.post_id && task.organization_id
      ? `/org/${task.organization_id}/grilla/${task.post_id}`
      : null;
  const due = formatTaskDue(task);

  const card = (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-border bg-surface",
        "hover:border-foreground/15 hover:bg-neutral-50/80 transition-colors",
        compact ? "px-2 py-1.5" : "px-2.5 py-2"
      )}
    >
      <p
        className={cn(
          "flex-1 min-w-0 truncate text-foreground",
          compact ? "text-[11px]" : "text-xs"
        )}
      >
        {formatTaskLabel(task)}
      </p>
      {due && (
        <span className="text-[10px] text-muted tabular-nums shrink-0 whitespace-nowrap">
          {due}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }

  return card;
}

function OrgColumn({
  group,
  compact,
  showOrgHeader,
}: {
  group: OrgGroup;
  compact?: boolean;
  showOrgHeader: boolean;
}) {
  return (
    <div className="min-w-0 flex flex-col gap-1.5">
      {showOrgHeader && (
        <Link
          href={`/org/${group.orgId}/home`}
          className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:text-muted transition-colors group mb-0.5"
        >
          <span className="truncate">{group.orgName}</span>
          <span className="text-muted tabular-nums shrink-0">{group.tasks.length}</span>
          <ChevronRight
            size={11}
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          />
        </Link>
      )}
      {group.tasks.map((task) => (
        <PendienteMiniCard key={task.id} task={task} compact={compact} />
      ))}
    </div>
  );
}

export function PendientesList({
  tasks = [],
  compact = false,
  groupByOrg,
}: {
  tasks?: TaskWithPost[];
  compact?: boolean;
  groupByOrg?: boolean;
}) {
  if (!tasks.length) {
    return <EmptyState text="Nada pendiente por ahora." />;
  }

  const shown = compact ? tasks.slice(0, 8) : tasks;
  const orgGroups = groupTasksByOrg(shown);
  const shouldGroup = groupByOrg ?? orgGroups.length > 1;

  if (!shouldGroup) {
    return (
      <div className="flex flex-col gap-1.5">
        {shown.map((task) => (
          <PendienteMiniCard key={task.id} task={task} compact={compact} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", orgColumnsClass(orgGroups.length))}>
      {orgGroups.map((group) => (
        <OrgColumn
          key={group.orgId}
          group={group}
          compact={compact}
          showOrgHeader
        />
      ))}
    </div>
  );
}
