import Link from "next/link";
import { Calendar, Building2, Lightbulb, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/home/calendario", label: "Calendario", icon: Calendar },
  { href: "/home/marcas", label: "Marcas", icon: Building2 },
  { href: "/home/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/home/archivo", label: "Archivo", icon: FolderOpen },
] as const;

export function HomeQuickNav() {
  return (
    <nav className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
