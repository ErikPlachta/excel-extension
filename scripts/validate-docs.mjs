#!/usr/bin/env node

/**
 * Validates documentation freshness.
 *
 * Checks:
 * - Generated sections in intro.md match what would be generated from source
 * - All library index.ts files have TSDoc @packageDocumentation
 *
 * Usage: node scripts/validate-docs.mjs
 * Exit codes: 0 = valid, 1 = stale/invalid
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
const CLAUDE_PATH = path.join(ROOT, ".claude/CLAUDE.md");
const LIBS_DIR = path.join(ROOT, "libs");

let hasErrors = false;
let hasWarnings = false;

function error(msg) {
  console.error(`ERROR: ${msg}`);
  hasErrors = true;
}

function warn(msg) {
  console.warn(`WARN: ${msg}`);
  hasWarnings = true;
}

function info(msg) {
  console.log(`INFO: ${msg}`);
}

/**
 * Check all library index.ts files have TSDoc
 */
function validateLibraryTSDoc() {
  const categories = ["core", "shared", "data", "office"];
  let count = 0;

  for (const category of categories) {
    const categoryPath = path.join(LIBS_DIR, category);
    if (!fs.existsSync(categoryPath)) continue;

    const libNames = fs
      .readdirSync(categoryPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const lib of libNames) {
      const indexPath = path.join(categoryPath, lib, "src/index.ts");
      if (!fs.existsSync(indexPath)) {
        warn(`Missing index.ts: ${category}/${lib}`);
        continue;
      }

      const content = fs.readFileSync(indexPath, "utf-8");
      if (!content.includes("@packageDocumentation")) {
        error(`Missing @packageDocumentation in ${category}/${lib}/src/index.ts`);
      } else {
        count++;
      }
    }
  }

  info(`Validated ${count} library TSDoc blocks`);
}

/**
 * Extract section content between markers
 */
function extractSection(content, startMarker, endMarker) {
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    return null;
  }

  return content.substring(startIdx + startMarker.length, endIdx).trim();
}

/**
 * Simulate what generate-docs would produce for libraries
 */
function generateExpectedLibraries() {
  const categories = ["core", "shared", "data", "office"];
  const libs = [];

  for (const category of categories) {
    const categoryPath = path.join(LIBS_DIR, category);
    if (!fs.existsSync(categoryPath)) continue;

    const libNames = fs
      .readdirSync(categoryPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    for (const lib of libNames) {
      const indexPath = path.join(categoryPath, lib, "src/index.ts");
      let description = "Library";

      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, "utf-8");
        const match = content.match(/@packageDocumentation\s*\n\s*\*\s*([^\n]+)/);
        if (match && match[1]) {
          description = match[1].replace(/\s*\*?\s*$/, "").trim().replace(/\.$/, "");
        }
      }

      libs.push(`| \`@excel-platform/${category}/${lib}\` | ${description} |`);
    }
  }

  return libs.join("\n");
}

/**
 * Check if generated sections are fresh
 */
function validateGeneratedSections() {
  if (!fs.existsSync(INTRO_PATH)) {
    error(`intro.md not found at ${INTRO_PATH}`);
    return;
  }

  const content = fs.readFileSync(INTRO_PATH, "utf-8");

  // Check libraries section
  const currentLibs = extractSection(
    content,
    "<!-- LIBRARIES_START -->",
    "<!-- LIBRARIES_END -->"
  );

  if (!currentLibs) {
    error("LIBRARIES markers not found in intro.md");
  } else {
    const expectedLibs = generateExpectedLibraries();
    // Compare just the table rows (skip header)
    const currentRows = currentLibs
      .split("\n")
      .filter((l) => l.startsWith("| `@"))
      .join("\n");

    if (currentRows !== expectedLibs) {
      error("Libraries section is stale. Run: npm run docs:generate");
    } else {
      info("Libraries section is up to date");
    }
  }

  // Check directory section exists
  const dirSection = extractSection(
    content,
    "<!-- DIRECTORY_START -->",
    "<!-- DIRECTORY_END -->"
  );

  if (!dirSection) {
    error("DIRECTORY markers not found in intro.md");
  } else if (!dirSection.includes("libs/")) {
    error("Directory section appears empty. Run: npm run docs:generate");
  } else {
    info("Directory section is present");
  }

  // Check scripts section exists
  const scriptsSection = extractSection(
    content,
    "<!-- SCRIPTS_START -->",
    "<!-- SCRIPTS_END -->"
  );

  if (!scriptsSection) {
    error("SCRIPTS markers not found in intro.md");
  } else if (!scriptsSection.includes("npm run")) {
    error("Scripts section appears empty. Run: npm run docs:generate");
  } else {
    info("Scripts section is present");
  }
}

/**
 * Validate CLAUDE.md has required markers
 */
function validateClaudeMd() {
  if (!fs.existsSync(CLAUDE_PATH)) {
    warn("CLAUDE.md not found");
    return;
  }

  const content = fs.readFileSync(CLAUDE_PATH, "utf-8");

  // Check directory markers exist
  if (!content.includes("<!-- DIRECTORY_START -->") || !content.includes("<!-- DIRECTORY_END -->")) {
    warn("DIRECTORY markers not found in CLAUDE.md");
  } else {
    info("CLAUDE.md directory markers present");
  }
}

/**
 * Main
 */
function main() {
  console.log("Validating documentation...\n");

  validateLibraryTSDoc();
  console.log("");
  validateGeneratedSections();
  console.log("");
  validateClaudeMd();

  console.log("");
  if (hasErrors) {
    console.error("Validation FAILED - see errors above");
    process.exit(1);
  } else if (hasWarnings) {
    console.warn("Validation passed with warnings");
    process.exit(0);
  } else {
    console.log("Validation PASSED");
    process.exit(0);
  }
}

main();
