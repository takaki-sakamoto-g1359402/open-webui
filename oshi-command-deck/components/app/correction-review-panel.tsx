"use client";

import { AlertTriangle, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { streamCategories, streamStatuses, type Livestream } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/domain/time";
import { type MessageKey } from "@/lib/i18n";
import { useApp } from "./app-provider";

const correctionFields = [
  "title",
  "status",
  "category",
  "scheduled_start_at",
  "actual_start_at",
  "ended_at",
  "visibility",
  "confidence"
] as const;

type CorrectionField = (typeof correctionFields)[number];

type CorrectionResponse = {
  persisted?: boolean;
  reason?: "missing_supabase" | "event_not_found";
  error?: string;
};

export function CorrectionReviewPanel() {
  const { t, streams, locale, preferences } = useApp();
  const reviewCandidates = useMemo(
    () =>
      streams.filter(
        (stream) =>
          stream.conflictIds.length > 0 ||
          stream.providerErrors.length > 0 ||
          Boolean(stream.adminCorrection)
      ),
    [streams]
  );
  const [selectedCanonicalKey, setSelectedCanonicalKey] = useState(
    () => reviewCandidates[0]?.canonicalKey ?? streams[0]?.canonicalKey ?? ""
  );
  const selectedStream =
    streams.find((stream) => stream.canonicalKey === selectedCanonicalKey) ??
    reviewCandidates[0] ??
    streams[0];
  const [fieldName, setFieldName] = useState<CorrectionField>("title");
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function saveCorrection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStream) {
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/corrections", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          canonicalKey: selectedStream.canonicalKey,
          fieldName,
          newValue: normalizeFormValue(fieldName, newValue),
          reason
        })
      });
      const body = (await response.json().catch(() => ({}))) as CorrectionResponse;

      if (response.status === 401) {
        setMessage(t("admin.correctionAdminRequired"));
        return;
      }
      if (response.status === 202 && body.reason === "missing_supabase") {
        setMessage(t("admin.correctionDegraded"));
        return;
      }
      if (response.status === 404) {
        setMessage(t("admin.correctionEventMissing"));
        return;
      }
      if (!response.ok) {
        throw new Error(body.error ?? response.statusText);
      }
      setMessage(t("admin.correctionSaved"));
    } catch {
      setMessage(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} className="text-[var(--app-amber)]" aria-hidden="true" />
          <CardTitle>{t("admin.conflictReview")}</CardTitle>
        </div>
        <CardDescription>{t("admin.correctionHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 rounded-[8px] border border-[var(--app-border)] p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black">{t("admin.reviewQueue")}</h3>
            <Badge variant="outline">{reviewCandidates.length}</Badge>
          </div>
          {reviewCandidates.length === 0 ? (
            <p className="rounded-[8px] bg-[var(--app-surface-strong)] px-3 py-4 text-sm font-semibold text-[var(--app-muted)]">
              {t("admin.noConflicts")}
            </p>
          ) : (
            <div
              className="flex max-h-[420px] flex-col gap-2 overflow-auto"
              tabIndex={0}
              aria-label={t("admin.reviewQueue")}
            >
              {reviewCandidates.map((stream) => (
                <button
                  key={stream.id}
                  type="button"
                  aria-pressed={stream.canonicalKey === selectedStream?.canonicalKey}
                  className="rounded-[8px] border border-[var(--app-border)] bg-white p-3 text-left hover:bg-[var(--app-surface-strong)] aria-pressed:border-[var(--app-amber)] aria-pressed:bg-[rgb(255_248_230)]"
                  onClick={() => setSelectedCanonicalKey(stream.canonicalKey)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={stream.conflictIds.length > 0 ? "stale" : "outline"}>
                      {t(`status.${stream.status}` as MessageKey)}
                    </Badge>
                    {stream.adminCorrection ? <Badge variant="success">{t("reason.manual_correction")}</Badge> : null}
                    <span className="font-bold">{stream.titleOriginal}</span>
                  </div>
                  <p className="mt-1 break-all text-xs text-[var(--app-muted)]">
                    {stream.canonicalKey}
                  </p>
                  <ReviewLine
                    label={t("admin.conflictIds")}
                    value={stream.conflictIds.join(", ")}
                    fallback={t("common.empty")}
                  />
                  <ReviewLine
                    label={t("admin.providerIssues")}
                    value={stream.providerErrors.map((error) => error.code).join(", ")}
                    fallback={t("common.empty")}
                  />
                  {stream.adminCorrection ? (
                    <ReviewLine
                      label={t("admin.correctedFields")}
                      value={`${stream.adminCorrection.field} · ${stream.adminCorrection.reason}`}
                      fallback={t("common.empty")}
                    />
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </section>

        <form className="flex min-w-0 flex-col gap-3" onSubmit={saveCorrection}>
          <p className="rounded-[8px] bg-[var(--app-surface-strong)] px-3 py-2 text-sm text-[var(--app-muted)]">
            {t("admin.correctionProtected")}
          </p>
          <Field label={t("admin.correctionEvent")}>
            <NativeSelect
              value={selectedStream?.canonicalKey ?? ""}
              onChange={(event) => setSelectedCanonicalKey(event.target.value)}
              disabled={streams.length === 0}
            >
              {streams.map((stream) => (
                <option key={stream.id} value={stream.canonicalKey}>
                  {stream.titleOriginal}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t("admin.correctionField")}>
            <NativeSelect
              value={fieldName}
              onChange={(event) => {
                setFieldName(event.target.value as CorrectionField);
                setNewValue("");
              }}
            >
              {correctionFields.map((field) => (
                <option key={field} value={field}>
                  {t(`correction.field.${field}` as MessageKey)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t("admin.currentValue")}>
            <Input value={selectedStream ? getCurrentValue(selectedStream, fieldName, locale, preferences.timezone) : ""} readOnly />
          </Field>
          <Field label={t("admin.newValue")}>{renderCorrectionValueInput(fieldName, newValue, setNewValue, t)}</Field>
          <Field label={t("admin.correctionReason")}>
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("admin.correctionReasonPlaceholder")}
              required
            />
          </Field>
          <Button type="submit" disabled={loading || !selectedStream}>
            <Save size={16} aria-hidden="true" />
            {t("admin.applyCorrection")}
          </Button>
          {message ? (
            <p className="rounded-[8px] bg-[var(--app-cyan-soft)] px-3 py-2 text-sm font-semibold text-[var(--app-cyan)]" role="status">
              {message}
            </p>
          ) : null}
        </form>
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

function ReviewLine({ label, value, fallback }: { label: string; value: string; fallback: string }) {
  return (
    <p className="mt-1 text-xs text-[var(--app-muted)]">
      <strong className="text-[var(--app-text)]">{label}:</strong> {value || fallback}
    </p>
  );
}

function renderCorrectionValueInput(
  fieldName: CorrectionField,
  value: string,
  setValue: (value: string) => void,
  t: (key: MessageKey) => string
) {
  if (fieldName === "status") {
    return (
      <NativeSelect value={value} onChange={(event) => setValue(event.target.value)} required>
        <option value="">{t("common.unknown")}</option>
        {streamStatuses.map((status) => (
          <option key={status} value={status}>
            {t(`status.${status}` as MessageKey)}
          </option>
        ))}
      </NativeSelect>
    );
  }

  if (fieldName === "category") {
    return (
      <NativeSelect value={value} onChange={(event) => setValue(event.target.value)} required>
        <option value="">{t("common.unknown")}</option>
        {streamCategories.map((category) => (
          <option key={category} value={category}>
            {t(`category.${category}` as MessageKey)}
          </option>
        ))}
      </NativeSelect>
    );
  }

  if (fieldName === "visibility") {
    return (
      <NativeSelect value={value} onChange={(event) => setValue(event.target.value)} required>
        <option value="unknown">{t("visibility.unknown")}</option>
        <option value="public">{t("visibility.public")}</option>
        <option value="unlisted">{t("visibility.unlisted")}</option>
      </NativeSelect>
    );
  }

  return (
    <Input
      type={fieldName === "confidence" ? "number" : "text"}
      min={fieldName === "confidence" ? "0" : undefined}
      max={fieldName === "confidence" ? "1" : undefined}
      step={fieldName === "confidence" ? "0.01" : undefined}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder={fieldName.includes("_at") ? t("admin.utcTimestampPlaceholder") : undefined}
      required
    />
  );
}

function getCurrentValue(stream: Livestream, fieldName: CorrectionField, locale: string, timezone: string) {
  if (fieldName === "title") {
    return stream.titleOriginal;
  }
  if (fieldName === "status") {
    return stream.status;
  }
  if (fieldName === "category") {
    return stream.category;
  }
  if (fieldName === "scheduled_start_at") {
    return stream.scheduledStartUtc ? formatDateTime(stream.scheduledStartUtc, locale, timezone) : "";
  }
  if (fieldName === "actual_start_at") {
    return stream.actualStartUtc ? formatDateTime(stream.actualStartUtc, locale, timezone) : "";
  }
  if (fieldName === "ended_at") {
    return stream.endedAtUtc ? formatDateTime(stream.endedAtUtc, locale, timezone) : "";
  }
  if (fieldName === "visibility") {
    return stream.visibility;
  }
  return String(stream.confidence);
}

function normalizeFormValue(fieldName: CorrectionField, value: string) {
  if (fieldName === "confidence") {
    return Number(value);
  }
  if (fieldName.includes("_at") && value.trim() === "") {
    return null;
  }
  return value;
}
