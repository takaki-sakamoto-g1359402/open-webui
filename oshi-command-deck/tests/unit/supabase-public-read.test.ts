import { describe, expect, it } from "vitest";
import { mapPublicEventRow } from "@/lib/supabase/public-read";

describe("Supabase public read model", () => {
  it("maps public view rows into UI livestream records without raw payload access", () => {
    const stream = mapPublicEventRow(
      {
        id: "event-1",
        creator_id: "creator-1",
        creator_slug: "kuzuha",
        creator_display_name: "Kuzuha",
        canonical_key: "youtube:abc123",
        title: "【Minecraft】Public view stream",
        category: "minecraft",
        branch: "jp",
        languages: ["ja"],
        collaborators: ["Elira Pendora"],
        status: "scheduled",
        scheduled_start_at: "2026-06-19T12:00:00Z",
        actual_start_at: null,
        ended_at: null,
        visibility: "public",
        confidence: 0.88,
        stale_after_minutes: 45,
        conflict_ids: ["x-announcement-duplicate"],
        provider_error_summary: [
          {
            provider: "x",
            code: "announcement_requires_review",
            message: "X context requires review before updating schedule facts.",
            transient: false
          }
        ],
        admin_corrected_fields: ["title"],
        admin_correction_note: "Title corrected from direct source review.",
        admin_corrected_at: "2026-06-19T10:30:00Z",
        is_demo: false,
        updated_at: "2026-06-19T10:00:00Z"
      },
      [
        {
          provider: "youtube",
          url: "https://www.youtube.com/watch?v=abc123",
          label: "YouTube",
          embeddable: true
        }
      ]
    );

    expect(stream).toMatchObject({
      id: "supabase-event-1",
      canonicalKey: "youtube:abc123",
      talentId: "kuzuha",
      titleOriginal: "【Minecraft】Public view stream",
      scheduledStartUtc: "2026-06-19T12:00:00Z",
      collaborators: ["Elira Pendora"],
      conflictIds: ["x-announcement-duplicate"],
      demo: false
    });
    expect(stream.adminCorrection).toEqual({
      field: "title",
      correctedAtUtc: "2026-06-19T10:30:00Z",
      reason: "Title corrected from direct source review."
    });
    expect(stream.sourceLinks).toEqual([
      {
        provider: "youtube",
        url: "https://www.youtube.com/watch?v=abc123",
        label: "YouTube",
        embeddable: true
      }
    ]);
    expect(stream.providerErrors).toEqual([
      {
        provider: "x",
        code: "announcement_requires_review",
        message: "X context requires review before updating schedule facts.",
        retryAfterUtc: undefined,
        transient: false
      }
    ]);
    expect(stream.provenance[0].rawExcerpt).toBe("Supabase public read model");
  });
});
