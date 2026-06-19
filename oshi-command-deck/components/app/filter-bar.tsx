"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { branchRegistry } from "@/lib/domain/registry";
import { streamCategories, streamStatuses } from "@/lib/domain/types";
import { getAvailableLanguages } from "@/lib/domain/filtering";
import type { MessageKey } from "@/lib/i18n/catalogs";
import { useApp } from "./app-provider";

export function FilterBar() {
  const { t, preferences, setPreferences, streams } = useApp();
  const languages = getAvailableLanguages(streams);

  return (
    <section
      aria-label={t("home.filters")}
      className="mb-4 rounded-[8px] border border-[var(--app-border)] bg-white p-3"
    >
      <div className="relative">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)]"
          size={18}
        />
        <label className="sr-only" htmlFor="stream-search">
          {t("home.searchLabel")}
        </label>
        <Input
          id="stream-search"
          className="pl-10"
          value={preferences.search}
          placeholder={t("home.searchPlaceholder")}
          onChange={(event) =>
            setPreferences((current) => ({ ...current, search: event.target.value }))
          }
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        <SelectField
          label={t("common.category")}
          value={preferences.categoryFilter}
          onChange={(value) =>
            setPreferences((current) => ({
              ...current,
              categoryFilter: value as typeof current.categoryFilter
            }))
          }
          options={[
            ["all", t("common.all")],
            ...streamCategories.map((category) => [
              category,
              t(`category.${category}` as MessageKey)
            ] as const)
          ]}
        />
        <SelectField
          label={t("common.branch")}
          value={preferences.branchFilter}
          onChange={(value) => setPreferences((current) => ({ ...current, branchFilter: value }))}
          options={[
            ["all", t("common.all")],
            ...branchRegistry.map((branch) => [branch.id, branch.label] as const)
          ]}
        />
        <SelectField
          label={t("common.language")}
          value={preferences.languageFilter}
          onChange={(value) =>
            setPreferences((current) => ({ ...current, languageFilter: value }))
          }
          options={[["all", t("common.all")], ...languages.map((language) => [language, language] as const)]}
        />
        <SelectField
          label={t("common.status")}
          value={preferences.statusFilter}
          onChange={(value) =>
            setPreferences((current) => ({
              ...current,
              statusFilter: value as typeof current.statusFilter
            }))
          }
          options={[
            ["all", t("common.all")],
            ...streamStatuses.map((status) => [
              status,
              t(`status.${status}` as MessageKey)
            ] as const)
          ]}
        />
        <Button
          variant="secondary"
          className="min-h-11"
          onClick={() =>
            setPreferences((current) => ({
              ...current,
              search: "",
              branchFilter: "all",
              languageFilter: "all",
              categoryFilter: "all",
              statusFilter: "all",
              favoritesOnly: false
            }))
          }
        >
          {t("common.clearAll")}
        </Button>
      </div>

      <div className="mt-2">
        <Checkbox
          label={t("home.favoriteOnly")}
          checked={preferences.favoritesOnly}
          onChange={(event) =>
            setPreferences((current) => ({
              ...current,
              favoritesOnly: event.target.checked
            }))
          }
        />
      </div>
    </section>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold text-[var(--app-muted)]">
      {label}
      <NativeSelect value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionValue === "all" ? `${label}: ${optionLabel}` : optionLabel}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}
