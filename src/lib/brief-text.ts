import type { BrandTextCasing } from "@/lib/brand-text-casing";
import { applyTextCasing } from "@/lib/brand-text-casing";

export type TextInstructionBlock =
  | { kind: "notice"; content: string }
  | { kind: "labeled"; label: string; content: string; details?: string }
  | { kind: "bullets"; items: { text: string; details?: string }[] }
  | { kind: "paragraph"; content: string; details?: string };

function parseContentWithDetails(raw: string): { content: string; details?: string } {
  const withDetails = raw.match(/^(.+?)\s*(?:\.?\s*)\(([^)]+)\)\.?\s*$/);
  if (withDetails) {
    return {
      content: withDetails[1].replace(/\.\s*$/, "").trim(),
      details: withDetails[2].trim(),
    };
  }
  return { content: raw.replace(/\.\s*$/, "").trim() };
}

function parseLabeledLine(line: string): Omit<Extract<TextInstructionBlock, { kind: "labeled" }>, "kind"> | null {
  const withDetails = line.match(/^([^:]+):\s*(.+?)\s*(?:\.?\s*)\(([^)]+)\)\.?\s*$/);
  if (withDetails) {
    return {
      label: withDetails[1].trim(),
      content: withDetails[2].replace(/\.\s*$/, "").trim(),
      details: withDetails[3].trim(),
    };
  }

  const simple = line.match(/^([^:]+):\s*(.+)$/);
  if (simple) {
    return {
      label: simple[1].trim(),
      content: simple[2].trim(),
    };
  }

  return null;
}

function isBulletLine(line: string) {
  return /^[-•*]\s/.test(line);
}

function isLabeledLine(line: string) {
  return /^[^:]+:\s*.+/.test(line) && !isBulletLine(line);
}

export function parseTextInstructionBlocks(text: string): TextInstructionBlock[] | null {
  const blocks: TextInstructionBlock[] = [];
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    if (/^no brand kit configured\.?$/i.test(line) || /^sin brand kit configurado\.?$/i.test(line)) {
      blocks.push({ kind: "notice", content: "No Brand Kit configured" });
      i++;
      continue;
    }

    if (isBulletLine(line)) {
      const items: { text: string; details?: string }[] = [];
      while (i < lines.length) {
        const bulletLine = lines[i].trim();
        if (!bulletLine || !isBulletLine(bulletLine)) break;
        const parsed = parseContentWithDetails(bulletLine.replace(/^[-•*]\s+/, ""));
        items.push({ text: parsed.content, details: parsed.details });
        i++;
      }
      blocks.push({ kind: "bullets", items });
      continue;
    }

    const paragraphLabel = line.match(/^(?:Párrafo|Paragraph):\s*(.+)$/i);
    if (paragraphLabel) {
      const parsed = parseContentWithDetails(paragraphLabel[1]);
      blocks.push({ kind: "paragraph", ...parsed });
      i++;
      continue;
    }

    const labeled = parseLabeledLine(line);
    if (labeled) {
      blocks.push({ kind: "labeled", ...labeled });
      i++;
      continue;
    }

    const paragraphLines = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next || isBulletLine(next) || isLabeledLine(next)) break;
      paragraphLines.push(next);
      i++;
    }
    blocks.push({ kind: "paragraph", content: paragraphLines.join(" ") });
  }

  return blocks.length > 0 ? blocks : null;
}

function styleSuffix(
  configured: boolean,
  role: "heading" | "body",
  fonts: { heading: string; body: string },
  color: string
) {
  if (!configured) return "";
  const font = role === "heading" ? `${fonts.heading} Extra Bold` : `${fonts.body} Regular/Medium`;
  return ` (${font}, ${color})`;
}

const MAX_TITLE_CHARS = 42;
const MAX_TITLE_WORDS = 7;
const IDEAL_TITLE_WORDS = 5;

