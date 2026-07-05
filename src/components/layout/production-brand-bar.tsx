"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Organization } from "@/lib/types";

interface ProductionBrandBarProps {
  organizations: Organization[];
  currentOrgId: string;
  page: "grilla" | "feed";
}

export function ProductionBrandBar({
  organizations,
  currentOrgId,
  page,
}: ProductionBrandBarProps) {
  if (organizations.length === 0) return null;

  return (
    <div className="sticky top-0 z-20 border-b border-white/40 bg-white/65 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/55">
      <div className="flex justify-center px-4 py-2.5 overflow-x-auto">
        <div className="inline-flex items-center gap-1.5 p-1 rounded-full bg-black/[0.04] border border-white/50 shadow-sm min-w-0">
          {organizations.map((org) => {
            const active = org.id === currentOrgId;
            return (
              <Link
                key={org.id}
                href={`/org/${org.id}/${page}`}
                className={cn(
                  "shrink-0 rounded-full px-4 py-1.5 text-sm transition-all duration-200",
                  active
                    ? "bg-white text-foreground font-medium shadow-sm ring-1 ring-black/5"
                    : "text-muted hover:text-foreground hover:bg-white/50"
                )}
              >
                {org.name}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
