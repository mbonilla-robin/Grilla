/** Tailwind-aligned breakpoints — keep in sync with responsive classes (md:, lg:, etc.) */
export const BREAKPOINTS = {
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export const MEDIA_QUERIES = {
  md: `(min-width: ${BREAKPOINTS.md}px)`,
  lg: `(min-width: ${BREAKPOINTS.lg}px)`,
  xl: `(min-width: ${BREAKPOINTS.xl}px)`,
} as const;

export type ViewportSize = "mobile" | "tablet" | "desktop";

export function viewportFromWidth(width: number): ViewportSize {
  if (width >= BREAKPOINTS.lg) return "desktop";
  if (width >= BREAKPOINTS.md) return "tablet";
  return "mobile";
}
