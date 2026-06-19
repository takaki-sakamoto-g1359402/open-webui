import { describe, expect, it } from "vitest";
import branches from "@/config/branches.json";
import talents from "@/config/talents.demo.json";
import { createRegistryConfig } from "@/lib/domain/registry-config";
import { branchRegistry, demoTalents } from "@/lib/domain/registry";

describe("registry config", () => {
  it("loads branch and talent registries from configurable JSON", () => {
    expect(branchRegistry.map((branch) => branch.id)).toEqual([
      "jp",
      "en",
      "id",
      "kr",
      "future"
    ]);
    expect(demoTalents.some((talent) => talent.id === "kuzuha")).toBe(true);
    expect(demoTalents.every((talent) => talent.providerIds)).toBe(true);
  });

  it("validates the shipped registry files", () => {
    expect(() => createRegistryConfig({ branches, talents })).not.toThrow();
  });

  it("rejects talents that reference unknown branches", () => {
    expect(() =>
      createRegistryConfig({
        branches,
        talents: [
          {
            id: "bad-branch",
            displayName: "Bad Branch",
            branch: "unknown",
            languages: ["ja"],
            tags: ["game"],
            providerIds: { manualSlug: "bad-branch" },
            confidence: 0.5,
            active: true
          }
        ]
      })
    ).toThrow(/unknown branch/u);
  });

  it("rejects duplicate provider IDs across talents", () => {
    expect(() =>
      createRegistryConfig({
        branches,
        talents: [
          {
            id: "first",
            displayName: "First",
            branch: "jp",
            languages: ["ja"],
            tags: ["game"],
            providerIds: { youtubeChannelId: "UC_DUPLICATE" },
            confidence: 0.5,
            active: true
          },
          {
            id: "second",
            displayName: "Second",
            branch: "en",
            languages: ["en"],
            tags: ["game"],
            providerIds: { youtubeChannelId: "UC_DUPLICATE" },
            confidence: 0.5,
            active: true
          }
        ]
      })
    ).toThrow(/duplicate provider id/u);
  });
});
