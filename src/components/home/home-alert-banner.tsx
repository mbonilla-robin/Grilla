"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface HomeAlertBannerProps {
  urgentCount: number;
  pendingCount: number;
  storageKey?: string;
}

function buildMessage(urgentCount: number, pendingCount: number): string {
  if (urgentCount > 0) {
    return urgentCount === 1
      ? "Tienes 1 tarea urgente en los próximos días."
      : `Tienes ${urgentCount} tareas urgentes en los próximos días.`;
  }
  if (pendingCount > 0) {
    return pendingCount === 1
      ? "Tienes 1 tarea pendiente."
      : `Tienes ${pendingCount} tareas pendientes.`;
  }
  return "Todo al día — nada urgente por ahora.";
}

export function HomeAlertBanner({
  urgentCount,
  pendingCount,
  storageKey = "home-alert-dismissed",
}: HomeAlertBannerProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const stored = localStorage.getItem(storageKey);
    setDismissed(stored === today);
  }, [storageKey]);

  function handleDismiss() {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(storageKey, today);
    setDismissed(true);
  }

  if (dismissed) return null;

  const isPositive = urgentCount === 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm",
        isPositive
          ? "bg-surface text-foreground border border-border"
          : "bg-foreground text-background"
      )}
    >
      <span className="flex-1 min-w-0">{buildMessage(urgentCount, pendingCount)}</span>
      <button
        type="button"
        onClick={handleDismiss}
        className={cn(
          "shrink-0 rounded-full p-0.5 transition-opacity hover:opacity-70",
          isPositive ? "text-muted hover:text-foreground" : "text-background/70 hover:text-background"
        )}
        aria-label="Cerrar"
      >
        <X size={14} />
      </button>
    </div>
  );
}
