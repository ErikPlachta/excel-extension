#!/usr/bin/env node

/**
 * Generates documentation content dynamically from source.
 *
 * - Libraries: Extracted from TSDoc @packageDocumentation in each lib index.ts
 * - Scripts: Extracted from package.json
 *
 * Updates marker sections in intro.md.
 *
 * Usage: node scripts/generate-docs.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const INTRO_PATH = path.join(
  ROOT,
  "apps/excel-addin-docs-website/docs/intro.md"
);
const LIBS_DIR = path.join(ROOT, "libs");
const PACKAGE_JSON = path.join(ROOT, "package.json");

/**
 * Extract description from TSDoc @packageDocumentation block
 * @param {string} indexPath - Path to index.ts file
 * @returns {string} Description or fallback
 */
function extractTSDocDescription(indexPath) {
  if (!fs.existsSync(indexPath)) {
    return "Library";
  }

  const content = fs.readFileSync(indexPath, "utf-8");

  // Match @packageDocumentation followed by description line
  const match = content.match(
    /@packageDocumentation\s*\n\s*\*\s*([^\n]+)/
  );

  if (match && match[1]) {
    // Clean up: remove trailing asterisk, trim, remove trailing period for table
    return match[1].replace(/\s*\*?\s*$/, "").trim().replace(/\.$/, "");
  }

  return "Library";
}

/**
 * Scan libs directory and extract library info dynamically
 * @returns {Array<{importPath: string, description: string}>}
 */
