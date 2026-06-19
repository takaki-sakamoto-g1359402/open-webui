"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { buildAlertQueue } from "@/lib/domain/alerts";
import { demoTalents } from "@/lib/domain/registry";
import { detectOverlaps } from "@/lib/domain/filtering";
import { formatDateTime } from "@/lib/domain/time";
import { streamCategories } from "@/lib/domain/types";
import { formatLanguageName, formatPercent, type MessageKey } from "@/lib/i18n";
import type { UserPreferences } from "@/lib/domain/types";
import { useApp } from "./app-provider";

export function FavoritesPanel() {
  const { t, locale, preferences, setPreferences, streams, pushSupported, now } = useApp();
  const [pushState, setPushState] = useState<PushState>("idle");
  const [pushDeviceState, setPushDeviceState] = useState<PushDeviceState>("checking");
  const overlaps = detectOverlaps(streams);
  const alertQueue = buildAlertQueue(streams, preferences, now, {
    pushConfigured: pushSupported
  });
  const favoriteLanguageOptions = useMemo(
    () =>
      [
        ...new Set([
          ...preferences.favoriteLanguages,
          ...demoTalents.flatMap((talent) => talent.languages),
          ...streams.flatMap((stream) => stream.languages)
        ])
      ]
        .filter(Boolean)
        .sort((left, right) =>
          formatLanguageName(left, locale).localeCompare(formatLanguageName(right, locale), locale, {
            sensitivity: "base"
          })
        ),
    [locale, preferences.favoriteLanguages, streams]
  );
  const favoriteOverlaps = streams.filter(
    (stream) =>
      preferences.favoriteTalentIds.includes(stream.talentId) &&
      (overlaps.get(stream.id)?.length ?? 0) > 0
  );
  const canDisablePush =
    pushDeviceState === "subscribed" &&
    pushState !== "saving" &&
    pushState !== "unsubscribing";
  const pushStatusMessageKey =
    pushState !== "idle"
      ? getPushStatusMessageKey(pushState)
      : getPushDeviceStatusMessageKey(pushDeviceState);

  useEffect(() => {
    let mounted = true;
    void readPushDeviceState().then((state) => {
      if (!mounted) {
        return;
      }
      setPushDeviceState(state);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle>{t("favorites.talents")}</CardTitle>
          <CardDescription>{t("favorites.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {demoTalents
            .filter((talent) => talent.active)
            .map((talent) => (
              <Checkbox
                key={talent.id}
                label={`${talent.displayName} · ${talent.branch.toUpperCase()}`}
                checked={preferences.favoriteTalentIds.includes(talent.id)}
                onChange={(event) =>
                  setPreferences((current) => ({
                    ...current,
                    favoriteTalentIds: event.target.checked
                      ? [...current.favoriteTalentIds, talent.id]
                      : current.favoriteTalentIds.filter((id) => id !== talent.id)
                  }))
                }
              />
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("common.alerts")}</CardTitle>
          <CardDescription>
            {pushSupported ? t("favorites.pushConfigured") : t("favorites.pushUnavailable")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {[
            ["upcoming", "favorites.alertUpcoming"],
            ["live", "favorites.alertLive"],
            ["minecraft", "favorites.alertMinecraft"],
            ["collaboration", "favorites.alertCollaboration"]
          ].map(([key, label]) => (
            <div key={key} className="flex min-h-11 items-center justify-between gap-3 rounded-[8px] border border-[var(--app-border)] p-3">
              <span className="text-sm font-semibold">{t(label as MessageKey)}</span>
              <Switch
                aria-label={t(label as MessageKey)}
                checked={preferences.alertTypes[key as keyof typeof preferences.alertTypes]}
                onCheckedChange={(checked) =>
                  setPreferences((current) => ({
                    ...current,
                    alertTypes: {
                      ...current.alertTypes,
                      [key]: checked
                    }
                  }))
                }
              />
            </div>
          ))}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant={pushSupported ? "default" : "secondary"}
              disabled={!pushSupported || pushState === "saving" || pushState === "unsubscribing"}
              aria-describedby={pushStatusMessageKey ? "push-alert-status" : undefined}
              onClick={() => {
                void enablePushAlerts(preferences, setPushState, setPushDeviceState);
              }}
            >
              {pushSupported ? <Bell size={16} aria-hidden="true" /> : <BellOff size={16} aria-hidden="true" />}
              {pushState === "saving" ? t("favorites.pushSaving") : t("favorites.pushEnable")}
            </Button>
            <Button
              variant="secondary"
              disabled={!canDisablePush}
              aria-describedby={pushStatusMessageKey ? "push-alert-status" : undefined}
              onClick={() => {
                void disablePushAlerts(setPushState, setPushDeviceState);
              }}
            >
              <BellOff size={16} aria-hidden="true" />
              {pushState === "unsubscribing" ? t("favorites.pushUnsubscribing") : t("favorites.pushDisable")}
            </Button>
          </div>
          {pushStatusMessageKey ? (
            <p
              id="push-alert-status"
              className="text-sm font-semibold text-[var(--app-muted)]"
              role="status"
            >
              {t(pushStatusMessageKey)}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>{t("favorites.alertQueueTitle")}</CardTitle>
          <CardDescription>{t("favorites.alertQueueSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {alertQueue.length === 0 ? (
            <p className="text-sm text-[var(--app-muted)]">{t("favorites.alertQueueEmpty")}</p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {alertQueue.map((item) => (
                <article
                  key={item.stream.id}
                  className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface)] p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-black">{item.stream.titleOriginal}</div>
                      <div className="mt-1 text-xs font-semibold text-[var(--app-muted)]">
                        {formatDateTime(item.dueAtUtc, locale, preferences.timezone)}
                      </div>
                    </div>
                    <Badge variant={deliveryVariant(item.deliveryState)}>
                      {t(`alert.delivery.${item.deliveryState}` as MessageKey)}
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-[8px] bg-[var(--app-surface-strong)] p-2">
                      <div className="text-xs font-bold uppercase text-[var(--app-muted)]">
                        {t("favorites.alertPriority")}
                      </div>
                      <div className="font-black">{item.priority}</div>
                    </div>
                    <div className="rounded-[8px] bg-[var(--app-surface-strong)] p-2">
                      <div className="text-xs font-bold uppercase text-[var(--app-muted)]">
                        {t("common.confidence")}
                      </div>
                      <div className="font-black">{formatPercent(item.stream.confidence, locale)}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.reasons.map((reason) => (
                      <Badge key={`${item.stream.id}-${reason.code}`} variant="outline">
                        {t(`alert.reason.${reason.code}` as MessageKey)}
                      </Badge>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>{t("favorites.types")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {streamCategories.map((category) => {
            const active = preferences.favoriteCategories.includes(category);
            return (
              <Button
                key={category}
                variant={active ? "default" : "secondary"}
                size="sm"
                aria-pressed={active}
                onClick={() =>
                  setPreferences((current) => ({
                    ...current,
                    favoriteCategories: active
                      ? current.favoriteCategories.filter((item) => item !== category)
                      : [...current.favoriteCategories, category]
                  }))
                }
              >
                {t(`category.${category}` as MessageKey)}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>{t("favorites.languages")}</CardTitle>
          <CardDescription>{t("favorites.languagesHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {favoriteLanguageOptions.map((language) => {
            const active = preferences.favoriteLanguages.includes(language);
            return (
              <Button
                key={language}
                data-testid={`favorite-language-${language.toLowerCase().replace(/[^a-z0-9-]/gu, "-")}`}
                variant={active ? "default" : "secondary"}
                size="sm"
                aria-pressed={active}
                onClick={() =>
                  setPreferences((current) => ({
                    ...current,
                    favoriteLanguages: active
                      ? current.favoriteLanguages.filter((item) => item !== language)
                      : [...current.favoriteLanguages, language]
                  }))
                }
              >
                {formatLanguageName(language, locale)}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>{t("favorites.overlapTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {favoriteOverlaps.length === 0 ? (
            <p className="text-sm text-[var(--app-muted)]">{t("favorites.overlapEmpty")}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {favoriteOverlaps.map((stream) => (
                <div
                  key={stream.id}
                  className="rounded-[8px] border border-[var(--app-border)] p-3"
                >
                  <div className="font-bold">{stream.titleOriginal}</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(overlaps.get(stream.id) ?? []).map((id) => (
                      <Badge key={id} variant="stale">
                        {streams.find((item) => item.id === id)?.titleOriginal ?? id}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function enablePushAlerts(
  preferences: UserPreferences,
  setPushState: (state: PushState) => void,
  setPushDeviceState: (state: PushDeviceState) => void
) {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    setPushState("degraded");
    setPushDeviceState("unsupported");
    return;
  }

  setPushState("saving");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    setPushState("denied");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "")
      }));
    setPushDeviceState("subscribed");

    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        ...subscription.toJSON(),
        alertTypes: preferences.alertTypes,
        preferences: {
          favoriteTalentIds: preferences.favoriteTalentIds,
          favoriteCategories: preferences.favoriteCategories,
          favoriteLanguages: preferences.favoriteLanguages,
          timezone: preferences.timezone,
          locale: preferences.locale
        }
      })
    });

    if (response.status === 202) {
      setPushState("degraded");
      return;
    }
    setPushState(response.ok ? "saved" : "enable_error");
  } catch {
    setPushState("enable_error");
  }
}

async function disablePushAlerts(
  setPushState: (state: PushState) => void,
  setPushDeviceState: (state: PushDeviceState) => void
) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    setPushDeviceState("unsupported");
    setPushState("degraded");
    return;
  }

  setPushState("unsubscribing");
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      setPushDeviceState("no_subscription");
      setPushState("not_found");
      return;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      setPushDeviceState("no_subscription");
      setPushState("not_found");
      return;
    }

    const endpoint = subscription.endpoint;
    const [localResult, serverResult] = await Promise.allSettled([
      subscription.unsubscribe(),
      deactivatePushSubscriptionOnServer(endpoint)
    ]);
    const locallyCleared =
      (localResult.status === "fulfilled" && localResult.value) ||
      (await isPushSubscriptionCleared(registration));

    if (!locallyCleared) {
      setPushState("disable_error");
      return;
    }

    setPushDeviceState("no_subscription");
    if (serverResult.status === "fulfilled" && serverResult.value === "ok") {
      setPushState("unsubscribed");
      return;
    }

    setPushState("disable_degraded");
  } catch {
    setPushState("disable_error");
  }
}

async function readPushDeviceState(): Promise<PushDeviceState> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    return subscription ? "subscribed" : "no_subscription";
  } catch {
    return "unknown";
  }
}

async function deactivatePushSubscriptionOnServer(endpoint: string) {
  const response = await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ endpoint })
  });

  if (response.status === 202) {
    return "degraded" as const;
  }

  return response.ok ? ("ok" as const) : ("error" as const);
}

async function isPushSubscriptionCleared(registration: ServiceWorkerRegistration) {
  try {
    return (await registration.pushManager.getSubscription()) === null;
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/gu, "+").replace(/_/gu, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function deliveryVariant(deliveryState: "push_ready" | "local_only" | "needs_review") {
  if (deliveryState === "push_ready") {
    return "success";
  }
  if (deliveryState === "needs_review") {
    return "stale";
  }
  return "outline";
}

function getPushStatusMessageKey(state: PushState): MessageKey {
  switch (state) {
    case "saved":
      return "favorites.pushSaved";
    case "degraded":
      return "favorites.pushDegraded";
    case "denied":
      return "favorites.pushDenied";
    case "unsubscribed":
      return "favorites.pushUnsubscribed";
    case "not_found":
      return "favorites.pushNoSubscription";
    case "enable_error":
      return "favorites.pushEnableError";
    case "disable_error":
      return "favorites.pushDisableError";
    case "disable_degraded":
      return "favorites.pushDisableDegraded";
    case "unsubscribing":
      return "favorites.pushUnsubscribing";
    case "saving":
    case "idle":
      return "favorites.pushSaving";
  }

  const exhaustiveState: never = state;
  return exhaustiveState;
}

function getPushDeviceStatusMessageKey(state: PushDeviceState): MessageKey | undefined {
  switch (state) {
    case "checking":
      return "favorites.pushDeviceChecking";
    case "no_subscription":
      return "favorites.pushNoSubscription";
    case "unsupported":
      return "favorites.pushDeviceUnsupported";
    case "unknown":
      return "favorites.pushDeviceUnknown";
    case "subscribed":
      return undefined;
  }

  const exhaustiveState: never = state;
  return exhaustiveState;
}

type PushState =
  | "idle"
  | "saving"
  | "saved"
  | "degraded"
  | "denied"
  | "enable_error"
  | "disable_error"
  | "disable_degraded"
  | "unsubscribing"
  | "unsubscribed"
  | "not_found";

type PushDeviceState =
  | "checking"
  | "unsupported"
  | "unknown"
  | "no_subscription"
  | "subscribed";
