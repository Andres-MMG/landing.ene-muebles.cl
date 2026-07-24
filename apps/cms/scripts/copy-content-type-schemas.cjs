#!/usr/bin/env node
//
// Copy Strapi content-type schema.json files from src/ to dist/.
//
// Why this script exists
// ----------------------
// Strapi v5's TypeScript loader reads schemas from `strapi.dirs.dist.api`
// (i.e. `dist/src/api`), not from `src/api`. When `strapi build` (or
// `pnpm --filter cms build`) runs `tsc` over the project, TypeScript
// emits `.js` files for every `.ts` it compiles, but it does NOT copy
// standalone `.json` files unless they are imported through
// `resolveJsonModule`. Strapi loads the schemas at runtime via
// `fs.readJSON`, not via a static import, so tsc never emits them.
//
// The symptom of the missing schema is:
//   TypeError: Cannot read properties of undefined (reading 'kind')
//       at isSingleType (utils/index.js:322)
//       at createRoutes (core-api/routes/index.js:5)
//   Thrown because `strapi.contentType(uid)` returns `undefined` when the
//   content-type registry was never populated for that uid.
//
// This script copies every schema.json under any
// `src/api/<api>/content-types/<ct>/schema.json` to the matching
// `dist/src/api/<api>/content-types/<ct>/schema.json` so the loader finds
// them. Components follow the same loader convention, so we copy them too.
//

"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SRC_API_DIR = path.join(PROJECT_ROOT, "src", "api");
const DIST_SRC_DIR = path.join(PROJECT_ROOT, "dist", "src");
const DIST_API_DIR = path.join(DIST_SRC_DIR, "api");
const SRC_COMPONENTS_DIR = path.join(PROJECT_ROOT, "src", "components");
const DIST_COMPONENTS_DIR = path.join(DIST_SRC_DIR, "components");

const SCHEMA_FILENAME = /schema\.json$/i;
const COMPONENT_FILENAME = /^[^/\\]+\.json$/i;

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function walkJsonFiles(root, filenameRe) {
  /** @type {string[]} */
  const found = [];
  if (!(await exists(root))) return found;

  async function visit(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      // Skip dotfiles to avoid copying .DS_Store or .gitkeep placeholders.
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(full);
        continue;
      }
      if (entry.isFile() && filenameRe.test(entry.name)) {
        found.push(full);
      }
    }
  }

  await visit(root);
  return found;
}

async function copyOne(srcFile, distRoot, srcRoot, label) {
  const relative = path.relative(srcRoot, srcFile);
  const destFile = path.join(distRoot, relative);
  await fs.mkdir(path.dirname(destFile), { recursive: true });
  await fs.copyFile(srcFile, destFile);
  // eslint-disable-next-line no-console
  console.log(
    `[copy-content-type-schemas] ${label}: ${path.relative(
      PROJECT_ROOT,
      srcFile
    )} -> ${path.relative(PROJECT_ROOT, destFile)}`
  );
}

async function collectSchemaFiles() {
  /** @type {string[]} */
  const found = [];
  if (!(await exists(SRC_API_DIR))) return found;

  const apiEntries = await fs.readdir(SRC_API_DIR, { withFileTypes: true });
  for (const entry of apiEntries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const apiContentTypes = path.join(
      SRC_API_DIR,
      entry.name,
      "content-types"
    );
    found.push(...(await walkJsonFiles(apiContentTypes, SCHEMA_FILENAME)));
  }
  return found;
}

async function main() {
  // The dist directory is produced by `strapi build` (which internally runs
  // `tsc`). If it does not exist we cannot mirror src/ into it, so bail out
  // with a helpful message instead of silently doing nothing.
  if (!(await exists(DIST_SRC_DIR))) {
    console.error(
      "[copy-content-type-schemas] dist/src does not exist yet. " +
        "Run `pnpm --filter cms build` first (it compiles the TypeScript " +
        "sources into dist/) before invoking this script."
    );
    process.exit(1);
  }

  const schemaFiles = await collectSchemaFiles();
  const componentFiles = await walkJsonFiles(
    SRC_COMPONENTS_DIR,
    COMPONENT_FILENAME
  );

  if (schemaFiles.length === 0 && componentFiles.length === 0) {
    // eslint-disable-next-line no-console
    console.log(
      "[copy-content-type-schemas] No schema.json or component files " +
        "found under src/api or src/components. Nothing to copy."
    );
    return;
  }

  for (const file of schemaFiles) {
    await copyOne(file, DIST_API_DIR, SRC_API_DIR, "schema");
  }
  for (const file of componentFiles) {
    await copyOne(file, DIST_COMPONENTS_DIR, SRC_COMPONENTS_DIR, "component");
  }

  // eslint-disable-next-line no-console
  console.log(
    `[copy-content-type-schemas] Copied ${schemaFiles.length} schema(s) ` +
      `and ${componentFiles.length} component(s).`
  );
}

main().catch((err) => {
  console.error("[copy-content-type-schemas] Unexpected error:", err);
  process.exit(1);
});
