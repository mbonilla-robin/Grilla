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
  Settings,
} from "lucide-react";
import { Logo } from "./logo";
import { MobileTabBar } from "./mobile-tab-bar";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { CreateOrgDialog } from "@/components/org/create-org-dialog";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { Organization, OrganizationMember } from "@/lib/types";

const navLinkBase =
  "flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm transition-colors";
const navLinkActive = "bg-foreground text-background font-medium";
const navLinkInactive = "text-muted hover:text-foreground hover:bg-neutral-50";

interface AppShellProps {
  children: React.ReactNode;
  memberships: (OrganizationMember & { organizations: Organization })[];
  currentOrgId: string;
  userId: string;
  unreadNotifications?: number;
}

export function AppShell({
  children,
  memberships,
  currentOrgId,
  userId,
  unreadNotifications = 0,
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
    router.push("/");
    router.refresh();
  }

  const feedHref = `/org/${currentOrgId}/feed`;
  const grillaHref = `/org/${currentOrgId}/grilla`;
  const settingsHref = `/org/${currentOrgId}/settings`;
  const isHomeWithDayRail =
    pathname === "/home" || /^\/org\/[^/]+\/home$/.test(pathname);

  return (
    <div className="flex h-[100dvh] md:h-screen">
      <aside className="hidden md:flex h-screen w-52 flex-col border-r border-border bg-surface shrink-0">
        <div className="flex h-14 items-center px-4 border-b border-border">
          <Link href="/home">
            <Logo size="md" showText={false} />
          </Link>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-auto">
          <Link
            href="/home"
            className={cn(
              navLinkBase,
              pathname === "/home" ? navLinkActive : navLinkInactive
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
                navLinkBase,
                "truncate",
                pathname === `/org/${org.id}/home` ? navLinkActive : navLinkInactive
              )}
            >
              <Building2 size={16} strokeWidth={1.5} className="shrink-0" />
              <span className="truncate">{org.name}</span>
            </Link>
          ))}

          <button
            type="button"
            onClick={() => setShowCreateOrg(true)}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-muted hover:text-foreground hover:bg-neutral-50 mt-1"
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
                navLinkBase,
                pathname.startsWith(`/org/${currentOrgId}/grilla`)
                  ? navLinkActive
                  : navLinkInactive
              )}
            >
              <LayoutGrid size={16} strokeWidth={1.5} />
              Grilla
            </Link>
          )}
          <Link
            href={feedHref}
            className={cn(
              navLinkBase,
              pathname.startsWith(`/org/${currentOrgId}/feed`)
                ? navLinkActive
                : navLinkInactive
            )}
          >
            <Rss size={16} strokeWidth={1.5} />
            Feed
          </Link>
        </nav>

        <div className="px-3 py-3 border-t border-border space-y-0.5">
          <Link
            href={settingsHref}
            className={cn(
              navLinkBase,
              pathname.startsWith(settingsHref) ? navLinkActive : navLinkInactive
            )}
          >
            <Settings size={16} strokeWidth={1.5} />
            Ajustes
          </Link>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm text-muted hover:text-foreground hover:bg-neutral-50 transition-colors"
          >
            <LogOut size={16} strokeWidth={1.5} />
            Salir
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-background">
        <header className="flex h-14 items-center justify-between gap-3 px-4 border-b border-border bg-surface shrink-0">
          <Link href="/home" className="md:hidden shrink-0">
            <Logo size="sm" showText={false} />
          </Link>
          <span className="hidden md:block text-sm font-medium">Inicio</span>
          <div className="md:hidden flex-1" />
          <NotificationBell userId={userId} initialCount={unreadNotifications} />
        </header>
        <div
          className={cn(
            "flex flex-col flex-1 w-full min-h-0 min-w-0",
            isHomeWithDayRail ? "overflow-hidden" : "overflow-auto",
            "pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:pb-0"
          )}
        >
          {children}
        </div>
      </main>

      <MobileTabBar currentOrgId={currentOrgId} isClient={isClient} />

      <CreateOrgDialog open={showCreateOrg} onClose={() => setShowCreateOrg(false)} />
    </div>
  );
}
