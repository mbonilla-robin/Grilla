export type InlineSegment =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string };

export type EmphasisHint = { kind: "bold" | "italic"; phrase: string };

const EMPHASIS_PATTERNS: Array<{ kind: EmphasisHint["kind"]; regex: RegExp }> = [
  { kind: "bold", regex: /SemiBold\s+on\s+"([^"]+)"/gi },
  { kind: "bold", regex: /(?:apply\s+)?SemiBold\s+to\s+"([^"]+)"/gi },
  { kind: "italic", regex: /(?:Medium\s+)?Italic\s+on\s+"([^"]+)"/gi },
  { kind: "italic", regex: /(?:apply\s+)?Italic\s+to\s+"([^"]+)"/gi },
];

/** Reads emphasis instructions from typographic parentheses (Canva-friendly). */
export function parseEmphasisHints(details?: string): EmphasisHint[] {
  if (!details) return [];
  const hints: EmphasisHint[] = [];
  const seen = new Set<string>();

  for (const { kind, regex } of EMPHASIS_PATTERNS) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(details)) !== null) {
      const phrase = match[1].trim();
      const key = `${kind}:${phrase.toLowerCase()}`;
      if (phrase && !seen.has(key)) {
        seen.add(key);
        hints.push({ kind, phrase });
      }
    }
  }

  return hints;
}

/** Converts legacy **bold** / *italic* markers into plain copy + typographic hints. */
export function convertMarkdownEmphasis(
  content: string,
  details?: string
): { content: string; details?: string } {
  const hints: string[] = [];
  let plain = content;

  plain = plain.replace(/\*\*([^*]+)\*\*/g, (_, phrase: string) => {
    hints.push(`SemiBold on "${phrase.trim()}"`);
    return phrase;
  });

  plain = plain.replace(/\*([^*]+)\*/g, (_, phrase: string) => {
    hints.push(`Italic on "${phrase.trim()}"`);
    return phrase;
  });

  if (hints.length === 0) return { content: plain, details };

  const emphasisNote = hints.join("; ");
  const newDetails = details ? `${details}; ${emphasisNote}` : emphasisNote;
  return { content: plain, details: newDetails };
}

export function applyEmphasisHints(text: string, hints: EmphasisHint[]): InlineSegment[] {
  if (!hints.length) return [{ kind: "text", value: text }];

  type Mark = { start: number; end: number; kind: "bold" | "italic" };
  const marks: Mark[] = [];

  for (const hint of hints) {
    const idx = text.indexOf(hint.phrase);
    if (idx !== -1) {
      marks.push({ start: idx, end: idx + hint.phrase.length, kind: hint.kind });
    }
  }

  if (!marks.length) return [{ kind: "text", value: text }];

  marks.sort((a, b) => a.start - b.start || b.end - a.end);

  const segments: InlineSegment[] = [];
  let cursor = 0;

  for (const mark of marks) {
    if (mark.start < cursor) continue;
    if (mark.start > cursor) {
      segments.push({ kind: "text", value: text.slice(cursor, mark.start) });
    }
    segments.push({ kind: mark.kind, value: text.slice(mark.start, mark.end) });
    cursor = mark.end;
  }

  if (cursor < text.length) {
    segments.push({ kind: "text", value: text.slice(cursor) });
  }

  return segments.length > 0 ? segments : [{ kind: "text", value: text }];
}

/** @deprecated Legacy markdown parser — kept for old briefs without typographic hints. */
export function parseInlineEmphasis(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "text", value: text.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith("**")) {
      segments.push({ kind: "bold", value: token.slice(2, -2) });
    } else {
      segments.push({ kind: "italic", value: token.slice(1, -1) });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ kind: "text", value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ kind: "text", value: text }];
}

export function inlineEmphasisToHtml(text: string, details?: string): string {
  const hints = parseEmphasisHints(details);
  const segments =
    hints.length > 0 ? applyEmphasisHints(text, hints) : parseInlineEmphasis(text);

  return segments
    .map((segment) => {
      switch (segment.kind) {
        case "bold":
          return `<strong>${segment.value}</strong>`;
        case "italic":
          return `<em>${segment.value}</em>`;
        default:
          return segment.value;
      }
    })
    .join("");
}

const MAX_SUBTITLE_WORDS = 12;

export function isShortSubtitle(text: string) {
  const trimmed = text.trim();
  return (
    trimmed.length <= 80 &&
    trimmed.split(/\s+/).length <= MAX_SUBTITLE_WORDS &&
    !trimmed.includes("\n")
  );
}
