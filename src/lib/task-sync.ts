import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskStatus } from "@/lib/types";
import type { TaskWithPost } from "@/lib/task-due";

export const OPEN_TASK_STATUSES: TaskStatus[] = ["contenido", "brief_listo"];

const LEGACY_OPEN = new Set(["pending", "in_progress"]);
const CLOSED_STATUSES = new Set([
  "done",
  "aprobado",
  "en_revision",
]);

const POST_CLOSED_STATUSES = new Set([
  "review",
  "approved",
  "scheduled",
  "published",
]);

export function normalizeTaskStatus(status: string): TaskStatus {
  if (status === "pending" || status === "in_progress") return "contenido";
  if (status === "done") return "aprobado";
  if (
    status === "contenido" ||
    status === "brief_listo" ||
    status === "en_revision" ||
    status === "aprobado"
  ) {
    return status;
  }
  return "contenido";
}

export function isOpenTask(task: TaskWithPost): boolean {
  const status = task.status as string;
  if (CLOSED_STATUSES.has(status)) return false;

  const postStatus = (task.post as { status?: string } | null)?.status;
  if (postStatus && POST_CLOSED_STATUSES.has(postStatus)) return false;

  return (
    status === "contenido" ||
    status === "brief_listo" ||
    LEGACY_OPEN.has(status)
  );
}

export function taskStatusFromPost(
  postStatus: string,
  hasAssets: boolean
): TaskStatus {
  if (["approved", "scheduled", "published"].includes(postStatus)) {
    return "aprobado";
  }
  if (hasAssets || postStatus === "review") {
    return "en_revision";
  }
  if (postStatus === "brief_ready") {
    return "brief_listo";
  }
  return "contenido";
}

/** DB value — works before and after enum migration */
export function dbTaskStatus(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    contenido: "contenido",
    brief_listo: "brief_listo",
    en_revision: "en_revision",
    aprobado: "aprobado",
  };
  return map[status];
}

export function legacyTaskStatus(status: TaskStatus): string {
  if (status === "contenido") return "pending";
  if (status === "aprobado") return "done";
  return "in_progress";
}

export async function setTasksStatusForPost(
  supabase: SupabaseClient,
  postId: string,
  status: TaskStatus,
  extra?: Record<string, unknown>
) {
  const payload = { ...extra, status: dbTaskStatus(status) };
  const { error } = await supabase
    .from("tasks")
    .update(payload)
    .eq("post_id", postId);

  if (error) {
    await supabase
      .from("tasks")
      .update({ ...extra, status: legacyTaskStatus(status) })
      .eq("post_id", postId);
  }
}

export async function syncTasksForPost(
  supabase: SupabaseClient,
  postId: string
) {
  const [{ data: post }, { count }, { data: task }] = await Promise.all([
    supabase
      .from("posts")
      .select("status, title, organization_id")
      .eq("id", postId)
      .single(),
    supabase
      .from("post_assets")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId),
    supabase
      .from("tasks")
      .select("status, assigned_to")
      .eq("post_id", postId)
      .maybeSingle(),
  ]);

  if (!post) return;

  const status = taskStatusFromPost(post.status, (count ?? 0) > 0);
  const previousStatus = task?.status ?? "contenido";

  await setTasksStatusForPost(supabase, postId, status);

  if (
    task?.assigned_to &&
    normalizeTaskStatus(previousStatus) !== status
  ) {
    const { notifyTaskStatusChange } = await import("@/lib/notifications");
    await notifyTaskStatusChange(
      post.organization_id,
      postId,
      post.title,
      task.assigned_to,
      previousStatus,
      status
    );
  }
}

export function primaryTaskAssignee(post: {
  assigned_to: string | null;
  created_by: string | null;
}): string | null {
  return post.assigned_to ?? post.created_by;
}

export function dedupeTasksByPost(tasks: TaskWithPost[]): TaskWithPost[] {
  const seen = new Set<string>();
  return tasks.filter((task) => {
    if (!task.post_id) return true;
    if (seen.has(task.post_id)) return false;
    seen.add(task.post_id);
    return true;
  });
}

export function filterOpenTasks(tasks: TaskWithPost[]): TaskWithPost[] {
  return dedupeTasksByPost(tasks.filter(isOpenTask));
}
