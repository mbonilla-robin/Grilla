/** Stagger delay for home dashboard entrance animations (seconds). */
export function homeStaggerDelay(index: number, base = 0.06, step = 0.07): string {
  return `${base + index * step}s`;
}
