import { addMinutes, toUtcIso } from "./time";
import type { Livestream, SourceHealth } from "./types";

const demoVideoBase = "https://www.youtube.com/watch?v=";
const demoXBase = "https://x.com/i/web/status/";

export function getDemoStreams(now = new Date()): Livestream[] {
  const liveStart = addMinutes(now, -36);
  const collabStart = addMinutes(now, 92);
  const chatStart = addMinutes(now, 210);
  const staleStart = addMinutes(now, -180);
  const tbdChecked = addMinutes(now, -84);
  const freshChecked = addMinutes(now, -8);

  return [
    {
      id: "demo-live-minecraft-kuzuha",
      canonicalKey: "youtube:DEMO_LIVE_MINECRAFT_KUZUHA",
      talentId: "kuzuha",
      titleOriginal: "【Minecraft】夜の建築と素材集め with friends",
      category: "minecraft",
      branch: "jp",
      languages: ["ja"],
      status: "live",
      scheduledStartUtc: toUtcIso(liveStart),
      actualStartUtc: toUtcIso(liveStart),
      collaborators: ["Elira Pendora", "Manual POV"],
      sourceLinks: [
        {
          provider: "youtube",
          url: `${demoVideoBase}DEMO_LIVE_MINECRAFT_KUZUHA`,
          label: "YouTube",
          embeddable: true
        },
        {
          provider: "x",
          url: `${demoXBase}DEMO_X_1001`,
          label: "X announcement",
          embeddable: false
        }
      ],
      confidence: 0.91,
      lastCheckedUtc: toUtcIso(freshChecked),
      staleAfterMinutes: 35,
      visibility: "public",
      demo: true,
      provenance: [
        {
          provider: "youtube",
          sourceId: "DEMO_LIVE_MINECRAFT_KUZUHA",
          fetchedAtUtc: toUtcIso(freshChecked),
          url: `${demoVideoBase}DEMO_LIVE_MINECRAFT_KUZUHA`,
          fields: ["title", "status", "scheduledStart", "category"],
          confidence: 0.94,
          rawExcerpt: "liveStreamingDetails.actualStartTime present; embeddable true"
        },
        {
          provider: "x",
          sourceId: "DEMO_X_1001",
          fetchedAtUtc: toUtcIso(addMinutes(now, -18)),
          url: `${demoXBase}DEMO_X_1001`,
          fields: ["context", "collaborators"],
          confidence: 0.78,
          rawExcerpt: "Minecraft collab note with links; parsed deterministically"
        }
      ],
      providerErrors: [],
      conflictIds: []
    },
    {
      id: "demo-scheduled-collab-elira",
      canonicalKey: "youtube:DEMO_SCHEDULED_COLLAB_ELIRA",
      talentId: "elira-pendora",
      titleOriginal: "Minecraft relay POV / exploring the new town",
      category: "minecraft",
      branch: "en",
      languages: ["en", "ja"],
      status: "scheduled",
      scheduledStartUtc: toUtcIso(collabStart),
      collaborators: ["Kuzuha", "Manual POV"],
      sourceLinks: [
        {
          provider: "youtube",
          url: `${demoVideoBase}DEMO_SCHEDULED_COLLAB_ELIRA`,
          label: "YouTube",
          embeddable: true
        }
      ],
      confidence: 0.86,
      lastCheckedUtc: toUtcIso(freshChecked),
      staleAfterMinutes: 45,
      visibility: "public",
      demo: true,
      provenance: [
        {
          provider: "youtube",
          sourceId: "DEMO_SCHEDULED_COLLAB_ELIRA",
          fetchedAtUtc: toUtcIso(freshChecked),
          url: `${demoVideoBase}DEMO_SCHEDULED_COLLAB_ELIRA`,
          fields: ["title", "status", "scheduledStart", "collaborators"],
          confidence: 0.86,
          rawExcerpt: "upcoming video with scheduledStartTime"
        }
      ],
      providerErrors: [],
      conflictIds: []
    },
    {
      id: "demo-chat-mito",
      canonicalKey: "manual:DEMO_MANUAL_CHAT_MITO",
      talentId: "tsukino-mito",
      titleOriginal: "雑談: 今週の予定を整理する配信",
      titleMachineTranslation: {
        locale: "en",
        text: "Chat: organizing this week's stream plans",
        model: "demo-human-labelled"
      },
      category: "chat",
      branch: "jp",
      languages: ["ja"],
      status: "scheduled",
      scheduledStartUtc: toUtcIso(chatStart),
      collaborators: [],
      sourceLinks: [
        {
          provider: "manual",
          url: "manual://demo/mito-chat",
          label: "Manual import",
          embeddable: false
        }
      ],
      confidence: 0.68,
      lastCheckedUtc: toUtcIso(addMinutes(now, -28)),
      staleAfterMinutes: 60,
      visibility: "unknown",
      demo: true,
      provenance: [
        {
          provider: "manual",
          sourceId: "DEMO_MANUAL_CHAT_MITO",
          fetchedAtUtc: toUtcIso(addMinutes(now, -28)),
          fields: ["title", "scheduledStart", "context"],
          confidence: 0.68,
          rawExcerpt: "Admin demo import; needs provider confirmation"
        }
      ],
      providerErrors: [],
      conflictIds: []
    },
    {
      id: "demo-unverified-event",
      canonicalKey: "x:DEMO_X_UNVERIFIED_EVENT",
      talentId: "demo-manual-pov",
      titleOriginal: "TBD: late night game slot / participants pending",
      category: "game",
      branch: "future",
      languages: ["ja", "en"],
      status: "tbd",
      collaborators: ["Kuzuha"],
      sourceLinks: [
        {
          provider: "x",
          url: `${demoXBase}DEMO_X_2002`,
          label: "X announcement",
          embeddable: false
        }
      ],
      confidence: 0.42,
      lastCheckedUtc: toUtcIso(tbdChecked),
      staleAfterMinutes: 45,
      visibility: "unknown",
      demo: true,
      provenance: [
        {
          provider: "x",
          sourceId: "DEMO_X_2002",
          fetchedAtUtc: toUtcIso(tbdChecked),
          url: `${demoXBase}DEMO_X_2002`,
          fields: ["context", "collaborators"],
          confidence: 0.42,
          rawExcerpt: "TBD wording detected; no direct YouTube video ID yet"
        }
      ],
      providerErrors: [
        {
          provider: "youtube",
          code: "missing_video_id",
          message: "No public YouTube video ID confirmed for this item.",
          transient: false
        }
      ],
      conflictIds: ["demo-conflict-2002"]
    },
    {
      id: "demo-stale-ended-pov",
      canonicalKey: "youtube:DEMO_STALE_ENDED_POV",
      talentId: "demo-manual-pov",
      titleOriginal: "Minecraft POV archive candidate",
      category: "minecraft",
      branch: "future",
      languages: ["ja"],
      status: "unverified",
      scheduledStartUtc: toUtcIso(staleStart),
      collaborators: ["Kuzuha", "Elira Pendora"],
      sourceLinks: [
        {
          provider: "youtube",
          url: `${demoVideoBase}DEMO_STALE_ENDED_POV`,
          label: "YouTube",
          embeddable: false
        },
        {
          provider: "manual",
          url: "manual://demo/stale-pov",
          label: "Manual correction",
          embeddable: false
        }
      ],
      confidence: 0.49,
      lastCheckedUtc: toUtcIso(addMinutes(now, -190)),
      staleAfterMinutes: 40,
      visibility: "unknown",
      demo: true,
      provenance: [
        {
          provider: "manual",
          sourceId: "DEMO_MANUAL_STALE_POV",
          fetchedAtUtc: toUtcIso(addMinutes(now, -190)),
          fields: ["context", "category"],
          confidence: 0.49,
          rawExcerpt: "Manual item not refreshed; queue for review"
        }
      ],
      providerErrors: [
        {
          provider: "youtube",
          code: "quota_guard",
          message: "Demo quota guard skipped network refresh.",
          retryAfterUtc: toUtcIso(addMinutes(now, 50)),
          transient: true
        }
      ],
      conflictIds: []
    }
  ];
}

