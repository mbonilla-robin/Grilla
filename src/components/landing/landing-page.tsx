import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  LayoutGrid,
  Palette,
  Sparkles,
  Smartphone,
  Users,
} from "lucide-react";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNav } from "@/components/landing/landing-nav";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: LayoutGrid,
    title: "Grilla editorial",
    description:
      "Planifica y organiza todo tu contenido en una vista clara. Copy, referencias y estados en un solo lugar.",
  },
  {
    icon: Sparkles,
    title: "Briefs con IA",
    description:
      "Genera briefs de diseño automáticamente por post. Tu equipo creativo recibe instrucciones claras al instante.",
  },
  {
    icon: Palette,
    title: "Brand Kit",
    description:
      "Centraliza colores, tipografías y tono de voz. Mantén la consistencia de marca en cada pieza.",
  },
  {
    icon: Smartphone,
    title: "Feed Preview",
    description:
      "Previsualiza cómo se verá tu contenido en Instagram antes de publicar. Aprueba con confianza.",
  },
  {
    icon: Users,
    title: "Colaboración en equipo",
    description:
      "Creadora, diseñador y cliente trabajan juntos con roles y permisos definidos para cada uno.",
  },
  {
    icon: Calendar,
    title: "Calendario editorial",
    description:
      "Visualiza fechas de publicación, deadlines y el flujo completo de producción de contenido.",
  },
] as const;

const STEPS = [
  {
    title: "Crea tu cuenta",
    description: "Regístrate en minutos y accede a tu espacio creativo.",
  },
  {
    title: "Configura tu organización",
    description: "Crea tu empresa o únete a un equipo existente.",
  },
  {
    title: "Arma tu grilla",
    description: "Agrega posts con copy, referencias y fechas de publicación.",
  },
  {
    title: "Genera briefs con IA",
    description: "Convierte cada idea en un brief listo para diseño.",
  },
  {
    title: "Invita a tu equipo",
    description: "Colabora con creadores, diseñadores y clientes.",
  },
] as const;

const ROLES = [
  { role: "Admin", access: "Control total, invitaciones y configuración" },
  { role: "Creadora", access: "Grilla editorial y briefs de diseño" },
  { role: "Diseñador", access: "Grilla, briefs, brand kit y assets" },
  { role: "Cliente", access: "Feed preview y posts aprobados" },
] as const;

export function LandingPage() {
  return (
    <div className="landing-page">
      <LandingNav />
      <LandingHero />

      <main className="landing-main">
        <section id="que-es" className="landing-section landing-section-features">
          <div className="landing-container">
            <div className="landing-section-header">
              <p className="landing-kicker">Qué es Grilla</p>
              <h2 className="landing-section-title">
                Todo el flujo creativo, en un solo lugar
              </h2>
              <p className="landing-section-lead">
                Grilla nace para equipos que producen contenido para redes sociales
                y necesitan orden, velocidad y colaboración. Desde la idea inicial
                hasta la aprobación del cliente, cada paso tiene su espacio.
              </p>
            </div>

            <div className="landing-feature-grid">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <article key={title} className="landing-feature-card">
                  <div className="landing-feature-icon">
                    <Icon size={20} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-title-section">{title}</h3>
                  <p className="text-body-muted mt-2 leading-relaxed">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-section-warm">
          <div className="landing-container">
            <div className="landing-section-header landing-section-header-center">
              <p className="landing-kicker">Cómo funciona</p>
              <h2 className="landing-section-title">
                De la idea al feed en cinco pasos
              </h2>
              <p className="landing-section-lead">
                Grilla está diseñado para acompañarte desde el primer día. Configura
                tu espacio y empieza a producir contenido de inmediato.
              </p>
            </div>

            <ol className="landing-steps">
              {STEPS.map(({ title, description }, index) => (
                <li key={title} className="landing-step">
                  <span className="landing-step-badge">{index + 1}</span>
                  <div>
                    <p className="text-micro font-semibold uppercase tracking-wider text-muted">
                      Paso 0{index + 1}
                    </p>
                    <h3 className="mt-1 font-display text-lg font-semibold">{title}</h3>
                    <p className="text-body-muted mt-1.5">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="landing-section landing-section-roles">
          <div className="landing-container">
            <div className="landing-section-header">
              <p className="landing-kicker">Para tu equipo</p>
              <h2 className="landing-section-title">
                Roles pensados para cada persona
              </h2>
              <p className="landing-section-lead">
                Cada miembro ve lo que necesita. Sin ruido, sin accesos de más.
              </p>
            </div>

            <div className="landing-roles-grid">
              {ROLES.map(({ role, access }) => (
                <div key={role} className="landing-role-card">
                  <div className="landing-role-avatar">{role.charAt(0)}</div>
                  <div>
                    <h3 className="text-title-section">{role}</h3>
                    <p className="text-body-muted mt-1">{access}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-section-cta">
          <div className="landing-container">
            <div className={cn("brand-hero landing-cta-panel")}>
              <div className="landing-cta-content">
                <h2 className="landing-cta-title">
                  Empieza a organizar tu contenido hoy
                </h2>
                <p className="landing-cta-copy">
                  Crea tu cuenta gratis y lleva tu producción de social media al
                  siguiente nivel con Grilla.
                </p>
              </div>
              <div className="landing-hero-actions landing-hero-actions-center">
                <Link href="/register" className="auth-pill-btn landing-cta-primary">
                  Crear cuenta gratis
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Link>
                <Link href="/login" className="auth-pill-btn-outline landing-cta-secondary">
                  Ya tengo cuenta
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <Logo size="sm" />
          <p className="text-caption text-center sm:text-right">
            © {new Date().getFullYear()} Grilla — Organizador creativo para social media
          </p>
        </div>
      </footer>
    </div>
  );
}
