import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export function LandingNav() {
  return (
    <header className="landing-nav">
      <div className="landing-nav-inner">
        <Link href="/" aria-label="Grilla inicio" className="landing-nav-logo">
          <Logo size="md" />
        </Link>
        <nav className="landing-nav-actions">
          <Link href="/login" className="landing-nav-link">
            <span className="landing-nav-text-short">Entrar</span>
            <span className="landing-nav-text-full">Iniciar sesión</span>
          </Link>
          <Link href="/register" className="auth-pill-btn landing-nav-cta">
            <span className="landing-nav-text-short">Empezar</span>
            <span className="landing-nav-text-full">Comenzar gratis</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