export function getDemoSourceHealth(now = new Date()): SourceHealth[] {
  return [
    {
      provider: "youtube",
      state: "healthy",
      coverageCode: "demo.youtube.pending_config",
      coverageLimit:
        "Demo fixtures only until YOUTUBE_DATA_API_KEY and channel registry are configured.",
      lastCheckedUtc: toUtcIso(addMinutes(now, -8)),
      confidence: 0.88,
      quotaRemaining: 9980
    },
    {
      provider: "x",
      state: "missing_credentials",
      coverageCode: "demo.x.official_api_disabled",
      coverageLimit:
        "Official X API only. No scraping; social context disabled without credentials.",
      lastCheckedUtc: toUtcIso(addMinutes(now, -84)),
      confidence: 0.4,
      errorCode: "missing_credentials.x_bearer_token",
      error: "X_BEARER_TOKEN not configured"
    },
    {
      provider: "manual",
      state: "healthy",
      coverageCode: "manual.imports_require_corrections",
      coverageLimit:
        "Manual imports are labeled and never overwrite provider facts without correction records.",
      lastCheckedUtc: toUtcIso(addMinutes(now, -28)),
      confidence: 0.7
    },
    {
      provider: "future",
      state: "disabled",
      coverageCode: "future.adapter_pending",
      coverageLimit:
        "Future providers must implement adapter, provenance, quota, and RLS review gates.",
      confidence: 0
    }
  ];
}
