import Link from "next/link";
import { Users, SlidersHorizontal, FolderOpen, BarChart3, CalendarDays, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function OrgQuickNav({ orgId }: { orgId: string }) {
  const links = [
    { href: `/org/${orgId}/marca`, label: "Marca", icon: SlidersHorizontal },
    { href: `/org/${orgId}/revision`, label: "Revisión", icon: ClipboardCheck },
    { href: `/org/${orgId}/estadisticas`, label: "Estadísticas", icon: BarChart3 },
    { href: `/org/${orgId}/calendario`, label: "Calendario", icon: CalendarDays },
    { href: `/org/${orgId}/team`, label: "Equipo", icon: Users },
    { href: `/org/${orgId}/assets`, label: "Assets", icon: FolderOpen },
  ] as const;

  return (
    <nav className="flex w-full gap-2">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex flex-1 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface",
            "px-2 py-2 text-xs sm:text-sm font-medium",
            "hover:bg-neutral-50 hover:border-foreground/15 transition-colors"
          )}
        >
          <Icon size={16} strokeWidth={1.5} className="text-muted shrink-0" />
          <span className="truncate">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
