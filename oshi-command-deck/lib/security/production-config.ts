export type ProductionConfigIssue = {
  level: "error" | "warning";
  code: string;
  message: string;
};

export type ProductionConfigValidation = {
  profile: "demo" | "production";
  ok: boolean;
  issues: ProductionConfigIssue[];
  summary: {
    streamReadSource: string;
    rateLimitBackend: string;
    hostRateLimitConfigured: boolean;
    youtubeConfigured: boolean;
    xConfigured: boolean;
    supabaseConfigured: boolean;
    cronSecretConfigured: boolean;
    pushConfigured: boolean;
    aiFallbackEnabled: boolean;
    youtubeDataRetentionDays: number;
  };
};

type ValidationOptions = {
  strictProduction?: boolean;
};

type ProviderJsonEntry = {
  talentId?: unknown;
  displayName?: unknown;
  branch?: unknown;
  languages?: unknown;
  tags?: unknown;
  channelId?: unknown;
  handle?: unknown;
};

const allowedStreamReadSources = new Set(["adapters", "supabase"]);
const allowedRateLimitBackends = new Set(["memory", "supabase"]);
const defaultYoutubeDataRetentionDays = 29;
const officialOpenAiResponsesUrl = "https://api.openai.com/v1/responses";
const placeholderPattern =
  /^(?:example|changeme|change-me|replace|replace_with|your_|your-|todo|test-key|test-token|secret-token|job-token|service-role-key|admin@example\.com|UCxxxx|example_handle)$/iu;
const trueEnvValues = new Set(["1", "true", "yes", "on"]);
const falseEnvValues = new Set(["0", "false", "no", "off"]);

