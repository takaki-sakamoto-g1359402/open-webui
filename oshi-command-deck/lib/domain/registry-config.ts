import type { BranchConfig, Talent } from "./types";

const branchCoverageValues = new Set<BranchConfig["coverage"]>([
  "active",
  "demo",
  "manual_only",
  "future"
]);

const registryIdPattern = /^[a-z0-9][a-z0-9_-]*$/u;

type RegistryInput = {
  branches: unknown;
  talents: unknown;
};

export type RegistryConfig = {
  branches: BranchConfig[];
  talents: Talent[];
};

export function createRegistryConfig({ branches, talents }: RegistryInput): RegistryConfig {
  const normalizedBranches = normalizeBranches(branches);
  const normalizedTalents = normalizeTalents(talents, normalizedBranches);
  assertUniqueProviderIds(normalizedTalents);

  return {
    branches: normalizedBranches,
    talents: normalizedTalents
  };
}

function normalizeBranches(input: unknown): BranchConfig[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("branch registry must be a non-empty array");
  }

  const seen = new Set<string>();
  return input.map((entry, index) => {
    const record = expectRecord(entry, `branches[${index}]`);
    const id = expectRegistryId(record.id, `branches[${index}].id`);
    if (seen.has(id)) {
      throw new Error(`duplicate branch id: ${id}`);
    }
    seen.add(id);

    const coverage = expectString(record.coverage, `branches[${index}].coverage`);
    if (!branchCoverageValues.has(coverage as BranchConfig["coverage"])) {
      throw new Error(`invalid branch coverage: ${coverage}`);
    }

    return {
      id,
      label: expectString(record.label, `branches[${index}].label`),
      localeHints: expectStringArray(record.localeHints, `branches[${index}].localeHints`),
      coverage: coverage as BranchConfig["coverage"],
      notes: expectString(record.notes, `branches[${index}].notes`)
    };
  });
}

function normalizeTalents(input: unknown, branches: BranchConfig[]): Talent[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("talent registry must be a non-empty array");
  }

  const branchIds = new Set(branches.map((branch) => branch.id));
  const seen = new Set<string>();

  return input.map((entry, index) => {
    const record = expectRecord(entry, `talents[${index}]`);
    const id = expectRegistryId(record.id, `talents[${index}].id`);
    if (seen.has(id)) {
      throw new Error(`duplicate talent id: ${id}`);
    }
    seen.add(id);

    const branch = expectRegistryId(record.branch, `talents[${index}].branch`);
    if (!branchIds.has(branch)) {
      throw new Error(`talent ${id} references unknown branch: ${branch}`);
    }

    const confidence = expectNumber(record.confidence, `talents[${index}].confidence`);
    if (confidence < 0 || confidence > 1) {
      throw new Error(`talent ${id} confidence must be between 0 and 1`);
    }

    return {
      id,
      displayName: expectString(record.displayName, `talents[${index}].displayName`),
      branch,
      languages: expectStringArray(record.languages, `talents[${index}].languages`),
      tags: expectStringArray(record.tags, `talents[${index}].tags`),
      providerIds: normalizeProviderIds(record.providerIds, `talents[${index}].providerIds`),
      confidence,
      active: expectBoolean(record.active, `talents[${index}].active`)
    };
  });
}

function normalizeProviderIds(input: unknown, path: string): Talent["providerIds"] {
  const record = expectRecord(input, path);
  return {
    youtubeChannelId: optionalString(record.youtubeChannelId, `${path}.youtubeChannelId`),
    xHandle: normalizeHandle(optionalString(record.xHandle, `${path}.xHandle`)),
    manualSlug: optionalString(record.manualSlug, `${path}.manualSlug`)
  };
}

function assertUniqueProviderIds(talents: Talent[]) {
  const seen = new Map<string, string>();

  for (const talent of talents) {
    for (const [provider, value] of Object.entries(talent.providerIds)) {
      if (!value) {
        continue;
      }
      const key = `${provider}:${value.toLowerCase()}`;
      const existing = seen.get(key);
      if (existing && existing !== talent.id) {
        throw new Error(`duplicate provider id ${key} on ${existing} and ${talent.id}`);
      }
      seen.set(key, talent.id);
    }
  }
}

function normalizeHandle(handle?: string) {
  return handle?.replace(/^@/u, "");
}

function expectRecord(input: unknown, path: string): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`${path} must be an object`);
  }
  return input as Record<string, unknown>;
}

function expectRegistryId(input: unknown, path: string) {
  const value = expectString(input, path);
  if (!registryIdPattern.test(value)) {
    throw new Error(`${path} must use lowercase letters, numbers, underscores, or hyphens`);
  }
  return value;
}

function expectString(input: unknown, path: string) {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
  return input.trim();
}

function optionalString(input: unknown, path: string) {
  if (input === undefined || input === null || input === "") {
    return undefined;
  }
  return expectString(input, path);
}

function expectStringArray(input: unknown, path: string) {
  if (!Array.isArray(input)) {
    throw new Error(`${path} must be an array`);
  }
  return input.map((item, index) => expectString(item, `${path}[${index}]`));
}

function expectNumber(input: unknown, path: string) {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    throw new Error(`${path} must be a finite number`);
  }
  return input;
}

function expectBoolean(input: unknown, path: string) {
  if (typeof input !== "boolean") {
    throw new Error(`${path} must be a boolean`);
  }
  return input;
}
