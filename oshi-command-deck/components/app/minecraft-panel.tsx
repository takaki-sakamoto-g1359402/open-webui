"use client";

import type React from "react";
import { ExternalLink, Link2, Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buildRelationshipEdges, groupMinecraftSessions } from "@/lib/domain/minecraft";
import { getTalentName } from "@/lib/domain/filtering";
import { formatDateTime } from "@/lib/domain/time";
import { formatNumber, formatPercent, type MessageKey } from "@/lib/i18n";
import type { SourceLink } from "@/lib/domain/types";
import { useApp } from "./app-provider";
import { StatusBadge } from "./status-badge";

export function MinecraftPanel({ compact = false }: { compact?: boolean }) {
  const { t, streams, preferences, locale } = useApp();
  const sessions = groupMinecraftSessions(streams);
  const edges = buildRelationshipEdges(streams);

  return (
    <div className={compact ? "grid gap-4" : "grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]"}>
      <Card>
        <CardHeader>
          <CardTitle>{t("minecraft.sessions")}</CardTitle>
          <CardDescription>{t("minecraft.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {sessions.length === 0 ? (
            <p className="text-sm text-[var(--app-muted)]">{t("minecraft.noSessions")}</p>
          ) : (
            sessions.slice(0, compact ? 2 : undefined).map((session) => (
              <article key={session.id} className="rounded-[8px] border border-[var(--app-border)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={session.status} t={t} />
                      <Badge variant="outline">
                        {formatPercent(session.confidence, locale)}
                      </Badge>
                    </div>
                    <h3 className="mt-2 text-base font-black">{session.title}</h3>
                    <p className="mt-1 text-xs text-[var(--app-muted)]">
                      {session.startUtc
                        ? formatDateTime(session.startUtc, locale, preferences.timezone)
                        : t("status.tbd")}
                    </p>
                  </div>
                  <Network size={20} aria-hidden="true" className="text-[var(--app-cyan)]" />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {session.participantTalentIds.map((talentId) => (
                    <Badge key={talentId} variant="default">
                      {getTalentName(talentId)}
                    </Badge>
                  ))}
                </div>

                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <SessionFact
                    label={t("minecraft.sessionStart")}
                    value={
                      session.startUtc
                        ? formatDateTime(session.startUtc, locale, preferences.timezone)
                        : t("status.tbd")
                    }
                  />
                  <SessionFact
                    label={t("minecraft.sessionEnd")}
                    value={
                      session.endUtc
                        ? formatDateTime(session.endUtc, locale, preferences.timezone)
                        : t("common.notAvailable")
                    }
                  />
                  <SessionFact
                    label={t("minecraft.povCount")}
                    value={formatNumber(session.streamIds.length, locale)}
                  />
                </dl>

                <div className="mt-3 flex items-center gap-3">
                  <Progress
                    value={Math.round(session.confidence * 100)}
                    aria-label={t("minecraft.sessionConfidence", { title: session.title })}
                  />
                  <span className="text-xs font-semibold">
                    {formatPercent(session.confidence, locale)}
                  </span>
                </div>

                <SessionLinks links={session.links} />
              </article>
            ))
          )}
        </CardContent>
      </Card>

      {!compact ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("minecraft.relationships")}</CardTitle>
            <CardDescription>{t("minecraft.relationshipFallback")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div aria-hidden="true" className="mb-4 min-h-52 rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-4">
              <div className="grid h-full min-h-44 grid-cols-2 gap-3">
                {edges.slice(0, 4).map((edge) => (
                  <div key={`${edge.fromTalentId}-${edge.toTalentId}`} className="flex items-center justify-center rounded-[8px] border border-[var(--app-border)] bg-white/88 p-2 text-center text-xs font-bold">
                    {getTalentName(edge.fromTalentId)}
                    <Link2 size={14} aria-hidden="true" className="mx-2 text-[var(--app-cyan)]" />
                    {getTalentName(edge.toTalentId)}
                  </div>
                ))}
              </div>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {edges.map((edge) => (
                <li
                  key={`${edge.fromTalentId}-${edge.toTalentId}`}
                  className="rounded-[8px] border border-[var(--app-border)] p-3"
                >
                  <div className="font-bold">
                    {getTalentName(edge.fromTalentId)} ↔ {getTalentName(edge.toTalentId)}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                    {t(`provider.${edge.source}` as MessageKey)} · {edge.meaning} ·{" "}
                    {formatPercent(edge.confidence, locale)}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SessionFact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[8px] bg-[var(--app-surface-strong)] p-2">
      <dt className="text-xs font-bold uppercase text-[var(--app-muted)]">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-[var(--app-text)]">{value}</dd>
    </div>
  );
}

function SessionLinks({ links }: { links: SourceLink[] }) {
  const { t } = useApp();
  const uniqueLinks = dedupeSourceLinks(links);

  return (
    <div className="mt-3" aria-label={t("minecraft.sessionLinks")}>
      <p className="text-xs font-semibold text-[var(--app-muted)]">{t("minecraft.sessionLinks")}</p>
      {uniqueLinks.length === 0 ? (
        <p className="mt-2 text-sm font-bold text-[var(--app-text)]">{t("common.notAvailable")}</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {uniqueLinks.map((link) =>
            /^https?:\/\//u.test(link.url) ? (
              <a
                key={`${link.provider}-${link.url}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center gap-2 rounded-[8px] border border-[var(--app-border)] bg-white px-3 py-2 text-sm font-bold text-[var(--app-text)] underline-offset-4 hover:underline"
              >
                {t(`provider.${link.provider}` as MessageKey)}
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            ) : (
              <Badge
                key={`${link.provider}-${link.url}`}
                variant="outline"
                aria-label={t("common.manualEvidenceLabel", { label: link.label })}
                title={t("common.manualEvidenceLabel", { label: link.label })}
              >
                {t("common.manualEvidence")}
              </Badge>
            )
          )}
        </div>
      )}
    </div>
  );
}

function dedupeSourceLinks(links: SourceLink[]) {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.provider}:${link.url}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
