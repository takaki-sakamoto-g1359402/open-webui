"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { demoTalents } from "@/lib/domain/registry";
import { createManualStreamFromInput } from "@/lib/domain/manual-imports";
import { formatDateTime } from "@/lib/domain/time";
import { streamCategories, streamStatuses, type StreamCategory, type StreamStatus } from "@/lib/domain/types";
import type { MessageKey } from "@/lib/i18n";
import { useApp } from "./app-provider";

export function ManualImportPanel() {
  const { t, preferences, addManualStream, removeManualStream, manualStreams, now, locale } =
    useApp();
  const defaultTalent = demoTalents.find((talent) => talent.active)?.id ?? demoTalents[0].id;
  const [title, setTitle] = useState("");
  const [talentId, setTalentId] = useState(defaultTalent);
  const [category, setCategory] = useState<StreamCategory>("game");
  const [status, setStatus] = useState<StreamStatus>("scheduled");
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [collaboratorsText, setCollaboratorsText] = useState("");
  const [languagesText, setLanguagesText] = useState("ja");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const activeTalents = useMemo(() => demoTalents.filter((talent) => talent.active), []);
  const valid =
    title.trim().length > 0 &&
    talentId.length > 0 &&
    (sourceUrl.trim().length > 0 || notes.trim().length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.manualImport")}</CardTitle>
        <CardDescription>{t("admin.manualImportHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          className="grid gap-3 lg:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid) {
              setMessage(t("admin.manualRequired"));
              return;
            }

            const stream = createManualStreamFromInput(
              {
                titleOriginal: title,
                talentId,
                category,
                status,
                scheduledLocal,
                timezone: preferences.timezone,
                sourceUrl,
                collaboratorsText,
                languagesText,
                notes
              },
              now
            );
            addManualStream(stream);
            setTitle("");
            setSourceUrl("");
            setCollaboratorsText("");
            setNotes("");
            setMessage(t("admin.manualSaved"));
          }}
        >
          <Field label={t("admin.titleLabel")}>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("admin.titlePlaceholder")}
              required
            />
          </Field>
          <Field label={t("common.favorite")}>
            <NativeSelect value={talentId} onChange={(event) => setTalentId(event.target.value)}>
              {activeTalents.map((talent) => (
                <option key={talent.id} value={talent.id}>
                  {talent.displayName} · {talent.branch.toUpperCase()}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t("common.category")}>
            <NativeSelect
              value={category}
              onChange={(event) => setCategory(event.target.value as StreamCategory)}
            >
              {streamCategories.map((item) => (
                <option key={item} value={item}>
                  {t(`category.${item}` as MessageKey)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t("common.status")}>
            <NativeSelect
              value={status}
              onChange={(event) => setStatus(event.target.value as StreamStatus)}
            >
              {streamStatuses.map((item) => (
                <option key={item} value={item}>
                  {t(`status.${item}` as MessageKey)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={`${t("admin.scheduledLocal")} · ${preferences.timezone}`}>
            <Input
              type="datetime-local"
              value={scheduledLocal}
              onChange={(event) => setScheduledLocal(event.target.value)}
            />
          </Field>
          <Field label={t("admin.sourceUrl")}>
            <Input
              type="url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder={t("admin.sourceUrlPlaceholder")}
            />
          </Field>
          <Field label={t("admin.collaboratorsText")}>
            <Input
              value={collaboratorsText}
              onChange={(event) => setCollaboratorsText(event.target.value)}
              placeholder={t("admin.collaboratorsPlaceholder")}
            />
          </Field>
          <Field label={t("admin.languagesText")}>
            <Input
              value={languagesText}
              onChange={(event) => setLanguagesText(event.target.value)}
              placeholder={t("admin.languagesPlaceholder")}
            />
          </Field>
          <Field label={t("admin.notes")}>
            <Input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("admin.notesPlaceholder")}
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={!valid} className="w-full">
              <Plus size={16} aria-hidden="true" />
              {t("admin.addManual")}
            </Button>
          </div>
        </form>

        {message ? (
          <p className="rounded-[8px] bg-[var(--app-cyan-soft)] px-3 py-2 text-sm font-semibold text-[var(--app-cyan)]">
            {message}
          </p>
        ) : null}

        <section className="rounded-[8px] border border-[var(--app-border)] p-3">
          <h3 className="text-sm font-black">{t("admin.localImports")}</h3>
          {manualStreams.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--app-muted)]">{t("admin.noManualImports")}</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {manualStreams.map((stream) => (
                <article
                  key={stream.id}
                  className="flex flex-col gap-2 rounded-[8px] bg-[var(--app-surface-strong)] p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{t("admin.manualLocal")}</Badge>
                      <Badge variant="scheduled">
                        {t(`status.${stream.status}` as MessageKey)}
                      </Badge>
                    </div>
                    <p className="mt-2 truncate text-sm font-bold">{stream.titleOriginal}</p>
                    <p className="mt-1 text-xs text-[var(--app-muted)]">
                      {stream.scheduledStartUtc
                        ? formatDateTime(stream.scheduledStartUtc, locale, preferences.timezone)
                        : t("status.tbd")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => removeManualStream(stream.id)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    {t("admin.removeManual")}
                  </Button>
                </article>
              ))}
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-bold text-[var(--app-muted)]">
      {label}
      {children}
    </label>
  );
}
