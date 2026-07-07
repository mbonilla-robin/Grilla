import type { Organization } from "@/lib/types";

export interface OrgIdentifierConfig {
  label: string | null;
  allowPhoto: boolean;
  placeholder: string | null;
}

export function getOrgIdentifierConfig(
  org: Pick<
    Organization,
    "identifier_label" | "identifier_allow_photo" | "identifier_placeholder"
  >
): OrgIdentifierConfig {
  const label = org.identifier_label?.trim() || null;
  return {
    label,
    allowPhoto: Boolean(label && org.identifier_allow_photo),
    placeholder: org.identifier_placeholder?.trim() || null,
  };
}

export function hasOrgIdentifier(
  org: Pick<Organization, "identifier_label">
): boolean {
  return Boolean(org.identifier_label?.trim());
}
