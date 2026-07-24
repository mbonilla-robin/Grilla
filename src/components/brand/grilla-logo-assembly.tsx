"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Stacked square wordmark (gri / lla), black on transparent. */
export const LOGO_ASSEMBLY_SIZE = { width: 397, height: 457 } as const;

export const LOGO_ASSEMBLY_PARTS = [
  { name: "g", src: "/logo-assembly/g.png", left: 20, top: 53, w: 103, h: 204 },
  { name: "r", src: "/logo-assembly/r.png", left: 157, top: 33, w: 99, h: 141 },
  { name: "i", src: "/logo-assembly/i.png", left: 287, top: 53, w: 36, h: 126 },
  { name: "idot", src: "/logo-assembly/idot.png", left: 303, top: 20, w: 19, h: 18 },
  { name: "l1", src: "/logo-assembly/l1.png", left: 99, top: 211, w: 55, h: 226 },
  { name: "l2", src: "/logo-assembly/l2.png", left: 184, top: 211, w: 54, h: 226 },
  { name: "a", src: "/logo-assembly/a.png", left: 266, top: 229, w: 111, h: 147 },
] as const;

export type LogoAssemblyPartName = (typeof LOGO_ASSEMBLY_PARTS)[number]["name"];

/** Full sting length including final settle. */
export const LOGO_ASSEMBLY_DURATION_MS = 2600;

const PLAY_ORDER: LogoAssemblyPartName[] = ["g", "i", "r", "idot", "l1", "l2", "a"];

type MotionSpec = {
  delay: number;
  duration: number;
  easing: string;
  /** Keyframes as functions of the logo scale (1 = preview ~420px wide). */
  frames: (s: number) => Keyframe[];
};

const MOTION: Record<LogoAssemblyPartName, MotionSpec> = {
  g: {
    delay: 0,
    duration: 420,
    easing: "cubic-bezier(0.15, 0.85, 0.2, 1)",
    frames: (s) => [
      { opacity: 0, transform: `translate(${-160 * s}px, ${20 * s}px) rotate(-42deg)` },
      { opacity: 1, transform: "none" },
    ],
  },
  i: {
    delay: 240,
    duration: 400,
    easing: "cubic-bezier(0.15, 0.9, 0.2, 1)",
    frames: (s) => [
      { opacity: 0, transform: `translateY(${-150 * s}px)` },
      { opacity: 1, transform: "none" },
    ],
  },
  r: {
    delay: 480,
    duration: 900,
    easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
    frames: (s) => [
      { opacity: 0, transform: `translate(0, ${-130 * s}px) rotate(-8deg)`, offset: 0 },
      { opacity: 1, transform: "none", offset: 0.38 },
      {
        opacity: 1,
        transform: `rotate(-14deg) translate(${-4 * s}px, 0)`,
        offset: 0.52,
      },
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
    frames: (s) => [
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
    frames: (s) => [
      { opacity: 0, transform: `translateY(${160 * s}px)` },
      { opacity: 1, transform: "none" },
    ],
  },
  l2: {
    delay: 1750,
    duration: 400,
    easing: "cubic-bezier(0.15, 0.85, 0.2, 1)",
    frames: (s) => [
      { opacity: 0, transform: `translateY(${-160 * s}px)` },
      { opacity: 1, transform: "none" },
    ],
  },
  a: {
    delay: 1950,
    duration: 420,
    easing: "cubic-bezier(0.15, 0.85, 0.2, 1)",
    frames: (s) => [
      {
        opacity: 0,
        transform: `translate(${150 * s}px, ${24 * s}px) rotate(24deg)`,
      },
      { opacity: 1, transform: "none" },
    ],
  },
};

interface GrillaLogoAssemblyProps {
  className?: string;
  width?: number | string;
  replayKey?: number | string;
  onComplete?: () => void;
}

export function GrillaLogoAssembly({
  className,
  width = "8.5rem",
  replayKey = 0,
  onComplete,
}: GrillaLogoAssemblyProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { width: cw, height: ch } = LOGO_ASSEMBLY_SIZE;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let cancelled = false;
    const anims: Animation[] = [];
    let doneTimer = 0;

    const play = () => {
      if (cancelled) return;
      const widthPx = root.getBoundingClientRect().width;
      // Fallback if layout hasn't resolved yet — still animate with a sensible scale
      const scale = (widthPx > 8 ? widthPx : 176) / 420;

      PLAY_ORDER.forEach((name) => {
        const el = root.querySelector<HTMLElement>(`[data-letter="${name}"]`);
        if (!el) return;
        const motion = MOTION[name];
        el.getAnimations().forEach((a) => a.cancel());
        el.style.opacity = "0";
        const anim = el.animate(motion.frames(scale), {
          duration: motion.duration,
          delay: motion.delay,
          easing: motion.easing,
          fill: "forwards",
        });
        anims.push(anim);
      });

      doneTimer = window.setTimeout(() => {
        if (!cancelled) onComplete?.();
      }, LOGO_ASSEMBLY_DURATION_MS);
    };

    // Wait two frames so width/aspect-ratio are real before measuring
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(play);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      anims.forEach((a) => a.cancel());
      window.clearTimeout(doneTimer);
    };
  }, [replayKey, onComplete]);

  const byName = Object.fromEntries(
    LOGO_ASSEMBLY_PARTS.map((part) => [part.name, part])
  ) as Record<LogoAssemblyPartName, (typeof LOGO_ASSEMBLY_PARTS)[number]>;

  return (
    <div
      ref={rootRef}
      className={cn("logo-assembly", className)}
      style={{
        position: "relative",
        display: "block",
        width,
        maxWidth: "100%",
        aspectRatio: `${cw} / ${ch}`,
        flexShrink: 0,
      }}
      role="img"
      aria-label="Grilla"
    >
      {PLAY_ORDER.map((name) => {
        const part = byName[name];
        return (
          <div
            key={`${name}-${replayKey}`}
            data-letter={name}
            className={cn("logo-assembly-letter", `logo-assembly-${name}`)}
            style={{
              position: "absolute",
              left: `${(part.left / cw) * 100}%`,
              top: `${(part.top / ch) * 100}%`,
              width: `${(part.w / cw) * 100}%`,
              height: `${(part.h / ch) * 100}%`,
              margin: 0,
              padding: 0,
              opacity: 0,
            }}
          >
            <img
              src={`${part.src}?v=black`}
              alt=""
              draggable={false}
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                objectFit: "fill",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
