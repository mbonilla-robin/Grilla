"use client";

import { useEffect, useState } from "react";

const TAGLINES = [
  { line1: "Tu espacio", line2: "creativo" },
  { line1: "Organiza", line2: "tu contenido" },
  { line1: "Planifica", line2: "y publica" },
  { line1: "Colabora", line2: "con tu equipo" },
] as const;

const LOGO_DURATION_MS = 2800;
const TAGLINE_DURATION_MS = 4000;

export function LandingHeroVisual() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const duration = step === 0 ? LOGO_DURATION_MS : TAGLINE_DURATION_MS;

    const timer = setTimeout(() => {
      setStep((current) => (current + 1) % (TAGLINES.length + 1));
    }, duration);

    return () => clearTimeout(timer);
  }, [step]);

  const tagline = step > 0 ? TAGLINES[step - 1] : null;

  return (
    <div className="landing-hero-stage">
      <div className="landing-hero-showcase">
        {step === 0 ? (
          <img
            key="logo"
            src="/grilla-logo.svg"
            alt="Grilla"
            width={188}
            height={100}
            className="landing-showcase-logo"
            draggable={false}
          />
        ) : tagline ? (
          <div key={step} className="landing-showcase-tagline" aria-live="polite">
            <span className="landing-showcase-line">{tagline.line1}</span>
            <span className="landing-showcase-line">{tagline.line2}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
