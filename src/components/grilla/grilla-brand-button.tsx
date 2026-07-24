"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Organization } from "@/lib/types";

interface GrillaBrandButtonProps {
  organizations: Organization[];
  currentOrgId: string;
  month?: string;
}

export function GrillaBrandButton({
  organizations,
  currentOrgId,
  month,
}: GrillaBrandButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = organizations.find((o) => o.id === currentOrgId);

  function goToOrgGrilla(orgId: string) {
    const qs = month ? `?month=${encodeURIComponent(month)}` : "";
    router.push(`/org/${orgId}/grilla${qs}`);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  if (!current || organizations.length <= 1) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 max-w-[11rem] items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-neutral-50 transition-colors sm:max-w-[14rem]"
        aria-label="Cambiar marca en grilla"
      >
        <Building2 size={13} className="shrink-0 text-muted" />
        <span className="truncate">{current.name}</span>
        <ChevronDown
          size={12}
          className={cn(
            "shrink-0 text-muted transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 min-w-[11rem] overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
          {organizations.map((org) => {
            const active = org.id === currentOrgId;
            return (
              <button
                key={org.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (!active) goToOrgGrilla(org.id);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-background transition-colors"
              >
                <span
                  className={cn(
                    "truncate",
                    active ? "font-medium text-foreground" : "text-muted"
                  )}
                >
                  {org.name}
                </span>
                {active && <Check size={12} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
