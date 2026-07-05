import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TeamMemberPreview } from "@/lib/home-data";

const MAX_VISIBLE = 5;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

interface TeamAvatarRowProps {
  members: TeamMemberPreview[];
  teamHref?: string;
  label?: string;
  className?: string;
}

export function TeamAvatarRow({
  members,
  teamHref,
  label = "Tu equipo",
  className,
}: TeamAvatarRowProps) {
  if (members.length === 0) return null;

  const visible = members.slice(0, MAX_VISIBLE);
  const overflow = members.length - MAX_VISIBLE;

  const avatars = (
    <div className="flex items-center">
      {visible.map((member, i) => (
        <div
          key={member.user_id}
          title={member.name}
          className={cn(
            "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-surface bg-neutral-100 text-[10px] font-medium text-foreground",
            i > 0 && "-ml-2"
          )}
          style={{ zIndex: visible.length - i }}
        >
          {member.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.avatar_url}
              alt={member.name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initials(member.name)
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="-ml-2 relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-surface bg-neutral-200 text-[10px] font-medium text-muted"
          style={{ zIndex: 0 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {teamHref ? (
        <Link href={teamHref} className="hover:opacity-80 transition-opacity">
          {avatars}
        </Link>
      ) : (
        avatars
      )}
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
