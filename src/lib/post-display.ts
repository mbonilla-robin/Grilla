import { FORMAT_LABELS, type PostFormat } from "@/lib/types";

export function formatPostLabel(
  format: PostFormat | string | null | undefined,
  title: string | null | undefined
): string {
  const formatLabel =
    format && format in FORMAT_LABELS
      ? FORMAT_LABELS[format as PostFormat]
      : null;
  const postTitle = title?.trim();

  if (formatLabel && postTitle) return `${formatLabel} | ${postTitle}`;
  if (formatLabel) return formatLabel;
  return postTitle || "Sin título";
}

export function taskActionLabel(taskTitle: string): string | null {
  const idx = taskTitle.indexOf(":");
  if (idx === -1) return null;
  return taskTitle.slice(0, idx).trim();
}

export function formatTaskLabel(task: {
  title: string;
  post?: { format?: PostFormat; title?: string } | null;
}): string {
  if (task.post?.format && task.post.title) {
    return formatPostLabel(task.post.format, task.post.title);
  }
  return task.title;
}
