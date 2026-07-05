"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const imageSizes = {
  sm: "h-7 w-auto",
  md: "h-9 w-auto",
  lg: "h-11 w-auto",
} as const;

const textSizes = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
} as const;

export function Logo({ size = "md", showText = false }: LogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/grilla-logo.png"
        srcSet="/grilla-logo.png 1x, /grilla-logo@2x.png 2x"
        alt="Grilla"
        width={188}
        height={100}
        className={cn("shrink-0", imageSizes[size])}
      />
      {showText && (
        <span className={cn("font-semibold tracking-tight", textSizes[size])}>
          Grilla
        </span>
      )}
    </div>
  );
}
