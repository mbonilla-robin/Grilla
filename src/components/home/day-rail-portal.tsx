"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useIsDesktop } from "@/hooks/use-media-query";

export function DayRailPortal({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    setTarget(document.getElementById("home-day-rail"));
  }, []);

  if (!target || isDesktop === false) return null;

  return createPortal(children, target);
}
