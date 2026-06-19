import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: vi.fn()
}));

import {
  buildCreatorChannelRpcArgs,
  upsertCreatorChannel
} from "@/lib/admin/creator-channels";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const mockedCreateSupabaseServiceClient = vi.mocked(createSupabaseServiceClient);

describe("creator channel registry RPC", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("builds normalized service-role RPC args with admin evidence metadata", () => {
    const args = buildCreatorChannelRpcArgs(
      {
        provider: "youtube",
        providerChannelId: "UCabcdefghijklmnopqrstuv",
        displayName: "Test Talent",
        slug: "test-talent",
        branch: "jp",
        languages: ["JA", "ja", "en"],
        tags: ["Game", "game", "Minecraft"],
        aliases: ["テスト", "テスト"],
        confidence: 0.82,
        isActive: true
      },
      new Request("https://app.example/api/admin/creator-channels", {
        headers: {
          "x-forwarded-for": "203.0.113.10, 10.0.0.1",
          "user-agent": "vitest"
        }
      }),
      {
        authorized: true,
        source: "supabase_auth",
        role: "admin",
        userId: "00000000-0000-4000-8000-000000000999"
      }
    );

    expect(args).toEqual({
      p_provider: "youtube",
      p_provider_channel_id: "UCabcdefghijklmnopqrstuv",
      p_display_name: "Test Talent",
      p_slug: "test-talent",
      p_branch: "jp",
      p_languages: ["ja", "en"],
      p_tags: ["game", "minecraft"],
      p_aliases: ["テスト"],
      p_confidence: 0.82,
      p_is_active: true,
      p_admin_actor: "supabase:00000000-0000-4000-8000-000000000999",
      p_admin_user_id: "00000000-0000-4000-8000-000000000999",
      p_ip: "203.0.113.10",
      p_user_agent: "vitest"
    });
  });

  it("upserts registry rows through the atomic RPC instead of direct table writes", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "00000000-0000-4000-8000-000000000111",
        provider: "youtube",
        provider_channel_id: "UCabcdefghijklmnopqrstuv",
        display_name: "Test Talent",
        slug: "test-talent",
        branch: "jp",
        languages: ["ja"],
        tags: ["game"],
        aliases: [],
        confidence: 0.82,
        is_active: true,
        updated_at: "2026-06-19T12:00:00.000Z"
      },
      error: null
    });
    const rpc = vi.fn(() => ({ single }));
    const from = vi.fn();
    mockedCreateSupabaseServiceClient.mockReturnValue({
      rpc,
      from
    } as unknown as ReturnType<typeof createSupabaseServiceClient>);

    const result = await upsertCreatorChannel(
      {
        provider: "youtube",
        providerChannelId: "UCabcdefghijklmnopqrstuv",
        displayName: "Test Talent",
        slug: "test-talent",
        branch: "jp",
        languages: ["ja"],
        tags: ["game"],
        aliases: [],
        confidence: 0.82,
        isActive: true
      },
      new Request("https://app.example/api/admin/creator-channels")
    );

    expect(rpc).toHaveBeenCalledWith(
      "upsert_creator_channel_registry",
      expect.objectContaining({
        p_provider: "youtube",
        p_provider_channel_id: "UCabcdefghijklmnopqrstuv",
        p_admin_actor: "admin-token"
      })
    );
    expect(from).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      persisted: true,
      channel: {
        id: "00000000-0000-4000-8000-000000000111",
        provider: "youtube",
        providerChannelId: "UCabcdefghijklmnopqrstuv"
      }
    });
  });

  it("surfaces registry RPC failures without a fallback direct write", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "audit insert failed" }
    });
    const rpc = vi.fn(() => ({ single }));
    const from = vi.fn();
    mockedCreateSupabaseServiceClient.mockReturnValue({
      rpc,
      from
    } as unknown as ReturnType<typeof createSupabaseServiceClient>);

    await expect(
      upsertCreatorChannel(
        {
          provider: "youtube",
          providerChannelId: "UCabcdefghijklmnopqrstuv",
          displayName: "Test Talent",
          slug: "test-talent",
          branch: "jp",
          languages: ["ja"],
          tags: ["game"],
          aliases: [],
          confidence: 0.82,
          isActive: true
        },
        new Request("https://app.example/api/admin/creator-channels")
      )
    ).rejects.toThrow("creator_channels registry rpc failed: audit insert failed");
    expect(from).not.toHaveBeenCalled();
  });
});
