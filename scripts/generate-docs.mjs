#!/usr/bin/env node

/**
 * Generates documentation content for intro.md
 *
 * Updates:
 * - Libraries table between <!-- LIBRARIES_START --> and <!-- LIBRARIES_END -->
 * - NPM Scripts table between <!-- SCRIPTS_START --> and <!-- SCRIPTS_END -->
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

/**
 * Library definitions with import paths and descriptions
 */
const LIBRARY_DEFINITIONS = [
  {
    importPath: "@excel-platform/shared/types",
    description: "Shared TypeScript types and interfaces",
  },
  {
    importPath: "@excel-platform/shared/ui",
    description: "Reusable UI components",
  },
  {
    importPath: "@excel-platform/shared/util",
    description: "Utility functions",
  },
  {
    importPath: "@excel-platform/core/auth",
    description: "Authentication service",
  },
  {
    importPath: "@excel-platform/core/telemetry",
    description: "Telemetry and logging",
  },
  {
    importPath: "@excel-platform/core/settings",
    description: "Application settings",
  },
  {
    importPath: "@excel-platform/office/excel",
    description: "Excel Office.js wrapper",
  },
  {
    importPath: "@excel-platform/office/common",
    description: "Common Office utilities",
  },
  {
    importPath: "@excel-platform/data/storage",
    description: "Storage abstraction",
  },
  { importPath: "@excel-platform/data/api", description: "API services" },
  {
    importPath: "@excel-platform/data/query",
    description: "Query execution",
  },
];

/**
 * NPM scripts to document
 */
const SCRIPT_DEFINITIONS = [
  { command: "npm start", description: "Dev server at localhost:4200" },
  { command: "npm run start:dev", description: "Dev server with HTTPS" },
  { command: "npm run build", description: "Production build" },
  { command: "npm run test:ci", description: "Run all tests (headless)" },
  { command: "npm run lint", description: "Lint TypeScript and templates" },
  { command: "npm run docs:serve", description: "View documentation locally" },
];

/**
 * Generate libraries markdown table
 */
function generateLibrariesTable() {
  const lines = [
    "## Libraries",
    "",
    "| Package | Description |",
    "|---------|-------------|",
  ];

  for (const lib of LIBRARY_DEFINITIONS) {
    lines.push(`| \`${lib.importPath}\` | ${lib.description} |`);
  }

  return lines.join("\n");
}

/**
 * Generate NPM scripts markdown table
 */
function generateScriptsTable() {
  const lines = [
    "## NPM Scripts",
    "",
    "| Command | Description |",
    "|---------|-------------|",
  ];

  for (const script of SCRIPT_DEFINITIONS) {
    lines.push(`| \`${script.command}\` | ${script.description} |`);
  }

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
  console.log("Generating documentation...");

  // Read intro.md
  let content = fs.readFileSync(INTRO_PATH, "utf-8");

  // Generate and replace libraries
  const librariesTable = generateLibrariesTable();
  content = replaceSection(
    content,
    "<!-- LIBRARIES_START -->",
    "<!-- LIBRARIES_END -->",
    librariesTable
  );

  // Generate and replace scripts
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
  console.log(`  - Libraries: ${LIBRARY_DEFINITIONS.length} entries`);
  console.log(`  - Scripts: ${SCRIPT_DEFINITIONS.length} entries`);
}

main();
