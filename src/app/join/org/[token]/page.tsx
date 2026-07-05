import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/layout/logo";
import { JoinOrgByLink } from "@/components/org/join-org-by-link";
import Link from "next/link";

export default async function JoinOrgPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: orgData } = await supabase.rpc("get_org_by_invite_token", {
    invite: token,
  });

  const org = orgData as { id: string; name: string; invite_token: string } | null;

  if (!org) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted">Link de invitación no válido</p>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-8 text-center">
          <Logo />
          <p className="text-sm text-muted">
            Inicia sesión para unirte a <strong>{org.name}</strong>
          </p>
          <Link
            href={`/login?next=/join/org/${token}`}
            className="inline-flex h-9 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground"
          >
            Iniciar sesión
          </Link>
          <p className="text-xs text-muted">
            ¿No tienes cuenta?{" "}
            <Link href={`/register?next=/join/org/${token}`} className="text-foreground hover:underline">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <Logo />
        </div>
        <JoinOrgByLink orgName={org.name} token={token} />
      </div>
    </div>
  );
}
