"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyableText({
  text,
  children,
  className,
}: {
  text: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const value = text.trim();

  if (!value) return <>{children}</>;

  async function handleCopy(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // silent
    }
  }

  return (
    <div className={cn("group/copy relative flex items-start gap-1", className)}>
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "Copiado" : "Copiar"}
        aria-label={copied ? "Copiado" : "Copiar texto"}
        className={cn(
          "no-print mt-px inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border bg-surface text-muted shadow-sm transition-all",
          "pointer-events-none opacity-0",
          "group-hover/copy:pointer-events-auto group-hover/copy:opacity-100",
          "focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20",
          "hover:border-border hover:text-foreground",
          copied
            ? "pointer-events-auto opacity-100 border-emerald-200 text-emerald-600"
            : "border-border/80"
        )}
      >
        {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2} />}
      </button>
    </div>
  );
}
