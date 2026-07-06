"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Rss, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileTabBarProps {
  currentOrgId: string;
  isClient?: boolean;
}

interface TabItem {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}

export function MobileTabBar({ currentOrgId, isClient = false }: MobileTabBarProps) {
  const pathname = usePathname();

  const tabs: TabItem[] = [
    {
      href: "/home",
      label: "Inicio",
      icon: Home,
      active:
        pathname === "/home" ||
        pathname.startsWith("/home/") ||
        /^\/org\/[^/]+\/home(?:\/|$)/.test(pathname),
    },
    ...(!isClient
      ? [
          {
            href: `/org/${currentOrgId}/grilla`,
            label: "Grilla",
            icon: LayoutGrid,
            active: pathname.startsWith(`/org/${currentOrgId}/grilla`),
          },
        ]
      : []),
    {
      href: `/org/${currentOrgId}/feed`,
      label: "Feed",
      icon: Rss,
      active: pathname.startsWith(`/org/${currentOrgId}/feed`),
    },
    {
      href: `/org/${currentOrgId}/settings`,
      label: "Ajustes",
      icon: Settings,
      active: pathname.startsWith(`/org/${currentOrgId}/settings`),
    },
  ];

  return (
    <nav
      aria-label="Navegación principal"
      className="md:hidden fixed inset-x-0 bottom-0 z-50 pointer-events-none"
    >
      <div
        className={cn(
          "pointer-events-auto mx-3 mb-[max(0.625rem,env(safe-area-inset-bottom))]",
          "rounded-[1.35rem] border border-white/60",
          "bg-white/72 backdrop-blur-2xl backdrop-saturate-150",
          "supports-[backdrop-filter]:bg-white/58",
          "shadow-[0_8px_32px_rgba(0,0,0,0.12),0_1px_0_rgba(255,255,255,0.8)_inset]"
        )}
      >
        <div className="flex items-stretch justify-around px-1 py-1.5">
          {tabs.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5",
                "transition-colors duration-200 active:scale-[0.97]",
                active ? "text-foreground" : "text-muted"
              )}
            >
              {active && (
                <span className="absolute inset-x-2 inset-y-0 rounded-xl bg-black/[0.05]" />
              )}
              <Icon
                size={22}
                strokeWidth={active ? 2.25 : 1.75}
                className="relative shrink-0"
              />
              <span
                className={cn(
                  "relative max-w-full truncate text-[10px] leading-none",
                  active ? "font-semibold" : "font-medium"
                )}
              >
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
