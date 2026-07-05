import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function GlobalHomeHeader({
  profileName,
  teamRow,
}: {
  profileName?: string;
  teamRow?: React.ReactNode;
}) {
  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <header className="space-y-3">
      <div>
        <p className="text-sm text-muted capitalize">{today}</p>
        <h1 className="text-2xl font-semibold tracking-tight mt-0.5">
          Hola
          {profileName ? (
            <>
              {", "}
              <span className="font-bold">{profileName}</span>
            </>
          ) : null}
        </h1>
        <p className="text-sm text-muted mt-1">Empieza tu día con foco.</p>
      </div>
      {teamRow}
    </header>
  );
}

export function SubPageHeader({
  title,
  backHref = "/home",
  backLabel = "Inicio",
}: {
  title: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="space-y-1">
      <Link
        href={backHref}
        className="inline-flex items-center gap-0.5 text-xs text-muted hover:text-foreground"
      >
        <ChevronRight size={12} className="rotate-180" />
        {backLabel}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
    </header>
  );
}

export function OrgHomeHeader({
  orgName,
  teamRow,
}: {
  orgName: string;
  teamRow?: React.ReactNode;
}) {
  return (
    <header className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">{orgName}</h1>
      {teamRow}
    </header>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className,
  id,
}: {
  title: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("home-card p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium">{title}</h2>
        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center gap-0.5 text-xs text-muted hover:text-foreground"
          >
            {action.label}
            <ChevronRight size={12} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function StatRow({
  items,
}: {
  items: { label: string; value: string | number }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-md bg-neutral-50 px-3 py-2.5 text-center">
          <p className="text-[10px] text-muted uppercase tracking-wide">{item.label}</p>
          <p className="text-sm font-semibold mt-0.5 tabular-nums">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function TimelineItem({
  title,
  subtitle,
  meta,
  href,
  isLast = false,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  href?: string;
  isLast?: boolean;
}) {
  const content = (
    <div className="flex gap-3 py-2">
      <div className="flex flex-col items-center pt-1">
        <div className="h-2 w-2 rounded-full bg-foreground/30 shrink-0" />
        {!isLast && (
          <div className="w-px flex-1 min-h-[16px] border-l border-dashed border-border mt-1" />
        )}
      </div>
      <div className="flex-1 min-w-0 pb-1">
        <p className="text-sm font-medium truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted mt-0.5 truncate">{subtitle}</p>
        )}
        {meta && <p className="text-[10px] text-muted mt-0.5">{meta}</p>}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:bg-neutral-50 -mx-1 px-1 rounded transition-colors">
        {content}
      </Link>
    );
  }
  return content;
}

export function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-muted text-center py-6">{text}</p>;
}
