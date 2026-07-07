import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";
import { ROLE_LABELS, type MemberRole } from "@/lib/types";
import type { OrgSnapshot } from "@/lib/home-data";
import { EmptyState } from "./home-ui";

function formatBrandSummary(org: OrgSnapshot): string {
  const parts: string[] = [];

  if (org.pending > 0) {
    parts.push(`${org.pending} producción`);
  }
  if (org.needsDesign > 0) {
    parts.push(`${org.needsDesign} sin diseño`);
  }
  if (parts.length === 0) {
    parts.push("Al día");
  }

  return parts.join(" · ");
}

export function BrandsProductionOverview({
  snapshots,
}: {
  snapshots: OrgSnapshot[];
}) {
  if (snapshots.length === 0) {
    return <EmptyState text="No tienes marcas activas." />;
  }

  return (
    <div className="flex flex-col gap-2">
      {snapshots.map((org) => (
        <Link
          key={org.id}
          href={`/org/${org.id}/home`}
          className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-3 hover:border-foreground/15 hover:bg-neutral-50/80 transition-colors"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 group-hover:bg-neutral-200/70 transition-colors">
            <Building2 size={16} className="text-muted" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug truncate">
              {org.name}
            </p>
            <p className="text-[11px] text-muted mt-0.5 truncate">
              {ROLE_LABELS[org.role as MemberRole]}
              <span className="text-border mx-1.5">·</span>
              {formatBrandSummary(org)}
            </p>
          </div>

          <ChevronRight size={14} className="text-muted shrink-0" />
        </Link>
      ))}
    </div>
  );
}
