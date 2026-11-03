#!/usr/bin/env bash
# QA-181 both ways, in throwaway repositories (no network, no real build, US$0):
#   1. lane.sh bind <lane> continues the lane's branch only when it is related to main, not yet in it, and fresh; a merged,
#      unrelated or stale (older than 24 h) branch leaves the copy on origin/main. A shallow clone is deepened first.
#   2. studio/tools/web-fresh.sh ensure rebuilds web/dist whenever it was not built from this copy's web/, contracts/,
#      engine/ (including a bundle built today from an old branch) and fails when the build fails; isolated.sh uses it.
#   bash product/tools/check-lane-bind.sh
set -u
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT" || exit 2
P=ai-workers/problem-1-pathway-setup-and-form-filling; LANE="$ROOT/$P/product/tools/lane.sh"; FRESH="$ROOT/$P/prototype/studio/tools/web-fresh.sh"
pass=0; fail=0
ok() { if [ "$2" = 1 ]; then pass=$((pass + 1)); echo "PASS  $1"; else fail=$((fail + 1)); echo "FAIL  $1 — $3"; fi; }
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
export GIT_AUTHOR_NAME=check GIT_AUTHOR_EMAIL=check@example.invalid GIT_COMMITTER_NAME=check GIT_COMMITTER_EMAIL=check@example.invalid
g() { git -C "$1" "${@:2}"; }
old=$(( $(date +%s) - 3 * 86400 ))

# ---- 1. bind: one origin with main and four qa branches; each case keeps one of them on its own origin copy
o="$T/seed"; git init -q -b main "$o"; mkdir -p "$o/$P/product/tools"; cp "$LANE" "$o/$P/product/tools/lane.sh"
g "$o" add -A && g "$o" commit -q -m base
g "$o" checkout -q -b claude/qa-merged && echo m > "$o/m" && g "$o" add -A && g "$o" commit -q -m merged-work
g "$o" checkout -q main && g "$o" merge -q --no-ff -m "merge qa-merged" claude/qa-merged
g "$o" checkout -q -b claude/qa-old && echo o > "$o/o" && g "$o" add -A && GIT_COMMITTER_DATE="@$old" GIT_AUTHOR_DATE="@$old" g "$o" commit -q -m old-work
g "$o" checkout -q main && g "$o" checkout -q -b claude/qa-fresh && echo f > "$o/f" && g "$o" add -A && g "$o" commit -q -m fresh-work
g "$o" checkout -q --orphan claude/qa-unrelated && g "$o" rm -rq --cached . && echo u > "$o/u" && g "$o" add u && g "$o" commit -q -m unrelated
g "$o" checkout -q -f main
# Main moves on after the forks (so a depth-1 clone cannot see any fork point).
for i in 1 2 3; do echo "$i" > "$o/main$i" && g "$o" add -A && g "$o" commit -q -m "main $i"; done
case_() {  # $1 case name, $2 the one qa branch origin keeps, $3 depth ("" = full); prints "<HEAD>|<branch>|<bind output>"
  local org="$T/origin-$1.git" c="$T/clone-$1"
  git clone -q --bare "$o" "$org"; for b in claude/qa-merged claude/qa-old claude/qa-fresh claude/qa-unrelated; do [ "$b" = "$2" ] || g "$org" branch -q -D "$b"; done
  git clone -q ${3:+--depth "$3"} --no-single-branch "file://$org" "$c" 2>/dev/null; g "$c" checkout -q -b claude/session-x
  out=$(cd "$c" && CLAUDE_CODE_REMOTE=true bash "$c/$P/product/tools/lane.sh" bind qa 2>&1 | tr '\n' ' ')
  echo "$(g "$c" rev-parse HEAD)|$(g "$c" branch --show-current)|$out"
}
main=$(g "$o" rev-parse main)
r=$(case_ merged claude/qa-merged); ok "a lane branch already in main: the copy stays on origin/main" "$([ "${r%%|*}" = "$main" ] && [[ "$r" == *"already in main"* ]] && echo 1)" "$r"
r=$(case_ unrelated claude/qa-unrelated); ok "a lane branch with no history in common with main: origin/main" "$([ "${r%%|*}" = "$main" ] && [[ "$r" == *"unrelated"* ]] && echo 1)" "$r"
r=$(case_ old claude/qa-old); ok "a lane branch last touched 3 days ago (QA-181's case): origin/main" "$([ "${r%%|*}" = "$main" ] && [[ "$r" == *"older than 24 h"* ]] && echo 1)" "$r"
r=$(case_ fresh claude/qa-fresh); ok "a fresh lane branch with work not in main: continued" "$([ "${r%%|*}" = "$(g "$o" rev-parse claude/qa-fresh)" ] && [[ "$r" == *"|claude/qa-fresh|"* ]] && echo 1)" "$r"
r=$(case_ shallow claude/qa-fresh 1); ok "a shallow clone (depth 1) is deepened, so a fresh related branch is still continued, not called unrelated" "$([ "${r%%|*}" = "$(g "$o" rev-parse claude/qa-fresh)" ] && echo 1)" "$r"
r=$(case_ shallowold claude/qa-old 1); ok "a shallow clone with a stale branch: origin/main, for the right reason (stale, not unrelated)" "$([ "${r%%|*}" = "$main" ] && [[ "$r" == *"older than 24 h"* ]] && echo 1)" "$r"
ok "the copy keeps its own branch name when it moves to origin/main" "$(case_ name claude/qa-old | cut -d'|' -f2 | grep -qx claude/session-x && echo 1)" "branch changed"

