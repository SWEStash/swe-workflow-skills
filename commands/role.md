---
name: role
description: "Switch the active swe-workflow role: promote that role's skills to auto-trigger (on) and send the rest to name-only. Usage: /role <name> to set, /role to show current + list, /role all (or none) to reset to baseline."
argument-hint: [role]
allowed-tools: Bash
disable-model-invocation: true
---

The user is managing the active swe-workflow skill role. The requested role argument is: `$ARGUMENTS`

**Validate the argument before running anything.** It must be empty or match
`^[a-z0-9_-]{1,32}$` (role keys are short kebab-case names). If it does not match —
any spaces, quotes, `$`, backticks, slashes, or other characters — do NOT run the
script below with it: reply that the role name is invalid and show the available
roles by running only `node "@@RESOLVE@@" roles` (with `ROLES_JSON="@@ROLES@@"`
exported).

If the argument is valid, run this script exactly once via Bash, replacing
`__ROLE__` with the validated argument (or with nothing when no argument was
given), then report the result to the user concisely (the new active role, and
that the change hot-reloads so it applies to the next prompt):

```bash
ROLE="__ROLE__"
case "$ROLE" in *[!a-zA-Z0-9_-]*) echo "invalid role name" >&2; exit 1;; esac
RESOLVE="@@RESOLVE@@"; SKILLS="@@SKILLS@@"; SETTINGS="@@SETTINGS@@"
ROLES="@@ROLES@@"; ACTIVE="@@ACTIVE_ROLE@@"
export ROLES_JSON="$ROLES"
if [ -z "$ROLE" ]; then
  echo "Active role: $(cat "$ACTIVE" 2>/dev/null || echo 'baseline (none)')"
  echo "Available roles:"; node "$RESOLVE" roles
elif [ "$ROLE" = "all" ] || [ "$ROLE" = "none" ]; then
  node "$RESOLVE" apply "$SETTINGS" "$SKILLS" none && rm -f "$ACTIVE"
  echo "Reset to baseline — only the pinned skills auto-trigger now."
elif node "$RESOLVE" label "$ROLE" >/dev/null 2>&1; then
  node "$RESOLVE" apply "$SETTINGS" "$SKILLS" "$ROLE" && printf '%s\n' "$ROLE" > "$ACTIVE"
  echo "Active role set to '$ROLE' — its skills now auto-trigger."
else
  echo "Unknown role '$ROLE'. Available roles:"; node "$RESOLVE" roles
fi
```

Notes:
- `skillOverrides` and the skill listing hot-reload when `settings.local.json` changes, so the new auto-trigger set takes effect on the next prompt without a restart.
- This command is for the full (all-skills) CLI install. Hard-subset (`--role`) installs and the per-role marketplace plugins don't need it.
- Security: the script deliberately never embeds `$ARGUMENTS` directly (slash-command templates interpolate it as text, so a crafted argument would execute in the shell). The value reaches the script only via the validated `__ROLE__` transfer above; the in-script `case` guard is defense-in-depth.
