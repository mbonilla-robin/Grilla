import { Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md";
}

export function Logo({ size = "md" }: LogoProps) {
  const iconSize = size === "sm" ? 18 : 22;
  const textSize = size === "sm" ? "text-base" : "text-lg";

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent">
        <Grid3x3 size={iconSize} className="text-accent-foreground" strokeWidth={1.5} />
      </div>
      <span className={cn("font-semibold tracking-tight", textSize)}>Grilla</span>
    </div>
  );
}
