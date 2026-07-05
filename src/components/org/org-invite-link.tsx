"use client";

import { useState } from "react";
import { Copy, Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type MemberRole } from "@/lib/types";

interface OrgInviteLinkProps {
  orgName: string;
  inviteToken: string;
  defaultRole: MemberRole;
}

export function OrgInviteLink({
  orgName,
  inviteToken,
  defaultRole,
}: OrgInviteLinkProps) {
  const [copied, setCopied] = useState(false);
  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/org/${inviteToken}`
      : `/join/org/${inviteToken}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Link2 size={16} className="text-muted" />
        <p className="text-sm font-medium">Link de invitación</p>
      </div>
      <p className="text-xs text-muted">
        Comparte este link para que se unan a <strong>{orgName}</strong> como{" "}
        {ROLE_LABELS[defaultRole]}
      </p>
      <div className="flex gap-2">
        <input
          readOnly
          value={inviteUrl}
          className="flex-1 h-8 rounded-md border border-border bg-background px-2 text-xs font-mono truncate"
        />
        <Button size="sm" variant="secondary" onClick={handleCopy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </Button>
      </div>
    </div>
  );
}
