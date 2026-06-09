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
  tdd-workflow
  technical-debt-review
  test-data-strategy
  test-suite-design
  ui-ux-design
)

usage() {
  cat <<EOF
Usage: $(basename "$0") [options] [skill1 skill2 ...]

Install Claude Code skills from this repo.

Options:
  -g, --global    Install to ~/.claude/skills/ (default: ./.claude/skills/)
  -a, --all       Install all skills (default: frequent skills only)
  -l, --list      List available skills
  -h, --help      Show this help

Arguments:
  skill names     Install specific skills (overrides --all / default set)

Examples:
  $(basename "$0")                          # install frequent skills to current project
  $(basename "$0") --global                 # install frequent skills globally
  $(basename "$0") --all --global           # install all skills globally
  $(basename "$0") feature-planning         # install one skill
  $(basename "$0") -g code-reviewing prd-writing
EOF
}

GLOBAL=false
ALL=false
SELECTED=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -g|--global) GLOBAL=true; shift ;;
    -a|--all) ALL=true; shift ;;
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

if $GLOBAL; then
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

[[ $errors -eq 0 ]] || exit 1
