import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskStatus } from "@/lib/types";
import type { TaskWithPost } from "@/lib/task-due";

export const OPEN_TASK_STATUSES: TaskStatus[] = ["contenido", "brief_listo"];

const LEGACY_OPEN = new Set(["pending", "in_progress"]);

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

/** Estado visible: deriva brief_listo del post cuando la tarea sigue en contenido */
export function effectiveTaskStatus(
  task: Pick<TaskWithPost, "status"> & { post?: { status?: string } | null }
): TaskStatus {
  const base = normalizeTaskStatus(task.status);
  if (base === "contenido" && task.post?.status === "brief_ready") {
    return "brief_listo";
  }
  return base;
}

export function isOpenTask(task: TaskWithPost): boolean {
  const status = effectiveTaskStatus(task);
  if (status === "aprobado" || status === "en_revision") return false;

  const postStatus = task.post?.status;
  if (postStatus && POST_CLOSED_STATUSES.has(postStatus)) return false;

  return status === "contenido" || status === "brief_listo";
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

/** Valor en DB — brief_listo se guarda como contenido (sin migración de enum) */
export function dbTaskStatus(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    contenido: "contenido",
    brief_listo: "contenido",
    en_revision: "en_revision",
    aprobado: "aprobado",
  };
  return map[status];
}

export function legacyTaskStatus(status: TaskStatus): string {
  if (status === "contenido" || status === "brief_listo") return "pending";
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
  postId: string,
  previousPostStatus?: string
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

  const newStatus = taskStatusFromPost(post.status, (count ?? 0) > 0);
  const previousRaw = task?.status ?? "contenido";
  const prevEffective = effectiveTaskStatus({
    status: previousRaw,
    post: previousPostStatus ? { status: previousPostStatus } : null,
  });

  await setTasksStatusForPost(supabase, postId, newStatus);

  if (task?.assigned_to && prevEffective !== newStatus) {
    const { notifyTaskStatusChange } = await import("@/lib/notifications");
    await notifyTaskStatusChange(
      post.organization_id,
      postId,
      post.title,
      task.assigned_to,
      prevEffective,
      newStatus
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
