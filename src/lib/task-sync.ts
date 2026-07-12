import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskStatus } from "@/lib/types";
import type { TaskWithPost } from "@/lib/task-due";

export const OPEN_TASK_STATUSES: TaskStatus[] = [
  "contenido",
  "brief_listo",
  "ajustes",
];

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
    status === "ajustes" ||
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
  const postStatus = task.post?.status;
  if (postStatus === "ajustes" || postStatus === "in_design") {
    return "ajustes";
  }
  if (base === "contenido" && postStatus === "brief_ready") {
    return "brief_listo";
  }
  return base;
}

export function isOpenTask(task: TaskWithPost): boolean {
  const status = effectiveTaskStatus(task);
  if (status === "aprobado" || status === "en_revision") return false;

  const postStatus = task.post?.status;
  if (postStatus && POST_CLOSED_STATUSES.has(postStatus)) return false;

  return (
    status === "contenido" || status === "brief_listo" || status === "ajustes"
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
  if (postStatus === "ajustes" || postStatus === "in_design") {
    return "ajustes";
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
    ajustes: "en_revision",
    aprobado: "aprobado",
  };
  return map[status];
}

export function legacyTaskStatus(status: TaskStatus): string {
  if (status === "contenido" || status === "brief_listo") return "pending";
  if (status === "aprobado") return "done";
  return "in_progress";
}

export type TaskInsertRow = {
  organization_id: string;
  title: string;
  description: string;
  assigned_to: string | null;
  created_by: string;
  post_id: string;
  due_at: string | null;
};

export async function pruneDuplicateTasks(supabase: SupabaseClient) {
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, post_id, updated_at, created_at")
    .not("post_id", "is", null)
    .order("updated_at", { ascending: false });

  if (!tasks?.length) return;

  const keepers = new Map<string, string>();
  const toDelete: string[] = [];

  for (const task of tasks) {
    if (!task.post_id) continue;
    if (keepers.has(task.post_id)) {
      toDelete.push(task.id);
    } else {
      keepers.set(task.post_id, task.id);
    }
  }

  if (toDelete.length > 0) {
    await supabase.from("tasks").delete().in("id", toDelete);
  }
}

export async function ensureTaskForPost(
  supabase: SupabaseClient,
  row: TaskInsertRow,
  status: TaskStatus = "contenido"
) {
  const { data: existing } = await supabase
    .from("tasks")
    .select("id")
    .eq("post_id", row.post_id)
    .order("updated_at", { ascending: false })
    .limit(1);

  const payload = { ...row, status: dbTaskStatus(status) };
  const keepId = existing?.[0]?.id;

  if (keepId) {
    await supabase.from("tasks").update(payload).eq("id", keepId);
    await pruneDuplicateTasks(supabase);
    return;
  }

  const { error } = await supabase.from("tasks").insert(payload);
  if (error) {
    await supabase.from("tasks").update(payload).eq("post_id", row.post_id);
  }
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
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);

  if (!post) return;

  await pruneDuplicateTasks(supabase);

  const newStatus = taskStatusFromPost(post.status, (count ?? 0) > 0);
  const previousRaw = task?.[0]?.status ?? "contenido";
  const prevEffective = effectiveTaskStatus({
    status: previousRaw,
    post: previousPostStatus ? { status: previousPostStatus } : null,
  });

  await setTasksStatusForPost(supabase, postId, newStatus);

  const assignee = task?.[0]?.assigned_to;
  if (assignee && prevEffective !== newStatus) {
    const { notifyTaskStatusChange } = await import("@/lib/notifications");
    await notifyTaskStatusChange(
      post.organization_id,
      postId,
      post.title,
      assignee,
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

function taskRecency(task: TaskWithPost): number {
  const raw = task.updated_at || task.created_at;
  const ms = raw ? new Date(raw).getTime() : 0;
  return Number.isNaN(ms) ? 0 : ms;
}

export function dedupeTasksByPost(tasks: TaskWithPost[]): TaskWithPost[] {
  const withoutPost = tasks.filter((task) => !task.post_id);
  const byPost = new Map<string, TaskWithPost>();

  for (const task of tasks) {
    if (!task.post_id) continue;
    const prev = byPost.get(task.post_id);
    if (!prev || taskRecency(task) >= taskRecency(prev)) {
      byPost.set(task.post_id, task);
    }
  }

  return [...withoutPost, ...byPost.values()];
}

export function filterOpenTasks(tasks: TaskWithPost[]): TaskWithPost[] {
  return dedupeTasksByPost(tasks.filter(isOpenTask));
}