# ---- 2. web/dist freshness: a fake studio whose vite only counts builds (and empties dist, as vite does)
s="$T/repo/a/b/c/prototype/studio"; mkdir -p "$s/tools" "$s/web/src" "$s/contracts" "$s/engine" "$s/node_modules/.bin"
cp "$FRESH" "$s/tools/web-fresh.sh"; git init -q -b main "$T/repo"
printf 'node_modules/\n**/web/dist/\n**/studio/var/\n' > "$T/repo/.gitignore"
echo "export const a = 1;" > "$s/web/src/a.tsx"; echo "export const c = 1;" > "$s/contracts/c.ts"; echo "export const e = 1;" > "$s/engine/e.ts"; echo '{}' > "$s/package-lock.json"
cat > "$s/node_modules/.bin/vite" <<'EOF'
#!/bin/bash
[ "${VITE_FAIL:-0}" = 1 ] && exit 1
rm -rf dist && mkdir dist && echo built > dist/index.html && echo build >> ../builds.log
EOF
chmod +x "$s/node_modules/.bin/vite"; g "$T/repo" add -A && g "$T/repo" commit -q -m v1
n() { [ -f "$s/builds.log" ] && grep -c . "$s/builds.log" || echo 0; }
ens() { bash "$s/tools/web-fresh.sh" ensure 2>/dev/null; }
ens; ok "no bundle: built and stamped" "$([ "$(n)" = 1 ] && [ -s "$s/web/dist/.source-stamp" ] && echo 1)" "builds $(n)"
ens; ok "bundle matches its sources: not rebuilt" "$([ "$(n)" = 1 ] && echo 1)" "builds $(n)"
echo "export const a = 2;" > "$s/web/src/a.tsx"; ens; ok "an uncommitted edit under web/src: rebuilt" "$([ "$(n)" = 2 ] && echo 1)" "builds $(n)"
g "$T/repo" commit -qam v2; ens; ok "the same content committed: not rebuilt" "$([ "$(n)" = 2 ] && echo 1)" "builds $(n)"
echo "export const c = 2;" > "$s/contracts/c.ts"; g "$T/repo" commit -qam v3; ens; ok "a contracts change (the web imports contracts/): rebuilt" "$([ "$(n)" = 3 ] && echo 1)" "builds $(n)"
g "$T/repo" checkout -q HEAD~2; ens; g "$T/repo" checkout -q main
before=$(n); ens; ok "QA-181: a bundle built today from an old commit is rebuilt on main (a time check would keep it)" "$([ "$(n)" = $((before + 1)) ] && echo 1)" "builds $(n)"
(cd "$s/web" && ../node_modules/.bin/vite build >/dev/null); before=$(n); ens; ok "a bundle built without a stamp (another builder): rebuilt" "$([ "$(n)" = $((before + 1)) ] && echo 1)" "builds $(n)"
echo "export const b = 1;" > "$s/web/src/new.tsx"; before=$(n); ens; ok "a new untracked file under web/src: rebuilt" "$([ "$(n)" = $((before + 1)) ] && echo 1)" "builds $(n)"
echo "export const a = 3;" > "$s/web/src/a.tsx"; VITE_FAIL=1 bash "$s/tools/web-fresh.sh" ensure >/dev/null 2>&1; code=$?
ok "a failing build: ensure exits 1 (isolated.sh then refuses to start)" "$([ "$code" = 1 ] && echo 1)" "exit $code"
iso="$ROOT/$P/prototype/studio/tools/isolated.sh"
ok "isolated.sh runs web-fresh.sh ensure before it starts the server, and stops when it fails" "$(awk '/web-fresh.sh" ensure/{e=NR} /nohup .*main\.ts/{m=NR} END{exit !(e && m && e < m)}' "$iso" && grep -q 'web-fresh.sh" ensure || { echo "refused' "$iso" && echo 1)" "see $iso"
echo "$pass passed, $fail failed"; [ "$fail" = 0 ]
