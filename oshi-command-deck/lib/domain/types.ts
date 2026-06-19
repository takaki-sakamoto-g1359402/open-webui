export const streamStatuses = [
  "scheduled",
  "live",
  "ended",
  "tbd",
  "unverified"
] as const;

export type StreamStatus = (typeof streamStatuses)[number];

export const streamCategories = [
  "chat",
  "game",
  "minecraft",
  "music",
  "collaboration",
  "event",
  "other"
] as const;

export type StreamCategory = (typeof streamCategories)[number];

export const providers = ["youtube", "x", "manual", "future"] as const;

export type Provider = (typeof providers)[number];

export type SourceHealthState =
  | "healthy"
  | "degraded"
  | "stale"
  | "missing_credentials"
  | "disabled";

export const sourceHealthCoverageCodes = [
  "demo.youtube.pending_config",
  "demo.x.official_api_disabled",
  "manual.imports_require_corrections",
  "manual.demo_require_corrections",
  "future.adapter_pending",
  "youtube.demo_not_called",
  "youtube.missing_credentials",
  "youtube.official_search",
  "youtube.official_search_stopped_early",
  "youtube.cached",
  "youtube.registry_error",
  "youtube.registry_missing",
  "x.demo_not_called",
  "x.missing_credentials",
  "x.official_search_ai_enabled",
  "x.official_search_ai_disabled",
  "x.official_search_ai_enabled_stopped_early",
  "x.official_search_ai_disabled_stopped_early",
  "x.registry_error",
  "x.registry_missing",
  "provider.cooldown",
  "supabase.not_configured",
  "supabase.empty",
  "supabase.serving_public",
  "supabase.read_failed",
  "offline.cached_snapshot"
] as const;

export type SourceHealthCoverageCode = (typeof sourceHealthCoverageCodes)[number];

export const sourceHealthErrorCodes = [
  "missing_credentials.youtube_data_api_key",
  "missing_credentials.x_bearer_token",
  "provider.code",
  "provider.cooldown",
  "supabase.public_read_failed"
] as const;

export type SourceHealthErrorCode = (typeof sourceHealthErrorCodes)[number];

export type BranchConfig = {
  id: string;
  label: string;
  localeHints: string[];
  coverage: "active" | "demo" | "manual_only" | "future";
  notes: string;
};

export type Talent = {
  id: string;
  displayName: string;
  branch: string;
  languages: string[];
  tags: string[];
  providerIds: {
    youtubeChannelId?: string;
    xHandle?: string;
    manualSlug?: string;
  };
  confidence: number;
  active: boolean;
};

export type SourceLink = {
  provider: Provider;
  url: string;
  label: string;
  embeddable: boolean;
};

export type ProvenanceField =
  | "title"
  | "status"
  | "scheduledStart"
  | "context"
  | "cancellation"
  | "collaborators"
  | "category";

export type Provenance = {
  provider: Provider;
  sourceId: string;
  fetchedAtUtc: string;
  url?: string;
  fields: ProvenanceField[];
  confidence: number;
  rawExcerpt: string;
};

export type ProviderError = {
  provider: Provider;
  code: string;
  message: string;
  retryAfterUtc?: string;
  transient: boolean;
};

export type Livestream = {
  id: string;
  canonicalKey: string;
  talentId: string;
  titleOriginal: string;
  titleMachineTranslation?: {
    locale: string;
    text: string;
    model: string;
  };
  category: StreamCategory;
  branch: string;
  languages: string[];
  status: StreamStatus;
  scheduledStartUtc?: string;
  actualStartUtc?: string;
  endedAtUtc?: string;
  collaborators: string[];
  sourceLinks: SourceLink[];
  confidence: number;
  lastCheckedUtc: string;
  staleAfterMinutes: number;
  visibility: "public" | "unlisted" | "unknown";
  demo: boolean;
  provenance: Provenance[];
  providerErrors: ProviderError[];
  conflictIds: string[];
  adminCorrection?: {
    field: string;
    correctedAtUtc: string;
    reason: string;
  };
};

export type SourceHealth = {
  provider: Provider;
  state: SourceHealthState;
  coverageCode?: SourceHealthCoverageCode;
  coverageParams?: Record<string, string | number>;
  coverageLimit: string;
  lastCheckedUtc?: string;
  confidence: number;
  quotaRemaining?: number;
  errorCode?: SourceHealthErrorCode;
  errorParams?: Record<string, string | number>;
  error?: string;
};

export type UserPreferences = {
  favoriteTalentIds: string[];
  favoriteCategories: StreamCategory[];
  favoriteLanguages: string[];
  alertTypes: {
    upcoming: boolean;
    live: boolean;
    minecraft: boolean;
    collaboration: boolean;
  };
  timezone: string;
  locale: string;
  branchFilter: string;
  languageFilter: string;
  categoryFilter: StreamCategory | "all";
  statusFilter: StreamStatus | "all";
  favoritesOnly: boolean;
  search: string;
  archivedEventIds: string[];
};

export type AlertType = keyof UserPreferences["alertTypes"];

export type WatchRouteReason = {
  code:
    | "live_now"
    | "favorite_talent"
    | "favorite_category"
    | "minecraft_priority"
    | "collaboration"
    | "overlap"
    | "starting_soon"
    | "high_confidence"
    | "stale_penalty"
    | "manual_correction";
  weight: number;
  evidence: string;
};

export type WatchRouteItem = {
  stream: Livestream;
  score: number;
  reasons: WatchRouteReason[];
  overlaps: string[];
};

export type MinecraftSession = {
  id: string;
  title: string;
  streamIds: string[];
  participantTalentIds: string[];
  status: StreamStatus;
  startUtc?: string;
  endUtc?: string;
  links: SourceLink[];
  confidence: number;
};

export type RelationshipEdge = {
  fromTalentId: string;
  toTalentId: string;
  streamIds: string[];
  confidence: number;
  source: Provider;
  meaning: "same_session" | "declared_collaboration";
};
