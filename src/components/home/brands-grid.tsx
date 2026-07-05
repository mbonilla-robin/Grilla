import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";
import { ROLE_LABELS, type MemberRole } from "@/lib/types";
import type { UserBrand } from "@/lib/home-data";
import { EmptyState } from "./home-ui";

export function BrandsGrid({ brands }: { brands: UserBrand[] }) {
  if (brands.length === 0) {
    return <EmptyState text="No tienes marcas activas." />;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {brands.map((brand) => (
        <Link
          key={brand.id}
          href={`/org/${brand.id}/home`}
          className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 hover:bg-neutral-50 transition-colors"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-100">
            <Building2 size={18} className="text-muted" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{brand.name}</p>
            <p className="text-xs text-muted mt-0.5">
              {ROLE_LABELS[brand.role as MemberRole]}
            </p>
          </div>
          <ChevronRight size={16} className="text-muted shrink-0" />
        </Link>
      ))}
    </div>
  );
}
