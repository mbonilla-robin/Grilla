/** Paleta unificada: amarillo, gris y negro */
export const PILLAR_PALETTE = [
  "#fff8e1",
  "#ffd54f",
  "#a3a3a3",
  "#171717",
  "#ffc107",
  "#737373",
] as const;

export const PILLAR_DEFAULTS = [
  { name: "Valor", color: PILLAR_PALETTE[0], target_pct: 30 },
  { name: "Ventas", color: PILLAR_PALETTE[1], target_pct: 25 },
  { name: "Información", color: PILLAR_PALETTE[2], target_pct: 25 },
  { name: "Entretenimiento", color: PILLAR_PALETTE[3], target_pct: 20 },
] as const;

export function getPillarColor(index: number): string {
  return PILLAR_PALETTE[index % PILLAR_PALETTE.length];
}

/** Color de visualización; ignora el color almacenado para mantener la paleta de marca. */
export function resolvePillarDisplayColor(index: number): string {
  return getPillarColor(index);
}