function splitHeadlineAndBody(text: string): { headline: string; remainder?: string } {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_TITLE_CHARS) return { headline: trimmed };

  const sentenceSplit = trimmed.match(/^(.{1,80}?[.!?])\s+([\s\S]+)$/);
  if (sentenceSplit && sentenceSplit[1].length <= MAX_TITLE_CHARS + 15) {
    return {
      headline: sentenceSplit[1].replace(/[.!?]+$/, "").trim(),
      remainder: sentenceSplit[2].trim(),
    };
  }

  const words = trimmed.split(/\s+/);
  if (words.length > MAX_TITLE_WORDS) {
    const headline = words.slice(0, IDEAL_TITLE_WORDS).join(" ");
    const remainder = words.slice(IDEAL_TITLE_WORDS).join(" ");
    return { headline: headline.replace(/[.,;:!?]+$/, ""), remainder };
  }

  const cut = trimmed.slice(0, MAX_TITLE_CHARS);
  const lastSpace = cut.lastIndexOf(" ");
  return {
    headline: (lastSpace > 20 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:!?]+$/, ""),
    remainder: trimmed.slice(lastSpace > 20 ? lastSpace + 1 : MAX_TITLE_CHARS).trim() || undefined,
  };
}

function isShortHeadline(text: string) {
  const trimmed = text.trim();
  return trimmed.length <= MAX_TITLE_CHARS && trimmed.split(/\s+/).length <= MAX_TITLE_WORDS;
}

