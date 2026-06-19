"use client";

import { AppProvider } from "@/components/app/app-provider";
import type { UserPreferences } from "@/lib/domain/types";

export function Providers({
  children,
  initialNowIso,
  initialPreferences,
  preferBrowserPreferenceDefaults
}: {
  children: React.ReactNode;
  initialNowIso: string;
  initialPreferences: UserPreferences;
  preferBrowserPreferenceDefaults: boolean;
}) {
  return (
    <AppProvider
      initialNowIso={initialNowIso}
      initialPreferences={initialPreferences}
      preferBrowserPreferenceDefaults={preferBrowserPreferenceDefaults}
    >
      {children}
    </AppProvider>
  );
}
