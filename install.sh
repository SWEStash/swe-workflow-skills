#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"
RESOLVE="$REPO_ROOT/scripts/resolve.py"
[[ -d "$SKILLS_DIR" ]] || { echo "Error: must be run from the swe-workflow-skills repo root" >&2; exit 1; }

usage() {
  cat <<EOF
Usage: $(basename "$0") [options] [skill1 skill2 ...]

Install Claude Code skills from this repo. By default installs ALL skills with a
name-only activation baseline (only the skill-router orchestrator + safety skills
auto-trigger; the rest are invoked on demand). Scope to a role at runtime with the
/role command, or install a hard subset with --role.

Options:
  -g, --global     Install to the user config dir: \$CLAUDE_CONFIG_DIR if set,
                   else ~/.claude/ (default without this flag: ./.claude/)
  -d, --dir DIR    Install to a custom Claude config directory DIR
                   (mutually exclusive with --global)
  -r, --role ROLE  Install only one role's skills (a lean, hard subset; see
                   --list for roles). Without it, all skills are installed.
  -p, --prune      After installing the selected set, remove previously-installed
                   library skills that are NOT in the new selection (never touches
                   your own custom skills). Use to narrow a prior all-skills install.
  -k, --hook       Also install the SessionStart hook that writes the activation
                   baseline (prints the settings snippet; never edits settings)
  -l, --list       List available skills and roles
  -h, --help       Show this help

Arguments:
  skill names      Install specific skills only (advanced; skips the role/
                   orchestrator machinery unless skill-router is included)

Examples:
  $(basename "$0")                          # all skills + machinery -> ./.claude/
  $(basename "$0") --global --hook           # all skills + hook, globally
  $(basename "$0") --role pm                 # just the PM subset
  $(basename "$0") --role pm --prune         # PM subset; drop other library skills
  $(basename "$0") --dir /etc/claude         # all skills to /etc/claude/
  $(basename "$0") feature-planning          # one skill, no machinery
EOF
}

GLOBAL=false
HOOK=false
PRUNE=false
CONFIG_DIR=""
ROLE=""
SELECTED=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -g|--global) GLOBAL=true; shift ;;
    -d|--dir)
      shift
      [[ $# -gt 0 ]] || { echo "Error: --dir requires a path" >&2; exit 1; }
      CONFIG_DIR="$1"; shift ;;
    --dir=*) CONFIG_DIR="${1#*=}"; shift ;;
    -a|--all) shift ;;  # accepted for back-compat; installing all is the default
    -r|--role)
      shift
      [[ $# -gt 0 ]] || { echo "Error: --role requires a role name" >&2; exit 1; }
      ROLE="$1"; shift ;;
    --role=*) ROLE="${1#*=}"; shift ;;
    -p|--prune) PRUNE=true; shift ;;
    -k|--hook) HOOK=true; shift ;;
    -l|--list)
      echo "Available skills:"
      ls "$SKILLS_DIR" | sed 's/^/  /'
      echo ""
      echo "Roles (--role, or /role at runtime):"
      if command -v python3 >/dev/null 2>&1 && [[ -f "$RESOLVE" ]]; then
        python3 "$RESOLVE" roles | sed 's/^/  /'
      else
        echo "  (install python3 to list roles from roles.json)"
      fi
      exit 0
      ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
    *) SELECTED+=("$1"); shift ;;
  esac
done

if [[ -n "$ROLE" ]]; then
  command -v python3 >/dev/null 2>&1 || { echo "Error: --role requires python3" >&2; exit 1; }
  python3 "$RESOLVE" label "$ROLE" >/dev/null 2>&1 || {
    echo "Error: unknown role '$ROLE'. Run '$(basename "$0") --list' to see roles." >&2; exit 1; }
fi

if [[ -n "$CONFIG_DIR" ]]; then
  $GLOBAL && { echo "Error: --dir and --global are mutually exclusive" >&2; exit 1; }
  case "$CONFIG_DIR" in "~" | "~/"*) CONFIG_DIR="${HOME}${CONFIG_DIR#\~}" ;; esac
  CLAUDE_DIR="$CONFIG_DIR"
elif $GLOBAL; then
  CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
else
  CLAUDE_DIR="$(pwd)/.claude"
fi
DEST="$CLAUDE_DIR/skills"
mkdir -p "$DEST"

