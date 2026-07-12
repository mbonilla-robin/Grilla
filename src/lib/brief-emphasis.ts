export type InlineSegment =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string };

/** Parses **bold** and *italic* markers in brief copy text. */
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

export function inlineEmphasisToHtml(text: string): string {
  return parseInlineEmphasis(text)
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
