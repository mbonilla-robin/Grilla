import Link from "next/link";
import { Calendar, Building2, Lightbulb, FolderOpen } from "lucide-react";
import { homeStaggerDelay } from "@/lib/home-motion";
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
      {links.map(({ href, label, icon: Icon }, index) => (
        <Link
          key={href}
          href={href}
          aria-label={label}
          title={label}
          className={cn(
            "flex flex-1 min-w-0 items-center justify-center rounded-xl border border-border bg-surface home-animate-in home-card-hover",
            "h-10 hover:bg-neutral-50 hover:border-foreground/15 group"
          )}
          style={{ animationDelay: homeStaggerDelay(index, 0.14, 0.05) }}
        >
          <Icon
            size={18}
            strokeWidth={1.5}
            className="text-muted shrink-0 group-hover:text-foreground transition-colors"
          />
        </Link>
      ))}
    </nav>
  );
}
