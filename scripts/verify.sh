#!/usr/bin/env bash
# End-to-end verification for name-only-baseline + orchestrator activation.
# Runs offline (no API key). Exits non-zero on the first failure.
#
#   scripts/verify.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

pass() { printf '  ok: %s\n' "$1"; }
fail() { printf '  FAIL: %s\n' "$1" >&2; exit 1; }

echo "1. roles.json integrity"
python3 scripts/resolve.py validate skills >/dev/null || fail "resolve.py validate"
pass "every referenced skill exists; no orphans"

echo "2. generator + catalog + JSON validity"
node scripts/build-plugins.mjs >/dev/null || fail "build-plugins.mjs"
while IFS= read -r f; do
  python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$f" || fail "invalid JSON: $f"
done < <(find plugins .claude-plugin -name '*.json'; echo catalog.json)
python3 - <<'PY' || fail "catalog completeness"
import json, os
cat = {s["name"] for s in json.load(open("catalog.json"))["skills"]}
disk = {e for e in os.listdir("skills") if os.path.isdir(os.path.join("skills", e))}
assert cat == disk, f"catalog != skills on disk: {cat ^ disk}"
assert all(s["description"] for s in json.load(open("catalog.json"))["skills"]), "empty description"
PY
pass "marketplace + catalog.json valid; catalog covers every skill"

echo "3. override computation"
python3 - <<'PY' || fail "overrides policy"
import json, subprocess, os
skills = "\n".join(e for e in os.listdir("skills") if os.path.isdir("skills/"+e))
def ov(*a):
    return json.loads(subprocess.run(["python3","scripts/resolve.py","overrides",*a],
        input=skills, capture_output=True, text=True).stdout)
base = ov()                       # baseline: only pinned on
assert "skill-router" not in base and "tdd-workflow" not in base, "pinned must stay on"
assert base.get("api-design") == "name-only"
pm = ov("pm")                     # pm: pm set + pinned on
assert "prd-writing" not in pm, "in-role skill must be on"
assert pm.get("api-design") == "name-only"
PY
pass "baseline crops all non-pinned; role promotes its set"

echo "4. apply merges into settings, preserving keys"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/skills"; for s in $(ls skills); do mkdir -p "$TMP/skills/$s"; done
printf '{"model":"opus","skillOverrides":{"external":"off"}}' > "$TMP/s.json"
python3 scripts/resolve.py apply "$TMP/s.json" "$TMP/skills" pm >/dev/null || fail "apply"
python3 - "$TMP/s.json" <<'PY' || fail "apply result"
import json, sys
d = json.load(open(sys.argv[1]))
assert d["model"] == "opus", "preserve unrelated key"
assert d["skillOverrides"]["external"] == "off", "preserve unmanaged override"
assert "prd-writing" not in d["skillOverrides"], "pm skill should be on"
assert d["skillOverrides"]["api-design"] == "name-only"
PY
pass "settings merge preserves other keys + unmanaged overrides"

echo "5. install (default = all + machinery + hook + baseline applied)"
./install.sh --dir "$TMP/inst" >/dev/null 2>&1 || fail "install"
[[ $(find "$TMP/inst/skills" -maxdepth 1 -mindepth 1 -type d | wc -l) -eq 42 ]] || fail "expected 42 skills"
for f in skills/.roles.json skills/.catalog.json hooks/resolve.py hooks/session-start.sh commands/role.md; do
  [[ -f "$TMP/inst/$f" ]] || fail "missing $f (hook is now default)"
done
grep -q '@@' "$TMP/inst/commands/role.md" && fail "unsubstituted placeholders in role.md"
# Baseline applied at install time → crop-safe before the hook is even wired.
python3 - "$TMP/inst/settings.local.json" <<'PY' || fail "install did not apply baseline"
import json, os, sys
p = sys.argv[1]
assert os.path.isfile(p), "settings.local.json not written by install"
ov = json.load(open(p)).get("skillOverrides", {})
n = sum(1 for v in ov.values() if v == "name-only")
assert n == 36, f"expected 36 name-only at install, got {n}"
assert "skill-router" not in ov, "router must stay on"
PY
# --no-hook: baseline still applied, but no hook script installed.
./install.sh --no-hook --dir "$TMP/nohook" >/dev/null 2>&1 || fail "install --no-hook"
[[ ! -f "$TMP/nohook/hooks/session-start.sh" ]] || fail "--no-hook should not install the hook"
python3 -c "import json;ov=json.load(open('$TMP/nohook/settings.local.json')).get('skillOverrides',{});assert sum(1 for v in ov.values() if v=='name-only')==36" \
  || fail "--no-hook must still apply the baseline"
pass "default installs hook + applies 36 name-only baseline; --no-hook keeps baseline, skips hook"

