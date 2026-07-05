"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addMemberByEmail } from "@/lib/actions";
import { TeamMemberRow } from "./team-member-row";
import { RoleBadge } from "./role-badge";
import { ROLE_LABELS, type MemberRole } from "@/lib/types";
import type { TeamMemberPreview } from "@/lib/home-data";

interface TeamPanelProps {
  orgId: string;
  currentUserId: string;
  role: MemberRole;
  teamMembers: TeamMemberPreview[];
}

const addableRoles: MemberRole[] = [
  "community_manager",
  "designer",
  "creator",
  "client",
  "admin",
];

export function TeamPanel({
  orgId,
  currentUserId,
  role,
  teamMembers: initialMembers,
}: TeamPanelProps) {
  const [teamMembers, setTeamMembers] = useState(initialMembers);
  const [showAddForm, setShowAddForm] = useState(false);
  const canAdd = role === "admin" || role === "creator";
  const isAdmin = role === "admin";

  useEffect(() => {
    setTeamMembers(initialMembers);
  }, [initialMembers]);

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-medium">Equipo</h2>
            <p className="text-xs text-muted mt-0.5">
              {teamMembers.length === 1
                ? "1 persona en esta marca"
                : `${teamMembers.length} personas en esta marca`}
            </p>
          </div>
          <Users size={16} className="text-muted" strokeWidth={1.5} aria-hidden />
        </div>

        {teamMembers.length === 0 ? (
          <div className="home-card px-4 py-8 text-center text-sm text-muted">
            Aún no hay nadie en el equipo.
          </div>
        ) : (
          <div className="home-card divide-y divide-border overflow-hidden">
            {teamMembers.map((member) => (
              <TeamMemberRow
                key={member.id}
                orgId={orgId}
                member={member}
                isSelf={member.user_id === currentUserId}
                canRemove={isAdmin && member.user_id !== currentUserId}
                onRemoved={(userId) =>
                  setTeamMembers((prev) => prev.filter((m) => m.user_id !== userId))
                }
              />
            ))}
          </div>
        )}
      </section>

      {canAdd && (
        <section>
          {!showAddForm ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="gap-1.5"
            >
              <Plus size={14} />
              Agregar al equipo
            </Button>
          ) : (
            <AddMemberForm
              orgId={orgId}
              onClose={() => setShowAddForm(false)}
              onAdded={(member) => {
                setTeamMembers((prev) => {
                  const idx = prev.findIndex((m) => m.user_id === member.user_id);
                  if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = { ...next[idx], ...member };
                    return next;
                  }
                  return [...prev, member];
                });
              }}
            />
          )}
        </section>
      )}
    </div>
  );
}

function AddMemberForm({
  orgId,
  onClose,
  onAdded,
}: {
  orgId: string;
  onClose: () => void;
  onAdded: (member: TeamMemberPreview) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("designer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const result = await addMemberByEmail(orgId, email, role);

    if (result.error) {
      setError(result.error);
    } else {
      const data = result.data as {
        id?: string;
        name?: string;
        user_id?: string;
        role?: MemberRole;
        extra_roles?: MemberRole[];
      };

      if (data?.user_id) {
        onAdded({
          id: data.id || data.user_id,
          user_id: data.user_id,
          role: data.role || role,
          extra_roles: data.extra_roles ?? [],
          name: data.name || email.split("@")[0],
          avatar_url: null,
        });
      }

      setEmail("");
      setSuccess(
        data?.name
          ? `${data.name} agregado como ${ROLE_LABELS[role].toLowerCase()}.`
          : "Persona agregada al equipo."
      );
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <div className="home-card p-4 space-y-4 max-w-md">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Agregar al equipo</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-muted hover:text-foreground"
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>
      </div>

      <p className="text-xs text-muted -mt-2">
        Correo con el que la persona se registró en Grilla.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Correo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="persona@correo.com"
          required
        />

        <div className="space-y-2">
          <p className="text-sm text-muted">Rol en esta marca</p>
          <div className="flex flex-wrap gap-2">
            {addableRoles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`rounded-full transition-opacity ${
                  role === r ? "opacity-100 ring-2 ring-foreground/20 ring-offset-1" : "opacity-50 hover:opacity-80"
                }`}
              >
                <RoleBadge role={r} />
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-success">{success}</p>}

        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={loading}>
            Agregar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
