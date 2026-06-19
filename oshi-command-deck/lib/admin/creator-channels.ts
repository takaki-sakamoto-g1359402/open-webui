import { z } from "zod";
import { branchRegistry, demoTalents } from "@/lib/domain/registry";
import type { Provider } from "@/lib/domain/types";
import { getAdminActorLabel, type AdminAuthorization } from "@/lib/security/admin";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const xHandlePattern = /^@?[A-Za-z0-9_]{1,15}$/u;
const youtubeChannelPattern = /^(?:UC[A-Za-z0-9_-]{20,}|DEMO_[A-Z0-9_]+)$/u;
const manualProviderIdPattern = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/u;
const liveProviderBranches = new Set(
  branchRegistry
    .filter((branch) => branch.coverage === "active" || branch.coverage === "demo")
    .map((branch) => branch.id)
);
const branchIds = new Set(branchRegistry.map((branch) => branch.id));

export const creatorChannelSchema = z
  .object({
    provider: z.enum(["youtube", "x", "manual", "future"]),
    providerChannelId: z.string().trim().min(1).max(160),
    displayName: z.string().trim().min(1).max(160),
    slug: z.string().trim().min(1).max(160),
    branch: z.string().trim().min(1).max(40),
    languages: z.array(z.string().trim().min(1).max(24)).max(12).default([]),
    tags: z.array(z.string().trim().min(1).max(40)).max(24).default([]),
    aliases: z.array(z.string().trim().min(1).max(120)).max(32).default([]),
    confidence: z.number().min(0).max(1).default(0.5),
    isActive: z.boolean().default(true)
  })
  .superRefine((value, ctx) => {
    if (!branchIds.has(value.branch)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["branch"],
        message: "unknown_branch"
      });
    }
    if (value.isActive && (value.provider === "youtube" || value.provider === "x") && !liveProviderBranches.has(value.branch)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["branch"],
        message: "branch_not_open_for_live_provider"
      });
    }
    if (value.provider === "youtube" && !youtubeChannelPattern.test(value.providerChannelId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["providerChannelId"],
        message: "invalid_youtube_channel_id"
      });
    }
    if (value.provider === "x" && !xHandlePattern.test(value.providerChannelId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["providerChannelId"],
        message: "invalid_x_handle"
      });
    }
    if ((value.provider === "manual" || value.provider === "future") && !manualProviderIdPattern.test(value.providerChannelId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["providerChannelId"],
        message: "invalid_manual_provider_id"
      });
    }
  });

export type CreatorChannelInput = z.infer<typeof creatorChannelSchema>;

export type CreatorChannelRecord = CreatorChannelInput & {
  id?: string;
  updatedAt?: string;
  demo?: boolean;
};

type ListCreatorChannelsOptions = {
  allowSupabase?: boolean;
};

type CreatorChannelRow = {
  id: string;
  provider: Provider;
  provider_channel_id: string | null;
  display_name: string;
  slug: string;
  branch: string;
  languages: string[];
  tags: string[];
  aliases?: string[];
  confidence: number;
  is_active: boolean;
  updated_at?: string;
};

export async function listCreatorChannels(options: ListCreatorChannelsOptions = {}) {
  const supabase = options.allowSupabase === false ? null : createSupabaseServiceClient();
  if (!supabase) {
    return {
      source: "demo" as const,
      channels: demoTalents.flatMap((talent) => {
        const rows: CreatorChannelRecord[] = [];
        if (talent.providerIds.youtubeChannelId) {
          rows.push(toDemoRecord("youtube", talent.providerIds.youtubeChannelId, talent));
        }
        if (talent.providerIds.xHandle) {
          rows.push(toDemoRecord("x", talent.providerIds.xHandle, talent));
        }
        if (talent.providerIds.manualSlug) {
          rows.push(toDemoRecord("manual", talent.providerIds.manualSlug, talent));
        }
        return rows;
      })
    };
  }

  const { data, error } = await supabase
    .from("creator_channels")
    .select("id, provider, provider_channel_id, display_name, slug, branch, languages, tags, aliases, confidence, is_active, updated_at")
    .order("branch", { ascending: true })
    .order("display_name", { ascending: true });

  if (error) {
    throw new Error(`creator_channels select failed: ${error.message}`);
  }

  return {
    source: "supabase" as const,
    channels: ((data ?? []) as CreatorChannelRow[]).map(mapCreatorChannelRow)
  };
}

export async function upsertCreatorChannel(
  input: CreatorChannelInput,
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
    .rpc("upsert_creator_channel_registry", buildCreatorChannelRpcArgs(input, request, authorization))
    .single();

  if (error) {
    throw new Error(`creator_channels registry rpc failed: ${error.message}`);
  }

  return {
    persisted: true as const,
    channel: mapCreatorChannelRow(data as CreatorChannelRow)
  };
}

export function buildCreatorChannelRpcArgs(
  input: CreatorChannelInput,
  request: Request,
  authorization?: AdminAuthorization
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip");

  return {
    p_provider: input.provider,
    p_provider_channel_id: input.providerChannelId,
    p_display_name: input.displayName,
    p_slug: input.slug,
    p_branch: input.branch,
    p_languages: uniqueLower(input.languages),
    p_tags: uniqueLower(input.tags),
    p_aliases: unique(input.aliases),
    p_confidence: input.confidence,
    p_is_active: input.isActive,
    p_admin_actor: authorization ? getAdminActorLabel(authorization) : "admin-token",
    p_admin_user_id: authorization?.source === "supabase_auth" ? authorization.userId : null,
    p_ip: ip || null,
    p_user_agent: request.headers.get("user-agent")
  };
}

function toDemoRecord(provider: Provider, providerChannelId: string, talent: (typeof demoTalents)[number]) {
  return {
    provider,
    providerChannelId,
    displayName: talent.displayName,
    slug: talent.providerIds.manualSlug ?? talent.id,
    branch: talent.branch,
    languages: talent.languages,
    tags: talent.tags,
    aliases: [],
    confidence: talent.confidence,
    isActive: talent.active,
    demo: true
  };
}

function mapCreatorChannelRow(row: CreatorChannelRow): CreatorChannelRecord {
  return {
    id: row.id,
    provider: row.provider,
    providerChannelId: row.provider_channel_id ?? "",
    displayName: row.display_name,
    slug: row.slug,
    branch: row.branch,
    languages: row.languages ?? [],
    tags: row.tags ?? [],
    aliases: row.aliases ?? [],
    confidence: Number(row.confidence),
    isActive: Boolean(row.is_active),
    updatedAt: row.updated_at
  };
}

function unique(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function uniqueLower(items: string[]) {
  return unique(items.map((item) => item.toLowerCase()));
}
