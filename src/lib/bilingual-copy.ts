/**
 * Split mixed Spanish/English creator copy into separate fields.
 * Handles Metalkor-style markers: Español/English, ES:/EN:, Versión en…, English version,
 * and interleaved per-slide pairs.
 */

export type ContentLang = "es" | "en";

export type SplitBilingualResult = {
  es: string;
  en: string;
  mode: "interleaved" | "block";
};

export function languageLabel(lang: ContentLang): string {
  return lang === "en" ? "English" : "Español";
}

/** Best-effort language guess for mono content stored in a single field. */
export function detectContentLanguage(text: string): ContentLang {
  const sample = text.slice(0, 2000);
  const esChars = (sample.match(/[áéíóúñü¿¡]/gi) || []).length;
  const esWords = (
    sample.match(
      /\b(el|la|los|las|de|del|que|para|con|una|por|como|más|también|nuestro|nuestra|equipo|solución|industria|texto|principal|secundario)\b/gi
    ) || []
  ).length;
  const enWords = (
    sample.match(
      /\b(the|and|for|with|your|from|that|this|our|equipment|solution|industrial|maintenance|main|text|secondary)\b/gi
    ) || []
  ).length;
  const esScore = esChars * 3 + esWords;
  const enScore = enWords;
  return enScore > esScore ? "en" : "es";
}

export function resolveMonoLanguage(
  primary: string | null | undefined,
  secondaryEn: string | null | undefined
): { lang: ContentLang; text: string } | null {
  const es = primary?.trim() || "";
  const en = secondaryEn?.trim() || "";
  if (es && en) return null;
  if (en) return { lang: "en", text: en };
  if (es) return { lang: detectContentLanguage(es), text: es };
  return null;
}

const ES_LINE =
  /^(?:versi[oó]n\s+en\s+espa[nñ]ol(?:\s*\([^)]*\))?|espa[nñ]ol)\s*:?\s*$/i;
const EN_LINE =
  /^(?:versi[oó]n\s+en\s+ingl[eé]s(?:\s*\([^)]*\))?|english\s+version|ingl[eé]s|english)\s*:?\s*$/i;

const ES_INLINE = /^(?:espa[nñ]ol|es)\s*:\s*/i;
const EN_INLINE = /^(?:ingl[eé]s|english|en)\s*:\s*/i;

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

