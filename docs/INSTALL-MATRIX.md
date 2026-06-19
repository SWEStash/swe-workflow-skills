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
| **Installer** `install.sh` | all 42 skills + orchestrator + `/role` | name-only baseline; the router invokes the rest by name; hook re-asserts each session | ✓ | CLI · Cowork |
| `install.sh --role <r>` | one role's skills | all auto-trigger | ✓ (small set) | CLI · Cowork |
| `install.sh --no-hook` | all 42 skills + orchestrator | baseline applied at install; no automatic re-assert | ✓ | CLI · Cowork |
| Manual copy (`cp`) — not recommended | whatever you copy | all auto-trigger | ✗ overflows at 40+ | CLI · Cowork |

"Reliable at 40+" = the skill listing won't overflow and silently drop skills.

## What "works on" means

- **CLI / desktop / IDE** — everything works: plugins, the installer, the session hook,
  and runtime `/role` switching.
- **Claude Code on the web** — plugins and skills load, but session hooks don't run, so
  the installer's full-library mode isn't available here. Install a per-role plugin.
- **claude.ai chat (and Cowork)** — add the plugin marketplace from Customize → Plugins;
  bundled skills and slash-commands work (hooks and sub-agents are Cowork-only). Install
  a per-role plugin; Team/Enterprise admins can distribute it org-wide.

## Which should I use?

**Most people — and anyone on the web or in chat, or who works in one role:** install
the **per-role plugin** for your hat. Simplest, and it works everywhere.

```text
/plugin marketplace add maprea/swe-workflow-skills
/plugin install swe-workflow-pm@swe-workflow
```

Roles: `backend`, `frontend`, `devops`, `ml`, `security`, `architect`, `em`, `pm`,
`qa`, `designer`.

**You want the whole library with the orchestrator, on the CLI:** run the **installer**.

```bash
./install.sh --global        # all skills + orchestrator + /role + the session hook
```

**Teams:** run the installer into your project's `.claude/` and commit it.

For the activation model in depth, see **[ROLES.md](ROLES.md)**.
