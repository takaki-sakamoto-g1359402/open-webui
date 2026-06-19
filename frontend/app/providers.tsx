"use client";

import { RailiaProvider } from "@/lib/railia/state";

export function Providers({ children }: { children: React.ReactNode }) {
  return <RailiaProvider>{children}</RailiaProvider>;
}
