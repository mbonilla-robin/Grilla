"use client";

import type { PostAssignmentOptions } from "@/lib/team-assignments";

function memberName(
  options: PostAssignmentOptions,
  userId: string,
  role: "creators" | "designers" | "communityManagers"
) {
  return options[role].find((m) => m.user_id === userId)?.name || "Sin nombre";
}

function RoleAssignmentField({
  label,
  pick,
  value,
  onChange,
  options,
  autoName,
}: {
  label: string;
  pick: boolean;
  value: string;
  onChange: (value: string) => void;
  options: { user_id: string; name: string }[];
  autoName?: string;
}) {
  if (!pick && autoName) {
    return (
      <p className="text-xs text-muted">
        <span className="text-foreground font-medium">{label}:</span> {autoName}{" "}
        <span className="text-muted">(automático)</span>
      </p>
    );
  }

  if (pick) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm text-muted">{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        >
          <option value="">Elegir {label.toLowerCase()}</option>
          {options.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return null;
}

interface PostAssignmentFieldsProps {
  assignmentOptions: PostAssignmentOptions;
  creatorId: string;
  designerId: string;
  communityManagerId: string;
  onCreatorChange: (id: string) => void;
  onDesignerChange: (id: string) => void;
  onCommunityManagerChange: (id: string) => void;
}

export function PostAssignmentFields({
  assignmentOptions,
  creatorId,
  designerId,
  communityManagerId,
  onCreatorChange,
  onDesignerChange,
  onCommunityManagerChange,
}: PostAssignmentFieldsProps) {
  const hasTeamSection =
    assignmentOptions.creators.length > 0 ||
    assignmentOptions.designers.length > 0 ||
    assignmentOptions.communityManagers.length > 0;

  if (!hasTeamSection) return null;

  return (
    <div className="space-y-3 rounded-md border border-border bg-background/50 p-3">
      <p className="text-xs font-medium">Equipo</p>

      {assignmentOptions.creators.length > 0 && (
        <RoleAssignmentField
          label="Creadora de contenido"
          pick={assignmentOptions.pickCreator}
          value={creatorId}
          onChange={onCreatorChange}
          options={assignmentOptions.creators}
          autoName={
            assignmentOptions.defaultCreatorId
              ? memberName(
                  assignmentOptions,
                  assignmentOptions.defaultCreatorId,
                  "creators"
                )
              : undefined
          }
        />
      )}

      {assignmentOptions.designers.length > 0 && (
        <RoleAssignmentField
          label="Diseñador"
          pick={assignmentOptions.pickDesigner}
          value={designerId}
          onChange={onDesignerChange}
          options={assignmentOptions.designers}
          autoName={
            assignmentOptions.defaultDesignerId
              ? memberName(
                  assignmentOptions,
                  assignmentOptions.defaultDesignerId,
                  "designers"
                )
              : undefined
          }
        />
      )}

      {assignmentOptions.communityManagers.length > 0 && (
        <RoleAssignmentField
          label="Community Manager"
          pick={assignmentOptions.pickCommunityManager}
          value={communityManagerId}
          onChange={onCommunityManagerChange}
          options={assignmentOptions.communityManagers}
          autoName={
            assignmentOptions.defaultCommunityManagerId
              ? memberName(
                  assignmentOptions,
                  assignmentOptions.defaultCommunityManagerId,
                  "communityManagers"
                )
              : undefined
          }
        />
      )}
    </div>
  );
}
