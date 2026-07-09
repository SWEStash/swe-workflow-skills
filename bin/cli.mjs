#!/usr/bin/env node
// swe-workflow-skills — npm CLI entry point. Dispatches subcommands to the
// installer/uninstaller so `npx swe-workflow-skills install` reads naturally.
// Runs on Linux, macOS, and Windows (the one runtime Claude Code already requires).
//
//   npx swe-workflow-skills install [--global|--dir DIR|--role R|--no-hook|...]
//   npx swe-workflow-skills uninstall [--global|--dir DIR|--dry-run|--yes]
//   npx swe-workflow-skills disable <skill> [--off|--global|--dir DIR]
//   npx swe-workflow-skills enable  <skill> [--global|--dir DIR]
//   npx swe-workflow-skills list-disabled  [--global|--dir DIR]

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const [sub, ...rest] = process.argv.slice(2);

const HELP = `swe-workflow-skills <command> [options]

Commands:
  install         Install skills into a Claude config dir (passes flags to install.mjs)
  uninstall       Remove the library (passes flags to uninstall.mjs)
  disable <skill> Opt a skill out of routing/auto-trigger (advanced; --off to fully hide)
  enable  <skill> Re-enable a previously disabled skill
  list-disabled   List skills currently disabled

Examples:
  npx swe-workflow-skills install --global
  npx swe-workflow-skills install --role pm
  npx swe-workflow-skills uninstall --global --dry-run
  npx swe-workflow-skills disable data-modeling --global
  npx swe-workflow-skills enable data-modeling --global

Run a command with --help to see its full option list.`;

// disable/enable/list-disabled all run through disable.mjs; map the CLI verb to
// the action positional it expects (list-disabled -> list).
const DISABLE_ACTIONS = { disable: "disable", enable: "enable", "list-disabled": "list" };

if (sub === "install" || sub === "uninstall") {
  const script = join(ROOT, sub === "install" ? "install.mjs" : "uninstall.mjs");
  // stdio inherited so install output and uninstall's confirm prompt pass through.
  const res = spawnSync(process.execPath, [script, ...rest], { stdio: "inherit" });
  process.exit(res.status ?? 1);
} else if (sub in DISABLE_ACTIONS) {
  const script = join(ROOT, "disable.mjs");
  const res = spawnSync(process.execPath, [script, DISABLE_ACTIONS[sub], ...rest], { stdio: "inherit" });
  process.exit(res.status ?? 1);
} else if (sub === "-v" || sub === "--version" || sub === "version") {
  process.stdout.write(readFileSync(join(ROOT, "VERSION"), "utf-8"));
  process.exit(0);
} else if (!sub || sub === "-h" || sub === "--help" || sub === "help") {
  process.stdout.write(HELP + "\n");
  process.exit(sub ? 0 : 1); // bare invocation is a usage error; explicit help is success
} else {
  process.stderr.write(`Unknown command: ${sub}\n\n${HELP}\n`);
  process.exit(1);
}
