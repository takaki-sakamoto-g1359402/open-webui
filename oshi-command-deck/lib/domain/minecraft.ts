import { getTalentById, getTalentName } from "./filtering";
import type { Livestream, MinecraftSession, RelationshipEdge, StreamStatus } from "./types";

const statusRank: Record<StreamStatus, number> = {
  live: 5,
  scheduled: 4,
  tbd: 3,
  unverified: 2,
  ended: 1
};

function maxStatus(statuses: StreamStatus[]) {
  return statuses.sort((left, right) => statusRank[right] - statusRank[left])[0] ?? "unverified";
}

export function groupMinecraftSessions(streams: Livestream[]): MinecraftSession[] {
  const minecraftStreams = streams.filter((stream) => stream.category === "minecraft");
  const groups = new Map<string, Livestream[]>();

  for (const stream of minecraftStreams) {
    const start = stream.actualStartUtc ?? stream.scheduledStartUtc ?? stream.lastCheckedUtc;
    const bucket = start.slice(0, 13);
    const collaboratorKey = [stream.talentId, ...stream.collaborators]
      .map((value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-"))
      .sort()
      .slice(0, 3)
      .join("-");
    const key = `${bucket}:${collaboratorKey}`;
    groups.set(key, [...(groups.get(key) ?? []), stream]);
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const participantNames = new Set<string>();
      const participantTalentIds = new Set<string>();
      for (const stream of group) {
        participantTalentIds.add(stream.talentId);
        participantNames.add(getTalentName(stream.talentId));
        for (const collaborator of stream.collaborators) {
          participantNames.add(collaborator);
          const talent = getTalentByDisplayName(collaborator);
          if (talent) {
            participantTalentIds.add(talent.id);
          }
        }
      }

      const times = group
        .map((stream) => stream.actualStartUtc ?? stream.scheduledStartUtc)
        .filter(Boolean)
        .sort() as string[];

      return {
        id: `mc-${key}`,
        title: [...participantNames].slice(0, 4).join(" / "),
        streamIds: group.map((stream) => stream.id),
        participantTalentIds: [...participantTalentIds],
        status: maxStatus(group.map((stream) => stream.status)),
        startUtc: times[0],
        endUtc: group.map((stream) => stream.endedAtUtc).filter(Boolean).sort().at(-1),
        links: group.flatMap((stream) => stream.sourceLinks),
        confidence:
          group.reduce((total, stream) => total + stream.confidence, 0) / Math.max(group.length, 1)
      } satisfies MinecraftSession;
    })
    .sort((left, right) => {
      const leftTime = left.startUtc ? new Date(left.startUtc).getTime() : 0;
      const rightTime = right.startUtc ? new Date(right.startUtc).getTime() : 0;
      return leftTime - rightTime;
    });
}

export function buildRelationshipEdges(streams: Livestream[]): RelationshipEdge[] {
  const edges = new Map<string, RelationshipEdge>();

  for (const stream of streams.filter((item) => item.category === "minecraft")) {
    const fromTalent = stream.talentId;
    for (const collaborator of stream.collaborators) {
      const toTalent = getTalentByDisplayName(collaborator)?.id;
      if (!toTalent || toTalent === fromTalent) {
        continue;
      }

      const key = [fromTalent, toTalent].sort().join(":");
      const existing = edges.get(key);
      if (existing) {
        existing.streamIds.push(stream.id);
        existing.confidence = Math.max(existing.confidence, stream.confidence);
      } else {
        const source = stream.provenance.find((item) =>
          item.fields.includes("collaborators")
        )?.provider;
        edges.set(key, {
          fromTalentId: fromTalent,
          toTalentId: toTalent,
          streamIds: [stream.id],
          confidence: stream.confidence,
          source: source ?? "manual",
          meaning: "declared_collaboration"
        });
      }
    }
  }

  return [...edges.values()].sort((left, right) => right.confidence - left.confidence);
}

function getTalentByDisplayName(displayName: string) {
  const normalized = displayName.toLowerCase();
  return (
    getTalentById(normalized) ??
    ["kuzuha", "tsukino-mito", "elira-pendora", "demo-manual-pov"]
      .map(getTalentById)
      .find((talent) => talent?.displayName.toLowerCase() === normalized)
  );
}
