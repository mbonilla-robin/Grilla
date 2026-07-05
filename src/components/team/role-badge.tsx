import { Shield, PenLine, Megaphone, Palette, UserRound } from "lucide-react";
import { ROLE_LABELS, type MemberRole } from "@/lib/types";

const ROLE_ICON: Record<MemberRole, typeof Shield> = {
  admin: Shield,
  creator: PenLine,
  community_manager: Megaphone,
  designer: Palette,
  client: UserRound,
};

const ROLE_STYLES: Record<MemberRole, string> = {
  admin: "bg-neutral-900 text-white border-neutral-900",
  creator: "bg-neutral-100 text-foreground border-border",
  community_manager: "bg-violet-50 text-violet-700 border-violet-200",
  designer: "bg-blue-50 text-blue-700 border-blue-200",
  client: "bg-amber-50 text-amber-800 border-amber-200",
};

export function RoleIcon({
  role,
  size = 12,
  className,
}: {
  role: MemberRole;
  size?: number;
  className?: string;
}) {
  const Icon = ROLE_ICON[role];
  return <Icon size={size} strokeWidth={1.75} className={className} aria-hidden />;
}

export function RoleBadge({ role }: { role: MemberRole }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${ROLE_STYLES[role]}`}
    >
      <RoleIcon role={role} size={11} />
      {ROLE_LABELS[role]}
    </span>
  );
}

export function memberInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
