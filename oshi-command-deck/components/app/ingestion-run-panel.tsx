"use client";

import { useCallback, useEffect, useState } from "react";
import { DatabaseZap, History, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/domain/time";
import { formatSourceHealthCoverage } from "@/lib/domain/source-health";
import type { Provider, SourceHealth } from "@/lib/domain/types";
import type { IngestionRunHistoryItem } from "@/lib/admin/ingestion-runs";
import { formatNumber, type MessageKey } from "@/lib/i18n";
import { useApp } from "./app-provider";

type AdapterResultView = {
  provider: Provider;
  streams: unknown[];
  health: SourceHealth;
  errors: Array<{ code: string; message: string }>;
  quotaCost: number;
  requestCount: number;
};

type IngestionRunResponse = {
  mode: string;
  canonicalStreams: unknown[];
  results: AdapterResultView[];
  protectedWriteSkipped?: boolean;
  adminAuthorized?: boolean;
  persist?: {
    persisted: boolean;
    reason?: string;
    eventCount?: number;
    runCount?: number;
  };
};

type IngestionRunHistoryResponse = {
  source: "demo" | "supabase";
  runs: IngestionRunHistoryItem[];
};

export function IngestionRunPanel() {
  const { t, locale, preferences } = useApp();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestionRunResponse | null>(null);
  const [error, setError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [history, setHistory] = useState<IngestionRunHistoryResponse | null>(null);

  const fetchHistory = useCallback(async () => {
    const response = await fetch("/api/admin/ingestion-runs", {
      headers: {
        accept: "application/json"
      }
    });
    const body = (await response.json()) as IngestionRunHistoryResponse | { error?: string };
    if (!response.ok) {
      throw new Error("error" in body && body.error ? body.error : response.statusText);
    }
    return body as IngestionRunHistoryResponse;
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchHistory()
      .then((body) => {
        if (!cancelled) {
          setHistory(body);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setHistoryError(caught instanceof Error ? caught.message : t("admin.historyFailed"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetchHistory, t]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      setHistory(await fetchHistory());
    } catch (caught) {
      setHistoryError(caught instanceof Error ? caught.message : t("admin.historyFailed"));
    } finally {
      setHistoryLoading(false);
    }
  }, [fetchHistory, t]);

  async function runDryRun() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ingestion/run", { method: "POST" });
      const body = (await response.json()) as IngestionRunResponse | { error?: string };
      if (!response.ok) {
        throw new Error("error" in body && body.error ? body.error : response.statusText);
      }
      setResult(body as IngestionRunResponse);
      void loadHistory();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("admin.runFailed"));
    } finally {
      setLoading(false);
    }
  }

  const requestCount =
    result?.results.reduce((total, adapter) => total + adapter.requestCount, 0) ?? 0;
  const quotaCost = result?.results.reduce((total, adapter) => total + adapter.quotaCost, 0) ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.ingestionRuns")}</CardTitle>
        <CardDescription>{t("admin.runDryRunHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button type="button" onClick={runDryRun} disabled={loading}>
          {loading ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <DatabaseZap size={16} aria-hidden="true" />
          )}
          {loading ? t("admin.running") : t("admin.runDryRun")}
        </Button>

        {error ? (
          <p className="rounded-[8px] border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
            {t("admin.runFailed")}: {error}
          </p>
        ) : null}

        {result ? (
          <div className="flex flex-col gap-3 rounded-[8px] border border-[var(--app-border)] p-3">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <Metric
                label={t("admin.mode")}
                value={t(`admin.ingestionMode.${result.mode}` as MessageKey)}
              />
              <Metric
                label={t("admin.streamsFound")}
                value={formatNumber(result.canonicalStreams.length, locale)}
              />
              <Metric label={t("admin.requests")} value={formatNumber(requestCount, locale)} />
              <Metric label={t("admin.quotaCost")} value={formatNumber(quotaCost, locale)} />
            </div>
            {result.protectedWriteSkipped ? (
              <Badge variant="outline">{t("admin.persistSkipped")}</Badge>
            ) : null}
            <div>
              <h3 className="text-sm font-black">{t("admin.adapterResults")}</h3>
              <div className="mt-2 flex flex-col gap-2">
                {result.results.map((adapter) => (
                  <article
                    key={adapter.provider}
                    className="rounded-[8px] bg-[var(--app-surface-strong)] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">
                        {t(`provider.${adapter.provider}` as MessageKey)}
                      </span>
                      <Badge
                        variant={adapter.health.state === "healthy" ? "success" : "outline"}
                      >
                        {t(`health.${adapter.health.state}` as MessageKey)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                      {formatSourceHealthCoverage(adapter.health, t)}
                    </p>
                    {adapter.errors.length > 0 ? (
                      <p className="mt-2 text-xs font-semibold text-amber-700">
                        {adapter.errors.map((item) => item.code).join(", ")}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-[8px] border border-[var(--app-border)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <History size={18} className="text-[var(--app-cyan)]" aria-hidden="true" />
              <h3 className="text-sm font-black">{t("admin.runHistory")}</h3>
            </div>
            <div className="flex items-center gap-2">
              {history ? (
                <Badge variant={history.source === "supabase" ? "success" : "outline"}>
                  {t(`admin.historySource.${history.source}` as MessageKey)}
                </Badge>
              ) : null}
              <Button type="button" variant="secondary" size="sm" onClick={loadHistory} disabled={historyLoading}>
                {historyLoading ? (
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                ) : (
                  <History size={15} aria-hidden="true" />
                )}
                {t("admin.refreshHistory")}
              </Button>
            </div>
          </div>

          {historyError ? (
            <p className="mt-3 rounded-[8px] border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
              {t("admin.historyFailed")}: {historyError}
            </p>
          ) : null}

          {history?.runs.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--app-muted)]">{t("admin.noRunHistory")}</p>
          ) : null}

          {history?.runs.length ? (
            <div className="mt-3 flex flex-col gap-2">
              {history.runs.map((run) => (
                <article
                  key={run.id}
                  className="rounded-[8px] bg-[var(--app-surface-strong)] p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-bold">
                        {t(`provider.${run.adapter}` as MessageKey)}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                        {formatDateTime(run.finishedAtUtc ?? run.startedAtUtc, locale, preferences.timezone)}
                      </div>
                    </div>
                    <Badge variant={runStatusVariant(run.status)}>
                      {t(`ingestion.status.${run.status}` as MessageKey)}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <Metric label={t("admin.requests")} value={formatNumber(run.requestCount, locale)} />
                    <Metric label={t("admin.quotaCost")} value={formatNumber(run.quotaCost, locale)} />
                    <Metric label={t("admin.providerIssues")} value={formatNumber(run.errors.length, locale)} />
                  </div>
                  {run.errorSummary ? (
                    <p className="mt-2 text-xs font-semibold text-amber-700">
                      {run.errorSummary}
                    </p>
                  ) : null}
                  {run.errors.length > 0 ? (
                    <div className="mt-2 flex flex-col gap-1">
                      {run.errors.map((providerError) => (
                        <p
                          key={providerError.id ?? `${run.id}-${providerError.code}`}
                          className="text-xs leading-5 text-[var(--app-muted)]"
                        >
                          <span className="font-bold text-amber-800">{providerError.code}</span>
                          {providerError.rawExcerpt ? `: ${providerError.rawExcerpt}` : ""}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-[var(--app-surface-strong)] p-3">
      <div className="text-xs font-bold uppercase text-[var(--app-muted)]">{label}</div>
      <div className="mt-1 font-black">{value}</div>
    </div>
  );
}

function runStatusVariant(status: IngestionRunHistoryItem["status"]) {
  if (status === "success") {
    return "success";
  }
  if (status === "failed") {
    return "stale";
  }
  if (status === "partial") {
    return "scheduled";
  }
  return "outline";
}
