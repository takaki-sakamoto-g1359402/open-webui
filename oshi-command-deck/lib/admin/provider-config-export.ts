import { branchRegistry } from "@/lib/domain/registry";
import type { CreatorChannelRecord } from "./creator-channels";

export type YoutubeChannelsConfigEntry = {
  talentId: string;
  displayName: string;
  channelId: string;
  branch: string;
  languages: string[];
  tags: string[];
};

export type XHandlesConfigEntry = {
  talentId: string;
  displayName: string;
  handle: string;
  branch: string;
  languages: string[];
  tags: string[];
};

export type ProviderConfigExport = {
  youtubeChannels: YoutubeChannelsConfigEntry[];
  xHandles: XHandlesConfigEntry[];
  youtubeJson: string;
  xJson: string;
  warnings: ProviderConfigExportWarning[];
};

export type ProviderConfigExportWarning = {
  code:
    | "demo_row"
    | "low_confidence"
    | "ignored_provider"
    | "inactive_row"
    | "missing_provider_id"
    | "branch_not_live";
  provider: CreatorChannelRecord["provider"];
  displayName: string;
  providerChannelId?: string;
  confidence?: number;
};

export function buildProviderConfigExport(
  channels: CreatorChannelRecord[]
): ProviderConfigExport {
  const warnings = collectWarnings(channels);
  const activeChannels = channels.filter(
    (channel) =>
      channel.isActive &&
      channel.providerChannelId.trim().length > 0 &&
      isLiveProviderBranch(channel)
  );

  const youtubeChannels = activeChannels
    .filter((channel) => channel.provider === "youtube")
    .map((channel): YoutubeChannelsConfigEntry => ({
      talentId: channel.slug,
      displayName: channel.displayName,
      channelId: channel.providerChannelId,
      branch: channel.branch,
      languages: unique(channel.languages),
      tags: unique(channel.tags)
    }));

  const xHandles = activeChannels
    .filter((channel) => channel.provider === "x")
    .map((channel): XHandlesConfigEntry => ({
      talentId: channel.slug,
      displayName: channel.displayName,
      handle: channel.providerChannelId.replace(/^@/u, ""),
      branch: channel.branch,
      languages: unique(channel.languages),
      tags: unique(channel.tags)
    }));

  return {
    youtubeChannels,
    xHandles,
    youtubeJson: JSON.stringify(youtubeChannels, null, 2),
    xJson: JSON.stringify(xHandles, null, 2),
    warnings
  };
}

function unique(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function collectWarnings(channels: CreatorChannelRecord[]) {
  const warnings: ProviderConfigExportWarning[] = [];

  for (const channel of channels) {
    const base = {
      provider: channel.provider,
      displayName: channel.displayName,
      providerChannelId: channel.providerChannelId || undefined
    };

    if (!channel.isActive) {
      warnings.push({
        ...base,
        code: "inactive_row"
      });
      continue;
    }

    if (!channel.providerChannelId.trim()) {
      warnings.push({
        ...base,
        code: "missing_provider_id"
      });
      continue;
    }

    if (channel.provider !== "youtube" && channel.provider !== "x") {
      warnings.push({
        ...base,
        code: "ignored_provider"
      });
    } else if (!isLiveProviderBranch(channel)) {
      warnings.push({
        ...base,
        code: "branch_not_live"
      });
    }

    if (channel.demo) {
      warnings.push({
        ...base,
        code: "demo_row"
      });
    }

    if (channel.confidence < 0.75) {
      warnings.push({
        ...base,
        code: "low_confidence",
        confidence: channel.confidence
      });
    }
  }

  return warnings;
}

function isLiveProviderBranch(channel: CreatorChannelRecord) {
  if (channel.provider !== "youtube" && channel.provider !== "x") {
    return true;
  }
  const branch = branchRegistry.find((item) => item.id === channel.branch);
  return branch?.coverage === "active" || branch?.coverage === "demo";
}