function cleanBlock(text: string): string {
  return text
    .replace(/^\s+|\s+$/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

function stripLeadingTema(prefix: string): string {
  return cleanBlock(prefix);
}

function looksInterleaved(text: string): boolean {
  const esHits = (text.match(/(?:^|\n)\s*(?:espa[nñ]ol|es)\s*:/gi) || []).length;
  const enHits = (text.match(/(?:^|\n)\s*(?:ingl[eé]s|english|en)\s*:/gi) || []).length;
  const slideHits = (text.match(/(?:^|\n)\s*(?:slide|SLIDE)\s*\d+/gi) || []).length;
  return slideHits >= 2 && esHits >= 2 && enHits >= 2;
}

function splitInterleaved(text: string): SplitBilingualResult | null {
  const lines = text.split("\n");
  const slides: {
    header: string;
    es: string[];
    en: string[];
    notes: string[];
  }[] = [];

  let current: (typeof slides)[number] | null = null;
  let lang: "es" | "en" | "note" | null = null;
  const preamble: string[] = [];

  function pushLine(bucket: "es" | "en" | "note", line: string) {
    if (!current) {
      if (bucket === "note") preamble.push(line);
      return;
    }
    if (bucket === "es") current.es.push(line);
    else if (bucket === "en") current.en.push(line);
    else current.notes.push(line);
  }

  for (const rawLine of lines) {
    const line = rawLine;
    const trimmed = line.trim();

    const slideMatch = trimmed.match(/^(?:slide|SLIDE)\s*(\d+)\b(.*)$/i);
    if (slideMatch) {
      current = {
        header: trimmed,
        es: [],
        en: [],
        notes: [],
      };
      slides.push(current);
      lang = null;
      continue;
    }

    if (!current) {
      preamble.push(line);
      continue;
    }

    if (ES_LINE.test(trimmed) || /^espa[nñ]ol\s*:?\s*$/i.test(trimmed)) {
      lang = "es";
      continue;
    }
    if (EN_LINE.test(trimmed) || /^(?:ingl[eé]s|english)\s*:?\s*$/i.test(trimmed)) {
      lang = "en";
      continue;
    }

    if (ES_INLINE.test(trimmed)) {
      lang = "es";
      const rest = trimmed.replace(ES_INLINE, "");
      if (rest) pushLine("es", rest);
      continue;
    }
    if (EN_INLINE.test(trimmed)) {
      lang = "en";
      const rest = trimmed.replace(EN_INLINE, "");
      if (rest) pushLine("en", rest);
      continue;
    }

    if (/^(?:imagen de referencia|referencia visual)\s*:/i.test(trimmed)) {
      lang = "note";
      pushLine("note", trimmed);
      continue;
    }

    if (lang === "es") pushLine("es", line);
    else if (lang === "en") pushLine("en", line);
    else if (lang === "note") pushLine("note", line);
    else pushLine("note", line);
  }

  if (slides.length === 0) return null;
  const hasPairs = slides.some((s) => s.es.join("").trim() && s.en.join("").trim());
  if (!hasPairs) return null;

  const prefix = stripLeadingTema(preamble.join("\n"));
  const esParts: string[] = [];
  const enParts: string[] = [];
  if (prefix) esParts.push(prefix);

  for (const slide of slides) {
    const esBody = cleanBlock([...slide.es, ...slide.notes].join("\n"));
    const enBody = cleanBlock(slide.en.join("\n"));
    if (esBody || slide.es.length || slide.notes.length) {
      esParts.push(cleanBlock(`${slide.header}\n${esBody}`));
    }
    if (enBody) {
      enParts.push(cleanBlock(`${slide.header}\n${enBody}`));
    }
  }

  const es = cleanBlock(esParts.join("\n\n"));
  const en = cleanBlock(enParts.join("\n\n"));
  if (!es || !en) return null;
  return { es, en, mode: "interleaved" };
}

function findLineIndex(lines: string[], re: RegExp): number {
  return lines.findIndex((line) => re.test(line.trim()));
}

function splitBlock(text: string): SplitBilingualResult | null {
  const lines = text.split("\n");
  const esIdx = findLineIndex(lines, ES_LINE);
  const enIdx = findLineIndex(lines, EN_LINE);

  if (enIdx === -1) return null;

  // Only English section (e.g. "Versión en inglés" with design notes before)
  if (esIdx === -1) {
    const prefix = cleanBlock(lines.slice(0, enIdx).join("\n"));
    const en = cleanBlock(lines.slice(enIdx + 1).join("\n"));
    if (!en) return null;
    return {
      es: prefix || en,
      en,
      mode: "block",
    };
  }

  if (esIdx > enIdx) {
    // Unusual order: English first then Spanish — still split
    const prefix = cleanBlock(lines.slice(0, enIdx).join("\n"));
    const en = cleanBlock(lines.slice(enIdx + 1, esIdx).join("\n"));
    const es = cleanBlock(lines.slice(esIdx + 1).join("\n"));
    if (!es || !en) return null;
    return {
      es: cleanBlock([prefix, es].filter(Boolean).join("\n\n")),
      en,
      mode: "block",
    };
  }

  const prefix = cleanBlock(lines.slice(0, esIdx).join("\n"));
  const es = cleanBlock(lines.slice(esIdx + 1, enIdx).join("\n"));
  const en = cleanBlock(lines.slice(enIdx + 1).join("\n"));
  if (!es || !en) return null;

  return {
    es: cleanBlock([prefix, es].filter(Boolean).join("\n\n")),
    en,
    mode: "block",
  };
}

export function looksBilingualCopy(copy: string | null | undefined): boolean {
  if (!copy?.trim()) return false;
  const text = normalizeNewlines(copy);
  return (
    text.split("\n").some((l) => ES_LINE.test(l.trim()) || EN_LINE.test(l.trim())) ||
    /(^|\n)\s*(?:espa[nñ]ol|es)\s*:/i.test(text) ||
    /(^|\n)\s*(?:ingl[eé]s|english|en)\s*:/i.test(text) ||
    /(^|\n)\s*english\s+version\s*:?\s*($|\n)/i.test(text)
  );
}

/**
 * Returns null when the text does not look bilingual or cannot be split safely.
 */
export function splitBilingualCopy(
  raw: string | null | undefined
): SplitBilingualResult | null {
  if (!raw?.trim()) return null;
  const text = normalizeNewlines(raw);
  if (!looksBilingualCopy(text)) return null;

  if (looksInterleaved(text)) {
    const interleaved = splitInterleaved(text);
    if (interleaved) return interleaved;
  }

  return splitBlock(text);
}
