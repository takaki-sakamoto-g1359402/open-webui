import { describe, expect, it } from "vitest";
import { isServerDemoModeEnabled, parseBooleanEnv } from "@/lib/security/demo-mode";

describe("server demo mode", () => {
  it.each([
    ["true", true],
    ["1", true],
    ["yes", true],
    ["on", true],
    ["false", false],
    ["0", false],
    ["no", false],
    ["off", false],
    ["", undefined],
    ["maybe", undefined]
  ])("parses %s as %s", (raw, expected) => {
    expect(parseBooleanEnv(raw)).toBe(expected);
  });

  it("lets OSHI_DEMO_MODE override the public build-time flag", () => {
    expect(isServerDemoModeEnabled({
      NEXT_PUBLIC_DEMO_MODE: "true",
      OSHI_DEMO_MODE: "false"
    })).toBe(false);
    expect(isServerDemoModeEnabled({
      NEXT_PUBLIC_DEMO_MODE: "false",
      OSHI_DEMO_MODE: "true"
    })).toBe(true);
  });

  it("falls back to NEXT_PUBLIC_DEMO_MODE and then the caller default", () => {
    expect(isServerDemoModeEnabled({ NEXT_PUBLIC_DEMO_MODE: "true" })).toBe(true);
    expect(isServerDemoModeEnabled({ NEXT_PUBLIC_DEMO_MODE: "false" })).toBe(false);
    expect(isServerDemoModeEnabled({}, { defaultValue: true })).toBe(true);
    expect(isServerDemoModeEnabled({}, { defaultValue: false })).toBe(false);
  });
});

