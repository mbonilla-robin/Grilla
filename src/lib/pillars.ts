/** Split compound pillar fields like "Valor / Ventas" or "Valor; Informativo". */
export function parsePillars(raw: string | null | undefined): string[] {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return [];

  return trimmed
    .split(/\s*[/,;|]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Join pillars for storage / display (matches plate-style compound fields). */
export function formatPillars(pillars: string[]): string {
  return pillars
    .map((p) => p.trim())
    .filter(Boolean)
    .join(" / ");
}

export function matchPillarOption(
  raw: string,
  options: string[]
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return (
    options.find((p) => p.toLowerCase() === trimmed.toLowerCase()) ?? null
  );
}

/** Resolve one or many pillar names from free text against catalog options. */
export function resolvePillarsFromRaw(
  raw: string,
  options: string[]
): { pillars: string[]; errors: string[] } {
  const parts = parsePillars(raw);
  if (parts.length === 0) {
    return {
      pillars: options[0] ? [options[0]] : [],
      errors: [],
    };
  }

  const pillars: string[] = [];
  const errors: string[] = [];

  for (const part of parts) {
    const matched = matchPillarOption(part, options);
    if (matched) {
      if (!pillars.includes(matched)) pillars.push(matched);
    } else {
      errors.push(`Pilar desconocido: ${part}`);
    }
  }

  return {
    pillars: pillars.length > 0 ? pillars : options[0] ? [options[0]] : [],
    errors,
  };
}

export function togglePillarSelection(
  current: string[],
  pillar: string
): string[] {
  if (current.includes(pillar)) {
    return current.filter((p) => p !== pillar);
  }
  return [...current, pillar];
}
