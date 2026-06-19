---
name: role
description: "Switch the active swe-workflow role: promote that role's skills to auto-trigger (on) and send the rest to name-only. Usage: /role <name> to set, /role to show current + list, /role all (or none) to reset to baseline."
argument-hint: [role]
allowed-tools: Bash
disable-model-invocation: true
---

The user is managing the active swe-workflow skill role. The requested role argument is: `$ARGUMENTS`

Run this script exactly once via Bash, then report the result to the user concisely (the new active role, and that the change hot-reloads so it applies to the next prompt):

```bash
ROLE="$ARGUMENTS"
RESOLVE="@@RESOLVE@@"; SKILLS="@@SKILLS@@"; SETTINGS="@@SETTINGS@@"
ROLES="@@ROLES@@"; ACTIVE="@@ACTIVE_ROLE@@"
export ROLES_JSON="$ROLES"
if [ -z "$ROLE" ]; then
  echo "Active role: $(cat "$ACTIVE" 2>/dev/null || echo 'baseline (none)')"
  echo "Available roles:"; python3 "$RESOLVE" roles
elif [ "$ROLE" = "all" ] || [ "$ROLE" = "none" ]; then
  python3 "$RESOLVE" apply "$SETTINGS" "$SKILLS" none && rm -f "$ACTIVE"
  echo "Reset to baseline — only the pinned skills auto-trigger now."
elif python3 "$RESOLVE" label "$ROLE" >/dev/null 2>&1; then
  python3 "$RESOLVE" apply "$SETTINGS" "$SKILLS" "$ROLE" && printf '%s\n' "$ROLE" > "$ACTIVE"
  echo "Active role set to '$ROLE' — its skills now auto-trigger."
else
  echo "Unknown role '$ROLE'. Available roles:"; python3 "$RESOLVE" roles
fi
```

Notes:
- `skillOverrides` and the skill listing hot-reload when `settings.local.json` changes, so the new auto-trigger set takes effect on the next prompt without a restart.
- This command is for the full (all-skills) CLI install. Hard-subset (`--role`) installs and the per-role marketplace plugins don't need it.
