"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Building2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsNavProps {
  orgId: string;
  isAdmin: boolean;
}

const links = [
  { href: "perfil", label: "Perfil", icon: User },
  { href: "organizaciones", label: "Organizaciones", icon: Building2 },
  { href: "invitaciones", label: "Invitaciones", icon: UserPlus, adminOnly: true },
] as const;

export function SettingsNav({ orgId, isAdmin }: SettingsNavProps) {
  const pathname = usePathname();
  const base = `/org/${orgId}/settings`;

  return (
    <nav className="w-48 shrink-0 border-r border-border px-3 py-6 space-y-0.5">
      <p className="px-2 pb-3 text-[10px] font-medium text-muted uppercase tracking-wider">
        Ajustes
      </p>
      {links
        .filter((link) => !("adminOnly" in link && link.adminOnly) || isAdmin)
        .map(({ href, label, icon: Icon }) => {
          const linkHref = `${base}/${href}`;
          const active = pathname === linkHref || pathname === `${linkHref}/`;

          return (
            <Link
              key={href}
              href={linkHref}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                active
                  ? "bg-neutral-100 text-foreground font-medium"
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
