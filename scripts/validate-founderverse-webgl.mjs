import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const args = parseArgs(process.argv.slice(2));
const warnOnly = hasFlag("warn-only");
const checkWranglerAuth = hasFlag("check-wrangler-auth");
const isolatedWranglerHome = hasFlag("isolated-wrangler-home");

const cwd = process.cwd();
const unityProjectPath = path.resolve(
  readArg("unity-project", process.env.UNITY_PROJECT_PATH || cwd),
);
const webglBuildPath = path.resolve(
  readArg("webgl-build", process.env.FV_WEBGL_BUILD || path.join(unityProjectPath, "Build", "WebGL")),
);

const results = [];

checkFile(
  "Unity project settings",
  path.join(unityProjectPath, "ProjectSettings", "ProjectSettings.asset"),
  "Set --unity-project or UNITY_PROJECT_PATH to the FounderVerse Unity project root.",
);

checkFile(
  "Unity editor build settings",
  path.join(unityProjectPath, "ProjectSettings", "EditorBuildSettings.asset"),
  "Open the project in Unity and add the FounderVerse scenes to Build Settings.",
);

checkFile(
  "WebGL index",
  path.join(webglBuildPath, "index.html"),
  "Run the Unity WebGL build to create Build/WebGL/index.html.",
);

checkDirectory(
  "WebGL Build asset directory",
  path.join(webglBuildPath, "Build"),
  "Unity WebGL output should contain Build/WebGL/Build.",
);

checkDirectory(
  "WebGL TemplateData directory",
  path.join(webglBuildPath, "TemplateData"),
  "Unity WebGL output should contain Build/WebGL/TemplateData.",
);

const headersPath = path.join(webglBuildPath, "_headers");
checkFile(
  "Cloudflare Pages _headers",
  headersPath,
  "Copy a docs/templates/founderverse-webgl-headers-* template to Build/WebGL/_headers.",
);

validateCompressionHeaders(webglBuildPath, headersPath);
scanBuildForSensitiveFiles(webglBuildPath);
validateUnityEditorAvailability();
validateWranglerAvailability();

if (checkWranglerAuth) {
  validateWranglerAuth();
}

printReport();

const failures = results.filter((result) => result.level === "fail").length;
process.exitCode = failures > 0 && !warnOnly ? 1 : 0;

function parseArgs(argv) {
  const parsed = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) {
      continue;
    }

    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      parsed.set(key, true);
      continue;
    }

    parsed.set(key, next);
    i += 1;
  }

  return parsed;
}

function readArg(name, fallback) {
  return args.has(name) ? String(args.get(name)) : fallback;
}

function hasFlag(name) {
  return args.get(name) === true || args.get(name) === "true";
}

function checkFile(label, filePath, remedy) {
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    pass(label, filePath);
    return;
  }

  fail(label, `${filePath} was not found. ${remedy}`);
}

function checkDirectory(label, directoryPath, remedy) {
  if (fs.existsSync(directoryPath) && fs.statSync(directoryPath).isDirectory()) {
    pass(label, directoryPath);
    return;
  }

  fail(label, `${directoryPath} was not found. ${remedy}`);
}

function validateCompressionHeaders(buildPath, headersFilePath) {
  if (!fs.existsSync(buildPath) || !fs.statSync(buildPath).isDirectory()) {
    warn("Compression header check", "Skipped because the WebGL build directory does not exist.");
    return;
  }

  const files = walkFiles(buildPath, 5000);
  const compressedFiles = files.filter((filePath) => filePath.endsWith(".gz") || filePath.endsWith(".br"));
  if (compressedFiles.length === 0) {
    pass("Compression header check", "No .gz or .br files detected.");
    return;
  }

  if (!fs.existsSync(headersFilePath)) {
    fail("Compression header check", "Compressed .gz/.br files exist, but Build/WebGL/_headers is missing.");
    return;
  }

  const headers = fs.readFileSync(headersFilePath, "utf8");
  const needsGzip = compressedFiles.some((filePath) => filePath.endsWith(".gz"));
  const needsBrotli = compressedFiles.some((filePath) => filePath.endsWith(".br"));
  const hasGzip = headers.includes("Content-Encoding: gzip");
  const hasBrotli = headers.includes("Content-Encoding: br");
  const hasWasm = headers.includes("Content-Type: application/wasm");

  if ((needsGzip && !hasGzip) || (needsBrotli && !hasBrotli) || !hasWasm) {
    fail("Compression header check", "Compressed assets are present, but _headers is missing required Content-Encoding or wasm MIME entries.");
    return;
  }

  pass("Compression header check", "Compressed asset headers are present.");
}

