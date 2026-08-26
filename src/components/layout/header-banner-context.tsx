"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";

type HeaderBannerContextValue = {
  banner: string | null;
  setBanner: (banner: string | null) => void;
};

const HeaderBannerContext = createContext<HeaderBannerContextValue | null>(
  null
);

export function HeaderBannerProvider({ children }: { children: ReactNode }) {
  const [banner, setBanner] = useState<string | null>(null);

  return (
    <HeaderBannerContext.Provider value={{ banner, setBanner }}>
      {children}
    </HeaderBannerContext.Provider>
  );
}

export function useHeaderBanner() {
  return useContext(HeaderBannerContext)?.banner ?? null;
}

export function HeaderBanner({ message }: { message: string | null }) {
  const ctx = useContext(HeaderBannerContext);
  const setBanner = ctx?.setBanner;

  useLayoutEffect(() => {
    if (!setBanner) return;
    setBanner(message);
    return () => setBanner(null);
  }, [message, setBanner]);

  return null;
}
