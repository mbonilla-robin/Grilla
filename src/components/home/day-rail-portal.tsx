"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function DayRailPortal({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById("home-day-rail"));
  }, []);

  if (!target) return null;

  return createPortal(children, target);
}
