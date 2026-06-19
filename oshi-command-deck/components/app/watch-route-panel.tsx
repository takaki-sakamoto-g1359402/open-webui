"use client";

import { Archive, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buildWatchRoute } from "@/lib/domain/watch-route";
import { getTalentName } from "@/lib/domain/filtering";
import { formatDateTime } from "@/lib/domain/time";
import { formatNumber, formatPercent, type MessageKey } from "@/lib/i18n";
import type { WatchRouteReason } from "@/lib/domain/types";
import { useApp } from "./app-provider";
import { StatusBadge } from "./status-badge";

export function WatchRoutePanel({ limit }: { limit?: number }) {
  const { t, streams, preferences, setPreferences, locale, now } = useApp();
  const route = buildWatchRoute(streams, preferences, now);
  const visible = limit ? route.slice(0, limit) : route;
  const archived = streams.filter((stream) => preferences.archivedEventIds.includes(stream.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("route.title")}</CardTitle>
        <CardDescription>{t("route.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {visible.length === 0 ? (
          <p className="rounded-[8px] border border-dashed border-[var(--app-border-strong)] p-4 text-sm text-[var(--app-muted)]">
            {t("route.noItems")}
          </p>
        ) : (
          visible.map((item) => (
            <article
              key={item.stream.id}
              className="rounded-[8px] border border-[var(--app-border)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={item.stream.status} t={t} />
                    <Badge variant="outline">{formatPercent(item.stream.confidence, locale)}</Badge>
                  </div>
                  <h3 className="mt-2 text-sm font-black leading-5">{item.stream.titleOriginal}</h3>
                  <p className="mt-1 text-xs text-[var(--app-muted)]">
                    {getTalentName(item.stream.talentId)} ·{" "}
                    {item.stream.scheduledStartUtc
                      ? formatDateTime(item.stream.scheduledStartUtc, locale, preferences.timezone)
                      : t("status.tbd")}
                  </p>
                </div>
                <div className="w-16 shrink-0 text-right">
                  <div className="text-xl font-black">{Math.round(item.score)}</div>
                  <Progress value={item.score} aria-label={t("route.title")} />
                </div>
              </div>
              <ul className="mt-3 flex flex-col gap-1 text-xs leading-5 text-[var(--app-muted)]">
                {item.reasons.map((reason) => (
                  <li key={`${item.stream.id}-${reason.code}-${reason.evidence}`} className="flex gap-2">
                    <span className={reason.weight < 0 ? "text-[var(--app-amber)]" : "text-[var(--app-cyan)]"}>
                      {reason.weight > 0 ? "+" : ""}
                      {reason.weight}
                    </span>
                    <span>
                      {t(`reason.${reason.code}` as MessageKey)}:{" "}
                      {formatReasonEvidence(reason, locale, preferences.timezone, t)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setPreferences((current) => ({
                      ...current,
                      archivedEventIds: [...current.archivedEventIds, item.stream.id]
                    }))
                  }
                >
                  <Archive size={14} aria-hidden="true" />
                  {t("common.archive")}
                </Button>
              </div>
            </article>
          ))
        )}

        {archived.length > 0 ? (
          <section className="rounded-[8px] bg-[var(--app-surface-strong)] p-3">
            <h3 className="text-sm font-bold">{t("route.archiveQueue")}</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">{t("route.archiveHelp")}</p>
            <div className="mt-2 flex flex-col gap-2">
              {archived.map((stream) => (
                <div key={stream.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate font-semibold">{stream.titleOriginal}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setPreferences((current) => ({
                        ...current,
                        archivedEventIds: current.archivedEventIds.filter((id) => id !== stream.id)
                      }))
                    }
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                    {t("common.unarchive")}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatReasonEvidence(
  reason: WatchRouteReason,
  locale: string,
  timezone: string,
  t: (key: MessageKey, params?: Record<string, string | number>) => string
) {
  if (reason.code === "favorite_category") {
    return t(`category.${reason.evidence}` as MessageKey);
  }

  if (reason.code === "minecraft_priority") {
    return t("route.evidence.minecraftAlertEnabled");
  }

  if (reason.code === "starting_soon") {
    const minutes = Number(reason.evidence);
    const key = minutes === 1 ? "route.evidence.minutes.one" : "route.evidence.minutes.other";
    return t(key, { count: formatNumber(minutes, locale) });
  }

  if (reason.code === "high_confidence") {
    const confidence = Number(reason.evidence);
    return Number.isFinite(confidence) ? formatPercent(confidence, locale) : reason.evidence;
  }

  if ((reason.code === "live_now" || reason.code === "stale_penalty") && isIsoDate(reason.evidence)) {
    return formatDateTime(reason.evidence, locale, timezone);
  }

  return reason.evidence;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}T/u.test(value) && Number.isFinite(new Date(value).getTime());
}
