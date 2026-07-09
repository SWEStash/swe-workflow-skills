# Security

This library extends Claude Code — an agent that can read, write, and execute on a
developer's machine — so a compromise of what it installs is code execution or
instruction injection on that machine. This document is the security model:
the trust boundaries, what runs automatically, the supply-chain guarantees, the
accepted residual risks, and how to report a vulnerability.

Operational security details live where they are used (the release flow in
[docs/RELEASING.md](docs/RELEASING.md), tool-grant authoring rules in
[docs/AUTHORING.md](docs/AUTHORING.md)); this file owns the model and posture.

## What gets installed, and where it runs

`node install.mjs` copies files into a Claude config directory (`./.claude/` by
default, `~/.claude/` with `--global`, or `--dir`):

- **Skills** — markdown under `<claude>/skills/`. These become *model instructions*
  when invoked. They are not executable code, but the model treats them as trusted
  guidance.
- **The SessionStart hook** — `<claude>/hooks/session-start.mjs`, plus `resolve.mjs`
  beside it. Once you wire the printed snippet into `settings.json`, **this runs
  automatically (`node …/session-start.mjs`) on every session boundary.**
- **The `/role` command** — `<claude>/commands/role.md`, run through Claude Code's
  Bash tool when you type `/role`.
- **Data files** — `.roles.json`, `.catalog.json`, `.active-role`,
  `.disabled-skills`, and `.swe-workflow-manifest.json` under `<claude>/skills/`, read
  by the hook and the `/role` command.

## Trust boundaries

| Boundary crossing | Risk | Control |
|---|---|---|
| distribution channel → your `<claude>/` | supply-chain: skills become trusted model instructions; machinery becomes auto-run code | **npm:** OIDC trusted publishing (no long-lived token), automatic provenance, `prepublishOnly` + a fresh `verify.mjs` gate on the exact release commit, zero runtime dependencies, explicit `files:` allowlist. **Marketplace plugins:** skills only — no hooks or commands ship through that channel. **Git:** GitHub repo integrity. |
| installed files → your shell (hook, `/role`) | local command execution | The printed hook snippet is shell-quoted (`$`, `` ` ``, `\`, `"` escaped) so a config path containing `$(…)` cannot run a command substitution. `/role` never assigns its argument to a shell variable — see [Accepted residual risks](#accepted-residual-risks). |
| installer → your config dir | destructive writes | Positional args must exactly match known skill names before any `rmSync` (rejects path traversal). A skill directory this installer did not create is never overwritten or removed — provenance is tracked in `.swe-workflow-manifest.json` (`--force` to overwrite deliberately). |
| PR content → CI | script injection, secret theft | Eval workflows trigger on `pull_request` (never `pull_request_target`), so fork PRs receive no secrets; `permissions: contents: read`; GitHub context values are passed through `env:`, never interpolated into `run:` scripts; Python harnesses use argv lists (no `shell=True`). |
| untrusted repo content → the model | prompt injection / exfiltration | Each skill's `allowed-tools` frontmatter scopes its tool surface. Skills that read untrusted content while holding network tools carry an explicit note — see the authoring rule in [docs/AUTHORING.md](docs/AUTHORING.md). |

## Files that execute automatically — treat as trusted-integrity

Anything that can write `<claude>/hooks/session-start.mjs`, `<claude>/hooks/resolve.mjs`,
or the `.roles.json` / `.active-role` / `.disabled-skills` data files the hook reads gains
**code execution or instruction injection at your next session boundary.** This is inherent to the
SessionStart-hook feature (the same posture as any Claude Code hook), not a defect —
the hook's own logic is data-only, fails safe (best-effort `try/catch`, never blocks a
session), and refuses to rebuild a corrupt `settings.local.json` from scratch.

Protect these files with filesystem permissions the way you would any auto-run script.
A **project-level** install puts this machinery in a repo-committable `./.claude/`, so
review its contents in code review like any other committed code.

## Accepted residual risks

- **`/role` argument handling.** Slash-command templates interpolate `$ARGUMENTS` as
  text, so untrusted text cannot be embedded directly in a shell script safely. The
  command's **primary control is model-side validation**: the model must reject any
  argument that is not `^[a-z0-9_-]{1,32}$` before emitting Bash. As a deterministic
  backstop, the validated value reaches the shell only as the final quoted argv of a
  `node …/resolve.mjs` call, where `resolve.mjs` rejects any string that is not a known
  role — it is never placed in a bare `ROLE=…` assignment. The residual (a jailbroken
  model bypassing validation and quote-escaping the argv) is **accepted**: `/role` is
  `disable-model-invocation: true` (only a human types the argument), a compromised
  model already holds the Bash tool, and Claude Code's permission mode still gates the
  call. Owner: maintainers.
- **Skills that read untrusted content while holding network tools.** `security-audit`
  (and similar research skills) deliberately keep `WebFetch`/`WebSearch` for live CVE
  lookups while also reading a repository that may contain prompt injection — a
  read-then-exfiltrate channel. This is a general Claude Code exposure; the grant is
  **kept** for its legitimate use and documented as an authoring rule
  ([docs/AUTHORING.md](docs/AUTHORING.md)). Run such skills only on repositories you
  are authorized to audit. Owner: maintainers.

## Operator checklist (repo settings, outside this codebase)

If you fork or self-host the release pipeline, confirm:

1. **Branch protection on `main`** — `release.yml` runs with `contents: write` on every
   push to `main` and can auto-push to the release PR branch; the model assumes only
   reviewed merges land there.
2. **npm trusted-publisher binding** points at exactly this repo + `release.yml`.
3. **Secrets inventory** — only `ANTHROPIC_API_KEY` and `RELEASE_PLEASE_TOKEN` should
   exist, and the token should be fine-grained (repo-scoped, minimal permissions).

## Reporting a vulnerability

Please report suspected vulnerabilities privately via
[GitHub Security Advisories](https://github.com/SWEStash/swe-workflow-skills/security/advisories/new)
rather than a public issue. Include the affected file(s), a reproduction, and the
impact you observed. We aim to acknowledge within a few business days.
