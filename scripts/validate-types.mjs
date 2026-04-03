import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, "src");
const compilerOptions = {
  allowImportingTsExtensions: false,
  isolatedModules: true,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  resolveJsonModule: true,
  target: ts.ScriptTarget.ES2022,
};

function walkTypescriptFiles(directoryPath, files = []) {
  for (const entry of readdirSync(directoryPath)) {
    const entryPath = path.join(directoryPath, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      walkTypescriptFiles(entryPath, files);
      continue;
    }

    if (entryPath.endsWith(".ts") && !entryPath.endsWith(".d.ts")) {
      files.push(entryPath);
    }
  }

  return files;
}

function resolveLocalSpecifier(filePath, specifier) {
  const basePath = path.resolve(path.dirname(filePath), specifier);
  const candidates = [];

  if (path.extname(basePath)) {
    candidates.push(basePath);

    if (basePath.endsWith(".js")) {
      candidates.push(basePath.slice(0, -3) + ".ts");
    }
  } else {
    candidates.push(basePath + ".ts");
    candidates.push(basePath + ".js");
    candidates.push(path.join(basePath, "index.ts"));
    candidates.push(path.join(basePath, "index.js"));
  }

  return candidates.find((candidatePath) => {
    try {
      return statSync(candidatePath).isFile();
    } catch {
      return false;
    }
  });
}

function collectImportDiagnostics(filePath, sourceText) {
  const diagnostics = [];
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.ES2022, true);

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.moduleSpecifier) {
      continue;
    }

    if (!ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }

    const specifier = statement.moduleSpecifier.text;

    if (!specifier.startsWith(".")) {
      continue;
    }

    if (specifier.endsWith(".css") || specifier.endsWith(".json")) {
      const resolved = path.resolve(path.dirname(filePath), specifier);

      try {
        if (!statSync(resolved).isFile()) {
          diagnostics.push(`Missing asset import "${specifier}" in ${path.relative(projectRoot, filePath)}`);
        }
      } catch {
        diagnostics.push(`Missing asset import "${specifier}" in ${path.relative(projectRoot, filePath)}`);
      }

      continue;
    }

    const resolvedImport = resolveLocalSpecifier(filePath, specifier);

    if (!resolvedImport) {
      diagnostics.push(`Missing module import "${specifier}" in ${path.relative(projectRoot, filePath)}`);
    }
  }

  return diagnostics;
}

function collectTranspileDiagnostics(filePath, sourceText) {
  const result = ts.transpileModule(sourceText, {
    compilerOptions,
    fileName: filePath,
    reportDiagnostics: true,
  });

  return (result.diagnostics ?? [])
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    .map((diagnostic) => {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");

      if (diagnostic.file && diagnostic.start != null) {
        const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        const relativePath = path.relative(projectRoot, diagnostic.file.fileName);
        return `${relativePath}:${position.line + 1}:${position.character + 1} ${message}`;
      }

      return `${path.relative(projectRoot, filePath)} ${message}`;
    });
}

const files = walkTypescriptFiles(sourceRoot);
const errors = [];

for (const filePath of files) {
  const sourceText = readFileSync(filePath, "utf8");
  errors.push(...collectTranspileDiagnostics(filePath, sourceText));
  errors.push(...collectImportDiagnostics(filePath, sourceText));
}

if (errors.length > 0) {
  console.error("TypeScript validation failed:\n");

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log(`Validated ${files.length} TypeScript files with transpile + import checks.`);
