import { describe, expect, it } from "vitest";
import { buildProviderConfigExport } from "@/lib/admin/provider-config-export";
import type { CreatorChannelRecord } from "@/lib/admin/creator-channels";

describe("provider config export", () => {
  it("builds server env JSON for YouTube and X adapters from active registry rows", () => {
    const channels: CreatorChannelRecord[] = [
      {
        provider: "youtube",
        providerChannelId: "UC_TEST",
        displayName: "Test Talent",
        slug: "test-talent",
        branch: "jp",
        languages: ["ja", "ja"],
        tags: ["game", "minecraft", "game"],
        aliases: [],
        confidence: 0.9,
        isActive: true,
        demo: true
      },
      {
        provider: "x",
        providerChannelId: "@test_handle",
        displayName: "Test Talent",
        slug: "test-talent",
        branch: "jp",
        languages: ["ja"],
        tags: ["game"],
        aliases: [],
        confidence: 0.9,
        isActive: true
      },
      {
        provider: "manual",
        providerChannelId: "manual-test",
        displayName: "Manual Talent",
        slug: "manual-talent",
        branch: "future",
        languages: ["ja"],
        tags: ["manual"],
        aliases: [],
        confidence: 0.6,
        isActive: true
      },
      {
        provider: "youtube",
        providerChannelId: "UC_INACTIVE",
        displayName: "Inactive Talent",
        slug: "inactive-talent",
        branch: "en",
        languages: ["en"],
        tags: ["music"],
        aliases: [],
        confidence: 0.4,
        isActive: false
      },
      {
        provider: "x",
        providerChannelId: "@legacy_handle",
        displayName: "Legacy Talent",
        slug: "legacy-talent",
        branch: "id",
        languages: ["id"],
        tags: ["game"],
        aliases: [],
        confidence: 0.9,
        isActive: true
      }
    ];

    const result = buildProviderConfigExport(channels);

    expect(result.youtubeChannels).toEqual([
      {
        talentId: "test-talent",
        displayName: "Test Talent",
        channelId: "UC_TEST",
        branch: "jp",
        languages: ["ja"],
        tags: ["game", "minecraft"]
      }
    ]);
    expect(result.xHandles).toEqual([
      {
        talentId: "test-talent",
        displayName: "Test Talent",
        handle: "test_handle",
        branch: "jp",
        languages: ["ja"],
        tags: ["game"]
      }
    ]);
    expect(result.youtubeJson).toContain("UC_TEST");
    expect(result.youtubeJson).not.toContain("UC_INACTIVE");
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      "demo_row",
      "ignored_provider",
      "low_confidence",
      "inactive_row",
      "branch_not_live"
    ]);
  });
});
