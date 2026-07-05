"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { acceptInvitation } from "@/lib/actions";
import { ROLE_LABELS, type Invitation, type Organization } from "@/lib/types";

interface JoinOrganizationProps {
  pendingInvitations: (Invitation & { organization?: Organization })[];
  userEmail: string;
}

export function JoinOrganization({
  pendingInvitations,
  userEmail,
}: JoinOrganizationProps) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  async function handleAccept(invitationToken: string) {
    setError("");
    setLoading(invitationToken);

    const result = await acceptInvitation(invitationToken);

    if (result.error) {
      setError(result.error);
      setLoading(null);
      return;
    }

    router.push(`/org/${result.data!.organization_id}/grilla`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {pendingInvitations.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">
            Invitaciones para {userEmail}
          </p>
          {pendingInvitations.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div>
                <p className="text-sm font-medium">
                  {inv.organization?.name || "Organización"}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  Como {ROLE_LABELS[inv.role]}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleAccept(inv.token)}
                loading={loading === inv.token}
              >
                Aceptar
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-background p-4 text-center">
          <p className="text-sm text-muted">
            No tienes invitaciones pendientes para {userEmail}
          </p>
          <p className="text-xs text-muted/70 mt-1">
            Pide al admin que te invite desde Equipo
          </p>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted uppercase tracking-wide">
          ¿Tienes un enlace de invitación?
        </p>
        <Input
          label="Código de invitación"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Pega el código del enlace"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          size="sm"
          variant="secondary"
          className="w-full"
          disabled={!token.trim()}
          loading={loading === token}
          onClick={() => handleAccept(token.trim())}
        >
          Unirme con código
        </Button>
      </div>
    </div>
  );
}