echo "6. SessionStart hook writes baseline + reloadSkills (preserving keys)"
printf '{"model":"x"}' > "$TMP/inst/settings.local.json"
OUT="$("$TMP/inst/hooks/session-start.sh" </dev/null)" || fail "hook run"
echo "$OUT" | python3 -c "import sys,json;d=json.load(sys.stdin)['hookSpecificOutput'];assert d['reloadSkills'] is True;assert d['additionalContext']" || fail "hook JSON"
python3 - "$TMP/inst/settings.local.json" <<'PY' || fail "hook baseline"
import json, sys
d = json.load(open(sys.argv[1]))
assert d["model"] == "x", "hook must preserve other settings keys"
n = sum(1 for v in d["skillOverrides"].values() if v == "name-only")
assert n == 36, f"expected 36 name-only at baseline, got {n}"
assert "skill-router" not in d["skillOverrides"], "router stays on"
PY
pass "hook writes 36 name-only baseline, reloadSkills, valid JSON, preserves keys"

echo "7. /role command flow (set + reset)"
runrole() { sed -n '/```bash/,/```/p' "$TMP/inst/commands/role.md" | sed "1d;\$d; s/\$ARGUMENTS/$1/" | bash >/dev/null 2>&1; }
runrole pm || fail "/role pm"
[[ "$(cat "$TMP/inst/skills/.active-role")" == "pm" ]] || fail ".active-role not set"
python3 -c "import json;ov=json.load(open('$TMP/inst/settings.local.json'))['skillOverrides'];assert 'prd-writing' not in ov" || fail "pm not promoted"
runrole none || fail "/role none"
[[ ! -f "$TMP/inst/skills/.active-role" ]] || fail ".active-role not cleared"
pass "/role sets role + promotes set; /role none resets to baseline"

echo "8. resolve.py prune removes managed keys, preserves the rest"
printf '{"model":"x","skillOverrides":{"api-design":"name-only","external":"off"}}' > "$TMP/p.json"
python3 scripts/resolve.py prune "$TMP/p.json" api-design >/dev/null || fail "prune"
python3 - "$TMP/p.json" <<'PY' || fail "prune result"
import json, sys
d = json.load(open(sys.argv[1]))
assert d["model"] == "x", "preserve unrelated key"
assert d["skillOverrides"] == {"external": "off"}, d.get("skillOverrides")
PY
printf '{"skillOverrides":{"api-design":"name-only"}}' > "$TMP/p2.json"
python3 scripts/resolve.py prune "$TMP/p2.json" api-design >/dev/null || fail "prune empty"
python3 -c "import json;d=json.load(open('$TMP/p2.json'));assert 'skillOverrides' not in d" \
  || fail "prune should drop empty skillOverrides"
pass "prune removes managed keys, keeps unmanaged, drops empty skillOverrides"

echo "9. install --prune narrows to the selection (keeps user skills)"
./install.sh --dir "$TMP/narrow" >/dev/null 2>&1 || fail "install all"
mkdir -p "$TMP/narrow/skills/zz-user-skill"   # a custom skill the user added
./install.sh --role pm --prune --dir "$TMP/narrow" >/dev/null 2>&1 || fail "install --prune"
[[ -d "$TMP/narrow/skills/prd-writing" ]] || fail "pm skill missing after prune"
[[ ! -d "$TMP/narrow/skills/containerization" ]] || fail "non-pm skill should be pruned"
[[ -d "$TMP/narrow/skills/zz-user-skill" ]] || fail "user skill must be preserved"
pass "--prune removes non-selected library skills, preserves user skills"

echo "10. uninstall removes our files, prunes local settings, preserves user skill + settings.json"
./install.sh --hook --dir "$TMP/un" >/dev/null 2>&1 || fail "install for uninstall"
mkdir -p "$TMP/un/skills/zz-user-skill"
printf '{"model":"x","skillOverrides":{"api-design":"name-only","external":"off"}}' > "$TMP/un/settings.local.json"
printf '{"hooks":{"SessionStart":[]}}' > "$TMP/un/settings.json"
./uninstall.sh --yes --dir "$TMP/un" >/dev/null 2>&1 || fail "uninstall"
for gone in skills/api-design skills/.roles.json skills/.catalog.json \
            hooks/resolve.py hooks/session-start.sh commands/role.md; do
  [[ ! -e "$TMP/un/$gone" ]] || fail "uninstall left $gone"
done
[[ -d "$TMP/un/skills/zz-user-skill" ]] || fail "user skill must be preserved"
[[ -f "$TMP/un/settings.json" ]] || fail "settings.json must be untouched"
python3 - "$TMP/un/settings.local.json" <<'PY' || fail "settings.local prune"
import json, sys
d = json.load(open(sys.argv[1]))
assert d["model"] == "x", "preserve unrelated key"
assert "api-design" not in d.get("skillOverrides", {}), "library override should be pruned"
assert d.get("skillOverrides", {}).get("external") == "off", "unmanaged override preserved"
PY
pass "uninstall removes library files, prunes local overrides, keeps user skill + settings.json"

echo "11. --global honors CLAUDE_CONFIG_DIR"
CLAUDE_CONFIG_DIR="$TMP/cfg" ./install.sh --global >/dev/null 2>&1 || fail "install --global w/ CLAUDE_CONFIG_DIR"
[[ $(find "$TMP/cfg/skills" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l) -ge 1 ]] \
  || fail "--global did not install under CLAUDE_CONFIG_DIR"
pass "--global installs under CLAUDE_CONFIG_DIR when set"

echo ""
echo "ALL CHECKS PASSED"
