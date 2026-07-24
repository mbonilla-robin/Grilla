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

export function formatIdentifierValues(values: string[]): string {
  return values
    .map((v) => v.trim())
    .filter(Boolean)
    .join(" / ");
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

/**
 * Resolve all identifiers for a post.
 * Multi-value `plate` ("A / B") expands to multiple refs; single FK / photo
 * override still works for one-identifier posts.
 */
export function resolvePostIdentifierReferences(
  post: Pick<Post, "plate" | "org_identifier_id" | "identifier_photo_url">,
  catalog: OrgIdentifier[]
): ResolvedPostIdentifier[] {
  const plateValues = post.plate?.trim()
    ? parseIdentifierValues(post.plate)
    : [];

  if (plateValues.length > 1) {
    return plateValues.map((value) =>
      resolveIdentifierInCatalog(value, catalog)
    );
  }

  if (plateValues.length === 1) {
    if (post.org_identifier_id) {
      const byId = catalog.find((item) => item.id === post.org_identifier_id);
      if (byId) {
        return [
          {
            value: byId.value,
            photoUrl: post.identifier_photo_url || byId.photo_url,
            catalogId: byId.id,
          },
        ];
      }
    }

    const resolved = resolveIdentifierInCatalog(plateValues[0], catalog);
    if (post.identifier_photo_url) {
      return [
        {
          ...resolved,
          photoUrl: post.identifier_photo_url,
          catalogId: post.org_identifier_id ?? resolved.catalogId,
        },
      ];
    }
    return [resolved];
  }

  if (post.org_identifier_id) {
    const byId = catalog.find((item) => item.id === post.org_identifier_id);
    if (byId) {
      return [
        {
          value: byId.value,
          photoUrl: post.identifier_photo_url || byId.photo_url,
          catalogId: byId.id,
        },
      ];
    }
  }

  if (post.identifier_photo_url) {
    return [
      {
        value: post.plate,
        photoUrl: post.identifier_photo_url,
        catalogId: post.org_identifier_id,
      },
    ];
  }

  return [];
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

/** Catalog IDs currently selected for a post (from plate + FK). */
export function selectedIdentifierIdsFromPost(
  post: Pick<Post, "plate" | "org_identifier_id" | "identifier_photo_url">,
  catalog: OrgIdentifier[]
): string[] {
  const refs = resolvePostIdentifierReferences(post, catalog);
  const ids = refs
    .map((ref) => ref.catalogId)
    .filter((id): id is string => Boolean(id));

  if (ids.length > 0) return [...new Set(ids)];
  if (post.org_identifier_id) return [post.org_identifier_id];
  return [];
}

/** Build plate / primary FK / photo fields from a multi-select of catalog IDs. */
export function selectionFromIdentifierIds(
  ids: string[],
  catalog: OrgIdentifier[]
): {
  id: string | null;
  value: string;
  photoUrl: string | null;
} {
  const selected = ids
    .map((id) => catalog.find((item) => item.id === id))
    .filter((item): item is OrgIdentifier => Boolean(item));

  if (selected.length === 0) {
    return { id: null, value: "", photoUrl: null };
  }

  return {
    id: selected[0].id,
    value: formatIdentifierValues(selected.map((item) => item.value)),
    photoUrl: selected.length === 1 ? selected[0].photo_url : null,
  };
}
