#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"
[[ -d "$SKILLS_DIR" ]] || { echo "Error: must be run from the swe-workflow-skills repo root" >&2; exit 1; }

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Remove the swe-workflow-skills library from a Claude config directory. Removes only
what install.sh created: this repo's skills, the catalog/role markers, resolve.py,
the SessionStart hook, and the /role command. Your own custom skills are never
touched. The library's skillOverrides entries are pruned from settings.local.json
(machine-written); the SessionStart registration in settings.json is left for you to
remove by hand (this tool never edits settings.json) — the exact block is printed.

Options:
  -g, --global   Remove from the user config dir: \$CLAUDE_CONFIG_DIR if set, else
                 ~/.claude/ (default without this flag: ./.claude/)
  -d, --dir DIR  Remove from a custom Claude config directory DIR
                 (mutually exclusive with --global)
  -y, --yes      Skip the confirmation prompt
  -n, --dry-run  Print what would be removed; change nothing
  -h, --help     Show this help

Examples:
  $(basename "$0")                  # remove from ./.claude/
  $(basename "$0") --global         # remove from the user config dir
  $(basename "$0") --dir /etc/claude --dry-run
EOF
}

GLOBAL=false
DRY_RUN=false
ASSUME_YES=false
CONFIG_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -g|--global) GLOBAL=true; shift ;;
    -d|--dir)
      shift
      [[ $# -gt 0 ]] || { echo "Error: --dir requires a path" >&2; exit 1; }
      CONFIG_DIR="$1"; shift ;;
    --dir=*) CONFIG_DIR="${1#*=}"; shift ;;
    -y|--yes) ASSUME_YES=true; shift ;;
    -n|--dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
    *) echo "Unexpected argument: $1" >&2; usage >&2; exit 1 ;;
  esac
done

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

if [[ ! -d "$CLAUDE_DIR" ]]; then
  echo "Nothing to do: $CLAUDE_DIR does not exist."
  exit 0
fi

# resolve.py — prefer the installed copy (removed below); fall back to the repo copy.
RESOLVE="$CLAUDE_DIR/hooks/resolve.py"
[[ -f "$RESOLVE" ]] || RESOLVE="$REPO_ROOT/scripts/resolve.py"
SETTINGS_LOCAL="$CLAUDE_DIR/settings.local.json"

# Build the removal list: only library skills present on disk, plus the machinery.
LIB_SKILLS=()
for s in $(ls "$SKILLS_DIR"); do
  [[ -d "$DEST/$s" ]] && LIB_SKILLS+=("$s")
done

TARGETS=()
for s in "${LIB_SKILLS[@]}"; do TARGETS+=("$DEST/$s"); done
for f in \
  "$DEST/.roles.json" "$DEST/.catalog.json" "$DEST/.active-role" \
  "$CLAUDE_DIR/hooks/resolve.py" "$CLAUDE_DIR/hooks/session-start.sh" \
  "$CLAUDE_DIR/commands/role.md"; do
  [[ -e "$f" ]] && TARGETS+=("$f")
done

if [[ ${#TARGETS[@]} -eq 0 ]]; then
  echo "Nothing to remove under $CLAUDE_DIR (no swe-workflow-skills install found)."
  exit 0
fi

echo "Will remove from $CLAUDE_DIR:"
printf '  %s\n' "${TARGETS[@]}"
echo "  (and prune swe-workflow skillOverrides from $SETTINGS_LOCAL)"

if $DRY_RUN; then
  echo ""
  echo "Dry run: nothing changed."
  exit 0
fi

if ! $ASSUME_YES; then
  printf 'Proceed? [y/N] '
  read -r reply
  case "$reply" in [yY]|[yY][eE][sS]) ;; *) echo "Aborted."; exit 0 ;; esac
fi

# Prune settings.local.json BEFORE deleting resolve.py (we may be using the installed copy).
if [[ ${#LIB_SKILLS[@]} -gt 0 && -f "$RESOLVE" ]] && command -v python3 >/dev/null 2>&1; then
  python3 "$RESOLVE" prune "$SETTINGS_LOCAL" "${LIB_SKILLS[@]}" || \
    echo "Warning: could not prune $SETTINGS_LOCAL (remove swe-workflow skillOverrides by hand)." >&2
fi

for t in "${TARGETS[@]}"; do
  rm -rf "$t"
  echo "Removed: $t"
done

# Tidy now-empty machinery dirs (ignore failures: the user may keep other content).
for d in "$DEST" "$CLAUDE_DIR/hooks" "$CLAUDE_DIR/commands"; do
  [[ -d "$d" ]] && rmdir "$d" 2>/dev/null && echo "Removed empty dir: $d" || true
done

echo ""
echo "Done. If you enabled the SessionStart hook, remove this block from"
echo "$CLAUDE_DIR/settings.json by hand (this tool never edits settings.json):"
echo ""
cat <<'EOF'
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          { "type": "command", "command": ".../hooks/session-start.sh" }
        ]
      }
    ]
  }
EOF
