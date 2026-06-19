"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clipboard, RefreshCw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { buildProviderConfigExport } from "@/lib/admin/provider-config-export";
import { providers, type Provider } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/domain/time";
import { formatPercent, type MessageKey } from "@/lib/i18n";
import { useApp } from "./app-provider";

type RegistryChannel = {
  id?: string;
  provider: Provider;
  providerChannelId: string;
  displayName: string;
  slug: string;
  branch: string;
  languages: string[];
  tags: string[];
  aliases: string[];
  confidence: number;
  isActive: boolean;
  updatedAt?: string;
  demo?: boolean;
};

type RegistryResponse = {
  source: "demo" | "supabase";
  channels: RegistryChannel[];
};

const emptyForm: RegistryChannel = {
  provider: "youtube",
  providerChannelId: "",
  displayName: "",
  slug: "",
  branch: "jp",
  languages: ["ja"],
  tags: [],
  aliases: [],
  confidence: 0.7,
  isActive: true
};

export function RegistryAdminPanel() {
  const { t, locale, preferences } = useApp();
  const [channels, setChannels] = useState<RegistryChannel[]>([]);
  const [source, setSource] = useState<RegistryResponse["source"]>("demo");
  const [form, setForm] = useState<RegistryChannel>(emptyForm);
  const [message, setMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadRegistry = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/creator-channels", {
        headers: { accept: "application/json" }
      });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const body = (await response.json()) as RegistryResponse;
      setChannels(body.channels);
      setSource(body.source);
      if (body.channels[0]) {
        setForm(body.channels[0]);
      }
    } catch {
      setMessage(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        void loadRegistry();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadRegistry]);

  const grouped = useMemo(
    () =>
      channels.reduce<Record<string, RegistryChannel[]>>((acc, channel) => {
        const key = channel.branch || "unknown";
        acc[key] = [...(acc[key] ?? []), channel];
        return acc;
      }, {}),
    [channels]
  );
  const selectedKey = `${form.provider}:${form.providerChannelId}`;
  const providerConfig = useMemo(() => buildProviderConfigExport(channels), [channels]);

  async function copyConfig(text: string) {
    setCopyMessage("");
    try {
      if (!navigator.clipboard) {
        throw new Error("clipboard_unavailable");
      }
      await navigator.clipboard.writeText(text);
      setCopyMessage(t("admin.providerExportCopied"));
    } catch {
      setCopyMessage(t("admin.providerExportCopyFailed"));
    }
  }

  async function saveRegistry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/creator-channels", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(form)
      });
      const body = (await response.json().catch(() => ({}))) as {
        persisted?: boolean;
        reason?: string;
        error?: string;
        channel?: RegistryChannel;
      };

      if (response.status === 401) {
        setMessage(t("admin.registryAdminRequired"));
        return;
      }
      if (response.status === 202 && body.reason === "missing_supabase") {
        setMessage(t("admin.registryDegraded"));
        return;
      }
      if (!response.ok || !body.channel) {
        throw new Error(body.error ?? response.statusText);
      }

      setChannels((current) => [
        body.channel as RegistryChannel,
        ...current.filter(
          (item) =>
            !(
              item.provider === body.channel?.provider &&
              item.providerChannelId === body.channel.providerChannelId
            )
        )
      ]);
      setMessage(t("admin.registrySaved"));
    } catch {
      setMessage(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.registryManager")}</CardTitle>
        <CardDescription>{t("admin.registryHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 rounded-[8px] border border-[var(--app-border)] p-3" aria-busy={loading}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black">{t("admin.talentRegistry")}</h3>
              <Badge variant="outline">
                {t("admin.registrySource")}: {t(`admin.registrySource.${source}` as MessageKey)}
              </Badge>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => void loadRegistry()}>
              <RefreshCw size={14} aria-hidden="true" />
              {t("admin.refreshRegistry")}
            </Button>
          </div>
          <div
            className="mt-3 max-h-[420px] overflow-auto"
            tabIndex={0}
            aria-label={t("admin.talentRegistry")}
          >
            {loading && channels.length === 0 ? (
              <p className="rounded-[8px] bg-[var(--app-surface-strong)] px-3 py-4 text-sm font-semibold text-[var(--app-muted)]">
                {t("common.loading")}
              </p>
            ) : null}
            {!loading && channels.length === 0 ? (
              <p className="rounded-[8px] bg-[var(--app-surface-strong)] px-3 py-4 text-sm font-semibold text-[var(--app-muted)]">
                {t("common.empty")}
              </p>
            ) : null}
            {Object.entries(grouped).map(([branch, records]) => (
              <div key={branch} className="mb-3">
                <div className="mb-2 text-xs font-black uppercase text-[var(--app-muted)]">
                  {branch}
                </div>
                <div className="flex flex-col gap-2">
                  {records.map((channel) => (
                    <button
                      key={`${channel.provider}-${channel.providerChannelId}-${channel.slug}`}
                      type="button"
                      aria-pressed={`${channel.provider}:${channel.providerChannelId}` === selectedKey}
                      className="rounded-[8px] border border-[var(--app-border)] bg-white p-3 text-left hover:bg-[var(--app-surface-strong)] aria-pressed:border-[var(--app-cyan)] aria-pressed:bg-[var(--app-cyan-soft)]"
                      onClick={() => setForm(channel)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={channel.isActive ? "success" : "outline"}>
                          {t(`provider.${channel.provider}` as MessageKey)}
                        </Badge>
                        {channel.demo ? <Badge variant="outline">{t("common.demo")}</Badge> : null}
                        <span className="font-bold">{channel.displayName}</span>
                      </div>
                      <p className="mt-1 break-all text-xs text-[var(--app-muted)]">
                        {channel.providerChannelId}
                      </p>
                      <p className="mt-1 text-xs text-[var(--app-muted)]">
                        {formatPercent(channel.confidence, locale)} · {channel.tags.join(", ") || t("common.empty")}
                      </p>
                      {channel.updatedAt ? (
                        <p className="mt-1 text-xs text-[var(--app-muted)]">
                          {t("common.lastChecked")}: {formatDateTime(channel.updatedAt, locale, preferences.timezone)}
                        </p>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <form className="flex min-w-0 flex-col gap-3" onSubmit={saveRegistry}>
          <Field label={t("admin.provider")}>
            <NativeSelect
              value={form.provider}
              onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value as Provider }))}
            >
              {providers.map((provider) => (
                <option key={provider} value={provider}>
                  {t(`provider.${provider}` as MessageKey)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t("admin.providerItemId")}>
            <Input
              value={form.providerChannelId}
              onChange={(event) => setForm((current) => ({ ...current, providerChannelId: event.target.value }))}
              required
            />
          </Field>
          <Field label={t("admin.displayName")}>
            <Input
              value={form.displayName}
              onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
              required
            />
          </Field>
          <Field label={t("admin.slug")}>
            <Input
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              required
            />
          </Field>
          <Field label={t("common.branch")}>
            <Input
              value={form.branch}
              onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value }))}
              required
            />
          </Field>
          <Field label={t("common.language")}>
            <Input
              value={form.languages.join(", ")}
              onChange={(event) => setForm((current) => ({ ...current, languages: splitList(event.target.value) }))}
            />
          </Field>
          <Field label={t("admin.tags")}>
            <Input
              value={form.tags.join(", ")}
              onChange={(event) => setForm((current) => ({ ...current, tags: splitList(event.target.value) }))}
            />
          </Field>
          <Field label={t("admin.aliases")}>
            <Input
              value={form.aliases.join(", ")}
              onChange={(event) => setForm((current) => ({ ...current, aliases: splitList(event.target.value) }))}
            />
          </Field>
          <Field label={t("admin.confidenceInput")}>
            <Input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={form.confidence}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  confidence: Number(event.target.value)
                }))
              }
            />
          </Field>
          <label className="flex min-h-10 items-center gap-2 text-sm font-bold text-[var(--app-muted)]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
            />
            {t("admin.active")}
          </label>
          <Button type="submit" disabled={loading}>
            <Save size={16} aria-hidden="true" />
            {t("admin.saveRegistry")}
          </Button>
          {message ? (
            <p className="rounded-[8px] bg-[var(--app-cyan-soft)] px-3 py-2 text-sm font-semibold text-[var(--app-cyan)]" role="status">
              {message}
            </p>
          ) : null}
        </form>

        <section className="min-w-0 rounded-[8px] border border-[var(--app-border)] p-3 xl:col-span-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h3 className="text-sm font-black">{t("admin.providerExportTitle")}</h3>
              <p className="mt-1 text-sm leading-5 text-[var(--app-muted)]">
                {t("admin.providerExportHelp")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {t("admin.youtubeExportCount", {
                  count: providerConfig.youtubeChannels.length
                })}
              </Badge>
              <Badge variant="outline">
                {t("admin.xExportCount", { count: providerConfig.xHandles.length })}
              </Badge>
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <ProviderConfigTextarea
              label={t("admin.youtubeChannelsJson")}
              value={providerConfig.youtubeJson}
              buttonLabel={t("admin.copyYoutubeConfig")}
              onCopy={() => void copyConfig(providerConfig.youtubeJson)}
            />
            <ProviderConfigTextarea
              label={t("admin.xHandlesJson")}
              value={providerConfig.xJson}
              buttonLabel={t("admin.copyXConfig")}
              onCopy={() => void copyConfig(providerConfig.xJson)}
            />
          </div>
          {providerConfig.warnings.length > 0 ? (
            <div
              className="mt-3 rounded-[8px] border border-[var(--app-border)] bg-[var(--app-amber-soft)] p-3"
              role="region"
              aria-labelledby="provider-export-warnings-heading"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4
                  id="provider-export-warnings-heading"
                  className="text-sm font-black text-[var(--app-text)]"
                >
                  {t("admin.providerExportWarnings")}
                </h4>
                <Badge variant="stale">
                  {t(
                    providerConfig.warnings.length === 1
                      ? "admin.providerExportWarningCount.one"
                      : "admin.providerExportWarningCount.other",
                    {
                      count: providerConfig.warnings.length
                    }
                  )}
                </Badge>
              </div>
              <ul className="mt-2 grid gap-2 text-sm text-[var(--app-muted)]">
                {providerConfig.warnings.map((warning, index) => (
                  <li
                    key={`${warning.code}-${warning.provider}-${warning.providerChannelId ?? warning.displayName}-${index}`}
                    className="rounded-[8px] bg-white/80 p-2"
                  >
                    <span className="font-bold text-[var(--app-text)]">
                      {warning.displayName}
                    </span>{" "}
                    <span className="font-semibold">
                      {t(`provider.${warning.provider}` as MessageKey)}
                    </span>
                    {warning.providerChannelId ? (
                      <span className="break-all"> · {warning.providerChannelId}</span>
                    ) : null}
                    <div className="mt-1 text-xs leading-5">
                      {t(`admin.providerExportWarning.${warning.code}` as MessageKey, {
                        confidence:
                          typeof warning.confidence === "number"
                            ? formatPercent(warning.confidence, locale)
                            : ""
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {copyMessage ? (
            <p className="mt-3 rounded-[8px] bg-[var(--app-cyan-soft)] px-3 py-2 text-sm font-semibold text-[var(--app-cyan)]" role="status">
              {copyMessage}
            </p>
          ) : null}
        </section>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-bold text-[var(--app-muted)]">
      {label}
      {children}
    </label>
  );
}

function splitList(value: string) {
  return [...new Set(value.split(/[,、\n]+/u).map((item) => item.trim()).filter(Boolean))];
}

function ProviderConfigTextarea({
  label,
  value,
  buttonLabel,
  onCopy
}: {
  label: string;
  value: string;
  buttonLabel: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 text-sm font-bold text-[var(--app-muted)]">
      <div>{label}</div>
      <textarea
        aria-label={label}
        readOnly
        value={value}
        className="min-h-56 w-full resize-y rounded-[8px] border border-[var(--app-border-strong)] bg-[var(--app-surface-strong)] p-3 font-mono text-xs leading-5 text-[var(--app-text)]"
      />
      <Button type="button" variant="secondary" size="sm" onClick={onCopy}>
        <Clipboard size={14} aria-hidden="true" />
        {buttonLabel}
      </Button>
    </div>
  );
}
