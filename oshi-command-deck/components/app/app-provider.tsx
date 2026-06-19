"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createTranslator, getLocaleDirection, resolveLocale } from "@/lib/i18n";
import {
  getClientInitialPreferences,
  normalizePreferences,
  preferencesStorageKey,
  writePreferencesCookie
} from "@/lib/domain/preferences";
import { getDemoSourceHealth, getDemoStreams } from "@/lib/domain/fixtures";
import {
  createOfflineStreamsSnapshot,
  markSourceHealthAsOfflineCached,
  offlineStreamsSnapshotStorageKey,
  parseOfflineStreamsSnapshot,
  type OfflineStreamsSnapshot
} from "@/lib/domain/offline-cache";
import {
  readManualStreamsFromStorage,
  writeManualStreamsToStorage
} from "@/lib/domain/manual-imports";
import type { Livestream, SourceHealth, UserPreferences } from "@/lib/domain/types";

type AppContextValue = {
  locale: string;
  dir: "ltr" | "rtl";
  t: ReturnType<typeof createTranslator>;
  preferences: UserPreferences;
  setPreferences: (updater: UserPreferences | ((current: UserPreferences) => UserPreferences)) => void;
  streams: Livestream[];
  manualStreams: Livestream[];
  addManualStream: (stream: Livestream) => void;
  removeManualStream: (streamId: string) => void;
  sourceHealth: SourceHealth[];
  dataMode: "loading" | "demo" | "live_api" | "mixed_degraded" | "offline_cache";
  now: Date;
  online: boolean;
  pushSupported: boolean;
};

type StreamsApiResponse = {
  mode: "demo" | "live_api" | "mixed_degraded";
  streams: Livestream[];
  sourceHealth: SourceHealth[];
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  children,
  initialNowIso,
  initialPreferences,
  preferBrowserPreferenceDefaults
}: {
  children: React.ReactNode;
  initialNowIso: string;
  initialPreferences: UserPreferences;
  preferBrowserPreferenceDefaults: boolean;
}) {
  const [preferences, setPreferencesState] = useState<UserPreferences>(() =>
    initialPreferences
  );
  const [manualStreams, setManualStreams] = useState<Livestream[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Livestream[] | null>(null);
  const [remoteSourceHealth, setRemoteSourceHealth] = useState<SourceHealth[] | null>(null);
  const [remoteMode, setRemoteMode] = useState<StreamsApiResponse["mode"] | null>(null);
  const [remoteLoadFailed, setRemoteLoadFailed] = useState(false);
  const [offlineSnapshot, setOfflineSnapshot] = useState<OfflineStreamsSnapshot | null>(null);
  const [now, setNow] = useState(() => new Date(initialNowIso));
  const [online, setOnline] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const preferencesTouchedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const hydrationTimer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      if (!preferencesTouchedRef.current) {
        setPreferencesState(
          getClientInitialPreferences(initialPreferences, {
            preferBrowserDefaults: preferBrowserPreferenceDefaults
          })
        );
      }
      setManualStreams(readManualStreamsFromStorage());
      setOfflineSnapshot(readOfflineSnapshotFromStorage());
      setOnline(navigator.onLine);
      setHydrated(true);
    }, 0);

    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const serviceWorkerDisabled =
      navigator.webdriver || process.env.NEXT_PUBLIC_DISABLE_SERVICE_WORKER === "true";

    if ("serviceWorker" in navigator && process.env.NODE_ENV !== "test" && !serviceWorkerDisabled) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(hydrationTimer);
      window.clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [initialPreferences, preferBrowserPreferenceDefaults]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const controller = new AbortController();
    fetch("/api/streams", {
      signal: controller.signal,
      headers: {
        accept: "application/json"
      }
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        return (await response.json()) as StreamsApiResponse;
      })
      .then((body) => {
        if (Array.isArray(body.streams) && Array.isArray(body.sourceHealth)) {
          const snapshot = createOfflineStreamsSnapshot(body, new Date().toISOString());
          setRemoteStreams(body.streams);
          setRemoteSourceHealth(body.sourceHealth);
          setRemoteMode(body.mode);
          setOfflineSnapshot(snapshot);
          writeOfflineSnapshotToStorage(snapshot);
          setRemoteLoadFailed(false);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setRemoteLoadFailed(true);
      });

    return () => controller.abort();
  }, [hydrated]);

  const locale = resolveLocale(preferences.locale);
  const dir = getLocaleDirection(locale) as "ltr" | "rtl";
  const t = useMemo(() => createTranslator(locale), [locale]);
  const useOfflineSnapshot =
    hydrated &&
    Boolean(offlineSnapshot?.streams.length) &&
    (!online || (remoteLoadFailed && remoteStreams === null));
  const streams = useMemo(
    () => [
      ...manualStreams,
      ...(useOfflineSnapshot && offlineSnapshot ? offlineSnapshot.streams : (remoteStreams ?? getDemoStreams(now)))
    ],
    [manualStreams, now, offlineSnapshot, remoteStreams, useOfflineSnapshot]
  );
  const sourceHealth = useMemo(
    () =>
      useOfflineSnapshot && offlineSnapshot
        ? markSourceHealthAsOfflineCached(
            offlineSnapshot.sourceHealth,
            offlineSnapshot.cachedAtUtc,
            t("offline.snapshotCoverage")
          )
        : (remoteSourceHealth ?? getDemoSourceHealth(now)),
    [now, offlineSnapshot, remoteSourceHealth, t, useOfflineSnapshot]
  );
  const dataMode = !hydrated
    ? "loading"
    : useOfflineSnapshot || !online
      ? "offline_cache"
      : remoteLoadFailed
        ? "demo"
        : (remoteMode ?? "demo");
  const pushSupported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [dir, locale]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    window.localStorage.setItem(preferencesStorageKey, JSON.stringify(preferences));
    writePreferencesCookie(preferences);
  }, [hydrated, preferences]);

  const setPreferences = useCallback<AppContextValue["setPreferences"]>((updater) => {
    preferencesTouchedRef.current = true;
    setPreferencesState((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      return normalizePreferences(next);
    });
  }, []);

  const addManualStream = useCallback((stream: Livestream) => {
    setManualStreams((current) => {
      const next = [stream, ...current.filter((item) => item.id !== stream.id)];
      writeManualStreamsToStorage(next);
      return next;
    });
  }, []);

  const removeManualStream = useCallback((streamId: string) => {
    setManualStreams((current) => {
      const next = current.filter((stream) => stream.id !== streamId);
      writeManualStreamsToStorage(next);
      return next;
    });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      locale,
      dir,
      t,
      preferences,
      setPreferences,
      streams,
      manualStreams,
      addManualStream,
      removeManualStream,
      sourceHealth,
      dataMode,
      now,
      online,
      pushSupported
    }),
    [
      dir,
      addManualStream,
      dataMode,
      locale,
      manualStreams,
      now,
      online,
      preferences,
      pushSupported,
      removeManualStream,
      setPreferences,
      sourceHealth,
      streams,
      t
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error("useApp must be used within AppProvider");
  }
  return value;
}

function readOfflineSnapshotFromStorage() {
  try {
    return parseOfflineStreamsSnapshot(window.localStorage.getItem(offlineStreamsSnapshotStorageKey));
  } catch {
    return null;
  }
}

function writeOfflineSnapshotToStorage(snapshot: OfflineStreamsSnapshot) {
  try {
    window.localStorage.setItem(offlineStreamsSnapshotStorageKey, JSON.stringify(snapshot));
  } catch {
    // Offline cache is a convenience layer; private-mode storage failures must not break the app.
  }
}
