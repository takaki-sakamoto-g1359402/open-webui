"use client";

import { Activity, MonitorSmartphone } from "lucide-react";
import { AlertBanner } from "./notice";
import { AppShell, PageHeader } from "./app-shell";
import { FilterBar } from "./filter-bar";
import { MinecraftPanel } from "./minecraft-panel";
import { SourceHealthPanel } from "./source-health-panel";
import { StreamCard } from "./stream-card";
import { WatchRoutePanel } from "./watch-route-panel";
import { useApp } from "./app-provider";
import { filterTodayStreams } from "@/lib/domain/filtering";
import { formatPlural } from "@/lib/i18n";
import { EmptyState } from "@/components/ui/empty-state";

export function HomePage() {
  const { t, streams, preferences, sourceHealth, now, locale, dataMode } = useApp();
  const loading = dataMode === "loading";
  const filtered = loading ? [] : filterTodayStreams(streams, preferences, now);
  const modeNotice =
    dataMode === "loading"
      ? t("home.loadingText")
      : dataMode === "live_api"
      ? t("home.liveNotice")
      : dataMode === "mixed_degraded"
        ? t("home.degradedNotice")
        : dataMode === "offline_cache"
          ? t("home.offlineNotice")
          : t("home.demoNotice");

  return (
    <AppShell>
      <PageHeader
        title={t("home.title")}
        subtitle={t("home.subtitle")}
        action={
          <div className="flex gap-2">
            <span className="inline-flex min-h-10 items-center gap-2 rounded-[8px] border border-[var(--app-border)] bg-white px-3 text-sm font-bold text-[var(--app-text)]">
              <Activity size={16} aria-hidden="true" />
              {formatPlural(filtered.length, locale, "plural.streams")}
            </span>
            <span className="hidden min-h-10 items-center gap-2 rounded-[8px] border border-[var(--app-border)] bg-white px-3 text-sm font-bold text-[var(--app-text)] md:inline-flex">
              <MonitorSmartphone size={16} aria-hidden="true" />
              {preferences.timezone}
            </span>
          </div>
        }
      />

      <AlertBanner
        title={t("app.unofficial")}
        body={dataMode === "offline_cache" ? t("app.notAffiliated") : `${modeNotice} ${t("app.notAffiliated")}`}
      />

      <FilterBar />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section aria-live="polite" className="flex min-w-0 flex-col gap-3">
          {loading ? (
            <EmptyState title={t("common.loading")} body={t("home.loadingText")} />
          ) : filtered.length === 0 ? (
            <EmptyState title={t("empty.streamsTitle")} body={t("home.noResults")} />
          ) : (
            filtered.map((stream) => <StreamCard key={stream.id} stream={stream} />)
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-4">
          <SourceHealthPanel items={sourceHealth} />
          <WatchRoutePanel limit={3} />
          <MinecraftPanel compact />
        </aside>
      </div>
    </AppShell>
  );
}
