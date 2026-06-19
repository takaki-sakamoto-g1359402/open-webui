"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditLogRecord } from "@/lib/admin/audit-logs";
import { formatDateTime } from "@/lib/domain/time";
import { type MessageKey } from "@/lib/i18n";
import { useApp } from "./app-provider";

type AuditLogResponse = {
  source: "demo" | "supabase";
  logs: AuditLogRecord[];
};

export function AuditLogPanel() {
  const { t, locale, preferences } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [audit, setAudit] = useState<AuditLogResponse | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    const response = await fetch("/api/admin/audit-logs", {
      headers: {
        accept: "application/json"
      }
    });
    const body = (await response.json()) as AuditLogResponse | { error?: string };
    if (!response.ok) {
      throw new Error("error" in body && body.error ? body.error : response.statusText);
    }
    return body as AuditLogResponse;
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setAudit(await fetchAuditLogs());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("admin.auditFailed"));
    } finally {
      setLoading(false);
    }
  }, [fetchAuditLogs, t]);

  useEffect(() => {
    let cancelled = false;
    fetchAuditLogs()
      .then((body) => {
        if (!cancelled) {
          setAudit(body);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : t("admin.auditFailed"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetchAuditLogs, t]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-[var(--app-cyan)]" aria-hidden="true" />
          <CardTitle>{t("admin.audit")}</CardTitle>
        </div>
        <CardDescription>{t("admin.auditHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={audit?.source === "supabase" ? "success" : "outline"}>
              {audit ? t(`admin.auditSource.${audit.source}` as MessageKey) : t("common.loading")}
            </Badge>
            <Badge variant="outline">{t("admin.auditReadOnly")}</Badge>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={loadAuditLogs} disabled={loading}>
            {loading ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <History size={15} aria-hidden="true" />
            )}
            {t("admin.refreshAudit")}
          </Button>
        </div>

        {error ? (
          <p className="rounded-[8px] border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
            {t("admin.auditFailed")}: {error}
          </p>
        ) : null}

        {!loading && audit?.logs.length === 0 ? (
          <p className="rounded-[8px] bg-[var(--app-surface-strong)] px-3 py-4 text-sm font-semibold text-[var(--app-muted)]">
            {t("admin.noAuditLogs")}
          </p>
        ) : null}

        {audit?.logs.length ? (
          <div
            className="flex max-h-[520px] flex-col gap-2 overflow-auto"
            tabIndex={0}
            aria-label={t("admin.audit")}
          >
            {audit.logs.map((log) => (
              <article
                key={log.id}
                className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface)] p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={auditActionVariant(log.action)}>{log.action}</Badge>
                      <span className="break-all text-sm font-black">{log.tableName}</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                      {formatDateTime(log.createdAtUtc, locale, preferences.timezone)}
                    </p>
                  </div>
                  {log.rowId ? (
                    <Badge variant="outline">
                      {t("admin.auditRow")}: {shortId(log.rowId)}
                    </Badge>
                  ) : null}
                </div>

                {log.summary ? (
                  <p className="mt-3 break-words rounded-[8px] bg-[var(--app-surface-strong)] px-3 py-2 text-sm leading-5 text-[var(--app-muted)]">
                    {log.summary}
                  </p>
                ) : null}

                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                  <AuditMeta label={t("admin.auditActor")} value={log.actorUserId ?? "admin-token"} />
                  <AuditMeta label={t("admin.auditIp")} value={log.ip ?? t("common.unknown")} />
                  <AuditMeta
                    label={t("admin.auditUserAgent")}
                    value={log.userAgent ? compactUserAgent(log.userAgent) : t("common.unknown")}
                  />
                </dl>
              </article>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AuditMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-[var(--app-surface-strong)] p-2">
      <dt className="font-bold uppercase text-[var(--app-muted)]">{label}</dt>
      <dd className="mt-1 break-all font-semibold text-[var(--app-text)]">{value}</dd>
    </div>
  );
}

function auditActionVariant(action: string) {
  if (action.includes("correction")) {
    return "stale";
  }
  if (action.includes("upsert") || action.includes("persist")) {
    return "success";
  }
  return "outline";
}

function shortId(value: string) {
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}

function compactUserAgent(value: string) {
  return value.length > 48 ? `${value.slice(0, 45)}...` : value;
}
