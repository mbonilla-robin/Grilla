"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  GrillaLogoAssembly,
  LOGO_ASSEMBLY_DURATION_MS,
  LOGO_ASSEMBLY_PARTS,
  LOGO_ASSEMBLY_SIZE,
} from "@/components/brand/grilla-logo-assembly";

export const MIN_DURATION_MS = LOGO_ASSEMBLY_DURATION_MS + 900;
const OVERLAY_ID = "grilla-loading-overlay";

function LoadingContent() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background px-6">
      <GrillaLogoAssembly width="8.5rem" className="mx-auto" />
    </div>
  );
}

/** Fallback DOM sting if React overlay unmounts mid-play. */
function buildPersistHtml() {
  const { width: cw, height: ch } = LOGO_ASSEMBLY_SIZE;
  const order = ["g", "i", "r", "idot", "l1", "l2", "a"] as const;

  const letters = order
    .map((name) => {
      const part = LOGO_ASSEMBLY_PARTS.find((p) => p.name === name)!;
      return `<div data-letter="${name}" class="logo-assembly-letter logo-assembly-${name}" style="position:absolute;left:${(part.left / cw) * 100}%;top:${(part.top / ch) * 100}%;width:${(part.w / cw) * 100}%;height:${(part.h / ch) * 100}%;margin:0;padding:0;opacity:0"><img src="${part.src}?v=black" alt="" style="display:block;width:100%;height:100%" /></div>`;
    })
    .join("");

  return `
    <div class="absolute inset-0 flex items-center justify-center px-6">
      <div id="grilla-logo-persist" class="logo-assembly" style="position:relative;display:block;width:8.5rem;max-width:100%;aspect-ratio:${cw}/${ch};flex-shrink:0;margin:0 auto" role="img" aria-label="Grilla">
        ${letters}
      </div>
    </div>
    <script>
      (function () {
        var root = document.getElementById("grilla-logo-persist");
        if (!root || !root.animate) return;
        var s = root.getBoundingClientRect().width / 420;
        var motion = {
          g: { delay: 0, duration: 420, easing: "cubic-bezier(0.15, 0.85, 0.2, 1)",
            frames: [{ opacity: 0, transform: "translate(" + (-160*s) + "px, " + (20*s) + "px) rotate(-42deg)" }, { opacity: 1, transform: "none" }] },
          i: { delay: 240, duration: 400, easing: "cubic-bezier(0.15, 0.9, 0.2, 1)",
            frames: [{ opacity: 0, transform: "translateY(" + (-150*s) + "px)" }, { opacity: 1, transform: "none" }] },
          r: { delay: 480, duration: 900, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
            frames: [
              { opacity: 0, transform: "translate(0, " + (-130*s) + "px) rotate(-8deg)", offset: 0 },
              { opacity: 1, transform: "none", offset: 0.38 },
              { opacity: 1, transform: "rotate(-14deg) translate(" + (-4*s) + "px, 0)", offset: 0.52 },
              { opacity: 1, transform: "rotate(22deg) translate(" + (10*s) + "px, " + (-2*s) + "px)", offset: 0.68 },
              { opacity: 1, transform: "rotate(-4deg)", offset: 0.84 },
              { opacity: 1, transform: "none", offset: 1 }
            ] },
          idot: { delay: 780, duration: 720, easing: "cubic-bezier(0.25, 0.7, 0.2, 1)",
            frames: [
              { opacity: 0, transform: "translate(" + (-118*s) + "px, " + (28*s) + "px) scale(0.85) rotate(-20deg)", offset: 0 },
              { opacity: 1, transform: "translate(" + (-118*s) + "px, " + (28*s) + "px) scale(0.85) rotate(-20deg)", offset: 0.12 },
              { opacity: 1, transform: "translate(" + (-40*s) + "px, " + (-36*s) + "px) rotate(18deg) scale(1.05)", offset: 0.55 },
              { opacity: 1, transform: "translate(" + (2*s) + "px, " + (4*s) + "px) rotate(-4deg)", offset: 0.82 },
              { opacity: 1, transform: "none", offset: 1 }
            ] },
          l1: { delay: 1550, duration: 400, easing: "cubic-bezier(0.15, 0.85, 0.2, 1)",
            frames: [{ opacity: 0, transform: "translateY(" + (160*s) + "px)" }, { opacity: 1, transform: "none" }] },
          l2: { delay: 1750, duration: 400, easing: "cubic-bezier(0.15, 0.85, 0.2, 1)",
            frames: [{ opacity: 0, transform: "translateY(" + (-160*s) + "px)" }, { opacity: 1, transform: "none" }] },
          a: { delay: 1950, duration: 420, easing: "cubic-bezier(0.15, 0.85, 0.2, 1)",
            frames: [{ opacity: 0, transform: "translate(" + (150*s) + "px, " + (24*s) + "px) rotate(24deg)" }, { opacity: 1, transform: "none" }] }
        };
        ["g","i","r","idot","l1","l2","a"].forEach(function (name) {
          var el = root.querySelector('[data-letter="' + name + '"]');
          var m = motion[name];
          if (!el || !m) return;
          el.animate(m.frames, { duration: m.duration, delay: m.delay, easing: m.easing, fill: "forwards" });
        });
      })();
    </script>
  `;
}

