"use client";

import { AuthBackground } from "@/components/auth/auth-background";
import { AuthHero } from "@/components/auth/auth-hero";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  footer?: React.ReactNode;
}

export function AuthLayout({ children, title, footer }: AuthLayoutProps) {
  return (
    <div className="auth-screen">
      <AuthBackground />

      <header className="auth-header">
        <AuthHero />
      </header>

      <main className="auth-sheet">
        <h1 className="text-title-sub mb-6 shrink-0 text-center text-foreground">
          {title}
        </h1>

        <div className="flex flex-1 flex-col">{children}</div>

        {footer ? <div className="mt-6 shrink-0">{footer}</div> : null}
      </main>
    </div>
  );
}
