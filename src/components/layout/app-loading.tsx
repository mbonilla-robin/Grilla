"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  GrillaLogoAssembly,
  LOGO_ASSEMBLY_DURATION_MS,
  LOGO_ASSEMBLY_PARTS,
  LOGO_ASSEMBLY_SIZE,
} from "@/components/brand/grilla-logo-assembly";

export const MIN_DURATION_MS = LOGO_ASSEMBLY_DURATION_MS + 700;
const OVERLAY_ID = "grilla-loading-overlay";

function LoadingContent() {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-6">
      <GrillaLogoAssembly className="w-[11.5rem] sm:w-[13.5rem]" />
    </div>
  );
}

function buildPersistHtml() {
  const { width: cw, height: ch } = LOGO_ASSEMBLY_SIZE;
  const order = ["g", "i", "r", "idot", "l1", "l2", "a"] as const;
  const motion: Record<
    (typeof order)[number],
    { anim: string; delay: number; dur: number; ease: string }
  > = {
    g: { anim: "logo-pop-g", delay: 0, dur: 0.42, ease: "cubic-bezier(0.15, 0.85, 0.2, 1)" },
    i: { anim: "logo-pop-i", delay: 0.24, dur: 0.4, ease: "cubic-bezier(0.15, 0.9, 0.2, 1)" },
    r: { anim: "logo-pop-r", delay: 0.48, dur: 0.9, ease: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
    idot: {
      anim: "logo-pop-idot",
      delay: 0.78,
      dur: 0.72,
      ease: "cubic-bezier(0.25, 0.7, 0.2, 1)",
    },
    l1: { anim: "logo-pop-l1", delay: 1.55, dur: 0.4, ease: "cubic-bezier(0.15, 0.85, 0.2, 1)" },
    l2: { anim: "logo-pop-l2", delay: 1.75, dur: 0.4, ease: "cubic-bezier(0.15, 0.85, 0.2, 1)" },
    a: { anim: "logo-pop-a", delay: 1.95, dur: 0.42, ease: "cubic-bezier(0.15, 0.85, 0.2, 1)" },
  };

  const byName = Object.fromEntries(
    LOGO_ASSEMBLY_PARTS.map((part) => [part.name, part])
  );

  const letters = order
    .map((name) => {
      const part = byName[name];
      const m = motion[name];
      return `<div class="logo-assembly-letter logo-assembly-${name}" style="left:${(part.left / cw) * 100}%;top:${(part.top / ch) * 100}%;width:${(part.w / cw) * 100}%;height:${(part.h / ch) * 100}%;--logo-anim:${m.anim};--logo-delay:${m.delay}s;--logo-dur:${m.dur}s;--logo-ease:${m.ease}"><img src="${part.src}" alt="" /></div>`;
    })
    .join("");

  return `
    <div class="absolute inset-0 flex items-center justify-center px-6">
      <div class="logo-assembly logo-assembly-playing w-[11.5rem] sm:w-[13.5rem]" style="aspect-ratio:${cw}/${ch}" role="img" aria-label="Grilla">
        ${letters}
      </div>
    </div>
  `;
}

function persistOverlay(startAt: number) {
  const remaining = MIN_DURATION_MS - (Date.now() - startAt);
  if (remaining <= 0) return;

  document.getElementById(OVERLAY_ID)?.remove();

  const shell = document.createElement("div");
  shell.id = OVERLAY_ID;
  shell.className =
    "fixed inset-0 z-[9999] bg-background pointer-events-none";
  shell.setAttribute("aria-live", "polite");
  shell.setAttribute("aria-busy", "true");
  shell.innerHTML = buildPersistHtml();

  document.body.appendChild(shell);

  const fadeAt = Math.max(0, remaining - 350);
  setTimeout(() => {
    shell.style.transition = "opacity 350ms ease";
    shell.style.opacity = "0";
  }, fadeAt);

  setTimeout(() => shell.remove(), remaining);
}

export function LoadingOverlay() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    document.getElementById(OVERLAY_ID)?.remove();
    setMounted(true);

    return () => {
      document.getElementById(OVERLAY_ID)?.remove();
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      id={OVERLAY_ID}
      className="fixed inset-0 z-[9999] bg-background"
      aria-live="polite"
      aria-busy="true"
    >
      <LoadingContent />
    </div>,
    document.body
  );
}

/** Usado por loading.tsx de Next.js — respeta duración mínima al desmontar */
export function AppLoading() {
  const startAt = useRef(Date.now());

  useEffect(() => {
    startAt.current = Date.now();

    return () => {
      persistOverlay(startAt.current);
    };
  }, []);

  return <LoadingOverlay />;
}
