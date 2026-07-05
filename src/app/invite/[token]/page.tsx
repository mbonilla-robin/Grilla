import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/layout/logo";
import { AcceptInvite } from "@/components/team/accept-invite";
import { ROLE_LABELS, type MemberRole } from "@/lib/types";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: invitationData } = await supabase.rpc(
    "get_invitation_by_token",
    { invite_token: token }
  );

  const invitation = invitationData as {
    id: string;
    organization_id: string;
    email: string;
    role: MemberRole;
    token: string;
    org_name: string;
  } | null;

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted">Invitación no válida o expirada</p>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <Logo />
        </div>
        <AcceptInvite
          token={token}
          orgName={invitation.org_name}
          role={ROLE_LABELS[invitation.role]}
          isAuthenticated={!!user}
        />
      </div>
    </div>
  );
}
