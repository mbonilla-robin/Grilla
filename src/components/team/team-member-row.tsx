import type { TeamMemberPreview } from "@/lib/home-data";
import { RoleBadge, memberInitials } from "./role-badge";
import { RemoveMemberButton } from "./remove-member-button";

interface TeamMemberRowProps {
  orgId: string;
  member: TeamMemberPreview;
  isSelf: boolean;
  canRemove: boolean;
  onRemoved: (userId: string) => void;
}

export function TeamMemberRow({
  orgId,
  member,
  isSelf,
  canRemove,
  onRemoved,
}: TeamMemberRowProps) {
  const displayRoles = [
    member.role,
    ...member.extra_roles.filter((r) => r !== member.role),
  ];

  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      {member.avatar_url ? (
        <img
          src={member.avatar_url}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full object-cover border border-border"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-neutral-100 text-xs font-medium text-muted">
          {memberInitials(member.name)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          {member.name}
          {isSelf && <span className="font-normal text-muted"> (tú)</span>}
        </p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {displayRoles.map((r) => (
            <RoleBadge key={r} role={r} />
          ))}
        </div>
      </div>

      {canRemove && (
        <RemoveMemberButton
          orgId={orgId}
          member={member}
          onRemoved={onRemoved}
        />
      )}
    </div>
  );
}
