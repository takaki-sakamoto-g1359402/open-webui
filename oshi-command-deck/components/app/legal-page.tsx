"use client";

import { ExternalLink, Mail } from "lucide-react";
import { AppShell, PageHeader } from "./app-shell";
import { AlertBanner } from "./notice";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { useApp } from "./app-provider";
import { SourceHealthPanel } from "./source-health-panel";
import type { MessageKey } from "@/lib/i18n";

type LegalPageKind = "privacy" | "terms" | "sources" | "contact" | "offline";

type LegalSection = {
  titleKey: MessageKey;
  bodyKey: MessageKey;
  badgeKey?: MessageKey;
};

type ReferenceLink = {
  labelKey: MessageKey;
  href: string;
};

const primaryReferences: ReferenceLink[] = [
  {
    labelKey: "legal.ref.anycolor",
    href: "https://www.anycolor.co.jp/guidelines/en/"
  },
  {
    labelKey: "legal.ref.youtubeTerms",
    href: "https://developers.google.com/youtube/terms/api-services-terms-of-service"
  },
  {
    labelKey: "legal.ref.youtubePolicies",
    href: "https://developers.google.com/youtube/terms/developer-policies"
  },
  {
    labelKey: "legal.ref.xAgreement",
    href: "https://docs.x.com/developer-terms/agreement"
  },
  {
    labelKey: "legal.ref.xPolicy",
    href: "https://docs.x.com/developer-terms/policy"
  },
  {
    labelKey: "legal.ref.xTerms",
    href: "https://docs.x.com/developer-terms"
  }
];

const legalPages: Record<
  LegalPageKind,
  {
    titleKey: MessageKey;
    bodyKey: MessageKey;
    sections: LegalSection[];
    references?: ReferenceLink[];
    showContact?: boolean;
    showSourceHealth?: boolean;
  }
> = {
  privacy: {
    titleKey: "legal.privacyTitle",
    bodyKey: "legal.privacyBody",
    sections: [
      {
        titleKey: "legal.privacyLocalTitle",
        bodyKey: "legal.privacyLocalBody",
        badgeKey: "common.demo"
      },
      {
        titleKey: "legal.privacyPushTitle",
        bodyKey: "legal.privacyPushBody"
      },
      {
        titleKey: "legal.privacySupabaseTitle",
        bodyKey: "legal.privacySupabaseBody"
      },
      {
        titleKey: "legal.privacyTrackingTitle",
        bodyKey: "legal.privacyTrackingBody"
      },
      {
        titleKey: "legal.privacyManualTitle",
        bodyKey: "legal.privacyManualBody"
      },
      {
        titleKey: "legal.privacyCacheTitle",
        bodyKey: "legal.privacyCacheBody"
      },
      {
        titleKey: "legal.privacyAdminTitle",
        bodyKey: "legal.privacyAdminBody"
      },
      {
        titleKey: "legal.privacyRequestTitle",
        bodyKey: "legal.privacyRequestBody"
      }
    ],
    showContact: true
  },
  terms: {
    titleKey: "legal.termsTitle",
    bodyKey: "legal.termsBody",
    sections: [
      {
        titleKey: "legal.termsUnofficialTitle",
        bodyKey: "legal.termsUnofficialBody"
      },
      {
        titleKey: "legal.termsVerifyTitle",
        bodyKey: "legal.termsVerifyBody"
      },
      {
        titleKey: "legal.termsMediaTitle",
        bodyKey: "legal.termsMediaBody"
      },
      {
        titleKey: "legal.termsPlatformTitle",
        bodyKey: "legal.termsPlatformBody"
      },
      {
        titleKey: "legal.termsAvailabilityTitle",
        bodyKey: "legal.termsAvailabilityBody"
      },
      {
        titleKey: "legal.termsCorrectionsTitle",
        bodyKey: "legal.termsCorrectionsBody"
      }
    ],
    references: primaryReferences,
    showContact: true
  },
  sources: {
    titleKey: "legal.sourcesTitle",
    bodyKey: "legal.sourcesBody",
    sections: [
      {
        titleKey: "legal.sourcesOfficialTitle",
        bodyKey: "legal.sourcesOfficialBody"
      },
      {
        titleKey: "legal.sourcesManualTitle",
        bodyKey: "legal.sourcesManualBody",
        badgeKey: "provider.manual"
      },
      {
        titleKey: "legal.sourcesNoScrapeTitle",
        bodyKey: "legal.sourcesNoScrapeBody"
      },
      {
        titleKey: "legal.sourcesAiTitle",
        bodyKey: "legal.sourcesAiBody"
      },
      {
        titleKey: "legal.sourcesErrorsTitle",
        bodyKey: "legal.sourcesErrorsBody"
      },
      {
        titleKey: "legal.sourcesPublicTitle",
        bodyKey: "legal.sourcesPublicBody"
      },
      {
        titleKey: "legal.sourcesCorrectionsTitle",
        bodyKey: "legal.sourcesCorrectionsBody"
      }
    ],
    references: primaryReferences,
    showSourceHealth: true
  },
  contact: {
    titleKey: "legal.contactTitle",
    bodyKey: "legal.contactBody",
    sections: [
      {
        titleKey: "legal.contactHowTitle",
        bodyKey: "legal.contactHowBody"
      },
      {
        titleKey: "legal.contactEvidenceTitle",
        bodyKey: "legal.contactEvidenceBody"
      },
      {
        titleKey: "legal.contactAuditTitle",
        bodyKey: "legal.contactAuditBody"
      },
      {
        titleKey: "legal.contactTimingTitle",
        bodyKey: "legal.contactTimingBody"
      },
      {
        titleKey: "legal.contactPrivacyTitle",
        bodyKey: "legal.contactPrivacyBody"
      }
    ],
    references: [primaryReferences[0]],
    showContact: true
  },
  offline: {
    titleKey: "offline.title",
    bodyKey: "offline.body",
    sections: [
      {
        titleKey: "offline.readOnlyTitle",
        bodyKey: "offline.readOnlyBody",
        badgeKey: "common.offline"
      },
      {
        titleKey: "offline.staleTitle",
        bodyKey: "offline.staleBody",
        badgeKey: "common.stale"
      }
    ],
    showSourceHealth: true
  }
};

