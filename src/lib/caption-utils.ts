export const INSTAGRAM_CAPTION_LIMIT = 2200;

export function parseCaption(text: string) {
  const lines = text.split("\n");
  const body: string[] = [];
  const tags: string[] = [];
  let inTags = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inTags && trimmed.startsWith("#")) inTags = true;
    if (inTags && trimmed) tags.push(line);
    else if (!inTags) body.push(line);
  }

  return {
    body: body.join("\n").trim(),
    tags: tags.join("\n").trim(),
  };
}

export function combineCaption(body: string, tags: string) {
  const b = body.trim();
  const t = tags.trim();
  if (b && t) return `${b}\n\n${t}`;
  return b || t;
}

export function countCaptionChars(text: string) {
  return text.length;
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w\u00C0-\u024F]+/g);
  return matches ? [...new Set(matches)] : [];
}

export function captionCharStatus(count: number) {
  if (count > INSTAGRAM_CAPTION_LIMIT) return "over" as const;
  if (count > INSTAGRAM_CAPTION_LIMIT * 0.9) return "warn" as const;
  return "ok" as const;
}