function scanBuildForSensitiveFiles(buildPath) {
  if (!fs.existsSync(buildPath) || !fs.statSync(buildPath).isDirectory()) {
    warn("Sensitive file scan", "Skipped because the WebGL build directory does not exist.");
    return;
  }

  const suspicious = walkFiles(buildPath, 5000).filter((filePath) => {
    const relative = path.relative(buildPath, filePath).toLowerCase();
    return relative === ".env"
      || relative.endsWith(".pem")
      || relative.endsWith(".key")
      || relative.endsWith(".p12")
      || relative.includes("secret")
      || relative.includes("credential")
      || relative.includes("kyc");
  });

  if (suspicious.length === 0) {
    pass("Sensitive file scan", "No obvious credential, key, or KYC files found in WebGL output.");
    return;
  }

  fail("Sensitive file scan", `Potentially sensitive files found: ${suspicious.map((filePath) => path.relative(buildPath, filePath)).join(", ")}`);
}

function validateUnityEditorAvailability() {
  const explicitUnity = process.env.UNITY_EDITOR;
  if (explicitUnity && fs.existsSync(explicitUnity)) {
    pass("Unity Editor executable", explicitUnity);
    return;
  }

  const macUnityRoot = "/Applications/Unity/Hub/Editor";
  if (fs.existsSync(macUnityRoot)) {
    const editor = findFirstFile(macUnityRoot, "Unity.app/Contents/MacOS/Unity", 4);
    if (editor) {
      pass("Unity Editor executable", editor);
      return;
    }
  }

  warn("Unity Editor executable", "Not found. Set UNITY_EDITOR before running a batchmode build.");
}

function validateWranglerAvailability() {
  const wrangler = localWranglerPath();
  if (wrangler) {
    pass("Wrangler CLI", wrangler);
    return;
  }

  warn("Wrangler CLI", "Local Wrangler was not found under node_modules/wrangler/bin/wrangler.js.");
}

function validateWranglerAuth() {
  const wrangler = localWranglerPath();
  if (!wrangler) {
    warn("Wrangler auth", "Skipped because local Wrangler was not found.");
    return;
  }

  const env = { ...process.env };
  let tempRoot;
  if (isolatedWranglerHome) {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "founderverse-wrangler-"));
    env.HOME = path.join(tempRoot, "home");
    env.XDG_CONFIG_HOME = path.join(tempRoot, "config");
    fs.mkdirSync(env.HOME, { recursive: true });
    fs.mkdirSync(env.XDG_CONFIG_HOME, { recursive: true });
  }

  const result = spawnSync(process.execPath, [wrangler, "whoami"], {
    cwd,
    env,
    encoding: "utf8",
    timeout: 15000,
  });

  if (tempRoot) {
    fs.rmSync(tempRoot, { force: true, recursive: true });
  }

  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  if (result.status === 0) {
    pass("Wrangler auth", output || "Authenticated.");
    return;
  }

  warn("Wrangler auth", output || "Wrangler whoami did not complete successfully.");
}

function localWranglerPath() {
  const wranglerPath = path.join(cwd, "node_modules", "wrangler", "bin", "wrangler.js");
  return fs.existsSync(wranglerPath) ? wranglerPath : null;
}

function findFirstFile(root, suffix, maxDepth) {
  const entries = [{ directory: root, depth: 0 }];
  while (entries.length > 0) {
    const current = entries.shift();
    if (!current || current.depth > maxDepth) {
      continue;
    }

    for (const entry of safeReadDir(current.directory)) {
      const fullPath = path.join(current.directory, entry.name);
      if (fullPath.endsWith(suffix) && fs.existsSync(fullPath)) {
        return fullPath;
      }

      if (entry.isDirectory()) {
        entries.push({ directory: fullPath, depth: current.depth + 1 });
      }
    }
  }

  return null;
}

function walkFiles(root, limit) {
  const files = [];
  const pending = [root];
  while (pending.length > 0 && files.length < limit) {
    const directory = pending.pop();
    for (const entry of safeReadDir(directory)) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        pending.push(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function safeReadDir(directory) {
  try {
    return fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

function pass(label, detail) {
  results.push({ level: "pass", label, detail });
}

function warn(label, detail) {
  results.push({ level: "warn", label, detail });
}

function fail(label, detail) {
  results.push({ level: "fail", label, detail });
}

function printReport() {
  const icon = {
    pass: "PASS",
    warn: "WARN",
    fail: "FAIL",
  };

  console.log("FounderVerse WebGL deployment validation");
  console.log(`Unity project: ${unityProjectPath}`);
  console.log(`WebGL build: ${webglBuildPath}`);
  console.log("");

  for (const result of results) {
    console.log(`[${icon[result.level]}] ${result.label}`);
    console.log(`  ${result.detail}`);
  }

  const summary = results.reduce(
    (accumulator, result) => {
      accumulator[result.level] += 1;
      return accumulator;
    },
    { pass: 0, warn: 0, fail: 0 },
  );

  console.log("");
  console.log(`Summary: ${summary.pass} pass, ${summary.warn} warn, ${summary.fail} fail`);
  if (warnOnly && summary.fail > 0) {
    console.log("Warn-only mode enabled: failures are reported without failing the process.");
  }
}
