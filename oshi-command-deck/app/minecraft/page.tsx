"use client";

import { AppShell, PageHeader } from "@/components/app/app-shell";
import { useApp } from "@/components/app/app-provider";
import { MinecraftPanel } from "@/components/app/minecraft-panel";

export default function MinecraftPage() {
  const { t } = useApp();
  return (
    <AppShell>
      <PageHeader title={t("minecraft.title")} subtitle={t("minecraft.subtitle")} />
      <MinecraftPanel />
    </AppShell>
  );
}
