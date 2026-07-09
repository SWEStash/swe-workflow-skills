# swe-workflow-skills — install methods & what each actually gives you

This library can be installed a few ways. They all copy the same skills; they differ
in **how the skills activate** and **which surfaces they work on**. Use the table and
the "Which should I use?" guide below to pick.

## Why there's more than one method

Claude keeps a limited budget for skill *descriptions* (roughly 20 fit at once). This
library has 40+ skills, so putting every description in front of Claude at once
overflows that budget and some skills silently stop triggering. Two designs avoid that:

- **Per-role plugin** — install only your role's handful of skills. Small enough that
  all of them stay active, and it works on every surface.
- **Full installer** — install all 40+ skills, but only the `skill-router` orchestrator
  and a few safety skills stay auto-triggering; the rest are listed by name and invoked
  on demand by the router (and you can promote a whole role's set with `/role`). This
  runs on the CLI, where the library can manage local settings and a session hook.

## At a glance

| Method | What you get | How skills activate | Reliable at 40+ | Works on |
|---|---|---|---|---|
| **Per-role plugin** `swe-workflow-<role>` | your role's skills (5–18) | all auto-trigger; chosen by your intent | ✓ (small set) | CLI · Code web · claude.ai chat · Cowork |
| **Installer** `node install.mjs` | all skills + orchestrator + `/role` | name-only baseline; the router invokes the rest by name; hook re-asserts each session | ✓ | CLI · Cowork |
| `node install.mjs --role <r>` | one role's skills | all auto-trigger | ✓ (small set) | CLI · Cowork |
| `node install.mjs --no-hook` | all skills + orchestrator | baseline applied at install; no automatic re-assert | ✓ | CLI · Cowork |
| Manual copy (`cp`) — not recommended | whatever you copy | all auto-trigger | ✗ overflows at 40+ | CLI · Cowork |

"Reliable at 40+" = the skill listing won't overflow and silently drop skills.

"Works on" is about Claude Code **surfaces**, not operating systems. The installer
itself is **pure Node** (the runtime Claude Code already requires), so it runs the same
on **Linux, macOS, and Windows** — there are no bash, Python, or `sed` prerequisites.

## What "works on" means

- **CLI / desktop / IDE** — everything works: plugins, the installer, the session hook,
  and runtime `/role` switching. Same on Linux, macOS, and Windows.
- **Claude Code on the web** — plugins and skills load, but session hooks don't run, so
  the installer's full-library mode isn't available here. Install a per-role plugin.
- **claude.ai chat (and Cowork)** — add the plugin marketplace from Customize → Plugins;
  bundled skills and slash-commands work (hooks and sub-agents are Cowork-only). Install
  a per-role plugin; Team/Enterprise admins can distribute it org-wide.

## Which should I use?

**Most people — and anyone on the web or in chat, or who works in one role:** install
the **per-role plugin** for your hat. Simplest, and it works everywhere.

```text
/plugin marketplace add SWEStash/swe-workflow-skills
/plugin install swe-workflow-pm@swe-workflow
```

Roles: `backend`, `frontend`, `devops`, `ml`, `ai`, `data`, `data-scientist`,
`security`, `architect`, `em`, `pm`, `strategy`, `qa`, `mobile`, `designer`.

**You want the whole library with the orchestrator, on the CLI:** run the **installer**.

```bash
node install.mjs --global        # all skills + orchestrator + /role + the session hook
```

**This is a two-step setup — wiring the hook is a required manual step.** The installer
copies the hook script and applies the name-only baseline, then **prints a `SessionStart`
snippet for you to merge into `settings.json`** (it never edits `settings.json` — that's a
[trust boundary](../SECURITY.md)). What you keep vs lose if you skip the merge:

- **Keep** — the skills are installed and the baseline is applied, so nothing crops.
- **Lose** — the **router nudge** (Claude won't be prompted to consult `skill-router` first,
  so skills won't auto-route) and the **post-`/compact` re-assert**. `--no-hook` is the
  explicit "I'm opting out of auto-routing" choice; auto-routing stays off until a hook is
  wired. After merging, start a new session and run `/doctor` to confirm the hook registered.

**Don't want a specific skill routed?** `node disable.mjs disable <skill>` (or
`npx swe-workflow-skills disable <skill>`) opts it out durably — see
[disable a skill from routing](ROLES.md#advanced-disable-a-skill-from-routing).

**Teams:** run the installer into your project's `.claude/` and commit it.

For the activation model in depth, see **[ROLES.md](ROLES.md)**.
