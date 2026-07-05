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

/** Split comment body into text and @mention segments for rendering. */
export function splitMentionSegments(body: string): { type: "text" | "mention"; value: string }[] {
  const parts = body.split(/(@[^\s@]+(?:\s+[^\s@]+)*)/g).filter(Boolean);
  return parts.map((part) =>
    part.startsWith("@")
      ? { type: "mention" as const, value: part.slice(1) }
      : { type: "text" as const, value: part }
  );
}
