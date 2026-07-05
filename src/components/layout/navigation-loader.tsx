"use client";

import { useEffect, useState } from "react";
import { LoadingOverlay, MIN_DURATION_MS } from "./app-loading";

/** Una sola vez por carga completa de la página (refresh o primera visita). */
let initialLoadConsumed = false;

function shouldShowInitialLoading(): boolean {
  if (typeof window === "undefined") return false;
  if (initialLoadConsumed) return false;

  const nav = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;

  if (nav?.type !== "reload" && nav?.type !== "navigate") return false;

  initialLoadConsumed = true;
  return true;
}

export function NavigationLoader() {
  const [visible, setVisible] = useState(shouldShowInitialLoading);

  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => setVisible(false), MIN_DURATION_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return <LoadingOverlay />;
}
