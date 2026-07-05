import { Logo } from "@/components/layout/logo";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="brand-hero relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-8">
      <div
        className="pointer-events-none absolute -right-16 top-16 h-48 w-48 rounded-full border-2 border-brand-foreground/8"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-10 bottom-24 h-32 w-32 rounded-full bg-brand-dark/25"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[20%] bottom-[15%] h-3 w-3 rounded-full bg-brand-foreground/20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-[18%] top-[22%] h-2 w-2 rounded-full bg-brand-foreground/15"
        aria-hidden
      />

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl bg-surface p-8 shadow-2xl shadow-black/10 sm:p-10">
          <div className="mb-6 flex justify-center">
            <Logo size="lg" />
          </div>

          <div className="mb-6 space-y-1 text-center">
            <h1 className="text-title-sub">{title}</h1>
            {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
