#!/usr/bin/env bash
# P-214 fix (7 Nov; #1145 round 1 Major 1, #1202): no PR-controlled code runs with pull-requests: write or issues: write.
#   1. write-token.py on this tree's workflows passes;
#   2. it fails on each made-up workflow that lets the PR's code meet a write token (main's job "kind" before this fix
#      among them) and passes on the safe shapes (retry-comment's base checkout, records-label.yml's data-only fetch);
#   3. records-label.sh (run by records-label.yml) labels a records-only change and unlabels a code change, on real
#      merged PRs of main, with GitHub answered by a stand-in gh (calls written to a log). US$0, no network.
#   bash product/tools/check-write-token.sh
set -u
. "$(dirname "$0")/guard-test-lib.sh"
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT" || exit 2
PY="$TOOLS/write-token.py"
W=$(mktemp -d "${TMPDIR:-/tmp}/wtok.XXXXXXXX") && [ -d "$W" ] || { echo "no temp dir: nothing was checked"; exit 2; }; trap 'rm -rf "$W"' EXIT

out=$(python3 "$PY" 2>&1); rc=$?
ok "this tree's workflows: no PR-controlled code with a write token" "$([ $rc = 0 ] && echo 1 || echo 0)" "$out"

# case <want: fail|pass> <rule or -> <name>   (the workflow on stdin)
case_() { local want="$1" rule="$2" name="$3" d="$W/c$RANDOM$RANDOM"; mkdir -p "$d"; cat > "$d/w.yml"
  local o r; o=$(python3 "$PY" --dir "$d" 2>&1); r=$?
  if [ "$want" = fail ]; then ok "fails: $name" "$([ $r = 1 ] && printf '%s' "$o" | grep -q "^FAIL  $rule " && echo 1 || echo 0)" "rc $r: $o"
  else ok "passes: $name" "$([ $r = 0 ] && echo 1 || echo 0)" "rc $r: $o"; fi; }

case_ fail W1 "main's job kind before this fix (write token, the PR's checkout, the PR's scripts)" <<'EOF'
on: { pull_request: { types: [opened] } }
jobs:
  kind:
    runs-on: ubuntu-latest
    permissions: { contents: read, actions: read, pull-requests: write, issues: write }
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0, filter: "blob:none" }
      - run: bash "$P/tools/change-kind.sh" "$range"
EOF
case_ pass - "main's job kind after this fix (read-only)" <<'EOF'
on: { pull_request: { types: [opened] } }
jobs:
  kind:
    runs-on: ubuntu-latest
    permissions: { contents: read, actions: read }
    steps:
      - uses: actions/checkout@v4
      - run: bash "$P/tools/change-kind.sh" "$range"
EOF
case_ fail W1 "issues: write alone, the PR checked out" <<'EOF'
on: pull_request
jobs:
  j: { runs-on: x, permissions: { issues: write }, steps: [ { uses: actions/checkout@v4 }, { run: make } ] }
EOF
case_ fail W1 "write-all for the workflow, a job with no permissions of its own" <<'EOF'
on: [pull_request]
permissions: write-all
jobs:
  j: { runs-on: x, steps: [ { uses: actions/checkout@v4 } ] }
EOF
case_ fail W1 "no permissions anywhere (GitHub's default may be write)" <<'EOF'
on: pull_request
jobs:
  j: { runs-on: x, steps: [ { uses: actions/checkout@v4, with: { ref: "${{ github.event.pull_request.head.sha }}" } } ] }
EOF
case_ fail W2 "the base commit checked out, but the token kept in .git/config" <<'EOF'
on: pull_request
jobs:
  j: { runs-on: x, permissions: { pull-requests: write }, steps: [ { uses: actions/checkout@v4, with: { ref: "${{ github.event.pull_request.base.sha }}", path: base } } ] }
EOF
case_ fail W3 "the base commit checked out, but the workspace's (PR's) copy of a tool run" <<'EOF'
on: pull_request
jobs:
  j:
    runs-on: x
    permissions: { pull-requests: write }
    steps:
      - uses: actions/checkout@v4
        with: { ref: "${{ github.event.pull_request.base.sha }}", path: base, persist-credentials: false }
      - run: node ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/flaky.mjs comment
EOF
case_ fail W4 "a local action (the PR's code) in a write job" <<'EOF'
on: pull_request
jobs:
  j: { runs-on: x, permissions: { pull-requests: write }, steps: [ { uses: ./.github/actions/label } ] }
EOF
case_ fail W5 "a write job runs a file the PR's jobs left in an artifact" <<'EOF'
on: pull_request
jobs:
  j:
    runs-on: x
    permissions: { pull-requests: write }
    steps:
      - uses: actions/download-artifact@v4
        with: { pattern: "suite-retries-*", path: retries }
      - run: bash retries/suite-retries-1/post.sh
