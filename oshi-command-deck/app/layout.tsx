import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { catalogs } from "@/lib/i18n/catalogs";
import { createTranslator, getLocaleDirection, resolveCatalogLocale, resolveLocale } from "@/lib/i18n";
import {
  getInitialPreferencesFromRequest,
  preferencesCookieKey
} from "@/lib/domain/preferences";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#047c9e"
};

export async function generateMetadata(): Promise<Metadata> {
  const { initialPreferences } = await getRequestPreferences();
  const metadataCatalog = catalogs[resolveCatalogLocale(initialPreferences.locale)];

  return {
    title: metadataCatalog["app.name"],
    description: metadataCatalog["app.description"],
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: metadataCatalog["app.name"],
      statusBarStyle: "default"
    }
  };
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { initialPreferences, hasPreferenceCookie } = await getRequestPreferences();
  const locale = resolveLocale(initialPreferences.locale);
  const dir = getLocaleDirection(locale);
  const t = createTranslator(locale);

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body>
        <Providers
          initialNowIso={new Date().toISOString()}
          initialPreferences={initialPreferences}
          preferBrowserPreferenceDefaults={!hasPreferenceCookie}
        >
          {children}
        </Providers>
        <noscript>{t("settings.offlineHelp")}</noscript>
      </body>
    </html>
  );
}

async function getRequestPreferences() {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const preferenceCookie = cookieStore.get(preferencesCookieKey)?.value;
  return {
    hasPreferenceCookie: Boolean(preferenceCookie),
    initialPreferences: getInitialPreferencesFromRequest({
      cookieValue: preferenceCookie,
      acceptLanguage: headerStore.get("accept-language")
    })
  };
}
