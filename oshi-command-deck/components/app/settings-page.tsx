"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Globe2, Monitor, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { formatLocaleName, getBrowserLocale, supportedLocales, type Locale, type MessageKey } from "@/lib/i18n";
import { getBrowserTimezone, isValidTimeZone, normalizeTimezone } from "@/lib/domain/time";
import { AppShell, PageHeader } from "./app-shell";
import { useApp } from "./app-provider";

const commonTimezones = [
  "Asia/Tokyo",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
  "Australia/Sydney",
  "UTC"
];

export function SettingsPage() {
  const { t, locale, dir, preferences, setPreferences, pushSupported, online } = useApp();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<
    "idle" | "available" | "installing" | "accepted" | "dismissed" | "installed"
  >("idle");
  const [detectedLocale, setDetectedLocale] = useState<string>();
  const [detectedTimezone, setDetectedTimezone] = useState<string>();
  const [localeTagDraft, setLocaleTagDraft] = useState({
    value: preferences.locale,
    dirty: false
  });
  const [timezoneDraft, setTimezoneDraft] = useState({
    value: preferences.timezone,
    dirty: false
  });
  const [timezoneSaveState, setTimezoneSaveState] = useState<"idle" | "invalid">("idle");
  const localeOptions = supportedLocales.includes(locale as Locale)
    ? supportedLocales
    : [locale, ...supportedLocales];
  const localeTagValue = localeTagDraft.dirty ? localeTagDraft.value : preferences.locale;
  const timezoneOptions = useMemo(
    () => unique([preferences.timezone, detectedTimezone, ...commonTimezones]),
    [detectedTimezone, preferences.timezone]
  );
  const timezoneTagValue = timezoneDraft.dirty ? timezoneDraft.value : preferences.timezone;

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) {
        return;
      }
      setDetectedLocale(getBrowserLocale());
      setDetectedTimezone(getBrowserTimezone());
    });

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallState("available");
    }

    function handleInstalled() {
      setInstallPrompt(null);
      setInstallState("installed");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      mounted = false;
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function requestInstall() {
    if (!installPrompt) {
      return;
    }

    setInstallState("installing");
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstallState(choice.outcome === "accepted" ? "accepted" : "dismissed");
  }

  const installStatusKey =
    installState === "available"
      ? "settings.installAvailable"
      : installState === "installing"
        ? "settings.installInstalling"
        : installState === "accepted"
          ? "settings.installAccepted"
          : installState === "dismissed"
            ? "settings.installDismissed"
            : installState === "installed"
              ? "settings.installInstalled"
              : "settings.installUnavailable";

  return (
    <AppShell>
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.languageSelector")}</CardTitle>
            <CardDescription>
              {t("settings.browserDetected")}: {detectedLocale ?? t("common.unknown")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <label className="flex flex-col gap-2 text-sm font-bold">
              {t("common.locale")}
              <NativeSelect
                value={locale}
                onChange={(event) =>
                  setPreferences((current) => ({ ...current, locale: event.target.value }))
                }
              >
                {localeOptions.map((optionLocale) => (
                  <option key={optionLocale} value={optionLocale}>
                    {formatLocaleOption(optionLocale, locale, t)}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <p className="text-sm leading-5 text-[var(--app-muted)]">
              {t("settings.referenceLocaleHelp")}
            </p>
            <label className="flex flex-col gap-2 text-sm font-bold">
              {t("settings.localeTagLabel")}
              <Input
                value={localeTagValue}
                placeholder={t("settings.localeTagPlaceholder")}
                spellCheck={false}
                autoCapitalize="none"
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) =>
                  setLocaleTagDraft({
                    value: event.target.value,
                    dirty: true
                  })
                }
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                aria-label={t("settings.saveLocale")}
                onClick={() => {
                  setLocaleTagDraft({ value: localeTagValue, dirty: false });
                  setPreferences((current) => ({ ...current, locale: localeTagValue }));
                }}
              >
                {t("common.save")}
              </Button>
              <Badge variant="outline">
                {t("settings.currentDirection")}: {dir.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm leading-5 text-[var(--app-muted)]">
              {t("settings.localeTagHelp")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.timezoneSelector")}</CardTitle>
            <CardDescription>
              {t("settings.browserDetected")}: {detectedTimezone ?? t("common.unknown")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <label className="flex flex-col gap-2 text-sm font-bold">
              {t("common.timezone")}
              <NativeSelect
                value={preferences.timezone}
                onChange={(event) => {
                  const timezone = event.target.value;
                  setTimezoneDraft({ value: timezone, dirty: false });
                  setTimezoneSaveState("idle");
                  setPreferences((current) => ({ ...current, timezone }));
                }}
              >
                {timezoneOptions.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <p className="text-sm leading-5 text-[var(--app-muted)]">{t("settings.timezoneHelp")}</p>
            <label className="flex flex-col gap-2 text-sm font-bold">
              {t("settings.timezoneTagLabel")}
              <Input
                value={timezoneTagValue}
                placeholder={t("settings.timezoneTagPlaceholder")}
                spellCheck={false}
                autoCapitalize="none"
                aria-describedby="timezone-tag-help"
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => {
                  setTimezoneDraft({
                    value: event.target.value,
                    dirty: true
                  });
                  setTimezoneSaveState("idle");
                }}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                aria-label={t("settings.saveTimezone")}
                onClick={() => {
                  const normalizedTimezone = normalizeTimezone(timezoneTagValue);
                  setTimezoneSaveState(isValidTimeZone(timezoneTagValue) ? "idle" : "invalid");
                  setTimezoneDraft({ value: normalizedTimezone, dirty: false });
                  setPreferences((current) => ({ ...current, timezone: normalizedTimezone }));
                }}
              >
                {t("common.save")}
              </Button>
              <Badge variant="outline">{preferences.timezone}</Badge>
            </div>
            <p id="timezone-tag-help" className="text-sm leading-5 text-[var(--app-muted)]">
              {timezoneSaveState === "invalid"
                ? t("settings.timezoneInvalidFallback")
                : t("settings.timezoneTagHelp")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="text-[var(--app-cyan)]">
                {installState === "installed" || installState === "accepted" ? (
                  <CheckCircle2 size={20} aria-hidden="true" />
                ) : (
                  <Download size={20} aria-hidden="true" />
                )}
              </span>
              <CardTitle>{t("settings.installTitle")}</CardTitle>
            </div>
            <CardDescription>{t("settings.installHelp")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={installState === "available" ? "success" : "outline"}>
                {t(installStatusKey)}
              </Badge>
              <Badge variant="outline">{t("settings.installFallback")}</Badge>
            </div>
            <Button
              type="button"
              variant={installPrompt ? "default" : "secondary"}
              disabled={!installPrompt || installState === "installing"}
              onClick={requestInstall}
            >
              <Download size={16} aria-hidden="true" />
              {t("settings.installAction")}
            </Button>
          </CardContent>
        </Card>
        <InfoCard
          icon={<WifiOff size={20} aria-hidden="true" />}
          title={t("settings.offlineTitle")}
          body={`${t("settings.offlineHelp")} ${online ? "" : t("common.offline")}`}
        />
        <InfoCard
          icon={<Globe2 size={20} aria-hidden="true" />}
          title={t("settings.rtlPreview")}
          body={t("settings.rtlHelp")}
        />
        <InfoCard
          icon={<Monitor size={20} aria-hidden="true" />}
          title={t("settings.desktopPreview")}
          body={t("settings.desktopPreviewBody")}
        />
        <InfoCard
          icon={<Globe2 size={20} aria-hidden="true" />}
          title={t("favorites.pushTitle")}
          body={pushSupported ? t("common.enabled") : t("favorites.pushUnavailable")}
        />
      </div>
    </AppShell>
  );
}

function unique(items: Array<string | undefined>) {
  return [...new Set(items.filter((item): item is string => Boolean(item)))];
}

function InfoCard({
  icon,
  title,
  body,
  action
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-[var(--app-cyan)]">{icon}</span>
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
      {action ? <CardContent>{action}</CardContent> : null}
    </Card>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function formatLocaleOption(
  optionLocale: string,
  activeLocale: string,
  t: (key: MessageKey, params?: Record<string, string | number>) => string
) {
  if (supportedLocales.includes(optionLocale as Locale)) {
    return t(`locale.${optionLocale}` as MessageKey);
  }

  return formatLocaleName(optionLocale, activeLocale);
}