export function validateProductionConfig(
  env: Record<string, string | undefined>,
  options: ValidationOptions = {}
): ProductionConfigValidation {
  const issues: ProductionConfigIssue[] = [];
  const strictProduction = options.strictProduction ?? false;
  validateDemoModeFlag(env, issues, "NEXT_PUBLIC_DEMO_MODE");
  validateDemoModeFlag(env, issues, "OSHI_DEMO_MODE");
  const clientDemoMode = parseBooleanEnv(env.NEXT_PUBLIC_DEMO_MODE) ?? true;
  const serverDemoMode = parseBooleanEnv(env.OSHI_DEMO_MODE) ?? clientDemoMode;
  const demoMode = clientDemoMode || serverDemoMode;
  const profile = strictProduction || !demoMode ? "production" : "demo";
  const streamReadSource = env.STREAMS_READ_SOURCE?.trim() || "adapters";
  const rateLimitBackend = env.RATE_LIMIT_BACKEND?.trim() || "memory";
  const hostRateLimitConfigured = parseBooleanEnv(env.HOST_RATE_LIMIT_CONFIGURED) ?? false;
  const youtubeConfigured = hasValue(env.YOUTUBE_DATA_API_KEY);
  const xConfigured = hasValue(env.X_BEARER_TOKEN);
  const supabaseConfigured =
    hasValue(env.SUPABASE_URL) &&
    hasValue(env.SUPABASE_SERVICE_ROLE_KEY) &&
    hasValue(env.NEXT_PUBLIC_SUPABASE_URL) &&
    hasValue(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const cronSecretConfigured = hasValue(env.CRON_SECRET);
  const pushConfigured =
    hasValue(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) &&
    hasValue(env.VAPID_PRIVATE_KEY) &&
    hasValue(env.VAPID_SUBJECT);
  const aiFallbackEnabled = env.AI_PARSE_FALLBACK_ENABLED === "true";
  const youtubeDataRetentionDays = parseYoutubeDataRetentionDays(env, issues);

  if (!allowedStreamReadSources.has(streamReadSource)) {
    issues.push(error("invalid_streams_read_source", "STREAMS_READ_SOURCE must be either adapters or supabase."));
  }

  if (!allowedRateLimitBackends.has(rateLimitBackend)) {
    issues.push(error("invalid_rate_limit_backend", "RATE_LIMIT_BACKEND must be either memory or supabase."));
  }

  if (env.HOST_RATE_LIMIT_CONFIGURED !== undefined && parseBooleanEnv(env.HOST_RATE_LIMIT_CONFIGURED) === undefined) {
    issues.push(error("invalid_host_rate_limit_configured", "HOST_RATE_LIMIT_CONFIGURED must be true or false when configured."));
  }

  if (profile === "demo") {
    if (!clientDemoMode || !serverDemoMode) {
      issues.push(error(
        "demo_profile_mismatch",
        "Demo profile must keep both NEXT_PUBLIC_DEMO_MODE and OSHI_DEMO_MODE enabled, or set both false for production."
      ));
    }
    return result(profile, issues, {
      streamReadSource,
      rateLimitBackend,
      hostRateLimitConfigured,
      youtubeConfigured,
      xConfigured,
      supabaseConfigured,
      cronSecretConfigured,
      pushConfigured,
      aiFallbackEnabled,
      youtubeDataRetentionDays
    });
  }

  validatePartialPush(env, issues);
  validateAiFallback(env, issues);
  validateProviderRegistries(env, issues);

  if (!isExplicitlyFalse(env.NEXT_PUBLIC_DEMO_MODE)) {
    issues.push(error("demo_mode_enabled", "Production config must set NEXT_PUBLIC_DEMO_MODE=false."));
  }

  if (!isExplicitlyFalse(env.OSHI_DEMO_MODE)) {
    issues.push(error("server_demo_mode_enabled", "Production config must set OSHI_DEMO_MODE=false so server routes do not stay in demo mode at runtime."));
  }

  requireStrongSecret(env, issues, "ADMIN_JOB_TOKEN", {
    minLength: 32,
    message: "Production admin/job routes require a non-placeholder ADMIN_JOB_TOKEN of at least 32 characters."
  });
  requireStrongSecret(env, issues, "CRON_SECRET", {
    minLength: 32,
    message:
      "Vercel Cron jobs require a non-placeholder CRON_SECRET of at least 32 characters so scheduled job requests carry a valid bearer token."
  });
  requireDistinctSecrets(env, issues, "ADMIN_JOB_TOKEN", "CRON_SECRET", {
    code: "admin_cron_secret_reused",
    message:
      "ADMIN_JOB_TOKEN and CRON_SECRET must be different values so scheduled cron access cannot unlock Admin owner privileges."
  });
  if (hasValue(env.ADMIN_SESSION_SECRET)) {
    requireStrongSecret(env, issues, "ADMIN_SESSION_SECRET", {
      minLength: 32,
      message:
        "ADMIN_SESSION_SECRET must be a non-placeholder secret of at least 32 characters when configured."
    });
  }
  requireValidEmail(env, issues, "NEXT_PUBLIC_CONTACT_EMAIL");
  requireSupabase(env, issues);
  validateProductionRateLimit(env, issues, {
    rateLimitBackend,
    hostRateLimitConfigured,
    supabaseConfigured
  });

  if (streamReadSource !== "supabase") {
    issues.push(
      error(
        "production_requires_supabase_read_source",
        "Production public reads must set STREAMS_READ_SOURCE=supabase so the PWA reads normalized canonical rows instead of polling provider adapters."
      )
    );
  }

  if (!youtubeConfigured && !xConfigured) {
    issues.push(
      error(
        "missing_live_provider",
        "Production config must enable at least one official provider: YOUTUBE_DATA_API_KEY or X_BEARER_TOKEN."
      )
    );
  }

  if (streamReadSource === "supabase" && !supabaseConfigured) {
    issues.push(
      error(
        "supabase_read_without_credentials",
        "STREAMS_READ_SOURCE=supabase requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      )
    );
  }

  if (youtubeConfigured && !hasValue(env.YOUTUBE_CHANNELS_JSON)) {
    issues.push(error("youtube_missing_registry", "YOUTUBE_DATA_API_KEY requires YOUTUBE_CHANNELS_JSON."));
  }

  if (youtubeConfigured && youtubeDataRetentionDays > defaultYoutubeDataRetentionDays) {
    issues.push(
      error(
        "youtube_retention_window_too_long",
        `YOUTUBE_API_DATA_RETENTION_DAYS must be ${defaultYoutubeDataRetentionDays} or less so stored YouTube API data is refreshed or deleted inside the policy window.`
      )
    );
  }

  if (xConfigured && !hasValue(env.X_HANDLES_JSON)) {
    issues.push(error("x_missing_registry", "X_BEARER_TOKEN requires X_HANDLES_JSON."));
  }

  return result(profile, issues, {
    streamReadSource,
    rateLimitBackend,
    hostRateLimitConfigured,
    youtubeConfigured,
    xConfigured,
    supabaseConfigured,
    cronSecretConfigured,
    pushConfigured,
    aiFallbackEnabled,
    youtubeDataRetentionDays
  });
}

function parseBooleanEnv(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (trueEnvValues.has(normalized)) {
    return true;
  }
  if (falseEnvValues.has(normalized)) {
    return false;
  }
  return undefined;
}

function validateDemoModeFlag(
  env: Record<string, string | undefined>,
  issues: ProductionConfigIssue[],
  name: "NEXT_PUBLIC_DEMO_MODE" | "OSHI_DEMO_MODE"
) {
  if (env[name] !== undefined && parseBooleanEnv(env[name]) === undefined) {
    issues.push(error(
      `invalid_${name.toLowerCase()}`,
      `${name} must be true or false when configured.`
    ));
  }
}

function isExplicitlyFalse(value: string | undefined) {
  return parseBooleanEnv(value) === false;
}

function validateProviderRegistries(
  env: Record<string, string | undefined>,
  issues: ProductionConfigIssue[]
) {
  const youtube = parseJsonArray(env.YOUTUBE_CHANNELS_JSON, "YOUTUBE_CHANNELS_JSON", issues);
  if (youtube) {
    youtube.forEach((entry, index) => validateYoutubeEntry(entry, index, issues));
  }

  const xHandles = parseJsonArray(env.X_HANDLES_JSON, "X_HANDLES_JSON", issues);
  if (xHandles) {
    xHandles.forEach((entry, index) => validateXEntry(entry, index, issues));
  }
}

function validateYoutubeEntry(
  entry: ProviderJsonEntry,
  index: number,
  issues: ProductionConfigIssue[]
) {
  validateCommonProviderEntry(entry, "YOUTUBE_CHANNELS_JSON", index, issues);
  if (typeof entry.channelId !== "string" || !entry.channelId.trim()) {
    issues.push(error("youtube_channel_missing", `YOUTUBE_CHANNELS_JSON[${index}].channelId is required.`));
    return;
  }
  const channelId = entry.channelId.trim();
  if (isPlaceholder(channelId) || /demo/iu.test(channelId)) {
    issues.push(error("youtube_channel_placeholder", `YOUTUBE_CHANNELS_JSON[${index}].channelId must not be a demo or placeholder value.`));
  }
  if (!/^UC[A-Za-z0-9_-]{22}$/u.test(channelId)) {
    issues.push(error("youtube_channel_format", `YOUTUBE_CHANNELS_JSON[${index}].channelId must look like a YouTube channel ID, e.g. UC plus 22 URL-safe characters.`));
  }
}

function validateXEntry(
  entry: ProviderJsonEntry,
  index: number,
  issues: ProductionConfigIssue[]
) {
  validateCommonProviderEntry(entry, "X_HANDLES_JSON", index, issues);
  if (typeof entry.handle !== "string" || !entry.handle.trim()) {
    issues.push(error("x_handle_missing", `X_HANDLES_JSON[${index}].handle is required.`));
    return;
  }
  const handle = entry.handle.trim().replace(/^@/u, "");
  if (isPlaceholder(handle) || /demo/iu.test(handle)) {
    issues.push(error("x_handle_placeholder", `X_HANDLES_JSON[${index}].handle must not be a demo or placeholder value.`));
  }
  if (!/^[A-Za-z0-9_]{1,15}$/u.test(handle)) {
    issues.push(error("x_handle_format", `X_HANDLES_JSON[${index}].handle must be 1-15 letters, numbers, or underscores.`));
  }
}

function validateCommonProviderEntry(
  entry: ProviderJsonEntry,
  envName: string,
  index: number,
  issues: ProductionConfigIssue[]
) {
  for (const key of ["talentId", "displayName", "branch"] as const) {
    if (typeof entry[key] !== "string" || !entry[key]?.trim()) {
      issues.push(error("provider_entry_missing_field", `${envName}[${index}].${key} is required.`));
    }
  }

  if (!Array.isArray(entry.languages) || entry.languages.length === 0) {
    issues.push(error("provider_entry_languages", `${envName}[${index}].languages must be a non-empty array.`));
  }

  if (typeof entry.talentId === "string" && /demo/iu.test(entry.talentId)) {
    issues.push(error("provider_entry_demo_talent", `${envName}[${index}].talentId must not be demo-only.`));
  }
}

function validatePartialPush(
  env: Record<string, string | undefined>,
  issues: ProductionConfigIssue[]
) {
  const fields = ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"] as const;
  const present = fields.filter((field) => hasValue(env[field]));
  if (present.length > 0 && present.length < fields.length) {
    issues.push(error("partial_vapid_config", "Web Push config must include NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT together, or leave all blank to degrade."));
  }

  const subject = env.VAPID_SUBJECT?.trim();
  if (subject && !/^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/iu.test(subject) && !/^https:\/\/[^\s]+$/iu.test(subject)) {
    issues.push(error("invalid_vapid_subject", "VAPID_SUBJECT must be a mailto: address or an HTTPS URL."));
  }
}

function validateAiFallback(
  env: Record<string, string | undefined>,
  issues: ProductionConfigIssue[]
) {
  if (env.AI_PARSE_FALLBACK_ENABLED !== "true") {
    return;
  }
  requireStrongSecret(env, issues, "OPENAI_API_KEY", {
    minLength: 20,
    message: "AI_PARSE_FALLBACK_ENABLED=true requires a non-placeholder OPENAI_API_KEY."
  });
  if (!hasValue(env.OPENAI_MODEL)) {
    issues.push(error("missing_openai_model", "AI_PARSE_FALLBACK_ENABLED=true requires OPENAI_MODEL."));
  }
  const responsesUrl = env.OPENAI_RESPONSES_URL?.trim();
  if (responsesUrl && responsesUrl !== officialOpenAiResponsesUrl) {
    issues.push(
      error(
        "invalid_openai_responses_url",
        `OPENAI_RESPONSES_URL must be the official OpenAI Responses API endpoint: ${officialOpenAiResponsesUrl}.`
      )
    );
  }
}

function parseYoutubeDataRetentionDays(
  env: Record<string, string | undefined>,
  issues: ProductionConfigIssue[]
) {
  const raw = env.YOUTUBE_API_DATA_RETENTION_DAYS?.trim();
  if (!raw) {
    return defaultYoutubeDataRetentionDays;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    issues.push(
      error(
        "invalid_youtube_retention_days",
        "YOUTUBE_API_DATA_RETENTION_DAYS must be a positive integer number of days."
      )
    );
    return defaultYoutubeDataRetentionDays;
  }
  return parsed;
}

function requireSupabase(
  env: Record<string, string | undefined>,
  issues: ProductionConfigIssue[]
) {
  requireHttpsUrl(env, issues, "SUPABASE_URL");
  requireHttpsUrl(env, issues, "NEXT_PUBLIC_SUPABASE_URL");
  requireStrongSecret(env, issues, "SUPABASE_SERVICE_ROLE_KEY", {
    minLength: 32,
    message: "Production persistence requires a non-placeholder SUPABASE_SERVICE_ROLE_KEY."
  });
  requireStrongSecret(env, issues, "NEXT_PUBLIC_SUPABASE_ANON_KEY", {
    minLength: 20,
    message: "Production public reads require NEXT_PUBLIC_SUPABASE_ANON_KEY."
  });

  if (
    hasValue(env.SUPABASE_URL) &&
    hasValue(env.NEXT_PUBLIC_SUPABASE_URL) &&
    env.SUPABASE_URL?.trim() !== env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  ) {
    issues.push(warning("supabase_url_mismatch", "SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL differ; verify this is intentional."));
  }
}

function validateProductionRateLimit(
  env: Record<string, string | undefined>,
  issues: ProductionConfigIssue[],
  options: {
    rateLimitBackend: string;
    hostRateLimitConfigured: boolean;
    supabaseConfigured: boolean;
  }
) {
  const persistentLimiter = options.rateLimitBackend === "supabase";
  if (!persistentLimiter && !options.hostRateLimitConfigured) {
    issues.push(
      error(
        "production_requires_persistent_rate_limit",
        "Production config must set RATE_LIMIT_BACKEND=supabase or HOST_RATE_LIMIT_CONFIGURED=true so API rate limits are not process-local only."
      )
    );
  }

  if (persistentLimiter && !options.supabaseConfigured) {
    issues.push(
      error(
        "rate_limit_supabase_without_credentials",
        "RATE_LIMIT_BACKEND=supabase requires Supabase service credentials."
      )
    );
  }

  if (persistentLimiter) {
    requireStrongSecret(env, issues, "RATE_LIMIT_KEY_SALT", {
      minLength: 32,
      message:
        "RATE_LIMIT_BACKEND=supabase requires RATE_LIMIT_KEY_SALT of at least 32 characters so persisted bucket keys do not store raw client identifiers."
    });
  }
}

function requireValidEmail(
  env: Record<string, string | undefined>,
  issues: ProductionConfigIssue[],
  name: string
) {
  const value = env[name]?.trim();
  if (!value) {
    issues.push(error("missing_contact_email", `${name} is required for production contact/takedown requests.`));
    return;
  }
  if (isPlaceholder(value) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(value)) {
    issues.push(error("invalid_contact_email", `${name} must be a real contact email, not a placeholder.`));
  }
}

function requireHttpsUrl(
  env: Record<string, string | undefined>,
  issues: ProductionConfigIssue[],
  name: string
) {
  const value = env[name]?.trim();
  if (!value) {
    issues.push(error(`missing_${name.toLowerCase()}`, `${name} is required for production.`));
    return;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      issues.push(error(`invalid_${name.toLowerCase()}`, `${name} must use https:// in production.`));
    }
  } catch {
    issues.push(error(`invalid_${name.toLowerCase()}`, `${name} must be a valid URL.`));
  }
}

function requireStrongSecret(
  env: Record<string, string | undefined>,
  issues: ProductionConfigIssue[],
  name: string,
  options: { minLength: number; message: string }
) {
  const value = env[name]?.trim();
  if (!value) {
    issues.push(error(`missing_${name.toLowerCase()}`, options.message));
    return;
  }
  if (value.length < options.minLength || isPlaceholder(value)) {
    issues.push(error(`weak_${name.toLowerCase()}`, options.message));
  }
}

function requireDistinctSecrets(
  env: Record<string, string | undefined>,
  issues: ProductionConfigIssue[],
  left: string,
  right: string,
  options: { code: string; message: string }
) {
  const leftValue = env[left]?.trim();
  const rightValue = env[right]?.trim();
  if (leftValue && rightValue && leftValue === rightValue) {
    issues.push(error(options.code, options.message));
  }
}

function parseJsonArray(
  value: string | undefined,
  envName: string,
  issues: ProductionConfigIssue[]
) {
  const raw = value?.trim();
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      issues.push(error("provider_registry_not_array", `${envName} must be a JSON array.`));
      return undefined;
    }
    if (parsed.length === 0) {
      issues.push(error("provider_registry_empty", `${envName} must contain at least one provider entry when configured.`));
      return undefined;
    }
    return parsed as ProviderJsonEntry[];
  } catch {
    issues.push(error("provider_registry_invalid_json", `${envName} must be valid JSON.`));
    return undefined;
  }
}

function hasValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlaceholder(value: string) {
  const normalized = value.trim();
  return placeholderPattern.test(normalized) || /(?:replace|example|placeholder|demo)/iu.test(normalized);
}

function error(code: string, message: string): ProductionConfigIssue {
  return { level: "error", code, message };
}

function warning(code: string, message: string): ProductionConfigIssue {
  return { level: "warning", code, message };
}

function result(
  profile: ProductionConfigValidation["profile"],
  issues: ProductionConfigIssue[],
  summary: ProductionConfigValidation["summary"]
): ProductionConfigValidation {
  return {
    profile,
    ok: issues.every((issue) => issue.level !== "error"),
    issues,
    summary
  };
}
