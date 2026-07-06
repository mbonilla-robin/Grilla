"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthBackground } from "@/components/auth/auth-background";
import { AuthHero } from "@/components/auth/auth-hero";

export function LandingHero() {
  return (
    <section className="landing-hero">
      <div className="landing-hero-bg" aria-hidden>
        <AuthBackground />
      </div>

      <div className="landing-hero-grid">
        <div className="landing-hero-copy">
          <p className="landing-kicker">Organizador creativo</p>
          <h1 className="landing-hero-title">
            Tu espacio creativo para equipos de social media
          </h1>
          <p className="landing-hero-subtitle">
            Unifica la grilla editorial, briefs de diseño con IA, brand kits y
            preview del feed en un solo lugar. Planifica, crea y publica con tu
            equipo.
          </p>
          <div className="landing-hero-actions">
            <Link href="/register" className="auth-pill-btn landing-cta-primary">
              Comenzar gratis
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            <Link href="/login" className="auth-pill-btn-outline landing-cta-secondary">
              Iniciar sesión
            </Link>
          </div>
        </div>

        <div className="landing-hero-visual">
          <AuthHero />
        </div>
      </div>
    </section>
  );
}
