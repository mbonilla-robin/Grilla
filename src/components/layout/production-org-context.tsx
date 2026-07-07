"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Organization } from "@/lib/types";

interface ProductionOrgContextProps {
  organizations: Organization[];
  currentOrgId: string;
  page: "grilla" | "feed";
  className?: string;
}

export function ProductionOrgContext({
  organizations,
  currentOrgId,
  page,
  className,
}: ProductionOrgContextProps) {
  const router = useRouter();
  const current = organizations.find((o) => o.id === currentOrgId);

  if (!current) return null;

  if (organizations.length <= 1) {
    return (
      <p className={cn("text-xs text-muted", className)}>{current.name}</p>
    );
  }

  return (
    <div className={cn("relative inline-flex max-w-full items-center", className)}>
      <select
        value={currentOrgId}
        onChange={(e) => router.push(`/org/${e.target.value}/${page}`)}
        className={cn(
          "max-w-full cursor-pointer appearance-none truncate rounded-md",
          "border-0 bg-transparent py-0 pl-0 pr-5 text-xs font-medium text-muted",
          "transition-colors hover:text-foreground focus:outline-none focus:ring-0"
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
        size={12}
        strokeWidth={2}
        className="pointer-events-none absolute right-0 shrink-0 text-muted"
      />
    </div>
  );
}
