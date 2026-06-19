"use client";

import { AppShell, PageHeader } from "@/components/app/app-shell";
import { useApp } from "@/components/app/app-provider";
import { FavoritesPanel } from "@/components/app/favorites-panel";

export default function FavoritesPage() {
  const { t } = useApp();
  return (
    <AppShell>
      <PageHeader title={t("favorites.title")} subtitle={t("favorites.subtitle")} />
      <FavoritesPanel />
    </AppShell>
  );
}
