import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const files = {
  packageJson: "package.json",
  readme: "README.md",
  legalPage: "components/app/legal-page.tsx",
  streamCard: "components/app/stream-card.tsx",
  catalogs: "lib/i18n/catalogs.ts",
  youtubeAdapter: "lib/adapters/youtube.ts",
  xAdapter: "lib/adapters/x.ts",
  aiFallback: "lib/adapters/announcement-ai-fallback.ts",
  setupGuide: "docs/setup-deploy.md",
  testingGuide: "docs/testing-strategy.md",
  architectureGuide: "docs/architecture-data-flow.md"
};

const officialReferenceUrls = [
  "https://www.anycolor.co.jp/guidelines/en/",
  "https://developers.google.com/youtube/terms/api-services-terms-of-service",
  "https://developers.google.com/youtube/terms/developer-policies",
  "https://docs.x.com/developer-terms/agreement",
  "https://docs.x.com/developer-terms/policy",
  "https://docs.x.com/developer-terms"
];

const allowedRuntimeUrlPrefixes = [
  ...officialReferenceUrls,
  "https://www.googleapis.com/youtube/v3",
  "https://api.x.com/2/tweets/search/recent",
  "https://api.openai.com/v1/responses",
  "https://push.demo.invalid/oshi-command-deck",
  "https://www.youtube.com/watch?v=",
  "https://x.com/i/web/status/",
  "https://x.com/",
  "http://www.w3.org/2000/svg"
];

