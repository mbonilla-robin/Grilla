"use client";

import { NavigationLoader } from "./navigation-loader";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavigationLoader />
      {children}
    </>
  );
}
