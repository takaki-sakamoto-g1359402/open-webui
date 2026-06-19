"use client";

import { useEffect, useState } from "react";
import { Info, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { demoTalents } from "@/lib/domain/registry";
import { formatPercent, type MessageKey } from "@/lib/i18n";
import { AppShell, PageHeader } from "./app-shell";
import { useApp } from "./app-provider";
import { IngestionRunPanel } from "./ingestion-run-panel";
import { ManualImportPanel } from "./manual-import-panel";
import { AlertBanner } from "./notice";
import { RegistryAdminPanel } from "./registry-admin-panel";
import { CorrectionReviewPanel } from "./correction-review-panel";
import { AuditLogPanel } from "./audit-log-panel";

export function AdminPage() {
  const { t, locale } = useApp();

  return (
    <AppShell>
      <PageHeader title={t("admin.title")} subtitle={t("admin.subtitle")} />
      <AlertBanner title={t("common.adminRequired")} body={`${t("admin.demoOnly")} ${t("admin.rlsNotice")}`} />
      <AdminAuthStatus />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 xl:col-span-2">
          <ManualImportPanel />
        </div>

        <div className="min-w-0 xl:col-span-2">
          <RegistryAdminPanel />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin.talentRegistry")}</CardTitle>
            <CardDescription>{t("admin.providerIds")}</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto" tabIndex={0} aria-label={t("admin.talentRegistry")}>
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead className="text-xs uppercase text-[var(--app-muted)]">
                <tr>
                  <th className="border-b border-[var(--app-border)] py-2 pr-3">{t("common.favorite")}</th>
                  <th className="border-b border-[var(--app-border)] py-2 pr-3">{t("common.branch")}</th>
                  <th className="border-b border-[var(--app-border)] py-2 pr-3">{t("provider.youtube")}</th>
                  <th className="border-b border-[var(--app-border)] py-2 pr-3">{t("provider.x")}</th>
                  <th className="border-b border-[var(--app-border)] py-2 pr-3">{t("common.confidence")}</th>
                </tr>
              </thead>
              <tbody>
                {demoTalents.map((talent) => (
                  <tr key={talent.id}>
                    <td className="border-b border-[var(--app-border)] py-2 pr-3 font-semibold">
                      {talent.displayName}
                    </td>
                    <td className="border-b border-[var(--app-border)] py-2 pr-3">
                      {talent.branch.toUpperCase()}
                    </td>
                    <td className="border-b border-[var(--app-border)] py-2 pr-3">
                      {talent.providerIds.youtubeChannelId ?? "—"}
                    </td>
                    <td className="border-b border-[var(--app-border)] py-2 pr-3">
                      {talent.providerIds.xHandle ?? "—"}
                    </td>
                    <td className="border-b border-[var(--app-border)] py-2 pr-3">
                      {formatPercent(talent.confidence, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <IngestionRunPanel />

        <div className="min-w-0 xl:col-span-2">
          <CorrectionReviewPanel />
        </div>

        <div className="min-w-0 xl:col-span-2">
          <AuditLogPanel />
        </div>
      </div>
    </AppShell>
  );
}

function AdminAuthStatus() {
  const { t } = useApp();
  const [state, setState] = useState<"idle" | "submitting" | "failed">("idle");
  const [status, setStatus] = useState<AdminSessionStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    void fetch("/api/admin/session", {
      headers: { accept: "application/json" }
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        return (await response.json()) as AdminSessionStatus;
      })
      .then((body) => {
        if (mounted) {
          setStatus(body);
        }
      })
      .catch(() => {
        if (mounted) {
          setStatus({
            ok: false,
            protectionEnabled: true,
            authorized: false,
            source: "unavailable",
            role: null,
            writeCapable: false,
            reason: "session_status_unavailable"
          });
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function signOut() {
    setState("submitting");
    try {
      const response = await fetch("/api/admin/session", {
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      window.location.assign("/admin/login?next=/admin");
    } catch {
      setState("failed");
    }
  }

  const isUnavailable = Boolean(status && !status.ok);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          {status?.authorized ? (
            <ShieldCheck size={20} className="mt-0.5 text-[var(--app-cyan)]" aria-hidden="true" />
          ) : (
            <Info
              size={20}
              className={isUnavailable ? "mt-0.5 text-[var(--app-red)]" : "mt-0.5 text-[var(--app-amber)]"}
              aria-hidden="true"
            />
          )}
          <div
            className="min-w-0"
            role={isUnavailable ? "alert" : "status"}
            aria-live={isUnavailable ? "assertive" : "polite"}
            aria-busy={!status}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-black">{t(getAdminStatusTitleKey(status))}</h2>
              <Badge variant={status?.authorized ? "success" : "outline"}>
                {t(getAdminStatusBadgeKey(status))}
              </Badge>
              {status?.role ? <Badge variant="outline">{t(getAdminRoleKey(status.role))}</Badge> : null}
            </div>
            <p className="mt-1 text-sm leading-5 text-[var(--app-muted)]">
              {t(getAdminStatusBodyKey(status))}
            </p>
            {state === "failed" ? (
              <p
                className="mt-2 rounded-[8px] bg-[var(--app-red-soft)] px-3 py-2 text-sm font-semibold text-[var(--app-red)]"
                role="alert"
              >
                {t("admin.logoutFailed")}
              </p>
            ) : null}
          </div>
        </div>
        {status?.protectionEnabled && status.authorized ? (
          <Button type="button" variant="secondary" onClick={() => void signOut()} disabled={state === "submitting"}>
            <LogOut size={16} aria-hidden="true" />
            {state === "submitting" ? t("admin.logoutSubmitting") : t("admin.logout")}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

type AdminSessionStatus = {
  ok: boolean;
  protectionEnabled: boolean;
  authorized: boolean;
  source: "demo_open" | "none" | "admin_token" | "admin_session" | "supabase_auth" | "unavailable";
  role: "owner" | "admin" | "reviewer" | null;
  writeCapable: boolean;
  reason: string | null;
};

function getAdminStatusTitleKey(status: AdminSessionStatus | null): MessageKey {
  if (!status) {
    return "admin.authStatusCheckingTitle";
  }
  if (!status.ok) {
    return "admin.authStatusUnavailableTitle";
  }
  if (!status.protectionEnabled) {
    return "admin.authStatusDemoTitle";
  }
  return status.authorized ? "admin.authStatusTitle" : "admin.authStatusLockedTitle";
}

function getAdminStatusBodyKey(status: AdminSessionStatus | null): MessageKey {
  if (!status) {
    return "admin.authStatusCheckingBody";
  }
  if (!status.ok) {
    return "admin.authStatusUnavailableBody";
  }
  if (!status.protectionEnabled) {
    return "admin.authStatusDemoBody";
  }
  return status.authorized ? "admin.authStatusBody" : "admin.authStatusLockedBody";
}

function getAdminStatusBadgeKey(status: AdminSessionStatus | null): MessageKey {
  if (!status) {
    return "admin.authSource.checking";
  }
  return `admin.authSource.${status.source}` as MessageKey;
}

function getAdminRoleKey(role: NonNullable<AdminSessionStatus["role"]>): MessageKey {
  return `admin.authRole.${role}` as MessageKey;
}
