"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  Building2,
  UserPlus,
  ChevronRight,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface SettingsNavProps {
  orgId: string;
  isAdmin: boolean;
}

const links: {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}[] = [
  { href: "perfil", label: "Perfil", icon: User },
  { href: "organizaciones", label: "Organizaciones", icon: Building2 },
  { href: "invitaciones", label: "Invitaciones", icon: UserPlus, adminOnly: true },
];

function visibleLinks(isAdmin: boolean) {
  return links.filter((link) => !link.adminOnly || isAdmin);
}

function SettingsPageButton({
  href,
  label,
  icon: Icon,
  active = false,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5",
        "text-sm font-medium transition-colors active:scale-[0.99]",
        active
          ? "border-foreground/20 bg-neutral-50"
          : "hover:bg-neutral-50 hover:border-foreground/10"
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
        <Icon size={16} strokeWidth={1.75} className="text-foreground" />
      </span>
      <span className="min-w-0 flex-1 text-left">{label}</span>
      <ChevronRight size={16} className="shrink-0 text-muted" />
    </Link>
  );
}

/** Desktop sidebar */
export function SettingsNav({ orgId, isAdmin }: SettingsNavProps) {
  const pathname = usePathname();
  const base = `/org/${orgId}/settings`;

  return (
    <nav className="hidden md:flex w-48 shrink-0 flex-col border-r border-border px-3 py-6 space-y-0.5">
      <p className="px-2 pb-3 text-[10px] font-medium text-muted uppercase tracking-wider">
        Ajustes
      </p>
      {visibleLinks(isAdmin).map(({ href, label, icon: Icon }) => {
        const linkHref = `${base}/${href}`;
        const active = pathname === linkHref || pathname === `${linkHref}/`;

        return (
          <Link
            key={href}
            href={linkHref}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm transition-colors",
              active
                ? "bg-foreground text-background font-medium"
                : "text-muted hover:text-foreground hover:bg-neutral-50"
            )}
          >
            <Icon size={16} strokeWidth={1.5} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile hub — list of page buttons */
export function SettingsHub({ orgId, isAdmin }: SettingsNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const base = `/org/${orgId}/settings`;

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="md:hidden w-full px-4 py-4">
      <h1 className="text-title-sub mb-4">Ajustes</h1>
      <div className="space-y-2">
        {visibleLinks(isAdmin).map(({ href, label, icon }) => {
          const linkHref = `${base}/${href}`;
          const active = pathname === linkHref || pathname === `${linkHref}/`;

          return (
            <SettingsPageButton
              key={href}
              href={linkHref}
              label={label}
              icon={icon}
              active={active}
            />
          );
        })}

        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 text-sm font-medium text-muted transition-colors hover:bg-neutral-50 hover:text-foreground active:scale-[0.99]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
            <LogOut size={16} strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1 text-left">Salir</span>
          <ChevronRight size={16} className="shrink-0 opacity-0" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Mobile back header on settings sub-pages */
export function SettingsMobileHeader({ orgId }: { orgId: string }) {
  const pathname = usePathname();
  const base = `/org/${orgId}/settings`;

  if (pathname === base || pathname === `${base}/`) {
    return null;
  }

  const current = links.find(({ href }) => pathname.startsWith(`${base}/${href}`));
  const title = current?.label ?? "Ajustes";

  return (
    <header className="md:hidden w-full border-b border-border px-4 py-3">
      <Link
        href={base}
        className="inline-flex items-center gap-0.5 text-xs text-muted hover:text-foreground mb-1"
      >
        <ChevronRight size={12} className="rotate-180" />
        Ajustes
      </Link>
      <h1 className="text-title-sub">{title}</h1>
    </header>
  );
}

/** Redirect desktop visitors from /settings to /settings/perfil */
export function SettingsDesktopRedirect({ orgId }: { orgId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/org/${orgId}/settings`;

  useEffect(() => {
    const isIndex = pathname === base || pathname === `${base}/`;
    if (!isIndex) return;

    const mql = window.matchMedia("(min-width: 768px)");
    if (mql.matches) {
      router.replace(`${base}/perfil`);
    }
  }, [pathname, router, base]);

  return null;
}
