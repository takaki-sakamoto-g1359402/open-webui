import { afterEach, describe, expect, it, vi } from "vitest";
import { creatorChannelSchema, listCreatorChannels } from "@/lib/admin/creator-channels";

describe("admin creator channels", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns demo registry rows when Supabase service credentials are absent", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const result = await listCreatorChannels();

    expect(result.source).toBe("demo");
    expect(result.channels.length).toBeGreaterThan(3);
    expect(result.channels[0]).toHaveProperty("providerChannelId");
  });

  it("keeps registry reads in demo mode unless admin access explicitly allows Supabase", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");

    const result = await listCreatorChannels({ allowSupabase: false });

    expect(result.source).toBe("demo");
    expect(result.channels.every((channel) => channel.demo)).toBe(true);
  });

  it("validates provider IDs, aliases, tags, active state, and confidence", () => {
    const parsed = creatorChannelSchema.parse({
      provider: "youtube",
      providerChannelId: "UCabcdefghijklmnopqrstuv",
      displayName: "Test Talent",
      slug: "test-talent",
      branch: "jp",
      languages: ["ja"],
      tags: ["game", "collaboration"],
      aliases: ["テスト"],
      confidence: 0.81,
      isActive: true
    });

    expect(parsed).toMatchObject({
      provider: "youtube",
      providerChannelId: "UCabcdefghijklmnopqrstuv",
      aliases: ["テスト"],
      confidence: 0.81,
      isActive: true
    });
  });

  it("rejects unknown branches and malformed provider IDs before database writes", () => {
    expect(() =>
      creatorChannelSchema.parse({
        provider: "x",
        providerChannelId: "bad-handle-with-dash",
        displayName: "Bad Handle",
        slug: "bad-handle",
        branch: "unknown",
        languages: ["ja"],
        tags: ["game"],
        aliases: [],
        confidence: 0.81,
        isActive: true
      })
    ).toThrow(/unknown_branch|invalid_x_handle/u);
  });

  it("rejects active live providers on manual-only or future branches", () => {
    expect(() =>
      creatorChannelSchema.parse({
        provider: "youtube",
        providerChannelId: "UCabcdefghijklmnopqrstuv",
        displayName: "Manual Branch Live",
        slug: "manual-branch-live",
        branch: "id",
        languages: ["id"],
        tags: ["game"],
        aliases: [],
        confidence: 0.81,
        isActive: true
      })
    ).toThrow(/branch_not_open_for_live_provider/u);

    expect(() =>
      creatorChannelSchema.parse({
        provider: "youtube",
        providerChannelId: "UCabcdefghijklmnopqrstuv",
        displayName: "Inactive Manual Branch Live",
        slug: "inactive-manual-branch-live",
        branch: "id",
        languages: ["id"],
        tags: ["game"],
        aliases: [],
        confidence: 0.81,
        isActive: false
      })
    ).not.toThrow();
  });
});
