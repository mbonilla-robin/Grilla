import Link from "next/link";
import { Users, Palette, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function OrgQuickNav({ orgId }: { orgId: string }) {
  const links = [
    { href: `/org/${orgId}/team`, label: "Equipo", icon: Users },
    { href: `/org/${orgId}/brand-kit`, label: "Brand kit", icon: Palette },
    { href: `/org/${orgId}/assets`, label: "Assets", icon: FolderOpen },
  ] as const;

  return (
    <nav className="grid grid-cols-3 gap-2">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg border border-border bg-surface",
            "px-4 py-3 text-sm font-medium hover:bg-neutral-50 hover:border-foreground/15 transition-colors"
          )}
        >
          <Icon size={16} strokeWidth={1.5} className="text-muted shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
