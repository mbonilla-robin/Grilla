import type { PostStatus } from "@/lib/types";

const STATUS_ORDER: PostStatus[] = [
  "draft",
  "brief_ready",
  "in_design",
  "review",
  "approved",
  "scheduled",
  "published",
];

export function postStatusProgress(status: string | undefined | null): number {
  if (!status) return 0;
  const idx = STATUS_ORDER.indexOf(status as PostStatus);
  if (idx === -1) return 0;
  return Math.round(((idx + 1) / STATUS_ORDER.length) * 100);
}

export const WORKFLOW_PHASES = [
  {
    key: "contenido",
    label: "Contenido",
    statuses: ["draft", "in_design"] as PostStatus[],
  },
  {
    key: "brief_listo",
    label: "Brief listo",
    statuses: ["brief_ready"] as PostStatus[],
  },
  {
    key: "en_revision",
    label: "En revisión",
    statuses: ["review"] as PostStatus[],
  },
  {
    key: "aprobado",
    label: "Aprobado",
    statuses: ["approved", "scheduled", "published"] as PostStatus[],
  },
] as const;

export function currentPhaseIndex(status: PostStatus): number {
  const idx = WORKFLOW_PHASES.findIndex((p) => p.statuses.includes(status));
  return idx === -1 ? 0 : idx;
}
