"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { formatPostHeaderDate } from "@/lib/utils";

type HeaderTitleContextValue = {
  postDateLabel: string | null;
  setPostDateLabel: (label: string | null) => void;
};

const HeaderTitleContext = createContext<HeaderTitleContextValue | null>(null);

export function HeaderTitleProvider({ children }: { children: ReactNode }) {
  const [postDateLabel, setPostDateLabel] = useState<string | null>(null);

  return (
    <HeaderTitleContext.Provider value={{ postDateLabel, setPostDateLabel }}>
      {children}
    </HeaderTitleContext.Provider>
  );
}

export function useHeaderTitle() {
  const ctx = useContext(HeaderTitleContext);
  const postDateLabel = ctx?.postDateLabel ?? null;
  return postDateLabel ? `Grilla-${postDateLabel}` : "Grilla";
}

export function PostHeaderDate({ date }: { date: string | null }) {
  const ctx = useContext(HeaderTitleContext);
  const setPostDateLabel = ctx?.setPostDateLabel;
  const label = formatPostHeaderDate(date);

  useLayoutEffect(() => {
    if (!setPostDateLabel) return;
    setPostDateLabel(label);
    return () => setPostDateLabel(null);
  }, [label, setPostDateLabel]);

  return null;
}
