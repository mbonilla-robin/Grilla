"use client";

import { HeaderTitleProvider } from "./header-title-context";
import { NavigationLoader } from "./navigation-loader";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <HeaderTitleProvider>
      <NavigationLoader />
      {children}
    </HeaderTitleProvider>
  );
}
