"use client";

import { AlertTriangle, CheckCircle2, CircleSlash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatPercent, type MessageKey } from "@/lib/i18n";
import { formatSourceHealthCoverage, formatSourceHealthError } from "@/lib/domain/source-health";
import { formatRelativeAge } from "@/lib/domain/time";
import type { SourceHealth } from "@/lib/domain/types";
import { useApp } from "./app-provider";

const healthIcon = {
  healthy: CheckCircle2,
  degraded: AlertTriangle,
  stale: AlertTriangle,
  missing_credentials: CircleSlash,
  disabled: CircleSlash
} as const;

export function SourceHealthPanel({ items }: { items: SourceHealth[] }) {
  const { t, locale, now } = useApp();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("home.sourceHealth")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.map((item) => {
          const Icon = healthIcon[item.state];
          const providerLabel = t(`provider.${item.provider}` as MessageKey);
          const sourceError = formatSourceHealthError(item, t);
          return (
            <article key={item.provider} className="rounded-[8px] border border-[var(--app-border)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon size={16} aria-hidden="true" className="text-[var(--app-cyan)]" />
                    <h3 className="text-sm font-bold">
                      {providerLabel}
                    </h3>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                    {formatSourceHealthCoverage(item, t)}
                  </p>
                </div>
                <Badge
                  variant={
                    item.state === "healthy"
                      ? "success"
                      : item.state === "degraded"
                        ? "stale"
                        : "outline"
                  }
                >
                  {t(`health.${item.state}` as MessageKey)}
                </Badge>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Progress
                  value={Math.round(item.confidence * 100)}
                  aria-label={t("home.sourceConfidence", { source: providerLabel })}
                />
                <span className="w-12 text-right text-xs font-semibold">
                  {formatPercent(item.confidence, locale)}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--app-muted)]">
                <div>
                  <dt className="font-semibold">{t("common.lastChecked")}</dt>
                  <dd>
                    {item.lastCheckedUtc
                      ? formatRelativeAge(item.lastCheckedUtc, now, locale)
                      : t("common.notAvailable")}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">{t("common.coverage")}</dt>
                  <dd>{item.quotaRemaining ?? t("common.unknown")}</dd>
                </div>
              </dl>
              {sourceError ? (
                <p className="mt-2 rounded-[8px] bg-[var(--app-amber-soft)] px-2 py-1 text-xs font-medium text-[var(--app-amber)]">
                  {sourceError}
                </p>
              ) : null}
            </article>
          );
        })}
      </CardContent>
    </Card>
  );
}
