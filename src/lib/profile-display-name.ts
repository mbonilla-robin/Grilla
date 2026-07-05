export function getProfileDisplayName(profile: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
} | null | undefined): string {
  if (!profile) return "Sin nombre";

  const fromParts = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return profile.full_name?.trim() || fromParts || "Sin nombre";
}

export function getProfileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
