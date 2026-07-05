import Link from "next/link";
import { Users, Palette, FolderOpen, BarChart3, CalendarDays, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export function OrgQuickNav({ orgId }: { orgId: string }) {
  const links = [
    { href: `/org/${orgId}/marca`, label: "Marca", icon: SlidersHorizontal },
    { href: `/org/${orgId}/estadisticas`, label: "Estadísticas", icon: BarChart3 },
    { href: `/org/${orgId}/calendario`, label: "Calendario", icon: CalendarDays },
    { href: `/org/${orgId}/team`, label: "Equipo", icon: Users },
    { href: `/org/${orgId}/brand-kit`, label: "Brand kit", icon: Palette },
    { href: `/org/${orgId}/assets`, label: "Assets", icon: FolderOpen },
  ] as const;

  return (
    <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
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
