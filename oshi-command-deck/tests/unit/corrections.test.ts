import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCorrectionRpcArgs,
  correctionSchema,
  normalizeCorrectionValue
} from "@/lib/admin/corrections";
import { applyCorrectionGuardsToEventRow } from "@/lib/supabase/persist-ingestion";

const baseEventRow = {
  creator_id: "creator-uuid",
  canonical_key: "youtube:abc",
  title: "Provider title",
  category: "minecraft" as const,
  branch: "jp",
  languages: ["ja"],
  collaborators: ["Elira Pendora"],
  status: "scheduled" as const,
  scheduled_start_at: "2026-06-19T12:00:00.000Z",
  actual_start_at: null,
  ended_at: null,
  visibility: "public" as const,
  confidence: 0.7,
  stale_after_minutes: 45,
  conflict_ids: [],
  provider_error_summary: [],
  is_demo: false,
  updated_at: "2026-06-19T10:00:00.000Z"
};

describe("admin corrections", () => {
  it("validates a correction payload", () => {
    const parsed = correctionSchema.parse({
      canonicalKey: "youtube:abc",
      fieldName: "title",
      newValue: "Corrected title",
      reason: "Direct source title was corrected by admin review."
    });

    expect(parsed).toMatchObject({
      canonicalKey: "youtube:abc",
      fieldName: "title",
      newValue: "Corrected title"
    });
  });

  it("normalizes date and confidence correction values", () => {
    expect(normalizeCorrectionValue("scheduled_start_at", "2026-06-19T12:00:00Z")).toBe(
      "2026-06-19T12:00:00.000Z"
    );
    expect(normalizeCorrectionValue("ended_at", "")).toBeNull();
    expect(normalizeCorrectionValue("confidence", "0.82")).toBe(0.82);
  });

  it("builds transaction RPC args with request metadata", () => {
    const args = buildCorrectionRpcArgs(
      {
        canonicalKey: "youtube:abc",
        fieldName: "confidence",
        newValue: "0.82",
        reason: "Direct source confidence correction."
      },
      new Request("https://app.example/api/admin/corrections", {
        headers: {
          "x-forwarded-for": "203.0.113.4, 10.0.0.1",
          "user-agent": "vitest"
        }
      })
    );

    expect(args).toEqual({
      p_canonical_key: "youtube:abc",
      p_field_name: "confidence",
      p_new_value: 0.82,
      p_reason: "Direct source confidence correction.",
      p_admin_actor: "admin-token",
      p_admin_user_id: null,
      p_ip: "203.0.113.4",
      p_user_agent: "vitest"
    });
  });

  it("labels Supabase Auth correction actors without replacing source evidence", () => {
    const args = buildCorrectionRpcArgs(
      {
        canonicalKey: "youtube:abc",
        fieldName: "title",
        newValue: "Corrected title",
        reason: "Direct source title was corrected by admin review."
      },
      new Request("https://app.example/api/admin/corrections"),
      {
        authorized: true,
        source: "supabase_auth",
        role: "admin",
        userId: "00000000-0000-4000-8000-000000000123"
      }
    );

    expect(args).toMatchObject({
      p_admin_actor: "supabase:00000000-0000-4000-8000-000000000123",
      p_admin_user_id: "00000000-0000-4000-8000-000000000123"
    });
  });

  it("preserves admin-corrected fields during later ingestion upserts", () => {
    const guarded = applyCorrectionGuardsToEventRow(
      {
        ...baseEventRow,
        title: "New provider title",
        status: "live",
        confidence: 0.91
      },
      {
        canonical_key: "youtube:abc",
        title: "Admin corrected title",
        status: "scheduled",
        confidence: 0.8,
        admin_corrected_fields: ["title", "confidence"]
      }
    );

    expect(guarded.title).toBe("Admin corrected title");
    expect(guarded.confidence).toBe(0.8);
    expect(guarded.status).toBe("live");
  });

  it("defines the correction RPC as the single database write boundary", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/0001_initial.sql"),
      "utf8"
    );

    expect(sql).toContain("create function public.apply_manual_correction");
    expect(sql).toContain("for update;");
    expect(sql).toContain("insert into public.manual_corrections");
    expect(sql).toContain("admin_user_id");
    expect(sql).toContain("insert into public.audit_logs");
    expect(sql).toContain("actor_user_id");
    expect(sql).toContain(
      "revoke execute on function public.apply_manual_correction(text, text, jsonb, text, text, uuid, inet, text) from public, anon, authenticated;"
    );
    expect(sql).toContain(
      "grant execute on function public.apply_manual_correction(text, text, jsonb, text, text, uuid, inet, text) to service_role;"
    );
  });

  it("ships a rollback-only Supabase smoke test for the correction RPC", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/smoke/0001_manual_correction_rpc.sql"),
      "utf8"
    );

    expect(sql).toContain("begin;");
    expect(sql).toContain("rollback;");
    expect(sql.toLowerCase()).not.toContain("commit;");
    expect(sql).toContain("manual:SMOKE_CORRECTION_RPC");
    expect(sql).toContain("public.apply_manual_correction");
    expect(sql).toContain("from public.manual_corrections");
    expect(sql).toContain("manual_corrections.apply");
    expect(sql).toContain("'title' = any(admin_corrected_fields)");
    expect(sql).toContain("'anon'");
    expect(sql).toContain("'authenticated'");
    expect(sql).toContain("'service_role'");
  });
});
