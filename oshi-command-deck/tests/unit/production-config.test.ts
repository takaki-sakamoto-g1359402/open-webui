import { describe, expect, it } from "vitest";
import { validateProductionConfig } from "@/lib/security/production-config";

const strongEnv = {
  NEXT_PUBLIC_DEMO_MODE: "false",
  OSHI_DEMO_MODE: "false",
  NEXT_PUBLIC_CONTACT_EMAIL: "ops@oshi-command-deck.dev",
  ADMIN_JOB_TOKEN: "a".repeat(48),
  CRON_SECRET: "c".repeat(48),
  SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "s".repeat(64),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon_" + "a".repeat(32),
  YOUTUBE_DATA_API_KEY: "youtube_" + "y".repeat(32),
  YOUTUBE_CHANNELS_JSON: JSON.stringify([
    {
      talentId: "kuzuha",
      displayName: "Kuzuha",
      channelId: "UC1234567890123456789012",
      branch: "jp",
      languages: ["ja"],
      tags: ["game"]
    }
  ]),
  X_BEARER_TOKEN: "",
  X_HANDLES_JSON: "",
  STREAMS_READ_SOURCE: "supabase",
  RATE_LIMIT_BACKEND: "supabase",
  RATE_LIMIT_KEY_SALT: "r".repeat(48),
  HOST_RATE_LIMIT_CONFIGURED: "false",
  AI_PARSE_FALLBACK_ENABLED: "false"
};

describe("production config validation", () => {
  it("accepts local demo mode without production credentials", () => {
    const result = validateProductionConfig({
      NEXT_PUBLIC_DEMO_MODE: "true",
      STREAMS_READ_SOURCE: "adapters"
    });

    expect(result.ok).toBe(true);
    expect(result.profile).toBe("demo");
  });

  it("rejects production mode without required Supabase, provider, contact, and token config", () => {
    const result = validateProductionConfig(
      {
        NEXT_PUBLIC_DEMO_MODE: "false",
        STREAMS_READ_SOURCE: "supabase",
        NEXT_PUBLIC_CONTACT_EMAIL: "admin@example.com",
        ADMIN_JOB_TOKEN: "job-token"
      },
      { strictProduction: true }
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "weak_admin_job_token",
        "missing_cron_secret",
        "invalid_contact_email",
        "missing_supabase_url",
        "missing_supabase_service_role_key",
        "missing_next_public_supabase_url",
        "missing_next_public_supabase_anon_key",
        "server_demo_mode_enabled",
        "production_requires_persistent_rate_limit",
        "missing_live_provider",
        "supabase_read_without_credentials"
      ])
    );
  });

  it("accepts a strict production config with Supabase and an official YouTube registry shape", () => {
    const result = validateProductionConfig(strongEnv, { strictProduction: true });

    expect(result.ok).toBe(true);
    expect(result.profile).toBe("production");
    expect(result.summary.supabaseConfigured).toBe(true);
    expect(result.summary.youtubeConfigured).toBe(true);
    expect(result.summary.youtubeDataRetentionDays).toBe(29);
    expect(result.summary.rateLimitBackend).toBe("supabase");
    expect(result.summary.hostRateLimitConfigured).toBe(false);
  });

  it("accepts strict production with a host-level rate limiter instead of the Supabase RPC backend", () => {
    const result = validateProductionConfig(
      {
        ...strongEnv,
        RATE_LIMIT_BACKEND: "memory",
        RATE_LIMIT_KEY_SALT: "",
        HOST_RATE_LIMIT_CONFIGURED: "true"
      },
      { strictProduction: true }
    );

    expect(result.ok).toBe(true);
    expect(result.summary.rateLimitBackend).toBe("memory");
    expect(result.summary.hostRateLimitConfigured).toBe(true);
  });

  it("requires a strong persisted bucket salt when the Supabase rate-limit backend is enabled", () => {
    const result = validateProductionConfig(
      {
        ...strongEnv,
        RATE_LIMIT_KEY_SALT: "short"
      },
      { strictProduction: true }
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("weak_rate_limit_key_salt");
  });

  it("rejects server runtime demo mode in strict production", () => {
    const result = validateProductionConfig(
      {
        ...strongEnv,
        OSHI_DEMO_MODE: "true"
      },
      { strictProduction: true }
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("server_demo_mode_enabled");
  });

  it("requires Supabase as the public stream read source in strict production", () => {
    const result = validateProductionConfig(
      {
        ...strongEnv,
        STREAMS_READ_SOURCE: "adapters"
      },
      { strictProduction: true }
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "production_requires_supabase_read_source"
    );
  });

  it("rejects a weak optional admin session signing secret", () => {
    const result = validateProductionConfig(
      {
        ...strongEnv,
        ADMIN_SESSION_SECRET: "short"
      },
      { strictProduction: true }
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("weak_admin_session_secret");
  });

  it("requires a strong Vercel cron secret in strict production", () => {
    const result = validateProductionConfig(
      {
        ...strongEnv,
        CRON_SECRET: "short"
      },
      { strictProduction: true }
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("weak_cron_secret");
  });

  it("rejects reusing the Admin token as the Vercel cron secret", () => {
    const reused = "shared-production-secret-" + "x".repeat(32);
    const result = validateProductionConfig(
      {
        ...strongEnv,
        ADMIN_JOB_TOKEN: reused,
        CRON_SECRET: reused
      },
      { strictProduction: true }
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("admin_cron_secret_reused");
  });

  it("rejects demo provider IDs and partial VAPID config in production", () => {
    const result = validateProductionConfig(
      {
        ...strongEnv,
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public-key",
        VAPID_PRIVATE_KEY: "",
        VAPID_SUBJECT: "",
        YOUTUBE_CHANNELS_JSON: JSON.stringify([
          {
            talentId: "demo-kuzuha",
            displayName: "Kuzuha",
            channelId: "DEMO_YT_KUZUHA",
            branch: "jp",
            languages: ["ja"]
          }
        ])
      },
      { strictProduction: true }
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "partial_vapid_config",
        "provider_entry_demo_talent",
        "youtube_channel_placeholder",
        "youtube_channel_format"
      ])
    );
  });

  it("requires OpenAI credentials when AI fallback is enabled", () => {
    const result = validateProductionConfig(
      {
        ...strongEnv,
        AI_PARSE_FALLBACK_ENABLED: "true",
        OPENAI_API_KEY: "",
        OPENAI_MODEL: ""
      },
      { strictProduction: true }
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["missing_openai_api_key", "missing_openai_model"])
    );
  });

  it("rejects YouTube retention windows outside the policy guardrail", () => {
    const result = validateProductionConfig(
      {
        ...strongEnv,
        YOUTUBE_API_DATA_RETENTION_DAYS: "31"
      },
      { strictProduction: true }
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("youtube_retention_window_too_long");
  });

  it("rejects non-official OpenAI Responses URLs when AI fallback is enabled", () => {
    const result = validateProductionConfig(
      {
        ...strongEnv,
        AI_PARSE_FALLBACK_ENABLED: "true",
        OPENAI_API_KEY: "sk-" + "o".repeat(48),
        OPENAI_MODEL: "gpt-5.4-mini",
        OPENAI_RESPONSES_URL: "https://example.com/v1/responses"
      },
      { strictProduction: true }
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("invalid_openai_responses_url");
  });
});
