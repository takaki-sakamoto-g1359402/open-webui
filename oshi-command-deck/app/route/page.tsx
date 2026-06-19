"use client";

import { AppShell, PageHeader } from "@/components/app/app-shell";
import { useApp } from "@/components/app/app-provider";
import { WatchRoutePanel } from "@/components/app/watch-route-panel";

export default function RoutePage() {
  const { t } = useApp();
  return (
    <AppShell>
      <PageHeader title={t("route.title")} subtitle={t("route.subtitle")} />
      <WatchRoutePanel />
    </AppShell>
  );
}
