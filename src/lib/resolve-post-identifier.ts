import type { OrgIdentifier, Post } from "@/lib/types";

export interface ResolvedPostIdentifier {
  value: string | null;
  photoUrl: string | null;
  catalogId: string | null;
}

export function normalizeIdentifierValue(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function resolvePostIdentifierReference(
  post: Pick<Post, "plate" | "org_identifier_id" | "identifier_photo_url">,
  catalog: OrgIdentifier[]
): ResolvedPostIdentifier {
  if (post.identifier_photo_url) {
    return {
      value: post.plate,
      photoUrl: post.identifier_photo_url,
      catalogId: post.org_identifier_id,
    };
  }

  if (post.org_identifier_id) {
    const byId = catalog.find((item) => item.id === post.org_identifier_id);
    if (byId) {
      return {
        value: byId.value,
        photoUrl: byId.photo_url,
        catalogId: byId.id,
      };
    }
  }

  if (!post.plate?.trim() || catalog.length === 0) {
    return { value: post.plate, photoUrl: null, catalogId: null };
  }

  const plateNorm = normalizeIdentifierValue(post.plate);

  const exact = catalog.find(
    (item) =>
      item.value === post.plate ||
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

  return { value: post.plate, photoUrl: null, catalogId: null };
}
