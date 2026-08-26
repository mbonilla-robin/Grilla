export interface MentionMember {
  user_id: string;
  name: string;
}

/** Resolve @Name tokens in comment body against org members (longest name first). */
export function parseMentionsFromBody(
  body: string,
  members: MentionMember[]
): string[] {
  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);
  const found = new Set<string>();

  for (const member of sorted) {
    const escaped = member.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`@${escaped}(?=\\s|$|[.,!?;:])`, "gi");
    if (pattern.test(body)) {
      found.add(member.user_id);
    }
  }

  return [...found];
}

export function mergeMentionIds(
  explicit: string[],
  parsed: string[],
  excludeUserId?: string
): string[] {
  const ids = new Set([...explicit, ...parsed]);
  if (excludeUserId) ids.delete(excludeUserId);
  return [...ids];
}

/**
 * Returns the in-progress @mention query before the cursor, or null when the
 * cursor is not inside an active mention (e.g. after a completed @Name).
 */
export function getActiveMentionQuery(
  beforeCursor: string,
  members: MentionMember[]
): string | null {
  const atIndex = beforeCursor.lastIndexOf("@");
  if (atIndex === -1) return null;

  const fragment = beforeCursor.slice(atIndex + 1);
  if (!fragment) return "";

  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);

  for (const member of sorted) {
    const nameLower = member.name.toLowerCase();
    const fragLower = fragment.toLowerCase();

    if (!fragLower.startsWith(nameLower)) continue;

    const after = fragment.slice(member.name.length);
    if (after.length === 0) return fragment;
    if (/^[\s.,!?;:]/.test(after)) return null;
    return fragment;
  }

  const firstSpace = fragment.indexOf(" ");
  if (firstSpace !== -1) {
    const firstToken = fragment.slice(0, firstSpace);
    const hasExactMember = members.some(
      (member) => member.name.toLowerCase() === firstToken.toLowerCase()
    );
    if (hasExactMember) return null;
  }

  return fragment;
}

/** Completed @mention range if Backspace at `cursor` should remove the whole token. */
export function findMentionRangeForBackspace(
  body: string,
  cursor: number,
  members: MentionMember[]
): { start: number; end: number; memberId: string } | null {
  if (cursor <= 0) return null;

  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);

  for (let i = 0; i < body.length; i++) {
    if (body[i] !== "@") continue;

    for (const member of sorted) {
      const token = `@${member.name}`;
      if (body.slice(i, i + token.length).toLowerCase() !== token.toLowerCase()) {
        continue;
      }

      const tokenEnd = i + token.length;
      const next = body[tokenEnd];
      if (next !== undefined && !/[\s.,!?;:]/.test(next)) continue;

      if (cursor > i && cursor <= tokenEnd) {
        return { start: i, end: tokenEnd, memberId: member.user_id };
      }

      i = tokenEnd - 1;
      break;
    }
  }

  return null;
}

/** Completed @mention range if Delete at `cursor` should remove the whole token. */
export function findMentionRangeForDelete(
  body: string,
  cursor: number,
  members: MentionMember[]
): { start: number; end: number; memberId: string } | null {
  if (cursor >= body.length) return null;

  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);

  for (let i = 0; i < body.length; i++) {
    if (body[i] !== "@") continue;

    for (const member of sorted) {
      const token = `@${member.name}`;
      if (body.slice(i, i + token.length).toLowerCase() !== token.toLowerCase()) {
        continue;
      }

      const tokenEnd = i + token.length;
      const next = body[tokenEnd];
      if (next !== undefined && !/[\s.,!?;:]/.test(next)) continue;

      if (cursor >= i && cursor < tokenEnd) {
        return { start: i, end: tokenEnd, memberId: member.user_id };
      }

      i = tokenEnd - 1;
      break;
    }
  }

  return null;
}

/** Split comment body using known member names (longest match first). */
export function splitBodyWithKnownMentions(
  body: string,
  members: MentionMember[]
): { type: "text" | "mention"; value: string }[] {
  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);
  const segments: { type: "text" | "mention"; value: string }[] = [];
  let i = 0;

  while (i < body.length) {
    if (body[i] !== "@") {
      const start = i;
      while (i < body.length && body[i] !== "@") i += 1;
      segments.push({ type: "text", value: body.slice(start, i) });
      continue;
    }

    let matched = false;
    for (const member of sorted) {
      const token = `@${member.name}`;
      if (
        body.slice(i, i + token.length).toLowerCase() === token.toLowerCase()
      ) {
        const next = body[i + token.length];
        if (next === undefined || /[\s.,!?;:]/.test(next)) {
          segments.push({ type: "mention", value: member.name });
          i += token.length;
          matched = true;
          break;
        }
      }
    }

    if (matched) continue;

    const start = i;
    i += 1;
    while (i < body.length && body[i] !== "@") i += 1;
    segments.push({ type: "text", value: body.slice(start, i) });
  }

  return segments;
}

/** Split comment body into text and @mention segments for rendering. */
export function splitMentionSegments(body: string): { type: "text" | "mention"; value: string }[] {
  const parts = body.split(/(@[^\s@]+(?:\s+[^\s@]+)*)/g).filter(Boolean);
  return parts.map((part) =>
    part.startsWith("@")
      ? { type: "mention" as const, value: part.slice(1) }
      : { type: "text" as const, value: part }
  );
}