export function LegalPage({
  page
}: {
  page: LegalPageKind;
}) {
  const { t, sourceHealth } = useApp();
  const config = legalPages[page];
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  const contactHref = contactEmail
    ? `mailto:${contactEmail}?subject=${encodeURIComponent(t("legal.contactMailSubject"))}`
    : undefined;

  return (
    <AppShell>
      <PageHeader title={t(config.titleKey)} subtitle={t("app.notAffiliated")} />
      <AlertBanner title={t("app.unofficial")} body={t("footer.trust")} />
      <div
        className={
          config.showSourceHealth
            ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]"
            : "flex flex-col gap-4"
        }
      >
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t(config.titleKey)}</CardTitle>
              <CardDescription>{t(config.bodyKey)}</CardDescription>
            </CardHeader>
          </Card>

          <section className="grid gap-3 md:grid-cols-2">
            {config.sections.map((section) => (
              <Card key={section.titleKey}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-sm">{t(section.titleKey)}</CardTitle>
                    {section.badgeKey ? <Badge variant="outline">{t(section.badgeKey)}</Badge> : null}
                  </div>
                </CardHeader>
                <CardContent className="text-sm leading-6 text-[var(--app-muted)]">
                  <p>{t(section.bodyKey)}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          {config.references ? (
            <ReferencePanel references={config.references} />
          ) : null}

          {config.showContact ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail size={18} aria-hidden="true" className="text-[var(--app-cyan)]" />
                  <CardTitle className="text-sm">{t("legal.contactEmailTitle")}</CardTitle>
                </div>
                <CardDescription>
                  {contactEmail
                    ? t("legal.contactEmailConfigured")
                    : t("legal.contactEmailMissing")}
                </CardDescription>
              </CardHeader>
              {contactHref ? (
                <CardContent>
                  <a
                    href={contactHref}
                    className="break-words text-sm font-semibold text-[var(--app-cyan)] underline-offset-4 hover:underline"
                  >
                    {contactEmail}
                  </a>
                </CardContent>
              ) : null}
            </Card>
          ) : null}
        </div>

        {config.showSourceHealth ? (
          <aside className="min-w-0">
            <SourceHealthPanel items={sourceHealth} />
          </aside>
        ) : null}
      </div>
    </AppShell>
  );
}

function ReferencePanel({ references }: { references: ReferenceLink[] }) {
  const { t } = useApp();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("legal.referencesTitle")}</CardTitle>
        <CardDescription>{t("legal.referencesBody")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 text-sm">
          {references.map((reference) => (
            <li key={reference.href}>
              <a
                href={reference.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center gap-2 break-words font-semibold text-[var(--app-cyan)] underline-offset-4 hover:underline"
              >
                <ExternalLink size={16} aria-hidden="true" />
                {t(reference.labelKey)}
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
