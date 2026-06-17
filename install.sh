#!/usr/bin/env bash
set -euo pipefail

SKILLS_DIR="$(cd "$(dirname "$0")/skills" 2>/dev/null && pwd)" || {
  echo "Error: must be run from the dev-workflow-skills repo root" >&2
  exit 1
}

FREQUENT_SKILLS=(
  api-design
  architecture-design
  architecture-documentation
  bug-investigating
  cicd-pipeline
  code-reviewing
  configuration-strategy
  containerization
  dependency-impact-analysis
  dependency-management
  deployment-checklist
  feature-planning
  git-workflow
  observability-design
  performance-optimization
  prd-writing
  project-documentation
  refactoring
  security-audit
  skill-router
  tdd-workflow
  technical-debt-review
  test-data-strategy
  test-suite-design
  ui-ux-design
  verification-before-completion
  writing-skills
)

usage() {
  cat <<EOF
Usage: $(basename "$0") [options] [skill1 skill2 ...]

Install Claude Code skills from this repo.

Options:
  -g, --global    Install to ~/.claude/skills/ (default: ./.claude/skills/)
  -d, --dir DIR   Install to DIR/skills/ — a custom Claude config directory
                  (mutually exclusive with --global; the hook, if requested,
                  goes to DIR/hooks/ and settings live at DIR/settings.json)
  -a, --all       Install all skills (default: frequent skills only)
  -k, --hook      Also install the opt-in SessionStart hook (prints the
                  settings.json snippet to enable it; never edits settings)
  -l, --list      List available skills
  -h, --help      Show this help

Arguments:
  skill names     Install specific skills (overrides --all / default set)

Examples:
  $(basename "$0")                          # install frequent skills to current project
  $(basename "$0") --global                 # install frequent skills globally
  $(basename "$0") --all --global           # install all skills globally
  $(basename "$0") --dir /etc/claude --all  # install all skills to /etc/claude/skills
  $(basename "$0") -d ~/work/.claude         # install frequent skills to a custom config dir
  $(basename "$0") feature-planning         # install one skill
  $(basename "$0") -g code-reviewing prd-writing
EOF
}

GLOBAL=false
ALL=false
HOOK=false
CONFIG_DIR=""
SELECTED=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -g|--global) GLOBAL=true; shift ;;
    -d|--dir)
      shift
      [[ $# -gt 0 ]] || { echo "Error: --dir requires a path" >&2; exit 1; }
      CONFIG_DIR="$1"; shift ;;
    --dir=*) CONFIG_DIR="${1#*=}"; shift ;;
    -a|--all) ALL=true; shift ;;
    -k|--hook) HOOK=true; shift ;;
    -l|--list)
      echo "Available skills:"
      ls "$SKILLS_DIR" | sed 's/^/  /'
      echo ""
      echo "Frequent skills (default):"
      printf '  %s\n' "${FREQUENT_SKILLS[@]}"
      exit 0
      ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
    *) SELECTED+=("$1"); shift ;;
  esac
done

if [[ -n "$CONFIG_DIR" ]]; then
  if $GLOBAL; then
    echo "Error: --dir and --global are mutually exclusive" >&2
    exit 1
  fi
  # Expand a leading ~ (survives even when the path was quoted).
  case "$CONFIG_DIR" in "~" | "~/"*) CONFIG_DIR="${HOME}${CONFIG_DIR#\~}" ;; esac
  DEST="$CONFIG_DIR/skills"
elif $GLOBAL; then
  DEST="$HOME/.claude/skills"
else
  DEST="$(pwd)/.claude/skills"
fi

mkdir -p "$DEST"

if [[ ${#SELECTED[@]} -eq 0 ]]; then
  if $ALL; then
    mapfile -t SELECTED < <(ls "$SKILLS_DIR")
  else
    SELECTED=("${FREQUENT_SKILLS[@]}")
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
  cp -r "$src" "$DEST/"
  echo "Installed: $skill -> $DEST/$skill"
done

if $HOOK; then
  REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
  HOOK_SRC="$REPO_ROOT/hooks/session-start.sh"
  if [[ ! -f "$HOOK_SRC" ]]; then
    echo "Error: hook script not found at $HOOK_SRC" >&2
    errors=$((errors + 1))
  else
    CLAUDE_DIR="$(dirname "$DEST")"
    HOOK_DEST_DIR="$CLAUDE_DIR/hooks"
    mkdir -p "$HOOK_DEST_DIR"
    cp "$HOOK_SRC" "$HOOK_DEST_DIR/session-start.sh"
    chmod +x "$HOOK_DEST_DIR/session-start.sh"
    HOOK_PATH="$HOOK_DEST_DIR/session-start.sh"
    SETTINGS="$CLAUDE_DIR/settings.json"
    echo "Installed hook script -> $HOOK_PATH"
    echo ""
    echo "To enable it, merge this into $SETTINGS (the installer does NOT edit settings for you):"
    echo ""
    cat <<EOF
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|clear|compact",
        "hooks": [
          { "type": "command", "command": "$HOOK_PATH" }
        ]
      }
    ]
  }
EOF
    echo ""
    echo "Then start a new session and run /doctor to confirm it's registered."
  fi
fi

[[ $errors -eq 0 ]] || exit 1
