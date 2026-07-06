"use client";

import { useEffect, useState } from "react";
import { MEDIA_QUERIES, viewportFromWidth, type ViewportSize } from "@/lib/breakpoints";

export function useMediaQuery(query: string): boolean | null {
  const [matches, setMatches] = useState<boolean | null>(null);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/** Matches Tailwind `md:` — sidebar day rail threshold */
export function useIsDesktop(): boolean | null {
  return useMediaQuery(MEDIA_QUERIES.md);
}

export function useViewportSize(): ViewportSize | null {
  const [size, setSize] = useState<ViewportSize | null>(null);

  useEffect(() => {
    const update = () => setSize(viewportFromWidth(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return size;
}
