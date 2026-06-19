# Roles & activation model

This library uses a **name-only baseline with an active orchestrator** so that a
large skill set stays reliable on any context window. The source of truth is
[`roles.json`](../roles.json); the catalog and marketplace are generated from it.

## The problem this solves

Claude Code injects each installed skill's `name`+`description` into a per-session
listing capped at `skillListingBudgetFraction` (**1% of the context window** —
only ~20–22 descriptions fit on a 200k window). Past the cap it **drops the
least-recently-used descriptions arbitrarily**, silently stripping the keywords
skills need to auto-trigger. With 40+ skills, description-based triggering becomes
unreliable and uncontrolled.

## How it works

- **Pinned skills stay `on`** (full description, auto-trigger): the `skill-router`
  orchestrator plus the safety Iron-Law skills — `verification-before-completion`,
  `tdd-workflow`, `bug-investigating`, `incident-response`, `code-reviewing`.
- **Every other skill is `name-only`**: listed by name, still invocable, but it
  does **not** auto-trigger and its description costs ~nothing. The listing never
  overflows, so the window size is irrelevant.
- **The orchestrator activates the rest.** `skill-router` reads the generated
  `catalog.json` (every skill's full description, with no budget pressure), matches
  your intent, and **invokes the chosen skill by name**. This replaces ~40 fragile
  description matches with one reliable router (kept `on`, reinforced by the
  SessionStart hook nudge, always available as `/skill-router`).
- **Roles promote a working set back to `on`.** Activating a role flips its skills
  to auto-trigger for direct, one-hop use of your daily set.

| `skillOverrides` value  | In listing | Auto-triggers | User-invocable |
|-------------------------|------------|---------------|----------------|
| `on` (default)          | name+desc  | yes           | yes            |
| `name-only`             | name only  | no            | yes            |
| `user-invocable-only`   | hidden     | no            | yes (`/name`)  |
| `off`                   | hidden     | no            | no             |

`skillOverrides` and the listing **hot-reload** when `settings.local.json`
changes, so the baseline and role switches apply without a restart.

## Two ways to avoid cropping (and where each works)

Cropping has exactly two cures, and which install method you pick comes down to which
one a given surface can use:

1. **Name-only baseline (lever ①)** — keep descriptions out of the listing for all but
   the pinned set. Scales to any number of skills. But it *is* `skillOverrides`, and
   **`skillOverrides` only affects skills under `.claude/skills/`** (personal / project
   / enterprise level). Applying it is a settings write — done by the installer and
   re-asserted by the hook. Works where settings + hooks run: **CLI and Cowork.**
2. **Small install (lever ②)** — install fewer skills than the budget (~20). Weaker (it
   caps your working set) but needs no settings, so it works **everywhere**, including
   Claude Code on the web and claude.ai chat. This is exactly what a per-role plugin does.

### Why plugins can't carry the baseline

Per the Claude Code docs, **"Plugin skills are not affected by `skillOverrides`."** No
plugin setting and no hook can mark a plugin's skills name-only — the only visibility
control for a plugin's skills is enabling/disabling the plugin. So a single
"everything" plugin would inject all 40+ descriptions and crop on *every* surface, CLI
included. That's why the full library ships via the **installer** (lever ①) and the
marketplace ships **per-role plugins** (lever ②), each small enough to fit — and why
the per-role plugins omit `skill-router` (with no baseline to route around, and no
catalog it could read, it would only waste a listing slot).

## Roles

| Role key   | Persona                          | Core      |
|------------|----------------------------------|-----------|
| `backend`  | Backend / Full-stack Engineer    | technical |
| `frontend` | Frontend Engineer                | technical |
| `devops`   | DevOps / SRE / Platform Engineer | technical |
| `ml`       | ML Engineer / MLOps              | technical |
| `security` | Security Engineer                | technical |
| `architect`| Architect / Staff Engineer       | technical |
| `em`       | Engineering Manager / Tech Lead  | universal |
| `pm`       | Product / Project Manager        | universal |
| `qa`       | QA / Test Engineer               | technical |
| `designer` | Designer / UX                    | universal |

A role's working set = its **core** ∪ its own skills. Cores: **universal** =
`skill-router`, `feature-planning`; **technical** = universal + `git-workflow`,
`code-reviewing`, `verification-before-completion`, `bug-investigating`,
`project-documentation`. Inspect with `python3 scripts/resolve.py skills <role>`
or list roles with `python3 scripts/resolve.py roles`.

## Install (CLI — the full dynamic model)

This is the only path that delivers the **whole library** (all 42 skills) without
cropping, because the name-only baseline (`skillOverrides`) applies only to skills in
`.claude/skills/` — see [Why plugins can't carry the baseline](#why-plugins-cant-carry-the-baseline).

```bash
./install.sh                     # all skills + machinery + hook + baseline -> ./.claude/
./install.sh --global            # ...to the user config dir
./install.sh --no-hook           # skip the hook (baseline still applied at install)
./install.sh --role pm           # hard subset: just the PM skills (no orchestrator gating)
./install.sh --role pm --prune   # ...and drop other library skills from a prior install
```

The default installs **all** skills plus the machinery (catalog/role markers,
`resolve.py`, the `/role` command), **applies the name-only baseline** to
`settings.local.json` immediately, and installs the SessionStart hook. Because the
baseline is written at install time and `skillOverrides` persists, the install is
**crop-safe right away** — even before you wire the hook, and with `--no-hook`. The
hook (on by default) **re-asserts** the baseline on every session boundary
(`startup|resume|clear|compact`), emits `reloadSkills`, and injects the router
nudge — needed because the skill listing isn't re-injected after `/compact`. The
installer prints the `settings.json` snippet to enable it; it never edits your settings.

Re-running install is idempotent: each skill is re-copied cleanly (no stale
leftover files). `--prune` additionally removes previously-installed library skills
outside the new selection (never your own custom skills). `--global` resolves to
`$CLAUDE_CONFIG_DIR` when that env var is set, else `~/.claude`; explicit `--dir`
always wins.

### Uninstall

```bash
./uninstall.sh                   # remove from ./.claude/
./uninstall.sh --global          # ...from the user config dir
./uninstall.sh --dry-run         # preview only
```

Removes only what the installer created (this repo's skills, the catalog/role
markers, `resolve.py`, the hook script, the `/role` command) and prunes the
library's `skillOverrides` from `settings.local.json`. It prompts first (`--yes` to
skip) and prints the `SessionStart` block to delete from `settings.json` — which it
never edits. The `.active-role` marker is only written by `--role` (and rewritten by
`/role`); `/role all|none` and `uninstall.sh` clear it.

### Switch roles at runtime

```text
/role            # show the active role + list roles
/role backend    # promote the backend set to auto-trigger
/role all        # reset to baseline (only pinned skills auto-trigger)
```

`/role` rewrites `settings.local.json` (hot-reloads) and records the choice in an
`.active-role` marker so the hook re-asserts it across compaction.

## Install (plugins — the recommended, cross-surface path)

For everywhere hooks don't run — **Claude Code on the web, claude.ai chat, and
Cowork** — and as the simplest managed install on the CLI too, the repo is a
marketplace of **per-role plugins**. Each is a hard subset (lever ②), so the subset
*is* the scope: small enough to never crop, no orchestrator or baseline needed.
Generated from `roles.json` by `scripts/build-plugins.mjs` into
[`.claude-plugin/marketplace.json`](../.claude-plugin/marketplace.json) and `plugins/`
(do not edit by hand).

```text
/plugin marketplace add maprea/swe-workflow-skills
/plugin install swe-workflow-pm@swe-workflow
```

In **claude.ai chat** the same marketplace is added from Customize → Plugins (Team/
Enterprise admins can distribute it org-wide); bundled **skills and slash-commands
work**, while **hooks and sub-agents are greyed out** (Cowork-only). On **Claude Code
web**, plugins and skills load but **hooks don't run** — which is exactly why these
are per-role subsets rather than one full-library plugin (see
[Why plugins can't carry the baseline](#why-plugins-cant-carry-the-baseline)).
Verified against the Claude Code / claude.ai docs, 2026-06.

## Missing roles (future iterations)

Need **new skills** first (build via the `writing-skills` RED→GREEN process):
**Data Engineer** (data-pipeline/ETL, data-quality) and **Mobile Engineer**.

## Open follow-ups

- The two largest roles (`backend` 18, `devops` 17 skills after dropping the router)
  sit near the ~20 listing cap — consider trimming or splitting so plugin subsets stay
  comfortably crop-safe on web.
- Decide whether to keep committing generated `plugins/` + `catalog.json` or
  generate them at release.

_Resolved: per-role plugins no longer bundle `skill-router` (it can't route without a
catalog or baseline); the `claude.ai/code` + chat plugin story is verified above._