function getLibraries() {
  const libs = [];
  const categories = ["core", "shared", "data", "office"];

  for (const category of categories) {
    const categoryPath = path.join(LIBS_DIR, category);
    if (!fs.existsSync(categoryPath)) continue;

    const libNames = fs.readdirSync(categoryPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    for (const libName of libNames) {
      const indexPath = path.join(categoryPath, libName, "src/index.ts");
      const description = extractTSDocDescription(indexPath);
      libs.push({
        importPath: `@excel-platform/${category}/${libName}`,
        description,
      });
    }
  }

  return libs;
}

/**
 * Script description mapping for common patterns
 */
const SCRIPT_DESCRIPTIONS = {
  start: "Dev server at localhost:4200",
  "start:dev": "Dev server with HTTPS",
  "start:mock": "Dev server with mock data",
  build: "Production build",
  test: "Run unit tests",
  "test:ci": "Run all tests (headless)",
  "test:coverage": "Run tests with coverage",
  "test:watch": "Run tests in watch mode",
  lint: "Lint TypeScript and templates",
  "lint:office": "Office add-in specific linting",
  prettier: "Format code",
  docs: "Build documentation site",
  "docs:serve": "View documentation locally",
  "docs:generate": "Regenerate intro.md content",
  "validate:dev-manifest": "Validate Office manifest",
  "dev-certs": "Install HTTPS dev certificates",
  graph: "View Nx dependency graph",
};

/**
 * Scripts to exclude from documentation
 */
const EXCLUDED_SCRIPTS = [
  "ng",
  "nx",
  "dev",
  "start:office",
  "stop:office",
  "test:api",
  "watch",
  "affected",
  "affected:lint",
  "affected:test",
  "affected:build",
  "ci",
  "ci:all",
  "lint:office:fix",
];

/**
 * Extract relevant scripts from package.json
 * @returns {Array<{command: string, description: string}>}
 */
function getScripts() {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf-8"));
  const scripts = [];

  for (const [name, cmd] of Object.entries(pkg.scripts || {})) {
    if (EXCLUDED_SCRIPTS.includes(name)) continue;
    if (name.startsWith("_")) continue;

    const description =
      SCRIPT_DESCRIPTIONS[name] || inferDescription(name, cmd);
    scripts.push({
      command: `npm run ${name}`,
      description,
    });
  }

  // Sort by common usage order
  const order = [
    "start",
    "start:dev",
    "start:mock",
    "build",
    "test",
    "test:ci",
    "lint",
    "docs",
  ];
  scripts.sort((a, b) => {
    const aName = a.command.replace("npm run ", "");
    const bName = b.command.replace("npm run ", "");
    const aIdx = order.indexOf(aName);
    const bIdx = order.indexOf(bName);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return aName.localeCompare(bName);
  });

  return scripts;
}

/**
 * Infer description from script name/command when not in mapping
 */
function inferDescription(name, cmd) {
  if (cmd.includes("ng serve")) return "Start dev server";
  if (cmd.includes("ng build")) return "Build application";
  if (cmd.includes("nx test")) return "Run tests";
  if (cmd.includes("eslint")) return "Run linter";
  return `Run ${name}`;
}

/**
 * Generate libraries markdown table
 */
function generateLibrariesTable() {
  const libs = getLibraries();
  const lines = [
    "## Libraries",
    "",
    "| Package | Description |",
    "|---------|-------------|",
  ];

  for (const lib of libs) {
    lines.push(`| \`${lib.importPath}\` | ${lib.description} |`);
  }

  return lines.join("\n");
}

/**
 * Generate NPM scripts markdown table
 */
function generateScriptsTable() {
  const scripts = getScripts();
  const lines = [
    "## NPM Scripts",
    "",
    "| Command | Description |",
    "|---------|-------------|",
  ];

  for (const script of scripts) {
    lines.push(`| \`${script.command}\` | ${script.description} |`);
  }

  return lines.join("\n");
}

/**
 * Generate directory structure tree for apps and libs
 */
function generateDirectoryStructure() {
  const lines = ["## Directory Structure", "", "```"];

  // Apps structure
  lines.push("apps/");
  const appsDir = path.join(ROOT, "apps");
  if (fs.existsSync(appsDir)) {
    const apps = fs.readdirSync(appsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    apps.forEach((app, i) => {
      const isLast = i === apps.length - 1;
      lines.push(`${isLast ? "└── " : "├── "}${app}/`);
    });
  }

  lines.push("");

  // Libs structure with categories
  lines.push("libs/");
  const categories = ["core", "shared", "data", "office"];
  categories.forEach((category, catIdx) => {
    const categoryPath = path.join(LIBS_DIR, category);
    if (!fs.existsSync(categoryPath)) return;

    const isLastCat = catIdx === categories.length - 1;
    const catPrefix = isLastCat ? "└── " : "├── ";
    const catContinue = isLastCat ? "    " : "│   ";

    lines.push(`${catPrefix}${category}/`);

    const libNames = fs.readdirSync(categoryPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    libNames.forEach((lib, libIdx) => {
      const isLastLib = libIdx === libNames.length - 1;
      const libPrefix = isLastLib ? "└── " : "├── ";
      lines.push(`${catContinue}${libPrefix}${lib}/`);
    });
  });

  lines.push("```");
  return lines.join("\n");
}

/**
 * Replace content between markers in file
 */
function replaceSection(content, startMarker, endMarker, newContent) {
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    console.warn(`Markers not found: ${startMarker} / ${endMarker}`);
    return content;
  }

  return (
    content.substring(0, startIdx + startMarker.length) +
    "\n" +
    newContent +
    "\n" +
    content.substring(endIdx)
  );
}

/**
 * Main execution
 */
function main() {
  console.log("Generating documentation from source...");

  // Read intro.md
  let content = fs.readFileSync(INTRO_PATH, "utf-8");

  // Generate and replace directory structure
  const dirStructure = generateDirectoryStructure();
  content = replaceSection(
    content,
    "<!-- DIRECTORY_START -->",
    "<!-- DIRECTORY_END -->",
    dirStructure
  );

  // Generate and replace libraries
  const libs = getLibraries();
  const librariesTable = generateLibrariesTable();
  content = replaceSection(
    content,
    "<!-- LIBRARIES_START -->",
    "<!-- LIBRARIES_END -->",
    librariesTable
  );

  // Generate and replace scripts
  const scripts = getScripts();
  const scriptsTable = generateScriptsTable();
  content = replaceSection(
    content,
    "<!-- SCRIPTS_START -->",
    "<!-- SCRIPTS_END -->",
    scriptsTable
  );

  // Write updated content
  fs.writeFileSync(INTRO_PATH, content);

  console.log("✓ Updated intro.md");
  console.log(`  - Directory: apps + libs tree`);
  console.log(`  - Libraries: ${libs.length} entries (from TSDoc)`);
  console.log(`  - Scripts: ${scripts.length} entries (from package.json)`);
}

main();
