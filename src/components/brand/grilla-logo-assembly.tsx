"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Horizontal wordmark parts (black on transparent), from grilla-logo@2x. */
export const LOGO_ASSEMBLY_SIZE = { width: 356, height: 181 } as const;

export const LOGO_ASSEMBLY_PARTS = [
  { name: "g", src: "/logo-assembly/g.png", left: 8, top: 60, w: 57, h: 113 },
  { name: "r", src: "/logo-assembly/r.png", left: 82, top: 48, w: 54, h: 78 },
  { name: "i", src: "/logo-assembly/i.png", left: 154, top: 60, w: 20, h: 69 },
  { name: "idot", src: "/logo-assembly/idot.png", left: 164, top: 41, w: 9, h: 9 },
  { name: "l1", src: "/logo-assembly/l1.png", left: 191, top: 8, w: 30, h: 125 },
  { name: "l2", src: "/logo-assembly/l2.png", left: 238, top: 8, w: 30, h: 125 },
  { name: "a", src: "/logo-assembly/a.png", left: 287, top: 54, w: 61, h: 82 },
] as const;

export type LogoAssemblyPartName = (typeof LOGO_ASSEMBLY_PARTS)[number]["name"];

/** Full sting length including the final settle. */
export const LOGO_ASSEMBLY_DURATION_MS = 2500;

const MOTION: Record<
  LogoAssemblyPartName,
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

const PLAY_ORDER: LogoAssemblyPartName[] = ["g", "i", "r", "idot", "l1", "l2", "a"];

interface GrillaLogoAssemblyProps {
  className?: string;
  /** Restart the sting when this value changes. */
  replayKey?: number | string;
  /** Fires once after the assembly finishes. */
  onComplete?: () => void;
}

export function GrillaLogoAssembly({
  className,
  replayKey = 0,
  onComplete,
}: GrillaLogoAssemblyProps) {
  const [playing, setPlaying] = useState(false);
  const { width: cw, height: ch } = LOGO_ASSEMBLY_SIZE;

  useEffect(() => {
    setPlaying(false);
    const start = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPlaying(true));
    });

    const done = window.setTimeout(() => {
      onComplete?.();
    }, LOGO_ASSEMBLY_DURATION_MS);

    return () => {
      cancelAnimationFrame(start);
      window.clearTimeout(done);
    };
  }, [replayKey, onComplete]);

  const byName = Object.fromEntries(
    LOGO_ASSEMBLY_PARTS.map((part) => [part.name, part])
  ) as Record<LogoAssemblyPartName, (typeof LOGO_ASSEMBLY_PARTS)[number]>;

  return (
    <div
      className={cn("logo-assembly", playing && "logo-assembly-playing", className)}
      style={{ aspectRatio: `${cw} / ${ch}` }}
      role="img"
      aria-label="Grilla"
    >
      {PLAY_ORDER.map((name) => {
        const part = byName[name];
        const motion = MOTION[name];
        return (
          <div
            key={`${name}-${replayKey}`}
            className={cn("logo-assembly-letter", `logo-assembly-${name}`)}
            style={
              {
                left: `${(part.left / cw) * 100}%`,
                top: `${(part.top / ch) * 100}%`,
                width: `${(part.w / cw) * 100}%`,
                height: `${(part.h / ch) * 100}%`,
                "--logo-anim": motion.anim,
                "--logo-delay": `${motion.delay}s`,
                "--logo-dur": `${motion.dur}s`,
                "--logo-ease": motion.ease,
              } as CSSProperties
            }
          >
            <img src={part.src} alt="" draggable={false} />
          </div>
        );
      })}
    </div>
  );
}
