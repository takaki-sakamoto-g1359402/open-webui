import { getDemoStreams } from "@/lib/domain/fixtures";
import { toUtcIso } from "@/lib/domain/time";
import type { IngestionAdapter } from "./types";

export const manualAdapter: IngestionAdapter = {
  provider: "manual",
  async run(context) {
    const streams = context.demoMode
      ? getDemoStreams(context.now).filter((stream) =>
          stream.sourceLinks.some((link) => link.provider === "manual")
        )
      : [];

    return {
      provider: "manual",
      streams,
      quotaCost: 0,
      requestCount: 0,
      health: {
        provider: "manual",
        state: "healthy",
        coverageCode: "manual.demo_require_corrections",
        coverageLimit:
          "Manual/demo entries are labeled and require correction records before overriding provider data.",
        lastCheckedUtc: toUtcIso(context.now),
        confidence: 0.7
      },
      errors: []
    };
  }
};
