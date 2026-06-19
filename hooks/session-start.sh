#!/usr/bin/env bash
# swe-workflow-skills — SessionStart hook (the activation baseline writer).
#
# The library uses a "name-only baseline": all skills are installed, but only a
# pinned critical set (the skill-router orchestrator + safety skills) keeps its
# description in context and auto-triggers. Everything else is listed name-only
# (invocable, but not auto-triggered) so the listing never overflows the budget.
#
# On every session boundary (startup|resume|clear|compact) this hook:
#   1. writes that baseline into <claude>/settings.local.json via resolve.py
#      (promoting the active role's skills to "on" if a role is set), and
#   2. emits reloadSkills:true so it applies to THIS session, plus a short nudge.
#
# settings.local.json `skillOverrides` and reloadSkills both hot-reload, so the
# crop takes effect immediately. The listing is NOT re-injected after /compact,
# which is why this must run on every boundary.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$SCRIPT_DIR/../skills"
SETTINGS="$SCRIPT_DIR/../settings.local.json"
RESOLVE="$SCRIPT_DIR/resolve.py"
ROLES_FILE="$SKILLS_DIR/.roles.json"

# Active role, if one was set (by install --role or the /role command).
ROLE=""
if [[ -f "$SKILLS_DIR/.active-role" ]]; then
  ROLE="$(tr -d '[:space:]' < "$SKILLS_DIR/.active-role" || true)"
fi

# Write the name-only baseline (promote pinned ∪ active-role to "on"). Send its
# stdout to stderr so it never pollutes the hook's JSON on stdout. Best-effort:
# if python3 / resolve.py / roles.json aren't present, skip silently.
if command -v python3 >/dev/null 2>&1 && [[ -f "$RESOLVE" && -f "$ROLES_FILE" && -d "$SKILLS_DIR" ]]; then
  ROLES_JSON="$ROLES_FILE" python3 "$RESOLVE" apply "$SETTINGS" "$SKILLS_DIR" ${ROLE:+"$ROLE"} >/dev/null 2>&1 || true
fi

read -r -d '' BASE <<'EOF' || true
This project has the swe-workflow skills library installed with a name-only
baseline: only a few critical skills (the `skill-router` orchestrator plus the
safety skills) keep their descriptions in context and auto-trigger. Every other
skill is listed by name only — still invocable, just not auto-triggered.

Before substantial software work — planning, a structural/data decision,
implementing, debugging, reviewing, or shipping — consult `skill-router`. It
reads the full catalog and invokes the right skill by name (skills are invocable
even when shown name-only). This is a nudge, not a gate; the user's explicit
instructions always take precedence.
EOF

ROLE_LINE=""
if [[ -n "$ROLE" ]]; then
  ROLE_LINE="Active role: ${ROLE} — its skills are promoted to auto-trigger. Switch with \`/role <name>\` (\`/role all\` resets to baseline)."
fi

# Emit the SessionStart JSON (additionalContext + reloadSkills). Prefer python3
# for safe encoding; fall back to a sed-based encoder that still sets reloadSkills.
BASE="$BASE" ROLE_LINE="$ROLE_LINE" python3 - <<'PY' 2>/dev/null || \
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","reloadSkills":true,"additionalContext":%s}}\n' \
    "\"$(printf '%s' "$BASE" | sed ':a;N;$!ba;s/\\/\\\\/g;s/"/\\"/g;s/\n/\\n/g')\""
import json, os
ctx = os.environ["BASE"]
role_line = os.environ.get("ROLE_LINE") or ""
if role_line:
    ctx = ctx + "\n\n" + role_line
print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "reloadSkills": True,
        "additionalContext": ctx,
    }
}))
PY
