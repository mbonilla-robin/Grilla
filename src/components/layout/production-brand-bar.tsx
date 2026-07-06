"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Organization } from "@/lib/types";

interface ProductionBrandBarProps {
  organizations: Organization[];
  currentOrgId: string;
  page: "grilla" | "feed";
  className?: string;
}

export function ProductionBrandBar({
  organizations,
  currentOrgId,
  page,
  className,
}: ProductionBrandBarProps) {
  if (organizations.length <= 1) return null;

  return (
    <div className={cn("flex w-full justify-center overflow-x-auto", className)}>
      <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-neutral-50/80 p-1 shadow-sm min-w-0">
        {organizations.map((org) => {
          const active = org.id === currentOrgId;
          return (
            <Link
              key={org.id}
              href={`/org/${org.id}/${page}`}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-all duration-200 sm:px-4",
                active
                  ? "bg-surface text-foreground font-medium shadow-sm ring-1 ring-black/5"
                  : "text-muted hover:bg-surface/70 hover:text-foreground"
              )}
            >
              {org.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
