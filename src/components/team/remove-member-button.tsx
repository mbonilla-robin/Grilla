"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { removeMemberFromOrg } from "@/lib/actions";
import type { TeamMemberPreview } from "@/lib/home-data";

interface RemoveMemberButtonProps {
  orgId: string;
  member: TeamMemberPreview;
  onRemoved: (userId: string) => void;
}

export function RemoveMemberButton({
  orgId,
  member,
  onRemoved,
}: RemoveMemberButtonProps) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleRemove() {
    setLoading(true);
    setError("");
    const result = await removeMemberFromOrg(orgId, member.user_id);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onRemoved(member.user_id);
    setConfirming(false);
    setLoading(false);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleRemove}
            disabled={loading}
            className="text-[11px] rounded-md px-2 py-1 bg-destructive text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "..." : "Confirmar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              setError("");
            }}
            disabled={loading}
            className="text-[11px] rounded-md px-2 py-1 border border-border text-muted hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
        {error && <p className="text-[10px] text-destructive max-w-[140px] text-right">{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="shrink-0 p-1.5 rounded-md text-muted hover:text-destructive hover:bg-red-50 transition-colors"
      aria-label={`Eliminar a ${member.name} del equipo`}
    >
      <Trash2 size={14} strokeWidth={1.75} />
    </button>
  );
}
