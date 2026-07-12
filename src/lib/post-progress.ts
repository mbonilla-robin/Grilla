import type { PostStatus, TaskStatus } from "@/lib/types";

const TASK_STATUS_ORDER: TaskStatus[] = [
  "contenido",
  "brief_listo",
  "en_revision",
  "ajustes",
  "aprobado",
];

/** Progreso según los 5 estados del flujo: 20 → 40 → 60 → 80 → 100 */
export function taskStatusProgress(status: TaskStatus): number {
  const idx = TASK_STATUS_ORDER.indexOf(status);
  if (idx === -1) return 0;
  return Math.round(((idx + 1) / TASK_STATUS_ORDER.length) * 100);
}

export const WORKFLOW_PHASES = [
  {
    key: "contenido",
    label: "Contenido",
    statuses: ["draft"] as PostStatus[],
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
    key: "ajustes",
    label: "Ajustes",
    statuses: ["ajustes", "in_design"] as PostStatus[],
  },
  {
    key: "aprobado",
    label: "Aprobado",
    statuses: ["approved", "scheduled", "published"] as PostStatus[],
  },
] as const;

export type WorkflowPhaseKey = (typeof WORKFLOW_PHASES)[number]["key"];

export function workflowPhaseFromStatus(
  status: string | undefined | null
): WorkflowPhaseKey {
  if (!status) return "contenido";
  for (const phase of WORKFLOW_PHASES) {
    if (phase.statuses.includes(status as PostStatus)) {
      return phase.key;
    }
  }
  return "contenido";
}

export function representativeStatusForPhase(phase: WorkflowPhaseKey): PostStatus {
  const map: Record<WorkflowPhaseKey, PostStatus> = {
    contenido: "draft",
    brief_listo: "brief_ready",
    en_revision: "review",
    ajustes: "ajustes",
    aprobado: "approved",
  };
  return map[phase];
}

export function workflowPhaseProgress(phase: WorkflowPhaseKey): number {
  const idx = WORKFLOW_PHASES.findIndex((item) => item.key === phase);
  if (idx === -1) return 0;
  return Math.round(((idx + 1) / WORKFLOW_PHASES.length) * 100);
}

export function currentPhaseIndex(status: PostStatus): number {
  const phase = workflowPhaseFromStatus(status);
  const idx = WORKFLOW_PHASES.findIndex((p) => p.key === phase);
  return idx === -1 ? 0 : idx;
}
