import { formatDate } from "@/lib/utils";
import type { PostFormat, Task } from "@/lib/types";

export type TaskWithPost = Omit<Task, "organization" | "post"> & {
  organization?: { name: string; id: string };
  post?: {
    format?: PostFormat;
    title?: string;
    scheduled_at?: string | null;
    status?: string;
  } | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Today plus this many following days appear in "Tu día". */
export const TU_DIA_LOOKAHEAD_DAYS = 3;
/** Days shown in "Próximas entregas", starting after the Tu día window. */
export const UPCOMING_WINDOW_DAYS = 7;

/** Calendar day number in UTC so date-only due dates don't shift by timezone. */
function utcDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      MS_PER_DAY
  );
}

function taskDueDay(task: TaskWithPost): number | null {
  const due = taskDueAt(task);
  if (!due) return null;
  return utcDayNumber(due);
}

function todayUtcDay(now = new Date()): number {
  return utcDayNumber(now);
}

export function taskDueAt(task: TaskWithPost): Date | null {
  const raw = task.due_at || task.post?.scheduled_at;
  if (!raw) return null;
  const due = new Date(raw);
  if (Number.isNaN(due.getTime())) return null;
  return due;
}

export function formatTaskDue(task: TaskWithPost): string | null {
  const due = taskDueAt(task);
  if (!due) return null;
  return formatDate(due.toISOString());
}

export function isDueWithinDays(
  task: TaskWithPost,
  days: number,
  now = new Date()
): boolean {
  const dueDay = taskDueDay(task);
  if (dueDay === null) return false;

  const today = todayUtcDay(now);
  return dueDay >= today && dueDay <= today + days;
}

export function isDueToday(task: TaskWithPost, now = new Date()): boolean {
  const dueDay = taskDueDay(task);
  if (dueDay === null) return false;
  return dueDay === todayUtcDay(now);
}

export function formatTaskShortDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function taskPriorityLabel(
  task: TaskWithPost,
  now = new Date()
): "Alta" | "Media" | null {
  const dueDay = taskDueDay(task);
  if (dueDay === null) return null;

  const diffDays = dueDay - todayUtcDay(now);

  if (diffDays <= 2) return "Alta";
  if (diffDays <= 7) return "Media";
  return null;
}

export function sortByDueAt(tasks: TaskWithPost[]): TaskWithPost[] {
  return [...tasks].sort((a, b) => {
    const aDue = taskDueAt(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bDue = taskDueAt(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aDue - bDue;
  });
}

export function filterUrgentTasks(
  tasks: TaskWithPost[],
  withinDays = TU_DIA_LOOKAHEAD_DAYS,
  now = new Date()
) {
  return sortByDueAt(tasks.filter((t) => isDueWithinDays(t, withinDays, now)));
}

export function filterUpcomingTasks(
  tasks: TaskWithPost[],
  afterDays = TU_DIA_LOOKAHEAD_DAYS,
  windowDays = UPCOMING_WINDOW_DAYS,
  now = new Date()
) {
  const today = todayUtcDay(now);
  const startDay = today + afterDays;
  const endDay = startDay + windowDays;

  return sortByDueAt(
    tasks.filter((t) => {
      const dueDay = taskDueDay(t);
      return dueDay !== null && dueDay > startDay && dueDay <= endDay;
    })
  );
}
