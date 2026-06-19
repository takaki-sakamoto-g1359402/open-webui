import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourceRoots = ["app", "components", "lib"].map((path) => join(root, path));
const envExamplePath = join(root, ".env.example");
const gitignorePath = join(root, ".gitignore");
const nextConfigPath = join(root, "next.config.ts");
const allowedClientEnv = new Set(["NODE_ENV"]);
const publicPrefix = "NEXT_PUBLIC_";

const sourceFiles = new Map();
const importGraph = new Map();
const clientEntries = [];
const failures = [];
const serverOnlyEnvNames = readEnvExample(envExamplePath)
  .filter((name) => !name.startsWith(publicPrefix))
  .sort();

for (const file of sourceRoots.flatMap(walkSourceFiles)) {
  const text = readFileSync(file, "utf8");
  const parsed = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  sourceFiles.set(normalizePath(file), { file, text, parsed });
  if (hasUseClientDirective(parsed)) {
    clientEntries.push(normalizePath(file));
  }
}

for (const [normalized, source] of sourceFiles) {
  importGraph.set(normalized, collectRuntimeImports(source.file, source.parsed));
}

validateNextConfig();
validateGitignore();
validateServerOnlyEnvDeclarations();
validateClientGraph();

if (failures.length > 0) {
  console.error("Environment boundary validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`OK: ${serverOnlyEnvNames.length} server-only env names are not exposed to client modules`);
console.log(`OK: ${clientEntries.length} client entry modules were scanned through runtime imports`);
console.log("OK: next.config.ts does not expose env values through nextConfig.env");
console.log("OK: local env files are ignored");

function readEnvExample(path) {
  const text = readFileSync(path, "utf8");
  const names = [];
  for (const line of text.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const match = /^([A-Z][A-Z0-9_]*)=/u.exec(trimmed);
    if (match) {
      names.push(match[1]);
    }
  }
  return [...new Set(names)];
}

function walkSourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...walkSourceFiles(path));
    } else if (/\.(ts|tsx)$/u.test(path) && !path.endsWith(".d.ts")) {
      files.push(path);
    }
  }
  return files;
}

function hasUseClientDirective(sourceFile) {
  for (const statement of sourceFile.statements) {
    if (
      ts.isExpressionStatement(statement) &&
      ts.isStringLiteral(statement.expression)
    ) {
      if (statement.expression.text === "use client") {
        return true;
      }
      continue;
    }
    return false;
  }
  return false;
}

function collectRuntimeImports(file, parsed) {
  const imports = new Set();

  function visit(node) {
    if (
      ts.isImportDeclaration(node) &&
      !node.importClause?.isTypeOnly &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const resolved = resolveImport(file, node.moduleSpecifier.text);
      if (resolved) {
        imports.add(resolved);
      }
    }

    if (
      ts.isExportDeclaration(node) &&
      !node.isTypeOnly &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const resolved = resolveImport(file, node.moduleSpecifier.text);
      if (resolved) {
        imports.add(resolved);
      }
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      const resolved = resolveImport(file, node.arguments[0].text);
      if (resolved) {
        imports.add(resolved);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(parsed);
  return [...imports];
}

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) {
    return undefined;
  }

  const base = specifier.startsWith("@/")
    ? join(root, specifier.slice(2))
    : resolve(dirname(fromFile), specifier);

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx")
  ];

  for (const candidate of candidates) {
    if (
      existsSync(candidate) &&
      statSync(candidate).isFile() &&
      [".ts", ".tsx"].includes(extname(candidate))
    ) {
      return normalizePath(candidate);
    }
  }
  return undefined;
}

function validateNextConfig() {
  const text = readFileSync(nextConfigPath, "utf8");
  if (/\benv\s*:/u.test(text)) {
    failures.push(
      "next.config.ts contains nextConfig.env; Next.js includes these values in the JavaScript bundle"
    );
  }
}

function validateGitignore() {
  const text = readFileSync(gitignorePath, "utf8");
  if (!/(^|\n)\.env\*\.local(\n|$)/u.test(text)) {
    failures.push(".gitignore must ignore .env*.local files used for local production/staging secrets");
  }
}

function validateServerOnlyEnvDeclarations() {
  for (const name of serverOnlyEnvNames) {
    if (name.startsWith(publicPrefix)) {
      failures.push(`server-only env ${name} must not use ${publicPrefix}`);
    }
  }
}

function validateClientGraph() {
  const reachable = new Map();

  for (const entry of clientEntries) {
    visit(entry, [entry], reachable);
  }
}

function visit(file, chain, reachable) {
  const existingChain = reachable.get(file);
  if (existingChain && existingChain.length <= chain.length) {
    return;
  }
  reachable.set(file, chain);

  const source = sourceFiles.get(file);
  if (!source) {
    return;
  }

  validateEnvReferences(source, chain);

  for (const imported of importGraph.get(file) ?? []) {
    visit(imported, [...chain, imported], reachable);
  }
}

function validateEnvReferences(source, chain) {
  function visitNode(node) {
    const envName = getProcessEnvName(node);
    if (envName) {
      const isPublic = envName.startsWith(publicPrefix);
      const isAllowed = allowedClientEnv.has(envName);
      if (!isPublic && !isAllowed) {
        addFailure(
          source.file,
          node,
          `server-only env ${envName} is reachable from client graph: ${formatChain(chain)}`
        );
      }
    }

    ts.forEachChild(node, visitNode);
  }

  visitNode(source.parsed);
}

function getProcessEnvName(node) {
  if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node)) {
    return undefined;
  }

  const left = ts.isPropertyAccessExpression(node)
    ? node.expression
    : node.expression;
  if (!isProcessEnv(left)) {
    return undefined;
  }

  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text;
  }

  const argument = node.argumentExpression;
  return argument && ts.isStringLiteral(argument) ? argument.text : "dynamic_process_env_lookup";
}

function isProcessEnv(node) {
  return (
    ts.isPropertyAccessExpression(node) &&
    node.name.text === "env" &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "process"
  );
}

function addFailure(file, node, message) {
  const position = ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart());
  failures.push(`${relative(root, file)}:${position.line + 1}:${position.character + 1} ${message}`);
}

function normalizePath(path) {
  return resolve(path);
}

function formatChain(chain) {
  return chain.map((file) => relative(root, file)).join(" -> ");
}