EOF
case_ pass - "retry-comment's shape (base commit, own path, no kept token, artifacts only read)" <<'EOF'
on: pull_request
jobs:
  retry-comment:
    runs-on: x
    permissions: { contents: read, pull-requests: write }
    steps:
      - uses: actions/download-artifact@v4
        with: { pattern: "suite-retries-*", path: retries }
      - run: for x in retries/*/retry-bugs.md; do cat "$x"; done > retry-bugs.md
      - uses: actions/checkout@v4
        with: { ref: "${{ github.event.pull_request.base.sha }}", path: base, persist-credentials: false }
      - run: node base/ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/flaky.mjs comment --body retry-bugs.md
EOF
case_ fail T1 "pull_request_target checking out the PR's head" <<'EOF'
on: { pull_request_target: { branches: [main] } }
jobs:
  j: { runs-on: x, permissions: { pull-requests: write }, steps: [ { uses: actions/checkout@v4, with: { ref: "${{ github.event.pull_request.head.sha }}" } } ] }
EOF
case_ fail T1 "pull_request_target checking out refs/pull/N/merge" <<'EOF'
on: pull_request_target
jobs:
  j: { runs-on: x, permissions: { issues: write }, steps: [ { uses: actions/checkout@v4, with: { ref: "refs/pull/${{ github.event.number }}/merge" } } ] }
EOF
case_ fail T2 "pull_request_target switching to the fetched PR commits" <<'EOF'
on: pull_request_target
jobs:
  j:
    runs-on: x
    permissions: { pull-requests: write }
    steps:
      - uses: actions/checkout@v4
      - run: |
          git fetch origin "+refs/pull/1/head:refs/remotes/pr/head"
          git checkout pr/head
EOF
case_ fail T2 "workflow_run running a script from the fetched PR commits" <<'EOF'
on: { workflow_run: { workflows: [ci], types: [completed] } }
jobs:
  j: { runs-on: x, permissions: { pull-requests: write }, steps: [ { run: "git worktree add w pr/head && bash w/x.sh; node pr/x.mjs" } ] }
EOF
case_ pass - "records-label.yml's shape (main's commit, PR fetched as data, names only)" < "$ROOT/.github/workflows/records-label.yml"

# 3. records-label.sh with a stand-in gh, on real merged PRs of main (merge commits: ^1 the base, ^2 the PR's head).
mkdir -p "$W/bin"
cat > "$W/bin/gh" <<'EOF'
#!/usr/bin/env bash
echo "$*" >> "$GH_LOG"
case "$*" in *"-X DELETE"*) [ "${GH_DELETE:-200}" = 404 ] && { echo "gh: Label does not exist (HTTP 404)" >&2; exit 1; }
  [ "${GH_DELETE:-200}" = 500 ] && { echo "gh: Server Error (HTTP 500)" >&2; exit 1; };; esac
case "$*" in *"-X POST"*) [ "${GH_POST:-200}" = 403 ] && { echo "gh: Resource not accessible by integration (HTTP 403)" >&2; exit 1; };; esac
exit 0
EOF
chmod +x "$W/bin/gh"
# #1216 (qa records: BUGS.md, CAPABILITIES.md, history) and #1198 (A3, app code): merge commits on main.
REC=$(git rev-parse -q --verify "2f375b7a^{commit}" 2>/dev/null)
CODE=$(git rev-parse -q --verify "9dc77d1a^{commit}" 2>/dev/null)
if [ -z "$REC" ] || [ -z "$CODE" ]; then ok "the two merged PRs are in this clone's history" 0 "fetch main with full history"; finish; fi
lab() { : > "$W/log"; PATH="$W/bin:$PATH" GH_LOG="$W/log" REPO=o/r PR=7 BASE="$1^1" HEAD_SHA="$(git rev-parse "$1^2")" GH_DELETE="${2:-200}" GH_POST="${3:-200}" \
  bash "$TOOLS/records-label.sh" > "$W/out" 2>&1; echo $?; }
r=$(lab "$REC"); ok "a records-only PR (#1216) gets the records label" "$([ "$r" = 0 ] && grep -qx 'api -X POST repos/o/r/issues/7/labels -f labels\[\]=records' "$W/log" && echo 1 || echo 0)" "rc $r: $(cat "$W/out" "$W/log")"
r=$(lab "$CODE"); ok "a code PR (#1198) has the records label taken off" "$([ "$r" = 0 ] && grep -qx 'api -X DELETE repos/o/r/issues/7/labels/records' "$W/log" && ! grep -q POST "$W/log" && echo 1 || echo 0)" "rc $r: $(cat "$W/out" "$W/log")"
r=$(lab "$CODE" 404); ok "a code PR without the label: 404 is fine, exit 0" "$([ "$r" = 0 ] && grep -q 'no records label' "$W/out" && echo 1 || echo 0)" "rc $r: $(cat "$W/out")"
r=$(lab "$CODE" 500); ok "GitHub refuses the removal: the step goes red" "$([ "$r" = 1 ] && echo 1 || echo 0)" "rc $r: $(cat "$W/out")"
r=$(lab "$REC" 200 403); ok "GitHub refuses the label: the step goes red" "$([ "$r" = 1 ] && echo 1 || echo 0)" "rc $r: $(cat "$W/out")"
: > "$W/log"; PATH="$W/bin:$PATH" GH_LOG="$W/log" REPO=o/r PR=7 BASE="$REC^1" HEAD_SHA=0123456789abcdef0123456789abcdef01234567 bash "$TOOLS/records-label.sh" > "$W/out" 2>&1; r=$?
ok "a head not fetched: no label judged, the step goes red" "$([ "$r" = 1 ] && [ ! -s "$W/log" ] && echo 1 || echo 0)" "rc $r: $(cat "$W/out")"
finish
