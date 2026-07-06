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
    <nav className="flex w-full gap-2">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-label={label}
          className={cn(
            "flex flex-1 min-w-0 items-center justify-center rounded-xl border border-border bg-surface",
            "px-2 py-2.5 sm:gap-1.5 sm:px-2 sm:py-2 text-xs sm:text-sm font-medium",
            "hover:bg-neutral-50 hover:border-foreground/15 transition-colors group"
          )}
        >
          <Icon
            size={18}
            strokeWidth={1.5}
            className="text-muted shrink-0 group-hover:text-foreground transition-colors sm:size-4"
          />
          <span className="hidden sm:inline truncate">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
