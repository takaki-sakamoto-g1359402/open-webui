import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const root = process.cwd();
const catalogsPath = join(root, "lib/i18n/catalogs.ts");
const scanRoots = ["app", "components/app"].map((path) => join(root, path));
const sourceHealthScanRoots = ["lib"].map((path) => join(root, path));
const userFacingAttributes = new Set(["aria-label", "placeholder", "title", "alt"]);
const visibleTextPattern = /[A-Za-z]{3,}|[ぁ-んァ-ン一-龯]{2,}/u;
const visibleAttributePattern = /[A-Za-z0-9]{2,}|[ぁ-んァ-ン一-龯]{2,}/u;

const source = readFileSync(catalogsPath, "utf8");
const sourceFile = ts.createSourceFile(catalogsPath, source, ts.ScriptTarget.Latest, true);
const catalogs = extractCatalogs(sourceFile);
const locales = Object.keys(catalogs);
const defaultLocale = "en";
const failures = [];

if (!catalogs[defaultLocale]) {
  failures.push("Missing default locale catalog: en");
}

const defaultKeys = Object.keys(catalogs[defaultLocale] ?? {}).sort();

for (const locale of locales) {
  const keys = Object.keys(catalogs[locale]).sort();
  const missing = defaultKeys.filter((key) => !keys.includes(key));
  const extra = keys.filter((key) => !defaultKeys.includes(key));
  if (missing.length > 0) {
    failures.push(`${locale} catalog is missing keys: ${missing.join(", ")}`);
  }
  if (extra.length > 0) {
    failures.push(`${locale} catalog has extra keys: ${extra.join(", ")}`);
  }
}

for (const file of scanRoots.flatMap(walkTsxFiles)) {
  validateFile(file);
}

for (const file of sourceHealthScanRoots.flatMap((dir) => walkSourceFiles(dir, [".ts"]))) {
  validateSourceHealthCoverageCodes(file);
}

if (failures.length > 0) {
  console.error("i18n validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`OK: ${locales.length} locale catalogs share ${defaultKeys.length} keys`);
console.log("OK: app-owned JSX text is routed through the i18n catalog");
console.log("OK: source health coverage displayed to users uses i18n coverage codes");

function extractCatalogs(file) {
  let result = {};

  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "catalogs" &&
      node.initializer
    ) {
      const expression = ts.isAsExpression(node.initializer)
        ? node.initializer.expression
        : node.initializer;
      if (ts.isObjectLiteralExpression(expression)) {
        result = objectLiteralToRecord(expression);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(file);
  return result;
}

function objectLiteralToRecord(node) {
  const record = {};
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }
    const key = getPropertyName(property.name);
    if (!key) {
      continue;
    }
    if (ts.isObjectLiteralExpression(property.initializer)) {
      record[key] = objectLiteralToRecord(property.initializer);
    } else if (
      ts.isStringLiteral(property.initializer) ||
      ts.isNoSubstitutionTemplateLiteral(property.initializer)
    ) {
      record[key] = property.initializer.text;
    }
  }
  return record;
}

function getPropertyName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return undefined;
}

function walkTsxFiles(dir) {
  return walkSourceFiles(dir, [".tsx"]);
}

function walkSourceFiles(dir, extensions) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...walkSourceFiles(path, extensions));
    } else if (extensions.some((extension) => path.endsWith(extension))) {
      files.push(path);
    }
  }
  return files;
}

function validateFile(file) {
  const text = readFileSync(file, "utf8");
  const parsed = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function visit(node) {
    if (ts.isJsxText(node)) {
      const value = node.getText(parsed).replace(/\s+/gu, " ").trim();
      if (visibleTextPattern.test(value)) {
        addFailure(file, node, `hard-coded JSX text "${value}"`);
      }
    }

    if (
      ts.isJsxAttribute(node) &&
      userFacingAttributes.has(node.name.text) &&
      node.initializer
    ) {
      const hardCodedLiteral = findHardCodedAttributeLiteral(node.initializer);
      if (hardCodedLiteral) {
        addFailure(file, node, `hard-coded ${node.name.text}="${hardCodedLiteral}"`);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(parsed);
}

function findHardCodedAttributeLiteral(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return visibleAttributePattern.test(node.text) ? node.text : undefined;
  }

  if (ts.isJsxExpression(node)) {
    return node.expression ? findHardCodedExpressionLiteral(node.expression) : undefined;
  }

  return undefined;
}

function findHardCodedExpressionLiteral(node) {
  if (isTranslationCall(node)) {
    return undefined;
  }

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return visibleAttributePattern.test(node.text) ? node.text : undefined;
  }

  if (ts.isConditionalExpression(node)) {
    return (
      findHardCodedExpressionLiteral(node.whenTrue) ??
      findHardCodedExpressionLiteral(node.whenFalse)
    );
  }

  if (ts.isParenthesizedExpression(node)) {
    return findHardCodedExpressionLiteral(node.expression);
  }

  if (ts.isBinaryExpression(node)) {
    if (node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
      return (
        findHardCodedExpressionLiteral(node.left) ??
        findHardCodedExpressionLiteral(node.right)
      );
    }
    if (
      node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
    ) {
      return findHardCodedExpressionLiteral(node.right);
    }
  }

  return undefined;
}

function isTranslationCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "t"
  );
}

function addFailure(file, node, message) {
  const position = ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart());
  failures.push(`${relative(root, file)}:${position.line + 1}:${position.character + 1} ${message}`);
}

function validateSourceHealthCoverageCodes(file) {
  const text = readFileSync(file, "utf8");
  if (!text.includes("coverageLimit")) {
    return;
  }

  const parsed = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);

  function visit(node) {
    if (ts.isObjectLiteralExpression(node) && hasProperty(node, "coverageLimit")) {
      if (!hasProperty(node, "coverageCode")) {
        addFailure(file, node, "SourceHealth coverageLimit is missing coverageCode");
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(parsed);
}

function hasProperty(node, propertyName) {
  return node.properties.some((property) => {
    if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
      return false;
    }
    return getPropertyName(property.name) === propertyName;
  });
}
