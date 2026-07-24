"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Organization } from "@/lib/types";

interface HeaderOrgSwitcherProps {
  organizations: Organization[];
  currentOrgId: string;
  className?: string;
}

function orgDestination(pathname: string, nextOrgId: string): string {
  const match = pathname.match(/^\/org\/[^/]+(\/.*)?$/);
  if (!match) return `/org/${nextOrgId}/home`;
  const rest = match[1] || "/home";
  return `/org/${nextOrgId}${rest}`;
}

export function HeaderOrgSwitcher({
  organizations,
  currentOrgId,
  className,
}: HeaderOrgSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const current = organizations.find((o) => o.id === currentOrgId);

  if (!current) return null;

  if (organizations.length <= 1) {
    return (
      <p className={cn("truncate text-sm font-medium text-foreground", className)}>
        {current.name}
      </p>
    );
  }

  return (
    <div className={cn("relative min-w-0 max-w-[11rem] sm:max-w-[14rem]", className)}>
      <select
        value={currentOrgId}
        onChange={(e) => router.push(orgDestination(pathname, e.target.value))}
        className={cn(
          "w-full cursor-pointer appearance-none truncate rounded-md",
          "border-0 bg-transparent py-1 pl-0 pr-5 text-sm font-medium text-foreground",
          "hover:opacity-80 focus:outline-none focus:ring-0"
        )}
        aria-label="Cambiar marca"
      >
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        strokeWidth={2}
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  );
}
