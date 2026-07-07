import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function HomeMainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full min-h-0 w-full overflow-auto">
      <div className="home-enter-stagger px-4 py-4 sm:px-6 sm:py-5 lg:px-8 xl:px-10 space-y-4 lg:space-y-5">
        {children}
      </div>
    </div>
  );
}

export function HomeDayRailLayout({
  dayPanel,
  children,
}: {
  dayPanel: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 w-full">
      <div className="flex-1 min-h-0 min-w-0 overflow-auto">
        <div className="home-enter-stagger px-4 py-4 sm:px-6 sm:py-5 lg:px-8 xl:px-10 space-y-4 lg:space-y-5">
          {children}
        </div>
      </div>

      <aside className="home-animate-in-right hidden md:flex w-64 shrink-0 min-h-0 flex-col border-l border-border overflow-y-auto bg-neutral-50/80" style={{ animationDelay: "0.2s" }}>
        {dayPanel}
      </aside>
    </div>
  );
}

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
        <p className="text-body-muted capitalize">{today}</p>
        <h1 className="text-title-page mt-0.5">
          Hola
          {profileName ? (
            <>
              {", "}
              <span className="font-bold">{profileName}</span>
            </>
          ) : null}
        </h1>
        <p className="text-body-muted mt-1">Empieza tu día con foco.</p>
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
      <h1 className="text-title-sub">{title}</h1>
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
      <h1 className="text-title-page font-bold">{orgName}</h1>
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
    <section id={id} className={cn("home-card p-4 lg:p-5", className)}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-title-section">{title}</h2>
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
  vertical = false,
}: {
  items: { label: string; value: string | number }[];
  vertical?: boolean;
}) {
  return (
    <div className={cn("gap-0.5", vertical ? "flex flex-col" : "flex flex-wrap gap-2")}>
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            vertical
              ? "flex items-center justify-between rounded-md px-2 py-1.5"
              : "rounded-xl bg-neutral-50 px-4 py-2 min-w-[7.5rem]"
          )}
        >
          <p
            className={cn(
              "uppercase tracking-wide",
              vertical
                ? "text-[10px] text-muted font-medium"
                : "text-[10px] text-muted"
            )}
          >
            {item.label}
          </p>
          <p
            className={cn(
              "text-sm font-semibold tabular-nums",
              vertical ? "" : "mt-0.5"
            )}
          >
            {item.value}
          </p>
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
  color = "neutral",
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  href?: string;
  isLast?: boolean;
  color?: "light" | "mid" | "dark" | "neutral";
}) {
  const barColors = {
    light: "bg-brand/40",
    mid: "bg-brand",
    dark: "bg-brand-dark",
    neutral: "bg-foreground/25",
  };

  const content = (
    <div className="flex gap-2.5 py-1.5">
      <div
        className={cn("w-1 shrink-0 rounded-full self-stretch", barColors[color])}
      />
      <div className="flex flex-col items-center pt-1">
        <div
          className={cn("h-2.5 w-2.5 rounded-full shrink-0", barColors[color])}
        />
        {!isLast && (
          <div className="w-px flex-1 min-h-[12px] border-l border-dashed border-border mt-1" />
        )}
      </div>
      <div className="flex-1 min-w-0 pb-0.5">
        <p className="text-xs font-medium leading-snug line-clamp-2">{title}</p>
        {subtitle && (
          <p className="text-[10px] text-muted mt-0.5 line-clamp-1">{subtitle}</p>
        )}
        {meta && <p className="text-[10px] text-muted mt-0.5">{meta}</p>}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl px-2 hover:bg-neutral-50 transition-colors"
      >
        {content}
      </Link>
    );
  }
  return content;
}

export function EmptyState({ text }: { text: string }) {
  return <p className="text-body-muted text-center py-6">{text}</p>;
}
