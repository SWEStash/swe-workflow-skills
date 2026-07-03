#!/usr/bin/env node
// Propagate the release version out to every place that must agree with it.
//
//   node scripts/sync-version.mjs
//
// release-please (release-type: node) bumps only package.json's version. This
// script fans that version out to the library's single source of truth — the
// VERSION file — and then re-runs the generator so the marketplace, per-role
// plugins, and catalog carry it too. scripts/verify.mjs asserts VERSION,
// package.json, and the marketplace all agree, so this is what keeps the release
// PR internally consistent (and the merged release commit green).
//
// Order matters: VERSION is the SSOT build-plugins.mjs reads, so it is written
// FIRST, then generation runs. Idempotent — safe to run locally or in CI, and a
// no-op when everything already agrees. See docs/RELEASING.md for the full flow.

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const version = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8")).version;
if (!version) {
  console.error("FAIL: package.json has no version to sync from.");
  process.exit(1);
}

const VERSION_FILE = join(ROOT, "VERSION");
const current = readFileSync(VERSION_FILE, "utf-8").trim();
if (current === version) {
  console.log(`VERSION already ${version}; regenerating to confirm no drift.`);
} else {
  writeFileSync(VERSION_FILE, version + "\n");
  console.log(`VERSION ${current} -> ${version}`);
}

// Regenerate marketplace + per-role plugins + catalog from the (now-current) VERSION.
execFileSync(process.execPath, [join(ROOT, "scripts", "build-plugins.mjs")], {
  stdio: "inherit",
  cwd: ROOT,
});
