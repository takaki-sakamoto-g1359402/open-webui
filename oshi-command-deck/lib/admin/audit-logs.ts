import { addMinutes, toUtcIso } from "@/lib/domain/time";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type AuditLogRecord = {
  id: string;
  action: string;
  tableName: string;
  rowId?: string;
  actorUserId?: string;
  createdAtUtc: string;
  ip?: string;
  userAgent?: string;
  before?: unknown;
  after?: unknown;
  summary: string;
};

type ListAuditLogOptions = {
  allowSupabase?: boolean;
  limit?: number;
};

type AuditLogRow = {
  id: string;
  actor_user_id: string | null;
  action: string;
  table_name: string;
  row_id: string | null;
  before_jsonb: unknown;
  after_jsonb: unknown;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

export async function listAuditLogs(options: ListAuditLogOptions = {}) {
  const supabase = options.allowSupabase === false ? null : createSupabaseServiceClient();
  if (!supabase) {
    return {
      source: "demo" as const,
      logs: getDemoAuditLogs()
    };
  }

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_user_id, action, table_name, row_id, before_jsonb, after_jsonb, ip, user_agent, created_at")
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 30);

  if (error) {
    throw new Error(`audit_logs select failed: ${error.message}`);
  }

  return {
    source: "supabase" as const,
    logs: ((data ?? []) as AuditLogRow[]).map(mapAuditLogRow)
  };
}

function mapAuditLogRow(row: AuditLogRow): AuditLogRecord {
  return {
    id: row.id,
    action: row.action,
    tableName: row.table_name,
    rowId: row.row_id ?? undefined,
    actorUserId: row.actor_user_id ?? undefined,
    createdAtUtc: normalizeTimestamp(row.created_at),
    ip: row.ip ?? undefined,
    userAgent: row.user_agent ?? undefined,
    before: row.before_jsonb ?? undefined,
    after: row.after_jsonb ?? undefined,
    summary: summarizePayload(row.after_jsonb ?? row.before_jsonb)
  };
}

function getDemoAuditLogs(): AuditLogRecord[] {
  const now = new Date();
  return [
    {
      id: "demo-audit-ingestion",
      action: "ingestion.persist",
      tableName: "live_events",
      rowId: "demo-live-minecraft-kuzuha",
      createdAtUtc: toUtcIso(addMinutes(now, -7)),
      ip: "127.0.0.1",
      userAgent: "DEMO job runner",
      after: {
        eventCount: 5,
        runCount: 3,
        mode: "demo"
      },
      summary: "eventCount=5, runCount=3, mode=demo"
    },
    {
      id: "demo-audit-registry",
      action: "creator_channels.upsert",
      tableName: "creator_channels",
      rowId: "demo-creator-channel",
      createdAtUtc: toUtcIso(addMinutes(now, -28)),
      ip: "127.0.0.1",
      userAgent: "DEMO admin console",
      after: {
        provider: "youtube",
        providerChannelId: "UC_DEMO_KUZUHA",
        displayName: "Kuzuha",
        slug: "kuzuha"
      },
      summary: "provider=youtube, providerChannelId=UC_DEMO_KUZUHA, displayName=Kuzuha"
    },
    {
      id: "demo-audit-correction",
      action: "manual_corrections.apply",
      tableName: "live_events",
      rowId: "demo-conflict-2002",
      createdAtUtc: toUtcIso(addMinutes(now, -83)),
      ip: "127.0.0.1",
      userAgent: "DEMO admin console",
      after: {
        fieldName: "title",
        reason: "Source evidence and provider conflict reviewed.",
        correctionId: "demo-correction-2002"
      },
      summary: "fieldName=title, reason=Source evidence and provider conflict reviewed."
    }
  ];
}

function summarizePayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value === undefined || value === null ? "" : String(value);
  }

  return Object.entries(value as Record<string, unknown>)
    .slice(0, 4)
    .map(([key, item]) => `${key}=${summarizeValue(item)}`)
    .join(", ");
}

function summarizeValue(value: unknown) {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.length}]`;
  }
  return "{...}";
}

function normalizeTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
