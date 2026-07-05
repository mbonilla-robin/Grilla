"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Home,
  LogOut,
  Plus,
  Building2,
  LayoutGrid,
  Rss,
} from "lucide-react";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { CreateOrgDialog } from "@/components/org/create-org-dialog";
import type { Organization, OrganizationMember } from "@/lib/types";

interface AppShellProps {
  children: React.ReactNode;
  memberships: (OrganizationMember & { organizations: Organization })[];
  currentOrgId: string;
}

export function AppShell({
  children,
  memberships,
  currentOrgId,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const organizations = memberships.map((m) => m.organizations);
  const membership = memberships.find((m) => m.organizations.id === currentOrgId);
  const isClient = membership?.role === "client";

  const [showCreateOrg, setShowCreateOrg] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const feedHref = `/org/${currentOrgId}/feed`;
  const grillaHref = `/org/${currentOrgId}/grilla`;

  return (
    <div className="flex h-screen">
      <aside className="flex h-screen w-52 flex-col border-r border-border bg-surface shrink-0">
        <div className="flex h-14 items-center px-4 border-b border-border">
          <Link href="/home">
            <Logo size="sm" />
          </Link>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-auto">
          <Link
            href="/home"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
              pathname === "/home"
                ? "bg-neutral-100 text-foreground font-medium"
                : "text-muted hover:text-foreground hover:bg-neutral-50"
            )}
          >
            <Home size={16} strokeWidth={1.5} />
            Inicio
          </Link>

          <p className="px-2 pt-4 pb-1 text-[10px] font-medium text-muted uppercase tracking-wider">
            Organizaciones
          </p>
          {organizations.map((org) => (
            <Link
              key={org.id}
              href={`/org/${org.id}/home`}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors truncate",
                pathname === `/org/${org.id}/home`
                  ? "bg-neutral-100 text-foreground font-medium"
                  : "text-muted hover:text-foreground hover:bg-neutral-50"
              )}
            >
              <Building2 size={16} strokeWidth={1.5} className="shrink-0" />
              <span className="truncate">{org.name}</span>
            </Link>
          ))}

          <button
            type="button"
            onClick={() => setShowCreateOrg(true)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted hover:text-foreground hover:bg-neutral-50 mt-1"
          >
            <Plus size={12} />
            Nueva organización
          </button>

          <p className="px-2 pt-4 pb-1 text-[10px] font-medium text-muted uppercase tracking-wider">
            Producción
          </p>
          {!isClient && (
            <Link
              href={grillaHref}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                pathname.startsWith(`/org/${currentOrgId}/grilla`)
                  ? "bg-neutral-100 text-foreground font-medium"
                  : "text-muted hover:text-foreground hover:bg-neutral-50"
              )}
            >
              <LayoutGrid size={16} strokeWidth={1.5} />
              Grilla
            </Link>
          )}
          <Link
            href={feedHref}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
              pathname.startsWith(`/org/${currentOrgId}/feed`)
                ? "bg-neutral-100 text-foreground font-medium"
                : "text-muted hover:text-foreground hover:bg-neutral-50"
            )}
          >
            <Rss size={16} strokeWidth={1.5} />
            Feed
          </Link>
        </nav>

        <div className="px-3 py-3 border-t border-border">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted hover:text-foreground hover:bg-neutral-50 transition-colors"
          >
            <LogOut size={16} strokeWidth={1.5} />
            Salir
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-background min-w-0">{children}</main>

      <CreateOrgDialog open={showCreateOrg} onClose={() => setShowCreateOrg(false)} />
    </div>
  );
}
