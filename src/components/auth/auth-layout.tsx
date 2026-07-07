"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthBackground } from "@/components/auth/auth-background";
import { AuthHero } from "@/components/auth/auth-hero";

export type AuthVariant = "login" | "register";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  variant: AuthVariant;
  footer?: React.ReactNode;
}

export function AuthLayout({
  children,
  title,
  subtitle,
  variant,
  footer,
}: AuthLayoutProps) {
  return (
    <div className={`auth-screen auth-screen--${variant}`}>
      <AuthBackground />

      <Link href="/" className="auth-back-btn">
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        Inicio
      </Link>

      <header className="auth-header">
        <div className="auth-hero-panel">
          <AuthHero />
          <p className="auth-hero-lead">
            {variant === "login"
              ? "Tu espacio creativo para equipos de social media."
              : "Organiza, crea y publica con tu equipo en un solo lugar."}
          </p>
        </div>
      </header>

      <main className="auth-sheet">
        <div className="auth-form-wrap">
          <h1 className="auth-form-title">{title}</h1>
          {subtitle ? <p className="auth-form-subtitle">{subtitle}</p> : null}

          <div className="auth-form-body">{children}</div>

          {footer ? <div className="auth-form-footer">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