/** Infiere instrucciones de texto respetando la estructura del copy del slide. */
export function formatSlideCopyAsTextInstructions(
  content: string,
  configured: boolean,
  fonts: { heading: string; body: string },
  colors: { primary: string; accent: string },
  textCasing?: BrandTextCasing
): string {
  const caseText = (text: string, kind: keyof BrandTextCasing) =>
    textCasing ? applyTextCasing(text, textCasing[kind]) : text;
  const trimmed = content.trim();
  if (!trimmed) {
    return configured
      ? `Paragraph: [content]${styleSuffix(configured, "body", fonts, colors.accent)}.`
      : "No Brand Kit configured.\nParagraph: [content].";
  }

  const prefix = configured ? "" : "No Brand Kit configured.\n";
  const titleMatch = trimmed.match(/(?:^|\n)(?:Título|Title)[:\s]*([^\n]+)/i);
  const subtitleMatch = trimmed.match(/(?:^|\n)(?:Subtítulo|Subtitle)[:\s]*([^\n]+)/i);
  const bodyMatch = trimmed.match(/(?:^|\n)(?:Cuerpo|Body)[:\s]*([\s\S]+)/i);

  if (titleMatch || subtitleMatch) {
    const parts: string[] = [];
    if (!configured) parts.push("No Brand Kit configured.");
    if (titleMatch) {
      const rawTitle = titleMatch[1].trim();
      if (isShortHeadline(rawTitle)) {
        parts.push(
          `Title: ${caseText(rawTitle, "title")}.${styleSuffix(configured, "heading", fonts, colors.primary)}.`
        );
      } else {
        const { headline, remainder } = splitHeadlineAndBody(rawTitle);
        parts.push(
          `Title: ${caseText(headline, "title")}.${styleSuffix(configured, "heading", fonts, colors.primary)}.`
        );
        if (remainder) {
          parts.push(
            `Paragraph: ${caseText(remainder, "body")}.${styleSuffix(configured, "body", fonts, colors.accent)}.`
          );
        }
      }
    }
    if (subtitleMatch) {
      parts.push(
        `Subtitle: ${caseText(subtitleMatch[1].trim(), "subtitle")}.${styleSuffix(configured, "body", fonts, colors.accent)}.`
      );
    }
    if (bodyMatch) {
      parts.push(
        `Body: ${caseText(bodyMatch[1].trim(), "body")}.${styleSuffix(configured, "body", fonts, colors.accent)}.`
      );
    }
    return parts.join("\n");
  }

  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  const bulletLines = lines.filter((l) => /^[-•*]\s/.test(l));

  if (bulletLines.length > 0) {
    return (
      prefix +
      bulletLines
        .map((line) => {
          const text = line.replace(/^[-•*]\s+/, "");
          return `- ${caseText(text, "bullet")}${styleSuffix(configured, "body", fonts, colors.accent)}.`;
        })
        .join("\n")
    );
  }

  const dotItems = lines
    .flatMap((line) => (line.includes(" · ") ? line.split(/\s·\s/) : [line]))
    .map((s) => s.trim())
    .filter(Boolean);

  if (dotItems.length >= 3 && lines.length <= 2) {
    return (
      prefix +
      dotItems
        .map((item) => `- ${caseText(item, "bullet")}${styleSuffix(configured, "body", fonts, colors.accent)}.`)
        .join("\n")
    );
  }

  if (lines.length === 1) {
    const line = lines[0];
    if (line.length < 70 && line === line.toUpperCase()) {
      return (
        prefix +
        `Title: ${caseText(line.replace(/\.\s*$/, ""), "title")}${styleSuffix(configured, "heading", fonts, colors.primary)}.`
      );
    }
    return (
      prefix +
      `Paragraph: ${caseText(line, "body")}${styleSuffix(configured, "body", fonts, colors.accent)}.`
    );
  }

  if (lines.length === 2) {
    const [first, second] = lines;
    if (second.includes(" · ")) {
      const items = second.split(/\s·\s/).map((s) => s.trim()).filter(Boolean);
      if (items.length >= 2) {
        const parts: string[] = [];
        if (!configured) parts.push("No Brand Kit configured.");
        parts.push(
          `Title: ${caseText(first.replace(/\.\s*$/, ""), "title")}${styleSuffix(configured, "heading", fonts, colors.primary)}.`
        );
        parts.push(
          ...items.map(
            (item) => `- ${caseText(item, "bullet")}${styleSuffix(configured, "body", fonts, colors.accent)}.`
          )
        );
        return parts.join("\n");
      }
    }
    const headlineLike =
      isShortHeadline(first) &&
      (first === first.toUpperCase() || /^[A-Z0-9][^.!?]*[.!?]?$/.test(first));
    if (headlineLike) {
      return (
        prefix +
        [
          `Title: ${caseText(first.replace(/\.\s*$/, ""), "title")}${styleSuffix(configured, "heading", fonts, colors.primary)}.`,
          `Subtitle: ${caseText(second.replace(/\.\s*$/, ""), "subtitle")}${styleSuffix(configured, "body", fonts, colors.accent)}.`,
        ].join("\n")
      );
    }
  }

  if (lines.length >= 2) {
    const [headline, ...rest] = lines;
    const parts: string[] = [];
    if (!configured) parts.push("No Brand Kit configured.");
    let restParts = rest;
    if (isShortHeadline(headline)) {
      parts.push(
        `Title: ${caseText(headline.replace(/\.\s*$/, ""), "title")}${styleSuffix(configured, "heading", fonts, colors.primary)}.`
      );
    } else {
      const { headline: short, remainder } = splitHeadlineAndBody(headline);
      parts.push(
        `Title: ${caseText(short.replace(/\.\s*$/, ""), "title")}${styleSuffix(configured, "heading", fonts, colors.primary)}.`
      );
      if (remainder) restParts = [remainder, ...rest];
    }
    const restText = restParts.join(" ");
    if (restText.includes(" · ")) {
      const items = restText.split(/\s·\s/).map((s) => s.trim()).filter(Boolean);
      if (items.length >= 2) {
        parts.push(
          ...items.map(
            (item) => `- ${caseText(item, "bullet")}${styleSuffix(configured, "body", fonts, colors.accent)}.`
          )
        );
        return parts.join("\n");
      }
    }
    parts.push(
      `Paragraph: ${caseText(restText, "body")}${styleSuffix(configured, "body", fonts, colors.accent)}.`
    );
    return parts.join("\n");
  }

  return (
    prefix +
    `Paragraph: ${caseText(trimmed.replace(/\n+/g, " "), "body")}${styleSuffix(configured, "body", fonts, colors.accent)}.`
  );
}

export function textInstructionsToHtml(text: string): string {
  const blocks = parseTextInstructionBlocks(text);
  if (!blocks) {
    return text.replace(/\n/g, "<br/>");
  }

  return blocks
    .map((block) => {
      switch (block.kind) {
        case "notice":
          return `<p><em>${block.content}</em></p>`;
        case "labeled":
          return `<p><strong>${block.label}:</strong> ${block.content}${block.details ? `<br/><span style="color:#737373;font-size:12px">${block.details}</span>` : ""}</p>`;
        case "bullets":
          return `<ul style="margin:4px 0;padding-left:20px">${block.items
            .map(
              (item) =>
                `<li>${item.text}${item.details ? ` <span style="color:#737373;font-size:12px">(${item.details})</span>` : ""}</li>`
            )
            .join("")}</ul>`;
        case "paragraph":
          return `<p>${block.content}${block.details ? `<br/><span style="color:#737373;font-size:12px">${block.details}</span>` : ""}</p>`;
      }
    })
    .join("");
}
