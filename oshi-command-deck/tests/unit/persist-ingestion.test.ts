import { beforeEach, describe, expect, it, vi } from "vitest";
import { runIngestion } from "@/lib/adapters";
import { getDemoStreams } from "@/lib/domain/fixtures";
import {
  buildLiveEventUpsertRow,
  getProviderItemIdForLink,
  persistIngestionSummary
} from "@/lib/supabase/persist-ingestion";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Livestream } from "@/lib/domain/types";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: vi.fn()
}));

const mockedCreateSupabaseServiceClient = vi.mocked(createSupabaseServiceClient);

describe("Supabase ingestion persistence helpers", () => {
  beforeEach(() => {
    mockedCreateSupabaseServiceClient.mockReset();
  });

  it("keeps public-safe collaborators, conflicts, provider errors, and creator linkage on live events", () => {
    const stream = getDemoStreams(new Date("2026-06-19T12:00:00Z")).find(
      (item) => item.id === "demo-unverified-event"
    );
    expect(stream).toBeDefined();

    const row = buildLiveEventUpsertRow(stream!, "creator-uuid", "2026-06-19T12:10:00Z");

    expect(row).toMatchObject({
      creator_id: "creator-uuid",
      canonical_key: "x:DEMO_X_UNVERIFIED_EVENT",
      collaborators: ["Kuzuha"],
      conflict_ids: ["demo-conflict-2002"],
      updated_at: "2026-06-19T12:10:00Z"
    });
    expect(row.provider_error_summary).toEqual([
      {
        provider: "youtube",
        code: "missing_video_id",
        message: "No public YouTube video ID confirmed for this item.",
        retryAfterUtc: undefined,
        transient: false
      }
    ]);
  });

  it("uses per-link source identities so duplicate provider links do not collide", () => {
    const youtubeStream = getDemoStreams(new Date("2026-06-19T12:00:00Z")).find(
      (item) => item.id === "demo-scheduled-collab-elira"
    );
    expect(youtubeStream).toBeDefined();

    const mergedStream: Livestream = {
      ...youtubeStream!,
      sourceLinks: [
        ...youtubeStream!.sourceLinks,
        {
          provider: "x",
          url: "https://x.com/kuzuha_example/status/1900000000000000999",
          label: "X",
          embeddable: false
        },
        {
          provider: "x",
          url: youtubeStream!.sourceLinks[0].url,
          label: "Linked source",
          embeddable: false
        }
      ],
      provenance: [
        ...youtubeStream!.provenance,
        {
          provider: "x",
          sourceId: "1900000000000000999",
          fetchedAtUtc: "2026-06-19T12:05:00Z",
          url: "https://x.com/kuzuha_example/status/1900000000000000999",
          fields: ["context", "collaborators"],
          confidence: 0.72,
          rawExcerpt: "Schedule update: POV may move, with Finana"
        }
      ]
    };

    const xIds = mergedStream.sourceLinks
      .filter((link) => link.provider === "x")
      .map((link) => getProviderItemIdForLink(mergedStream, link));

    expect(xIds).toContain("1900000000000000999");
    expect(new Set(xIds).size).toBe(xIds.length);
  });

  it("persists ingestion through one service-role RPC payload with source evidence", async () => {
    const rpc = vi.fn(
      async (functionName: string, args: { p_payload: Record<string, unknown> }) => {
        void functionName;
        void args;
        return {
          data: [
            {
              event_count: 4,
              source_count: 4,
              event_source_count: 4,
              public_link_count: 3,
              run_count: 3
            }
          ],
          error: null
        };
      }
    );
    const from = vi.fn((table: string) => {
      if (table !== "creator_channels") {
        throw new Error(`unexpected table write outside RPC: ${table}`);
      }
      return {
        select: vi.fn(() => ({
          in: vi.fn(async () => ({
            data: [
              {
                id: "00000000-0000-4000-8000-000000000001",
                slug: "elira-pendora",
                confidence: 0.9,
                is_active: true
              }
            ],
            error: null
          }))
        }))
      };
    });
    mockedCreateSupabaseServiceClient.mockReturnValue({
      from,
      rpc
    } as unknown as ReturnType<typeof createSupabaseServiceClient>);

    const summary = await runIngestion({
      now: new Date("2026-06-19T12:00:00Z"),
      dryRun: true,
      demoMode: true
    });
    summary.results[0].errors.push({
      provider: summary.results[0].provider,
      code: "fixture_warning",
      message: "Fixture warning is preserved for admin evidence.",
      transient: false
    });
    const result = await persistIngestionSummary(summary);

    expect(result).toMatchObject({
      persisted: true,
      eventCount: 4,
      sourceCount: 4,
      eventSourceCount: 4,
      publicLinkCount: 3,
      runCount: 3
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe("persist_ingestion_run");
    const payload = rpc.mock.calls[0][1]?.p_payload as {
      events: unknown[];
      sources: Array<{ payload_jsonb: { rawEvidence: unknown[] } }>;
      eventSources: unknown[];
      providerErrors: unknown[];
      reconcileEdges: boolean;
    };
    expect(payload.events.length).toBeGreaterThanOrEqual(4);
    expect(payload.reconcileEdges).toBe(true);
    expect(payload.sources[0].payload_jsonb.rawEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rawExcerpt: expect.any(String),
          fields: expect.any(Array)
        })
      ])
    );
    expect(payload.eventSources[0]).toEqual(
      expect.objectContaining({
        live_event_canonical_key: expect.any(String),
        provider_item_id: expect.any(String)
      })
    );
    expect(payload.providerErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          run_adapter: expect.any(String),
          raw_excerpt: expect.any(String)
        })
      ])
    );
  });
});
