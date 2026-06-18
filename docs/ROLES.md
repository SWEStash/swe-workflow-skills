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

| `skillOverrides` value | In listing | Auto-triggers | Invocable |
|------------------------|------------|---------------|-----------|
| `on`                   | name+desc  | yes           | yes       |
| `name-only`            | name only  | no            | yes       |
| `off`                  | hidden     | no            | yes (`/name`) |

`skillOverrides` and the listing **hot-reload** when `settings.local.json`
changes, so the baseline and role switches apply without a restart.

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

## Install (CLI — the dynamic model)

```bash
./install.sh --hook              # all skills, name-only baseline, + the hook
./install.sh --global --hook     # ...globally
./install.sh --role pm           # hard subset: just the PM skills (no orchestrator gating)
```

The default installs **all** skills plus the machinery: the catalog/role markers
beside the skills, `resolve.py`, and the `/role` command. `--hook` installs the
SessionStart hook that writes the baseline (`skillOverrides`) into
`settings.local.json` on every session boundary (`startup|resume|clear|compact`)
and emits `reloadSkills`. **The dynamic model needs the hook** — without it, no
baseline is applied and you fall back to plain description-triggering. The
installer prints the settings snippet; it never edits your settings for you.

### Switch roles at runtime

```text
/role            # show the active role + list roles
/role backend    # promote the backend set to auto-trigger
/role all        # reset to baseline (only pinned skills auto-trigger)
```

`/role` rewrites `settings.local.json` (hot-reloads) and records the choice in an
`.active-role` marker so the hook re-asserts it across compaction.

## Install (web / static — per-role plugins)

For environments that don't run hooks (e.g. `claude.ai/code`), the repo is also a
marketplace of **per-role plugins** — each a hard subset, so the subset *is* the
scope, no orchestrator needed. Generated from `roles.json` by
`scripts/build-plugins.mjs` into [`.claude-plugin/marketplace.json`](../.claude-plugin/marketplace.json)
and `plugins/` (do not edit by hand).

```text
/plugin marketplace add <owner>/dev-workflow-skills
/plugin install dev-workflow-pm@dev-workflow
```

> **Web caveat (unverified):** plugin/skill support on `claude.ai/code` is, per our
> research, more limited than the desktop CLI. Verify before relying on it.

## Missing roles (future iterations)

Need **new skills** first (build via the `writing-skills` RED→GREEN process):
**Data Engineer** (data-pipeline/ETL, data-quality) and **Mobile Engineer**.

## Open follow-ups

- Verify the `claude.ai/code` web plugin/skill story end-to-end.
- Per-role plugins bundle the shared orchestrator/catalog (full library); consider
  scoping each plugin's catalog to its own subset.
- Decide whether to keep committing generated `plugins/` + `catalog.json` or
  generate them at release.
