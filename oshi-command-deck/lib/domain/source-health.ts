import type { MessageKey } from "@/lib/i18n";
import type { SourceHealth } from "./types";

type Translator = (key: MessageKey, params?: Record<string, string | number>) => string;

export function formatSourceHealthCoverage(item: SourceHealth, t: Translator) {
  if (item.coverageCode) {
    return t(`sourceHealth.coverage.${item.coverageCode}` as MessageKey, item.coverageParams);
  }

  return t("sourceHealth.coverage.rawEvidenceFallback");
}

export function formatSourceHealthError(item: SourceHealth, t: Translator) {
  if (!item.error && !item.errorCode) {
    return null;
  }

  if (item.errorCode) {
    return t(`sourceHealth.error.${item.errorCode}` as MessageKey, item.errorParams);
  }

  return t("sourceHealth.error.providerMessage");
}
