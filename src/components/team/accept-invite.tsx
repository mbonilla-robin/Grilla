"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { acceptInvitation } from "@/lib/actions";

interface AcceptInviteProps {
  token: string;
  orgName: string;
  role: string;
  isAuthenticated: boolean;
}

export function AcceptInvite({
  token,
  orgName,
  role,
  isAuthenticated,
}: AcceptInviteProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleAccept() {
    setLoading(true);
    setError("");

    const result = await acceptInvitation(token);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/org/${result.data!.organization_id}/grilla`);
    router.refresh();
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-muted">
          Te invitaron a <strong>{orgName}</strong> como {role}
        </p>
        <Button onClick={() => router.push(`/register?invite=${token}`)}>
          Crear cuenta para aceptar
        </Button>
        <p className="text-xs text-muted">
          ¿Ya tienes cuenta?{" "}
          <button
            onClick={() => router.push(`/login?invite=${token}`)}
            className="text-foreground hover:underline"
          >
            Entrar
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <p className="text-sm text-muted">
        Te invitaron a <strong>{orgName}</strong> como {role}
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={handleAccept} loading={loading}>
        Aceptar invitación
      </Button>
    </div>
  );
}