const forbiddenRuntimePatterns = [
  {
    label: "no YouTube embed URLs",
    pattern: /youtube(?:-nocookie)?\.com\/embed/iu
  },
  {
    label: "no downloaded or proxied YouTube thumbnails",
    pattern: /\b(?:i\.ytimg\.com|img\.youtube\.com|yt3\.ggpht\.com)\b/iu
  },
  {
    label: "no downloaded or proxied X media",
    pattern: /\b(?:pbs|video|ton)\.twimg\.com\b|\btwimg\.com\b/iu
  },
  {
    label: "no generic Google-hosted copied media",
    pattern: /\bgoogleusercontent\.com\b/iu
  },
  {
    label: "no iframe playback surface",
    pattern: /<iframe\b/iu
  },
  {
    label: "no video playback surface",
    pattern: /<video\b/iu
  },
  {
    label: "no audio playback surface",
    pattern: /<audio\b/iu
  },
  {
    label: "no autoplay attribute",
    pattern: /\b(?:autoPlay\s*=|autoplay\s*=|allow=["'][^"']*autoplay)/iu
  },
  {
    label: "no Next image optimizer for provider media",
    pattern: /from\s+["']next\/image["']/iu
  },
  {
    label: "no raw image elements in app runtime",
    pattern: /<img\b/iu
  },
  {
    label: "no browser automation scraper dependency in runtime",
    pattern: /\b(?:cheerio|puppeteer|playwright|JSDOM)\b/iu
  }
];

const forbiddenPublicMediaExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".mp4",
  ".webm",
  ".mp3",
  ".wav",
  ".ogg",
  ".m4a"
]);
const allowedPublicPngAssets = new Set(["public/icons/icon-192.png", "public/icons/icon-512.png"]);

const checks = [];

const packageJson = JSON.parse(readProjectFile(files.packageJson));
const readme = readProjectFile(files.readme);
const legalPage = readProjectFile(files.legalPage);
const streamCard = readProjectFile(files.streamCard);
const catalogs = readProjectFile(files.catalogs);
const youtubeAdapter = readProjectFile(files.youtubeAdapter);
const xAdapter = readProjectFile(files.xAdapter);
const aiFallback = readProjectFile(files.aiFallback);
const setupGuide = readProjectFile(files.setupGuide);
const testingGuide = readProjectFile(files.testingGuide);
const architectureGuide = readProjectFile(files.architectureGuide);

function readProjectFile(path) {
  return readFileSync(join(root, path), "utf8");
}

function expect(label, pass, detail, quiet = false) {
  checks.push({ label, pass, detail, quiet });
}

function expectContains(label, value, needle) {
  expect(label, value.includes(needle), needle);
}

function expectNotContains(label, value, needle) {
  expect(label, !value.includes(needle), `must not contain ${needle}`);
}

expectContains(
  "README states unofficial status",
  readme,
  "not affiliated with or endorsed by ANYCOLOR Inc. or NIJISANJI"
);
expectContains("README forbids official logos", readme, "NIJISANJI/ANYCOLOR logos");
expectContains("README forbids character art", readme, "character art");
expectContains("README forbids copied media", readme, "copied media");
expectContains("README forbids rehosted thumbnails", readme, "rehosted thumbnails");
expectContains("README forbids downloaded video", readme, "downloaded video");
expectContains("README forbids downloaded audio", readme, "downloaded audio");
expectContains("README requires official YouTube API", readme, "official YouTube Data API");
expectContains("README requires official X API", readme, "official X APIs only");

for (const url of officialReferenceUrls) {
  expectContains(`legal page links ${url}`, legalPage, url);
  expectContains(`README references ${url}`, readme, url);
}

expect(
  "catalog has X policy reference key in both reference catalogs",
  countOccurrences(catalogs, '"legal.ref.xPolicy"') >= 2,
  "legal.ref.xPolicy in en and ja catalogs"
);
expectContains("legal page uses X policy label key", legalPage, '"legal.ref.xPolicy"');
expectContains("terms copy states links-only media boundary", catalogs, "This app is links-only");
expectContains("terms copy states no iframe embeds", catalogs, "iframe embeds");
expectContains("source copy states no scraping", catalogs, "must not scrape YouTube or X");

expectContains(
  "YouTube adapter uses official Data API base",
  youtubeAdapter,
  'const youtubeApiBaseUrl = "https://www.googleapis.com/youtube/v3"'
);
expectContains(
  "YouTube adapter discovers live/upcoming via search endpoint",
  youtubeAdapter,
  "new URL(`${youtubeApiBaseUrl}/search`)"
);
expectContains(
  "YouTube adapter batch-fetches videos endpoint",
  youtubeAdapter,
  "new URL(`${youtubeApiBaseUrl}/videos`)"
);
expectContains("YouTube adapter requests liveStreamingDetails", youtubeAdapter, "liveStreamingDetails");
expectContains("YouTube adapter requests embeddability metadata", youtubeAdapter, "embeddable");
expectContains("YouTube adapter tracks quota cost", youtubeAdapter, "quotaCost");
expectNotContains("YouTube adapter does not call thumbnail CDN", youtubeAdapter, "i.ytimg.com");

expectContains(
  "X adapter uses official recent search endpoint",
  xAdapter,
  'const xApiBaseUrl = "https://api.x.com/2/tweets/search/recent"'
);
expectContains("X adapter uses bearer auth", xAdapter, 'authorization: `Bearer ${bearerToken}`');
expectContains("X adapter reports no-scraping credential degradation", xAdapter, "no scraping is allowed");
expectNotContains("X adapter does not use legacy api.twitter.com", xAdapter, "api.twitter.com");

expectContains(
  "AI fallback defaults to official OpenAI Responses endpoint",
  aiFallback,
  '"https://api.openai.com/v1/responses"'
);
expectContains("AI fallback requires explicit evidence", aiFallback, "explicitly supported");
expectContains("AI fallback rejects inference", aiFallback, "Do not infer identities, sources, or missing facts");

expectContains("source links open in a new context", streamCard, 'target="_blank"');
expectContains("source links avoid referrer leakage", streamCard, 'rel="noreferrer"');

expect(
  "package exposes verify:trust",
  packageJson.scripts?.["verify:trust"] === "node scripts/validate_trust_boundaries.mjs",
  "scripts.verify:trust"
);
expect(
  "package verify includes trust guard",
  typeof packageJson.scripts?.verify === "string" && packageJson.scripts.verify.includes("pnpm verify:trust"),
  "scripts.verify"
);
expectContains("setup guide documents trust guard", setupGuide, "pnpm verify:trust");
expectContains("testing guide documents trust guard", testingGuide, "Trust/source boundary guard");
expectContains("architecture guide documents official API boundary", architectureGuide, "official provider API boundary");
expectContains(
  "architecture guide documents no media rehosting",
  architectureGuide,
  "does not ship, download, proxy, iframe, or rehost video, audio, thumbnail, logo, or character-art assets"
);

validateRuntimeBoundaries();
validatePublicAssets();

const failed = checks.filter((check) => !check.pass);

for (const check of checks) {
  if (!check.quiet || !check.pass) {
    const prefix = check.pass ? "OK" : "FAIL";
    console.log(`${prefix}: ${check.label}`);
  }
}

const quietPassed = checks.filter((check) => check.quiet && check.pass).length;
if (quietPassed > 0) {
  console.log(`OK: ${quietPassed} detailed runtime and public asset boundary checks passed`);
}

if (failed.length > 0) {
  console.error("\nTrust/source boundary validation failed:");
  for (const check of failed) {
    console.error(`- ${check.label}: expected ${check.detail}`);
  }
  process.exit(1);
}

function validateRuntimeBoundaries() {
  const runtimeFiles = walkFiles(["app", "components", "lib", "public"]).filter((path) =>
    [".ts", ".tsx", ".js", ".mjs", ".json", ".svg"].includes(extname(path))
  );

  for (const file of runtimeFiles) {
    const relativePath = relative(root, file);
    const text = readFileSync(file, "utf8");

    for (const { label, pattern } of forbiddenRuntimePatterns) {
      expect(`${relativePath}: ${label}`, !pattern.test(text), pattern.toString(), true);
    }

    for (const url of collectHttpUrls(text)) {
      const normalizedUrl = stripTemplateInterpolation(url);
      expect(
        `${relativePath}: allowed external URL ${normalizedUrl}`,
        allowedRuntimeUrlPrefixes.some((prefix) => normalizedUrl.startsWith(prefix)),
        normalizedUrl,
        true
      );
    }

    for (const url of collectExternalFetchLiteralUrls(text)) {
      expect(
        `${relativePath}: external fetch literal uses an approved API host`,
        [
          "https://www.googleapis.com/youtube/v3",
          "https://api.x.com/2/tweets/search/recent",
          "https://api.openai.com/v1/responses"
        ].some((prefix) => url.startsWith(prefix)),
        url,
        true
      );
    }
  }
}

function validatePublicAssets() {
  for (const file of walkFiles(["public"])) {
    const relativePath = relative(root, file);
    const lowerPath = relativePath.toLowerCase();
    expect(
      `${relativePath}: public assets avoid official brand filenames`,
      !/(nijisanji|anycolor)/iu.test(lowerPath),
      "no NIJISANJI or ANYCOLOR filenames",
      true
    );
	    expect(
	      `${relativePath}: public assets avoid downloaded media formats`,
	      !forbiddenPublicMediaExtensions.has(extname(file).toLowerCase()),
	      "no copied image/video/audio media in public/",
	      true
	    );
	    if (extname(file).toLowerCase() === ".png") {
	      expect(
	        `${relativePath}: public PNG assets stay on the generated icon allowlist`,
	        allowedPublicPngAssets.has(relativePath),
	        "only generated PWA icon PNGs are allowed in public/",
	        true
	      );
	    }
	  }
	}

function walkFiles(paths) {
  const files = [];
  for (const path of paths) {
    const fullPath = join(root, path);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      for (const entry of readdirSync(fullPath)) {
        files.push(...walkFiles([join(path, entry)]));
      }
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function collectHttpUrls(text) {
  return [...text.matchAll(/https?:\/\/[^\s"'`<>),]+/gu)].map((match) => match[0]);
}

function collectExternalFetchLiteralUrls(text) {
  return [...text.matchAll(/fetch\s*\(\s*["'`](https?:\/\/[^"'`]+)["'`]/gu)].map((match) => match[1]);
}

function stripTemplateInterpolation(url) {
  const interpolationIndex = url.indexOf("${");
  return interpolationIndex === -1 ? url : url.slice(0, interpolationIndex);
}

function countOccurrences(value, needle) {
  return value.split(needle).length - 1;
}
