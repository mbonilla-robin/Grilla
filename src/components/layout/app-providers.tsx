"use client";

import { HeaderBannerProvider } from "./header-banner-context";
import { NavigationLoader } from "./navigation-loader";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <HeaderBannerProvider>
      <NavigationLoader />
      {children}
    </HeaderBannerProvider>
  );
}
