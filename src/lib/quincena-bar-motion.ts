const PHASE_COLORS = {
  contenido: "#a3a3a3",
  brief_listo: "#ffe082",
  en_revision: "#ffd54f",
  aprobado: "#ffc107",
} as const;

type PhaseKey = keyof typeof PHASE_COLORS;

const PHASE_ORDER: PhaseKey[] = [
  "contenido",
  "brief_listo",
  "en_revision",
  "aprobado",
];

const PHASE_AT: Record<PhaseKey, number> = {
  contenido: 0,
  brief_listo: 25,
  en_revision: 50,
  aprobado: 75,
};

export function quincenaProgressColor(pct: number): string {
  return PHASE_COLORS[quincenaProgressPhase(pct)];
}

/** Alineado con workflowPhaseProgress: contenido=25, brief=50, revisión=75, aprobado=100 */
export function quincenaProgressPhase(progressPct: number): PhaseKey {
  if (progressPct <= 25) return "contenido";
  if (progressPct <= 50) return "brief_listo";
  if (progressPct <= 75) return "en_revision";
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
