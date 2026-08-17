"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { formatTaskLabel } from "@/lib/post-display";
import {
  formatTaskShortDate,
  taskDueRaw,
  TU_DIA_LOOKAHEAD_DAYS,
  type TaskWithPost,
} from "@/lib/task-due";
import { effectiveTaskStatus } from "@/lib/task-sync";
import { taskStatusCardStyles } from "@/lib/status-colors";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/lib/types";
import { homeStaggerDelay } from "@/lib/home-motion";
import { cn } from "@/lib/utils";

const COMPACT_URGENT_LIMIT = 5;

const statusDotClass: Record<TaskStatus, string> = {
  contenido: "bg-white ring-1 ring-border",
  brief_listo: "bg-brand-muted ring-1 ring-brand/40",
  en_revision: "bg-brand ring-1 ring-brand-dark/50",
  ajustes: "bg-amber-200 ring-1 ring-amber-400",
  aprobado: "bg-brand-dark ring-1 ring-foreground/20",
};

function DayRailSectionHeader({
  title,
  count,
  compact = false,
}: {
  title: string;
  count: number;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h3 className="text-[11px] font-medium text-muted uppercase tracking-wide">
          {title}
        </h3>
        {count > 0 && (
          <span className="text-[10px] font-semibold tabular-nums text-muted">
            {count}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2">
      <h2 className="min-w-0 text-title-section leading-tight">{title}</h2>
      <span
        className="shrink-0 flex h-7 min-w-7 items-center justify-center rounded-full border border-border bg-foreground px-2 text-xs font-semibold tabular-nums text-background home-animate-badge"
        style={{ animationDelay: "0.35s" }}
      >
        {count}
      </span>
    </div>
  );
}

function DayRailTaskCard({
  task,
  href,
  isLast = false,
  index = 0,
}: {
  task: TaskWithPost;
  href?: string;
  isLast?: boolean;
  index?: number;
}) {
  const taskStatus = effectiveTaskStatus(task);
  const status = TASK_STATUS_LABELS[taskStatus];
  const statusStyle = taskStatusCardStyles[taskStatus];
  const dueDate = formatTaskShortDate(taskDueRaw(task));

  const card = (
    <div
      className="relative flex gap-2 home-animate-in-right"
      style={{ animationDelay: homeStaggerDelay(index, 0.25, 0.06) }}
    >
      <div className="flex w-2.5 shrink-0 flex-col items-center pt-2">
        <div
          className={cn(
            "h-2 w-2 rounded-full ring-2",
            taskStatus === "contenido" && "bg-white ring-border",
            taskStatus === "brief_listo" && "bg-brand-muted ring-brand/30",
            taskStatus === "en_revision" && "bg-brand ring-brand-dark/50",
            taskStatus === "ajustes" && "bg-amber-200 ring-amber-400",
            taskStatus === "aprobado" && "bg-brand-dark ring-foreground/20"
          )}
        />
        {!isLast && (
          <div className="mt-0.5 w-px flex-1 bg-brand-dark/30" />
        )}
      </div>

      <div
        className={cn(
          "min-w-0 flex-1 rounded-lg border px-2 py-1.5 space-y-1 transition-transform duration-200",
          statusStyle.card,
          href && "group-hover:translate-x-0.5"
        )}
      >
        {task.organization?.name && (
          <p className="text-[9px] text-muted truncate leading-none">
            {task.organization.name}
          </p>
        )}

        <p className="text-[11px] font-medium leading-snug line-clamp-2">
          {formatTaskLabel(task)}
        </p>

        <div className="flex items-center justify-between gap-1.5">
          <span
            className={cn(
              "inline-flex shrink-0 text-[9px] rounded-full border px-1.5 py-px leading-tight",
              statusStyle.pill
            )}
          >
            {status}
          </span>
          {dueDate && (
            <span className="text-[10px] text-muted tabular-nums truncate">
              {dueDate}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group block hover:opacity-95 transition-opacity">
        {card}
      </Link>
    );
  }

  return card;
}

function CompactTaskRow({
  task,
  href,
}: {
  task: TaskWithPost;
  href?: string;
}) {
  const taskStatus = effectiveTaskStatus(task);
  const status = TASK_STATUS_LABELS[taskStatus];
  const dueDate = formatTaskShortDate(taskDueRaw(task));
  const orgName = task.organization?.name;

  const row = (
    <div className="flex items-center gap-2 min-w-0 py-1.5">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full shrink-0",
          statusDotClass[taskStatus]
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate leading-snug">
          {formatTaskLabel(task)}
        </p>
        <p className="text-[10px] text-muted truncate leading-tight mt-0.5">
          {[orgName, status].filter(Boolean).join(" · ")}
        </p>
      </div>
      {dueDate && (
        <span className="text-[10px] text-muted tabular-nums shrink-0">
          {dueDate}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block -mx-1 px-1 rounded-md hover:bg-neutral-50/80 transition-colors"
      >
        {row}
      </Link>
    );
  }

  return row;
}

function taskHref(task: TaskWithPost) {
  if (task.post_id && task.organization_id) {
    return `/org/${task.organization_id}/grilla/${task.post_id}`;
  }
  return undefined;
}

function DayRailTaskList({
  tasks,
  emptyText,
  startIndex = 0,
  compact = false,
}: {
  tasks: TaskWithPost[];
  emptyText: string;
  startIndex?: number;
  compact?: boolean;
}) {
  if (tasks.length === 0) {
    return compact ? null : <p className="text-caption px-1">{emptyText}</p>;
  }

  if (compact) {
    return (
      <div className="divide-y divide-border/70">
        {tasks.map((task) => (
          <CompactTaskRow
            key={task.id}
            task={task}
            href={taskHref(task)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task, i) => (
        <DayRailTaskCard
          key={task.id}
          task={task}
          href={taskHref(task)}
          isLast={i === tasks.length - 1}
          index={startIndex + i}
        />
      ))}
    </div>
  );
}

function taskDayKey(task: TaskWithPost): string | null {
  const raw = taskDueRaw(task);
  if (!raw) return null;
  const day = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

function splitUpcomingByNextDate(tasks: TaskWithPost[]) {
  if (tasks.length === 0) {
    return { nextDateTasks: [] as TaskWithPost[], rest: [] as TaskWithPost[] };
  }

  const firstDay = taskDayKey(tasks[0]);
  if (!firstDay) {
    return { nextDateTasks: tasks.slice(0, 1), rest: tasks.slice(1) };
  }

  const nextDateTasks: TaskWithPost[] = [];
  const rest: TaskWithPost[] = [];
  for (const task of tasks) {
    if (taskDayKey(task) === firstDay) nextDateTasks.push(task);
    else rest.push(task);
  }
  return { nextDateTasks, rest };
}

function CompactUpcomingBlock({
  nextDateTasks,
  rest,
  startIndex,
}: {
  nextDateTasks: TaskWithPost[];
  rest: TaskWithPost[];
  startIndex: number;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const didToggle = useRef(false);

  useEffect(() => {
    if (!didToggle.current) return;
    buttonRef.current?.scrollIntoView({
      behavior: "smooth",
      block: open ? "end" : "nearest",
    });
  }, [open]);

  return (
    <div>
      <DayRailTaskList
        tasks={nextDateTasks}
        emptyText=""
        startIndex={startIndex}
        compact
      />
      {open && rest.length > 0 && (
        <DayRailTaskList
          tasks={rest}
          emptyText=""
          startIndex={startIndex + nextDateTasks.length}
          compact
        />
      )}
      {rest.length > 0 && (
        <div className="relative z-10 mt-2 flex justify-center bg-surface pt-1">
          <button
            ref={buttonRef}
            type="button"
            aria-expanded={open}
            onClick={() => {
              didToggle.current = true;
              setOpen((value) => !value);
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1",
              "text-[11px] font-semibold tabular-nums text-muted shadow-sm",
              "hover:border-brand/40 hover:text-foreground transition-colors"
            )}
          >
            {rest.length}+
            <ChevronDown
              size={12}
              className={cn("transition-transform", open && "rotate-180")}
            />
          </button>
        </div>
      )}
    </div>
  );
}

interface DayRailSidebarProps {
  tuDiaTasks: TaskWithPost[];
  upcomingTasks: TaskWithPost[];
  compact?: boolean;
}

export function DayRailSidebar({
  tuDiaTasks,
  upcomingTasks,
  compact = false,
}: DayRailSidebarProps) {
  const urgentShown = compact
    ? tuDiaTasks.slice(0, COMPACT_URGENT_LIMIT)
    : tuDiaTasks;
  const { nextDateTasks, rest: upcomingRest } = splitUpcomingByNextDate(
    upcomingTasks
  );
  const urgentOverflow = tuDiaTasks.length - urgentShown.length;

  if (compact) {
    const hasUrgent = tuDiaTasks.length > 0;
    const hasUpcoming = upcomingTasks.length > 0;

    if (!hasUrgent && !hasUpcoming) {
      return (
        <p className="text-body-muted text-center py-4 text-sm">
          Nada urgente en los próximos {TU_DIA_LOOKAHEAD_DAYS} días.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {hasUrgent && (
          <div>
            <DayRailSectionHeader
              title="Urgente"
              count={tuDiaTasks.length}
              compact
            />
            <DayRailTaskList
              tasks={urgentShown}
              emptyText=""
              compact
            />
            {urgentOverflow > 0 && (
              <p className="text-[10px] text-muted mt-1.5 tabular-nums">
                +{urgentOverflow} más en los próximos {TU_DIA_LOOKAHEAD_DAYS} días
              </p>
            )}
          </div>
        )}

        {hasUpcoming && (
          <div className={hasUrgent ? "pt-3 border-t border-border/70" : undefined}>
            <DayRailSectionHeader
              title="Próximas entregas"
              count={upcomingTasks.length}
              compact
            />
            <CompactUpcomingBlock
              nextDateTasks={nextDateTasks}
              rest={upcomingRest}
              startIndex={tuDiaTasks.length}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <DayRailSectionHeader title="Tu día" count={tuDiaTasks.length} />

      <div className="px-3 pb-3">
        <DayRailTaskList
          tasks={urgentShown}
          emptyText={`Nada urgente en los próximos ${TU_DIA_LOOKAHEAD_DAYS} días.`}
        />
      </div>

      <div className="mx-3 border-t border-border" />

      <DayRailSectionHeader title="Próximas entregas" count={upcomingTasks.length} />

      <div className="px-3 pb-3">
        <DayRailTaskList
          tasks={upcomingTasks}
          emptyText="Sin más entregas en esta quincena."
          startIndex={tuDiaTasks.length}
        />
      </div>
    </div>
  );
}
