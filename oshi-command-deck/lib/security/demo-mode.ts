type DemoModeEnv = Record<string, string | undefined>;

const trueEnvValues = new Set(["1", "true", "yes", "on"]);
const falseEnvValues = new Set(["0", "false", "no", "off"]);

export function parseBooleanEnv(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (trueEnvValues.has(normalized)) {
    return true;
  }
  if (falseEnvValues.has(normalized)) {
    return false;
  }
  return undefined;
}

export function isServerDemoModeEnabled(
  env: DemoModeEnv = process.env,
  options: { defaultValue?: boolean } = {}
) {
  const serverOverride = parseBooleanEnv(env.OSHI_DEMO_MODE);
  if (serverOverride !== undefined) {
    return serverOverride;
  }

  const publicDemoMode = parseBooleanEnv(env.NEXT_PUBLIC_DEMO_MODE);
  return publicDemoMode ?? options.defaultValue ?? false;
}
