import type { BriefColorRef, DesignBrief } from "@/lib/types";

const HEX_REGEX = /#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})\b/g;

export function normalizeHex(hex: string): string {
  const value = hex.startsWith("#") ? hex : `#${hex}`;
  if (value.length === 4) {
    const r = value[1];
    const g = value[2];
    const b = value[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return value.toUpperCase();
}

export function extractHexColors(text: string): string[] {
  const matches = text.match(HEX_REGEX) ?? [];
  return [...new Set(matches.map(normalizeHex))];
}

export function isBrandKitConfigured(
  brandKit: {
    colors?: string[];
    fonts?: { heading?: string; body?: string };
  } | null
): boolean {
  if (!brandKit) return false;
  const hasColors = (brandKit.colors ?? []).some((c) => c?.trim());
  const hasFonts = Boolean(
    brandKit.fonts?.heading?.trim() && brandKit.fonts?.body?.trim()
  );
  return hasColors || hasFonts;
}

export function brandKitToPalette(
  colors: string[],
  fonts: { heading: string; body: string }
): NonNullable<DesignBrief["brand_palette"]> {
  return {
    colors: colors.map((hex, i) => ({
      hex: normalizeHex(hex),
      name: i === 0 ? "Principal" : i === 1 ? "Acento" : `Color ${i + 1}`,
    })),
    fonts,
  };
}

export function mergeColorRefs(
  ...lists: Array<BriefColorRef[] | undefined>
): BriefColorRef[] {
  const seen = new Set<string>();
  const merged: BriefColorRef[] = [];

  for (const list of lists) {
    if (!list) continue;
    for (const ref of list) {
      const hex = normalizeHex(ref.hex);
      if (seen.has(hex)) continue;
      seen.add(hex);
      merged.push({ ...ref, hex });
    }
  }

  return merged;
}

export const HEX_PATTERN = HEX_REGEX;
