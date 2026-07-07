import type { OrgIdentifier, Post } from "@/lib/types";

export interface ResolvedPostIdentifier {
  value: string | null;
  photoUrl: string | null;
  catalogId: string | null;
}

export function normalizeIdentifierValue(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

/** Split compound plate fields like "A72DR7V / A75DR7V" or "A07AB3P (1971) / A11CH7M". */
export function parseIdentifierValues(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  return trimmed
    .split(/\s*[/,;]\s*/)
    .map((segment) => segment.replace(/\s*\([^)]*\)\s*/g, "").trim())
    .filter(Boolean);
}

function resolveIdentifierInCatalog(
  value: string,
  catalog: OrgIdentifier[]
): ResolvedPostIdentifier {
  if (!value.trim() || catalog.length === 0) {
    return { value, photoUrl: null, catalogId: null };
  }

  const plateNorm = normalizeIdentifierValue(value);

  const exact = catalog.find(
    (item) =>
      item.value === value ||
      normalizeIdentifierValue(item.value) === plateNorm
  );
  if (exact) {
    return {
      value: exact.value,
      photoUrl: exact.photo_url,
      catalogId: exact.id,
    };
  }

  for (const item of catalog) {
    const itemNorm = normalizeIdentifierValue(item.value);
    if (
      itemNorm.length >= 4 &&
      (plateNorm.includes(itemNorm) || itemNorm.includes(plateNorm))
    ) {
      return {
        value: item.value,
        photoUrl: item.photo_url,
        catalogId: item.id,
      };
    }
  }

  return { value, photoUrl: null, catalogId: null };
}

export function resolvePostIdentifierReferences(
  post: Pick<Post, "plate" | "org_identifier_id" | "identifier_photo_url">,
  catalog: OrgIdentifier[]
): ResolvedPostIdentifier[] {
  if (post.identifier_photo_url) {
    return [
      {
        value: post.plate,
        photoUrl: post.identifier_photo_url,
        catalogId: post.org_identifier_id,
      },
    ];
  }

  if (post.org_identifier_id) {
    const byId = catalog.find((item) => item.id === post.org_identifier_id);
    if (byId) {
      return [
        {
          value: byId.value,
          photoUrl: byId.photo_url,
          catalogId: byId.id,
        },
      ];
    }
  }

  if (!post.plate?.trim()) return [];

  const values = parseIdentifierValues(post.plate);
  if (values.length === 0) return [];

  return values.map((value) => resolveIdentifierInCatalog(value, catalog));
}

/** First resolved identifier with a photo, or the first entry overall. */
export function resolvePostIdentifierReference(
  post: Pick<Post, "plate" | "org_identifier_id" | "identifier_photo_url">,
  catalog: OrgIdentifier[]
): ResolvedPostIdentifier {
  const refs = resolvePostIdentifierReferences(post, catalog);
  if (refs.length === 0) {
    return { value: post.plate, photoUrl: null, catalogId: null };
  }

  return refs.find((ref) => ref.photoUrl) ?? refs[0];
}
