---
name: role
description: "Switch the active swe-workflow role: promote that role's skills to auto-trigger (on) and send the rest to name-only. Usage: /role <name> to set, /role to show current + list, /role all (or none) to reset to baseline."
argument-hint: [role]
allowed-tools: Bash
disable-model-invocation: true
---

The user is managing the active swe-workflow skill role. The requested role argument is: `$ARGUMENTS`

**Validate the argument before running anything — this is the security-critical
step.** It must be empty or match `^[a-z0-9_-]{1,32}$` (role keys are short
kebab-case names). If it contains ANYTHING else — a space, quote, `$`, backtick,
slash, semicolon, or any other character — the argument is invalid: do NOT run any
Bash command that contains the argument in any form (not in a variable, not as an
argument, not anywhere). Instead reply that the role name is invalid and list the
available roles by running only the fixed command `node "@@RESOLVE@@" roles` with
`ROLES_JSON="@@ROLES@@"` exported — that command does not reference the argument at
all.

If the argument is valid (or empty), run the setup block once, then run the ONE
branch below that matches, substituting the validated role for `__ROLE__` **only
where shown** (always inside double quotes as the final argument of a `node`
call — never assigned to a shell variable). Then report the result concisely (the
new active role, and that the change hot-reloads so it applies to the next
prompt):

```bash
# --- setup (no argument appears here) ---
RESOLVE="@@RESOLVE@@"; SKILLS="@@SKILLS@@"; SETTINGS="@@SETTINGS@@"
ROLES="@@ROLES@@"; ACTIVE="@@ACTIVE_ROLE@@"
export ROLES_JSON="$ROLES"
```

Empty argument (no role given) — show current + available, no substitution:
```bash
echo "Active role: $(cat "$ACTIVE" 2>/dev/null || echo 'baseline (none)')"
echo "Available roles:"; node "$RESOLVE" roles
```

Argument is `all` or `none` — reset to baseline:
```bash
node "$RESOLVE" apply "$SETTINGS" "$SKILLS" none && rm -f "$ACTIVE"
echo "Reset to baseline — only the pinned skills auto-trigger now."
```

Any other validated role — apply it. `resolve.mjs` rejects an unknown role with a
non-zero exit, so the `&&` short-circuits and the marker is only written for a role
that actually resolved:
```bash
if node "$RESOLVE" apply "$SETTINGS" "$SKILLS" "__ROLE__" && printf '%s\n' "__ROLE__" > "$ACTIVE"; then
  echo "Active role set — its skills now auto-trigger."
else
  echo "Unknown role. Available roles:"; node "$RESOLVE" roles
fi
```

Notes:
- `skillOverrides` and the skill listing hot-reload when `settings.local.json` changes, so the new auto-trigger set takes effect on the next prompt without a restart.
- This command is for the full (all-skills) CLI install. Hard-subset (`--role`) installs and the per-role marketplace plugins don't need it.
- Security: `$ARGUMENTS` is never embedded directly (slash-command templates
  interpolate it as text, so a crafted argument would execute in the shell). The
  **primary control is the model-side regex validation above** — do it before
  emitting any Bash. As a deterministic backstop, the validated value reaches the
  shell only as the final quoted argv of a `node "$RESOLVE"` call, where
  `resolve.mjs` (`roleOrDie`) rejects any string that is not a known role before
  it is used — the value is never placed in a bare `ROLE=...` assignment. See
  `SECURITY.md` for the residual (quote-escape) risk and why it is accepted.
