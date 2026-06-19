import { z } from "zod";
import { streamCategories, streamStatuses } from "@/lib/domain/types";
import type { Livestream } from "@/lib/domain/types";
import { getAdminActorLabel, type AdminAuthorization } from "@/lib/security/admin";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const correctionFieldNames = [
  "title",
  "category",
  "status",
  "scheduled_start_at",
  "actual_start_at",
  "ended_at",
  "visibility",
  "confidence"
] as const;

type CorrectionFieldName = (typeof correctionFieldNames)[number];

const correctionValueSchema = z.union([z.string().trim(), z.number(), z.null()]);

export const correctionSchema = z.object({
  canonicalKey: z.string().trim().min(1).max(220),
  fieldName: z.enum(correctionFieldNames),
  newValue: correctionValueSchema,
  reason: z.string().trim().min(8).max(600)
});

export type CorrectionInput = z.infer<typeof correctionSchema>;

type ManualCorrectionRpcRow = {
  correction_id: string;
  event_id: string;
  field_name: string;
  corrected_at: string;
};

export async function applyManualCorrection(
  input: CorrectionInput,
  request: Request,
  authorization?: AdminAuthorization
) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return {
      persisted: false as const,
      reason: "missing_supabase" as const
    };
  }

  const { data, error } = await supabase
    .rpc("apply_manual_correction", buildCorrectionRpcArgs(input, request, authorization))
    .maybeSingle();

  if (error) {
    throw new Error(`manual correction rpc failed: ${error.message}`);
  }

  if (!data) {
    return {
      persisted: false as const,
      reason: "event_not_found" as const
    };
  }

  const correction = data as ManualCorrectionRpcRow;

  return {
    persisted: true as const,
    correctionId: correction.correction_id,
    eventId: correction.event_id,
    fieldName: correction.field_name,
    correctedAtUtc: normalizeCorrectionTimestamp(correction.corrected_at)
  };
}

export function buildCorrectionRpcArgs(
  input: CorrectionInput,
  request: Request,
  authorization?: AdminAuthorization
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip");

  return {
    p_canonical_key: input.canonicalKey,
    p_field_name: input.fieldName,
    p_new_value: normalizeCorrectionValue(input.fieldName, input.newValue),
    p_reason: input.reason,
    p_admin_actor: authorization ? getAdminActorLabel(authorization) : "admin-token",
    p_admin_user_id: authorization?.source === "supabase_auth" ? authorization.userId : null,
    p_ip: ip || null,
    p_user_agent: request.headers.get("user-agent")
  };
}

export function normalizeCorrectionValue(fieldName: CorrectionFieldName, value: CorrectionInput["newValue"]) {
  if (fieldName === "confidence") {
    const numberValue = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numberValue) || numberValue < 0 || numberValue > 1) {
      throw new Error("invalid_confidence");
    }
    return numberValue;
  }

  if (["scheduled_start_at", "actual_start_at", "ended_at"].includes(fieldName)) {
    if (value === null || value === "") {
      return null;
    }
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      throw new Error("invalid_datetime");
    }
    return date.toISOString();
  }

  if (fieldName === "status") {
    const status = String(value);
    if (!streamStatuses.includes(status as Livestream["status"])) {
      throw new Error("invalid_status");
    }
    return status;
  }

  if (fieldName === "category") {
    const category = String(value);
    if (!streamCategories.includes(category as Livestream["category"])) {
      throw new Error("invalid_category");
    }
    return category;
  }

  if (fieldName === "visibility") {
    const visibility = String(value);
    if (!["public", "unlisted", "unknown"].includes(visibility)) {
      throw new Error("invalid_visibility");
    }
    return visibility;
  }

  const text = String(value).trim();
  if (!text) {
    throw new Error("invalid_text");
  }
  return text;
}

function normalizeCorrectionTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
