import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/favorites",
  "/minecraft",
  "/route",
  "/settings",
  "/data-sources",
  "/privacy",
  "/terms",
  "/contact-takedown",
  "/admin"
];

test.describe("automated accessibility scan", () => {
  for (const route of routes) {
    test(`${route} has no automatically detectable WCAG A/AA violations`, async ({
      page
    }, testInfo) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });

      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      await testInfo.attach(`axe-${route === "/" ? "home" : route.slice(1)}`, {
        body: JSON.stringify(scan, null, 2),
        contentType: "application/json"
      });

      expect(scan.violations, summarizeViolations(scan.violations)).toEqual([]);
    });
  }
});

function summarizeViolations(violations: Array<{
  id: string;
  help: string;
  nodes: Array<{ target: unknown }>;
}>) {
  return violations
    .map((violation) => {
      const targets = violation.nodes
        .map((node) => formatTarget(node.target))
        .slice(0, 6)
        .join(", ");
      return `${violation.id}: ${violation.help} (${targets})`;
    })
    .join("\n");
}

function formatTarget(target: unknown): string {
  if (Array.isArray(target)) {
    return target.map(formatTarget).join(" ");
  }
  return String(target);
}
