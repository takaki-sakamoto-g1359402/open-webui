"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  Database,
  Heart,
  Home,
  LockKeyhole,
  Mail,
  Map,
  Pickaxe,
  Scale,
  Settings,
  ShieldCheck,
  SlidersHorizontal
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supportedLocales, type Locale, type MessageKey } from "@/lib/i18n";
import { useApp } from "./app-provider";
import { AlertBanner } from "./notice";

const primaryNav = [
  { href: "/", key: "nav.today", icon: Home },
  { href: "/favorites", key: "nav.favorites", icon: Heart },
  { href: "/minecraft", key: "nav.minecraft", icon: Pickaxe },
  { href: "/route", key: "nav.route", icon: Map },
  { href: "/settings", key: "nav.settings", icon: Settings }
] as const;

const secondaryNav = [
  { href: "/data-sources", key: "nav.dataSources", icon: Database },
  { href: "/privacy", key: "nav.privacy", icon: LockKeyhole },
  { href: "/terms", key: "nav.terms", icon: Scale },
  { href: "/contact-takedown", key: "nav.contact", icon: Mail },
  { href: "/admin", key: "nav.admin", icon: ShieldCheck }
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, locale, preferences, setPreferences, online } = useApp();
  const localeOptions = supportedLocales.includes(locale as Locale)
    ? supportedLocales
    : [locale, ...supportedLocales];

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <header className="sticky top-0 z-20 border-b border-[var(--app-border)] bg-white/94 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-[1480px] items-center justify-between gap-3 px-4 lg:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={t("app.name")}>
            <div
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-[8px] border border-[var(--app-border)] bg-[var(--app-cyan-soft)] text-[var(--app-cyan)]"
            >
              <CalendarClock size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-base font-black tracking-[0]">
                  {t("app.name")}
                </span>
                <Badge variant="scheduled">{t("common.demo")}</Badge>
              </div>
              <p className="hidden truncate text-xs text-[var(--app-muted)] sm:block">
                {t("app.tagline")}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Badge variant={online ? "success" : "stale"}>
              {online ? t("health.healthy") : t("common.offline")}
            </Badge>
            <label className="sr-only" htmlFor="shell-locale">
              {t("settings.languageSelector")}
            </label>
            <select
              id="shell-locale"
              className="min-h-10 rounded-[8px] border border-[var(--app-border-strong)] bg-white px-2 text-sm font-semibold"
              value={locale}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  locale: event.target.value
                }))
              }
            >
              {localeOptions.map((optionLocale) => (
                <option key={optionLocale} value={optionLocale}>
                  {formatLocaleOption(optionLocale, t)}
                </option>
              ))}
            </select>
            <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
              <Link href="/settings" aria-label={t("nav.settings")}>
                <SlidersHorizontal size={18} />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1480px] grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] border-r border-[var(--app-border)] bg-white/78 p-4 lg:block">
          <nav aria-label={t("aria.primaryNav")} className="flex flex-col gap-1">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-[8px] px-3 text-sm font-semibold ${
                    active
                      ? "bg-[var(--app-cyan-soft)] text-[var(--app-cyan)]"
                      : "text-[var(--app-text)] hover:bg-[var(--app-surface-strong)]"
                  }`}
                >
                  <Icon size={18} aria-hidden="true" />
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>

          <Separator className="my-4" />

          <nav aria-label={t("aria.trustNav")} className="flex flex-col gap-1">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-10 items-center gap-3 rounded-[8px] px-3 text-sm font-medium ${
                    active
                      ? "bg-[var(--app-surface-strong)] text-[var(--app-text)]"
                      : "text-[var(--app-muted)] hover:bg-[var(--app-surface-strong)]"
                  }`}
                >
                  <Icon size={17} aria-hidden="true" />
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>

          <section className="mt-6 rounded-[8px] border border-[var(--app-border)] bg-white p-3 text-xs leading-5 text-[var(--app-muted)]">
            <p className="font-bold text-[var(--app-text)]">{t("app.unofficial")}</p>
            <p className="mt-2">{t("app.notAffiliated")}</p>
          </section>
        </aside>

        <main className="min-w-0 px-4 py-5 lg:px-6">
          {!online ? (
            <AlertBanner title={t("common.offline")} body={t("home.offlineNotice")} />
          ) : null}
          {children}

          <nav
            aria-label={t("aria.trustNav")}
            className="mt-6 grid grid-cols-2 gap-2 text-sm font-semibold lg:hidden"
          >
            {secondaryNav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center justify-center rounded-[8px] border border-[var(--app-border)] bg-white px-2 text-center ${
                    active ? "text-[var(--app-text)]" : "text-[var(--app-muted)]"
                  }`}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>
        </main>
      </div>

      <nav
        aria-label={t("aria.mobileNav")}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--app-border)] bg-white/96 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_32px_rgb(15_23_42_/_0.08)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-[8px] text-[11px] font-semibold ${
                  active
                    ? "bg-[var(--app-cyan-soft)] text-[var(--app-cyan)]"
                    : "text-[var(--app-muted)]"
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{t(item.key)}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <p className="sr-only">
        {preferences.timezone} {preferences.locale}
      </p>
    </div>
  );
}

function formatLocaleOption(
  optionLocale: string,
  t: (key: MessageKey, params?: Record<string, string | number>) => string
) {
  if (supportedLocales.includes(optionLocale as Locale)) {
    return t(`locale.${optionLocale}` as MessageKey);
  }

  return optionLocale;
}

export function PageHeader({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-black leading-tight text-[var(--app-text)] md:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--app-muted)]">{subtitle}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