# Resolve the skill set: explicit args > role subset > all (default).
if [[ ${#SELECTED[@]} -eq 0 ]]; then
  if [[ -n "$ROLE" ]]; then
    mapfile -t SELECTED < <(python3 "$RESOLVE" skills "$ROLE")
  else
    mapfile -t SELECTED < <(ls "$SKILLS_DIR")
  fi
fi

errors=0
for skill in "${SELECTED[@]}"; do
  src="$SKILLS_DIR/$skill"
  if [[ ! -d "$src" ]]; then
    echo "Error: unknown skill '$skill'" >&2
    errors=$((errors + 1))
    continue
  fi
  # Clean copy: drop any prior version first so files removed upstream don't linger.
  rm -rf "${DEST:?}/$skill"
  cp -r "$src" "$DEST/"
  echo "Installed: $skill -> $DEST/$skill"
done

# --prune: narrow a prior install to the current selection. Only ever removes skills
# that exist in our source tree (so the user's own custom skills are never touched).
if $PRUNE; then
  declare -A keep=()
  for s in "${SELECTED[@]}"; do keep["$s"]=1; done
  for s in $(ls "$SKILLS_DIR"); do
    if [[ -z "${keep[$s]:-}" && -d "$DEST/$s" ]]; then
      rm -rf "${DEST:?}/$s"
      echo "Pruned: $s (not in selection)"
    fi
  done
fi

# The role/orchestrator machinery is set up only when the orchestrator itself is
# installed (it is, for the default-all and every role; not for ad-hoc single-skill
# installs). It is also needed by the hook.
has_router=false
for s in "${SELECTED[@]}"; do [[ "$s" == "skill-router" ]] && has_router=true; done

if $has_router; then
  # Catalog + role map alongside the skills, for the orchestrator and resolve.py.
  [[ -f "$REPO_ROOT/roles.json" ]] && cp "$REPO_ROOT/roles.json" "$DEST/.roles.json"
  [[ -f "$REPO_ROOT/catalog.json" ]] && cp "$REPO_ROOT/catalog.json" "$DEST/.catalog.json"

  # resolve.py is the shared engine for the hook + /role command. Park it next to
  # where the hook lives.
  TOOLS_DIR="$CLAUDE_DIR/hooks"
  mkdir -p "$TOOLS_DIR"
  cp "$RESOLVE" "$TOOLS_DIR/resolve.py"

  if [[ -n "$ROLE" ]]; then
    printf '%s\n' "$ROLE" > "$DEST/.active-role"
    echo "Wrote role marker -> $DEST/.active-role ($ROLE)"
  fi

  # Install the /role command, substituting absolute paths.
  CMD_SRC="$REPO_ROOT/commands/role.md"
  if [[ -f "$CMD_SRC" ]]; then
    CMD_DEST_DIR="$CLAUDE_DIR/commands"
    mkdir -p "$CMD_DEST_DIR"
    sed -e "s|@@RESOLVE@@|$TOOLS_DIR/resolve.py|g" \
        -e "s|@@SKILLS@@|$DEST|g" \
        -e "s|@@SETTINGS@@|$CLAUDE_DIR/settings.local.json|g" \
        -e "s|@@ROLES@@|$DEST/.roles.json|g" \
        -e "s|@@ACTIVE_ROLE@@|$DEST/.active-role|g" \
        "$CMD_SRC" > "$CMD_DEST_DIR/role.md"
    echo "Installed /role command -> $CMD_DEST_DIR/role.md"
  fi
fi

if $HOOK; then
  HOOK_SRC="$REPO_ROOT/hooks/session-start.sh"
  if [[ ! -f "$HOOK_SRC" ]]; then
    echo "Error: hook script not found at $HOOK_SRC" >&2
    errors=$((errors + 1))
  elif ! $has_router; then
    echo "Warning: --hook needs the orchestrator; install includes no skill-router, skipping hook." >&2
  else
    HOOK_DEST_DIR="$CLAUDE_DIR/hooks"
    mkdir -p "$HOOK_DEST_DIR"
    cp "$HOOK_SRC" "$HOOK_DEST_DIR/session-start.sh"
    chmod +x "$HOOK_DEST_DIR/session-start.sh"
    HOOK_PATH="$HOOK_DEST_DIR/session-start.sh"
    echo "Installed hook script -> $HOOK_PATH"
    echo ""
    echo "To enable it, merge this into $CLAUDE_DIR/settings.json (the installer"
    echo "does NOT edit settings for you):"
    echo ""
    cat <<EOF
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          { "type": "command", "command": "$HOOK_PATH" }
        ]
      }
    ]
  }
EOF
    echo ""
    echo "The hook writes the activation baseline to settings.local.json on each"
    echo "session start. Start a new session and run /doctor to confirm it's registered."
  fi
fi

[[ $errors -eq 0 ]] || exit 1
