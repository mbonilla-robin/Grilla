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

function calendarDayKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const day = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

function localDayKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function shiftDayKey(day: string, delta: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return localDayKey(new Date(year, month - 1, date + delta));
}

export function currentQuincenaBounds(now = new Date()): { start: string; end: string } {
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  const monthStr = String(month + 1).padStart(2, "0");
  if (date <= 15) {
    return { start: `${year}-${monthStr}-01`, end: `${year}-${monthStr}-15` };
  }
  const last = new Date(year, month + 1, 0).getDate();
  return {
    start: `${year}-${monthStr}-16`,
    end: `${year}-${monthStr}-${String(last).padStart(2, "0")}`,
  };
}

function daysBetweenKeys(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / MS_PER_DAY
  );
}

/** Prefer the post date so a reschedule is not stuck on a stale task due_at. */
export function taskDueRaw(task: TaskWithPost): string | null {
  return task.post?.scheduled_at || task.due_at || null;
}

function taskCalendarDay(task: TaskWithPost): string | null {
  return calendarDayKey(taskDueRaw(task));
}

export function taskDueAt(task: TaskWithPost): Date | null {
  const raw = taskDueRaw(task);
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
  const day = taskCalendarDay(task);
  if (!day) return false;

  const today = localDayKey(now);
  return day >= today && day <= shiftDayKey(today, days);
}

export function isDueToday(task: TaskWithPost, now = new Date()): boolean {
  const day = taskCalendarDay(task);
  if (!day) return false;
  return day === localDayKey(now);
}

export function formatTaskShortDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const day = date.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const [year, month, d] = day.split("-");
    return `${d}/${month}/${year}`;
  }
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
  const day = taskCalendarDay(task);
  if (!day) return null;

  const diffDays = daysBetweenKeys(localDayKey(now), day);

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
  exclude: TaskWithPost[] = [],
  now = new Date()
) {
  const excludeIds = new Set<string>();
  for (const task of exclude) {
    excludeIds.add(task.id);
    if (task.post_id) excludeIds.add(task.post_id);
  }
  const today = localDayKey(now);
  const { end } = currentQuincenaBounds(now);
  const closedPost = new Set([
    "review",
    "approved",
    "scheduled",
    "published",
    "suspendido",
  ]);

  return sortByDueAt(
    tasks.filter((t) => {
      if (excludeIds.has(t.id) || (t.post_id && excludeIds.has(t.post_id))) {
        return false;
      }
      const status = effectiveUpcomingStatus(t);
      if (status === "en_revision" || status === "aprobado") return false;
      if (t.post?.status && closedPost.has(t.post.status)) return false;

      const day = taskCalendarDay(t);
      return day !== null && day >= today && day <= end;
    })
  );
}

function effectiveUpcomingStatus(task: TaskWithPost): string {
  const postStatus = task.post?.status;
  if (postStatus === "review") return "en_revision";
  if (
    postStatus === "approved" ||
    postStatus === "scheduled" ||
    postStatus === "published" ||
    postStatus === "suspendido"
  ) {
    return "aprobado";
  }
  return task.status;
}
