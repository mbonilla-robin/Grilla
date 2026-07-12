const PHASE_COLORS = {
  contenido: "#a3a3a3",
  brief_listo: "#ffe082",
  en_revision: "#ffd54f",
  ajustes: "#ffb74d",
  aprobado: "#ffc107",
} as const;

type PhaseKey = keyof typeof PHASE_COLORS;

const PHASE_ORDER: PhaseKey[] = [
  "contenido",
  "brief_listo",
  "en_revision",
  "ajustes",
  "aprobado",
];

const PHASE_AT: Record<PhaseKey, number> = {
  contenido: 0,
  brief_listo: 20,
  en_revision: 40,
  ajustes: 60,
  aprobado: 80,
};

export function quincenaProgressColor(pct: number): string {
  return PHASE_COLORS[quincenaProgressPhase(pct)];
}

/** Alineado con workflowPhaseProgress: contenido=20, brief=40, revisión=60, ajustes=80, aprobado=100 */
export function quincenaProgressPhase(progressPct: number): PhaseKey {
  if (progressPct <= 20) return "contenido";
  if (progressPct <= 40) return "brief_listo";
  if (progressPct <= 60) return "en_revision";
  if (progressPct <= 80) return "ajustes";
  return "aprobado";
}

export function quincenaBarFillStyle(pct: number) {
  return {
    width: `${pct}%`,
    backgroundColor: quincenaProgressColor(pct),
  };
}

export const QUINCENA_BAR_ANIMATION_MS = 1200;

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export { PHASE_COLORS, PHASE_ORDER, PHASE_AT };
