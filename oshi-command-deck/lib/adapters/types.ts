import type { Livestream, Provider, ProviderError, SourceHealth } from "@/lib/domain/types";

export type ProviderCooldown = {
  retryAfterUtc: string;
  reason: string;
};

export type AdapterRunContext = {
  now: Date;
  dryRun: boolean;
  demoMode: boolean;
  providerCooldowns?: Partial<Record<Provider, ProviderCooldown>>;
};

export type AdapterRunResult = {
  provider: Provider;
  streams: Livestream[];
  health: SourceHealth;
  errors: ProviderError[];
  quotaCost: number;
  requestCount: number;
  cursorAfter?: string;
};

export interface IngestionAdapter {
  provider: Provider;
  run(context: AdapterRunContext): Promise<AdapterRunResult>;
}

export function hasServerEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}
