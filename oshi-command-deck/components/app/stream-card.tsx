"use client";

import { ExternalLink, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPercent, type MessageKey } from "@/lib/i18n";
import { getTalentName } from "@/lib/domain/filtering";
import { formatDateTime, formatRelativeAge, isStale } from "@/lib/domain/time";
import type { Livestream } from "@/lib/domain/types";
import { useApp } from "./app-provider";
import { StatusBadge } from "./status-badge";

export function StreamCard({ stream, compact = false }: { stream: Livestream; compact?: boolean }) {
  const { t, locale, preferences, setPreferences, now } = useApp();
  const stale = isStale(stream.lastCheckedUtc, stream.staleAfterMinutes, now);
  const favorite = preferences.favoriteTalentIds.includes(stream.talentId);
  const time = stream.actualStartUtc ?? stream.scheduledStartUtc ?? stream.endedAtUtc;

  return (
    <Card className={stale ? "border-[rgb(161_92_0_/_0.45)]" : undefined}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={stream.status} t={t} />
              {stream.demo ? <Badge variant="outline">{t("common.demo")}</Badge> : null}
              {stale ? <Badge variant="stale">{t("common.stale")}</Badge> : null}
              {stream.conflictIds.length > 0 ? (
                <Badge variant="stale">{t("common.conflicts")}</Badge>
              ) : null}
            </div>
            <p className="mt-3 text-xs font-semibold text-[var(--app-muted)]">
              {t("common.originalTitle")}
            </p>
            <h2 className="mt-1 text-base font-black leading-6 text-[var(--app-text)]">
              {stream.titleOriginal}
            </h2>
            {stream.titleMachineTranslation ? (
              <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                <span className="font-semibold">{t("common.machineTranslation")}</span>{" "}
                ({stream.titleMachineTranslation.locale}): {stream.titleMachineTranslation.text}
              </p>
            ) : null}
          </div>
          <Button
            variant={favorite ? "default" : "secondary"}
            size="icon"
            aria-pressed={favorite}
            aria-label={t("common.favorite")}
            onClick={() =>
              setPreferences((current) => ({
                ...current,
                favoriteTalentIds: favorite
                  ? current.favoriteTalentIds.filter((id) => id !== stream.talentId)
                  : [...current.favoriteTalentIds, stream.talentId]
              }))
            }
          >
            <Star size={18} fill={favorite ? "currentColor" : "none"} />
          </Button>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <Field label={t("common.localTime")} value={time ? formatDateTime(time, locale, preferences.timezone) : t("status.tbd")} />
          <Field label={t("common.talent")} value={getTalentName(stream.talentId)} />
          <Field label={t("common.category")} value={t(`category.${stream.category}` as MessageKey)} />
          <Field label={t("common.confidence")} value={formatPercent(stream.confidence, locale)} />
        </dl>

        {!compact ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <BadgeGroup label={t("common.branch")}>
                <Badge variant="default">{stream.branch.toUpperCase()}</Badge>
              </BadgeGroup>
              <BadgeGroup label={t("common.language")} empty={t("common.notAvailable")}>
                {stream.languages.map((language) => (
                  <Badge key={language} variant="outline">
                    {language}
                  </Badge>
                ))}
              </BadgeGroup>
              <BadgeGroup label={t("common.collaborators")} empty={t("common.noneReported")}>
                {stream.collaborators.map((collaborator) => (
                  <Badge key={collaborator} variant="default">
                    {collaborator}
                  </Badge>
                ))}
              </BadgeGroup>
            </div>

            <div className="mt-4" aria-label={t("common.links")}>
              <p className="text-xs font-semibold text-[var(--app-muted)]">{t("common.links")}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {stream.sourceLinks.length > 0 ? (
                  stream.sourceLinks.map((link) =>
                    isExternalSourceLink(link.url) ? (
                      <Button key={`${link.provider}-${link.url}`} asChild variant="secondary" size="sm">
                        <a href={link.url} target="_blank" rel="noreferrer">
                          {t(`provider.${link.provider}` as MessageKey)}
                          <ExternalLink size={14} aria-hidden="true" />
                        </a>
                      </Button>
                    ) : (
                      <span
                        key={`${link.provider}-${link.url}`}
                        className="inline-flex min-h-9 items-center rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-3 text-sm font-bold text-[var(--app-muted)]"
                        aria-label={t("common.manualEvidenceLabel", { label: link.label })}
                        title={t("common.manualEvidenceLabel", { label: link.label })}
                      >
                        {t("common.manualEvidence")}
                      </span>
                    )
                  )
                ) : (
                  <p className="text-sm font-bold text-[var(--app-text)]">{t("common.notAvailable")}</p>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-[8px] bg-[var(--app-surface-strong)] p-3 text-xs leading-5 text-[var(--app-muted)]">
              <p>
                <strong className="text-[var(--app-text)]">{t("common.lastChecked")}:</strong>{" "}
                {formatRelativeAge(stream.lastCheckedUtc, now, locale)}
              </p>
              <p>
                <strong className="text-[var(--app-text)]">{t("common.provenance")}:</strong>{" "}
                {stream.provenance
                  .map((item) => t(`provider.${item.provider}` as MessageKey))
                  .join(", ")}
              </p>
              {stream.provenance.length > 0 ? (
                <details className="mt-3 rounded-[8px] border border-[var(--app-border)] bg-white p-3">
                  <summary className="cursor-pointer text-sm font-black text-[var(--app-text)]">
                    {t("common.provenanceDetails")}
                  </summary>
                  <div className="mt-3 grid gap-3">
                    {stream.provenance.map((item) => (
                      <article
                        key={`${item.provider}-${item.sourceId}-${item.fetchedAtUtc}`}
                        className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface)] p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{t(`provider.${item.provider}` as MessageKey)}</Badge>
                          <Badge variant="default">{formatPercent(item.confidence, locale)}</Badge>
                        </div>
                        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                          <Field label={t("common.sourceId")} value={<code>{item.sourceId}</code>} />
                          <Field
                            label={t("common.fetchedAt")}
                            value={formatRelativeAge(item.fetchedAtUtc, now, locale)}
                          />
                          <Field
                            label={t("common.fields")}
                            value={item.fields
                              .map((field) => t(`provenance.field.${field}` as MessageKey))
                              .join(", ")}
                          />
                          <Field
                            label={t("common.sourceUrl")}
                            value={
                              item.url && isExternalSourceLink(item.url) ? (
                                <a
                                  className="inline-flex items-center gap-1 text-[var(--app-cyan)] underline-offset-4 hover:underline"
                                  href={item.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {t("common.openSource")}
                                  <ExternalLink size={13} aria-hidden="true" />
                                </a>
                              ) : (
                                t("common.notAvailable")
                              )
                            }
                          />
                        </dl>
                        <p className="mt-3 rounded-[8px] bg-[var(--app-surface-strong)] p-2 text-xs leading-5 text-[var(--app-muted)]">
                          <strong className="text-[var(--app-text)]">{t("common.rawEvidence")}:</strong>{" "}
                          {item.rawExcerpt}
                        </p>
                      </article>
                    ))}
                  </div>
                </details>
              ) : null}
              {stream.providerErrors.length > 0 ? (
                <p className="text-[var(--app-amber)]">
                  <strong>{t("common.providerError")}:</strong>{" "}
                  {stream.providerErrors.map((error) => error.message).join(" / ")}
                </p>
              ) : null}
              {stream.conflictIds.length > 0 ? (
                <p className="text-[var(--app-amber)]">
                  <strong>{t("common.conflicts")}:</strong> {stream.conflictIds.join(", ")}
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}


function isExternalSourceLink(url: string) {
  return /^https?:\/\//iu.test(url);
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-[var(--app-muted)]">{label}</dt>
      <dd className="mt-1 break-words font-bold text-[var(--app-text)]">{value}</dd>
    </div>
  );
}

function BadgeGroup({
  label,
  empty,
  children
}: {
  label: string;
  empty?: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const hasItems = Array.isArray(items) ? items.length > 0 : Boolean(items);

  return (
    <div>
      <p className="text-xs font-semibold text-[var(--app-muted)]">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {hasItems ? items : <span className="text-sm font-bold text-[var(--app-text)]">{empty}</span>}
      </div>
    </div>
  );
}