function persistOverlay(startAt: number) {
  const remaining = MIN_DURATION_MS - (Date.now() - startAt);
  if (remaining <= 0) return;

  document.getElementById(OVERLAY_ID)?.remove();

  const shell = document.createElement("div");
  shell.id = OVERLAY_ID;
  shell.className = "fixed inset-0 z-[9999] bg-background pointer-events-none";
  shell.setAttribute("aria-live", "polite");
  shell.setAttribute("aria-busy", "true");
  shell.innerHTML = buildPersistHtml();

  document.body.appendChild(shell);

  // Scripts inserted via innerHTML do not execute — run WAAPI directly.
  const root = shell.querySelector("#grilla-logo-persist") as HTMLElement | null;
  if (root?.animate) {
    const s = root.getBoundingClientRect().width / 420;
    const specs: Record<
      string,
      { delay: number; duration: number; easing: string; frames: Keyframe[] }
    > = {
      g: {
        delay: 0,
        duration: 420,
        easing: "cubic-bezier(0.15, 0.85, 0.2, 1)",
        frames: [
          { opacity: 0, transform: `translate(${-160 * s}px, ${20 * s}px) rotate(-42deg)` },
          { opacity: 1, transform: "none" },
        ],
      },
      i: {
        delay: 240,
        duration: 400,
        easing: "cubic-bezier(0.15, 0.9, 0.2, 1)",
        frames: [
          { opacity: 0, transform: `translateY(${-150 * s}px)` },
          { opacity: 1, transform: "none" },
        ],
      },
      r: {
        delay: 480,
        duration: 900,
        easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
        frames: [
          { opacity: 0, transform: `translate(0, ${-130 * s}px) rotate(-8deg)`, offset: 0 },
          { opacity: 1, transform: "none", offset: 0.38 },
          { opacity: 1, transform: `rotate(-14deg) translate(${-4 * s}px, 0)`, offset: 0.52 },
          {
            opacity: 1,
            transform: `rotate(22deg) translate(${10 * s}px, ${-2 * s}px)`,
            offset: 0.68,
          },
          { opacity: 1, transform: "rotate(-4deg)", offset: 0.84 },
          { opacity: 1, transform: "none", offset: 1 },
        ],
      },
      idot: {
        delay: 780,
        duration: 720,
        easing: "cubic-bezier(0.25, 0.7, 0.2, 1)",
        frames: [
          {
            opacity: 0,
            transform: `translate(${-118 * s}px, ${28 * s}px) scale(0.85) rotate(-20deg)`,
            offset: 0,
          },
          {
            opacity: 1,
            transform: `translate(${-118 * s}px, ${28 * s}px) scale(0.85) rotate(-20deg)`,
            offset: 0.12,
          },
          {
            opacity: 1,
            transform: `translate(${-40 * s}px, ${-36 * s}px) rotate(18deg) scale(1.05)`,
            offset: 0.55,
          },
          {
            opacity: 1,
            transform: `translate(${2 * s}px, ${4 * s}px) rotate(-4deg)`,
            offset: 0.82,
          },
          { opacity: 1, transform: "none", offset: 1 },
        ],
      },
      l1: {
        delay: 1550,
        duration: 400,
        easing: "cubic-bezier(0.15, 0.85, 0.2, 1)",
        frames: [
          { opacity: 0, transform: `translateY(${160 * s}px)` },
          { opacity: 1, transform: "none" },
        ],
      },
      l2: {
        delay: 1750,
        duration: 400,
        easing: "cubic-bezier(0.15, 0.85, 0.2, 1)",
        frames: [
          { opacity: 0, transform: `translateY(${-160 * s}px)` },
          { opacity: 1, transform: "none" },
        ],
      },
      a: {
        delay: 1950,
        duration: 420,
        easing: "cubic-bezier(0.15, 0.85, 0.2, 1)",
        frames: [
          {
            opacity: 0,
            transform: `translate(${150 * s}px, ${24 * s}px) rotate(24deg)`,
          },
          { opacity: 1, transform: "none" },
        ],
      },
    };

    (["g", "i", "r", "idot", "l1", "l2", "a"] as const).forEach((name) => {
      const el = root.querySelector<HTMLElement>(`[data-letter="${name}"]`);
      const m = specs[name];
      if (!el || !m) return;
      el.animate(m.frames, {
        duration: m.duration,
        delay: m.delay,
        easing: m.easing,
        fill: "forwards",
      });
    });
  }

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
