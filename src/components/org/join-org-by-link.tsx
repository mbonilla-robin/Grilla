"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { joinOrgByInviteToken } from "@/lib/actions";

interface JoinOrgByLinkProps {
  orgName: string;
  token: string;
}

export function JoinOrgByLink({ orgName, token }: JoinOrgByLinkProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleJoin() {
    setLoading(true);
    setError("");

    const result = await joinOrgByInviteToken(token);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/org/${result.data}/home`);
    router.refresh();
  }

  return (
    <div className="text-center space-y-4">
      <p className="text-sm text-muted">
        Te invitaron a unirte a <strong>{orgName}</strong>
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={handleJoin} loading={loading} className="w-full">
        Unirme
      </Button>
    </div>
  );
}
