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

export function isDueWithinDays(task: TaskWithPost, days: number): boolean {
  const due = taskDueAt(task);
  if (!due) return false;

  const end = new Date();
  end.setDate(end.getDate() + days);
  end.setHours(23, 59, 59, 999);

  return due <= end;
}

export function isDueToday(task: TaskWithPost): boolean {
  const due = taskDueAt(task);
  if (!due) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  return due >= today && due <= end;
}

export function formatTaskShortDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

export function taskPriorityLabel(task: TaskWithPost): "Alta" | "Media" | null {
  const due = taskDueAt(task);
  if (!due) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

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

export function filterUrgentTasks(tasks: TaskWithPost[], withinDays = 5) {
  return sortByDueAt(tasks.filter((t) => isDueWithinDays(t, withinDays)));
}

export function filterUpcomingTasks(tasks: TaskWithPost[], afterDays = 5) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + afterDays);
  cutoff.setHours(23, 59, 59, 999);

  return sortByDueAt(
    tasks.filter((t) => {
      const due = taskDueAt(t);
      return due !== null && due > cutoff;
    })
  );
}
