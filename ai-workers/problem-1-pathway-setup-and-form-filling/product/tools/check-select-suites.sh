#!/usr/bin/env bash
# The suite selection and the change kinds CI acts on (I1, 3 Nov): select-suites.mjs picks what a change can affect,
# change-kind.sh tells notes, records and code apart. Fixed file lists in, the chosen suites out. Runs no suite, US$0.
#   bash product/tools/check-select-suites.sh
set -u
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT" || exit 2
Q=ai-workers/problem-1-pathway-setup-and-form-filling; S="$Q/prototype/studio"; T="$Q/product/tools"
pass=0; fail=0
ok() { if [ "$2" = 1 ]; then pass=$((pass + 1)); echo "PASS  $1"; else fail=$((fail + 1)); echo "FAIL  $1 — $3"; fi; }
sel() { printf '%s\n' "$@" | node "$T/select-suites.mjs"; }
dsel() { printf '%s\n' "$@" | node "$T/select-suites.mjs" --direct; }
kind() { printf '%s\n' "$@" | bash "$T/change-kind.sh" --files; }
all() { [ "$(printf '%s\n' "$1" | head -1 | cut -f1)" = ALL ]; }
only_smoke() { printf '%s\n' "$1" | awk -F'\t' '$2 != "smoke" { bad = 1 } END { exit bad }'; }
has() { printf '%s\n' "$1" | cut -f1 | grep -qx "$2"; }

# Shared files run everything; the dependencies I1 found missing run everything too.
o=$(sel "$S/engine/near.ts"); ok "an engine file runs everything" "$(all "$o" && echo 1)" "$(head -1 <<< "$o")"
o=$(sel "$Q/prototype/p2/prompts/who-can-be.v1.md"); ok "an AI prompt (.md the app reads) runs everything; before I1 it chose nothing" "$(all "$o" && echo 1)" "$(head -1 <<< "$o")"
o=$(sel "$Q/official-sources/ircc/manifest.json"); ok "official sources (the app reads the manifest) run everything" "$(all "$o" && echo 1)" "$(head -1 <<< "$o")"
o=$(sel "$T/run-suites.sh"); ok "run-suites.sh decides how suites run: everything" "$(all "$o" && echo 1)" "$(head -1 <<< "$o")"
o=$(sel .github/workflows/ci.yml); ok "ci.yml: everything" "$(all "$o" && echo 1)" "$(head -1 <<< "$o")"
# Files that cannot change a suite's result choose only the smoke set.
for f in "$Q/product/STATE.md" "$T/merge-guard.sh" .github/workflows/nightly.yml "$Q/official-sources/ircc/README.md" "$S/screens/x/notes.md"; do
  o=$(sel "$f"); ok "$f: only the smoke set" "$(only_smoke "$o" && echo 1)" "$(grep -v '	smoke$' <<< "$o" | head -2 | tr '\n' ' ')"
done
# A changed suite runs itself; the three runtime R1 suites run together; a page runs the browser suites that open it.
o=$(sel "$S/tests/check_queue_tx.ts"); ok "a changed suite runs itself" "$(has "$o" check_queue_tx.ts && echo 1)" "$(head -3 <<< "$o" | tr '\n' ' ')"
o=$(sel "$S/tests/runtime/check_runtime_r1d.ts"); ok "R1 suites run together" "$(has "$o" check_runtime_r1a.ts && has "$o" check_runtime_r1c.cjs && has "$o" check_runtime_r1d.ts && echo 1)" "$(cut -f1 <<< "$o" | tr '\n' ' ')"
o=$(sel "$S/web/src/pages/history.tsx"); ok "a page (/releases, /activity) runs its browser suites, not everything" "$(! all "$o" && has "$o" check_g3_demo_release_browser.cjs && has "$o" check_studio_browser.cjs && echo 1)" "$(cut -f1 <<< "$o" | tr '\n' ' ')"
o=$(sel "$S/web/src/pages/history.tsx"); n=$(grep -c . <<< "$o"); ok "that page chooses fewer than 30 suites ($n)" "$([ "$n" -lt 30 ] && echo 1)" "$n"
# --direct (PR_SUITES=direct): never everything, and still the suites that import or name the file.
o=$(dsel "$S/engine/near.ts" "$Q/prototype/p2/prompts/who-can-be.v1.md" "$T/run-suites.sh"); ok "--direct never runs everything" "$(! all "$o" && echo 1)" "$(head -1 <<< "$o")"
o=$(dsel "$T/run-suites.sh"); ok "--direct: run-suites.sh still runs the suites that name it" "$(! only_smoke "$o" && echo 1)" "$(head -2 <<< "$o" | tr '\n' ' ')"
o=$(dsel "$S/tests/check_queue_tx.ts"); ok "--direct: a changed suite still runs itself" "$(has "$o" check_queue_tx.ts && echo 1)" "$(head -2 <<< "$o" | tr '\n' ' ')"

# change-kind.sh: what CI runs for each kind of pull request.
k=$(kind "$Q/product/STATE.md" "$Q/product/reports/build-review-2026-11-03.html" "$S/screens/x/notes.md"); ok "records and reports only: notes" "$([ "$k" = notes ] && echo 1)" "$k"
k=$(kind "sources/drive-snapshot/x.md"); ok "an .md under sources/ is not notes (the push guard must run)" "$([ "$k" != notes ] && echo 1)" "$k"
k=$(kind "$Q/product/STATE.md" "$Q/prototype/p2/prompts/who-can-be.v1.md"); ok "a prompt .md is code" "$([ "$k" = code ] && echo 1)" "$k"
k=$(kind "$Q/product/qa/board.csv" "$T/merge-guard.sh" .mergify.yml); ok "boards, guards, the merge queue file: records (fast checks)" "$([ "$k" = records ] && echo 1)" "$k"
k=$(kind "$S/web/src/pages/history.tsx" "$Q/product/STATE.md"); ok "a page plus notes: code" "$([ "$k" = code ] && echo 1)" "$k"
k=$(kind "$Q/official-sources/ircc/manifest.json"); ok "official sources: code" "$([ "$k" = code ] && echo 1)" "$k"
k=$(kind "$T/change-kind.sh"); ok "this classifier itself: code" "$([ "$k" = code ] && echo 1)" "$k"
k=$(kind "$Q/product/STAND-INS.md"); ok "a record a suite reads as data (STAND-INS.md): code (I1 review)" "$([ "$k" = code ] && echo 1)" "$k"
o=$(sel "$Q/product/STAND-INS.md"); ok "STAND-INS.md chooses check_stand_ins.ts" "$(has "$o" check_stand_ins.ts && echo 1)" "$(grep -v '	smoke$' <<< "$o" | head -2 | tr '\n' ' ')"
o=$(sel "$Q/product/qa/CAPABILITIES.md"); ok "CAPABILITIES.md named only in suites' comments: only the smoke set" "$(only_smoke "$o" && echo 1)" "$(grep -v '	smoke$' <<< "$o" | head -2 | tr '\n' ' ')"
for f in "$Q/product/DECISIONS.md" "$Q/product/qa/CAPABILITIES.md"; do
  k=$(kind "$f"); ok "$(basename "$f") feeds graph.mjs --check: records, not notes (I1 review)" "$([ "$k" = records ] && echo 1)" "$k"
done
k=$(printf '' | bash "$T/change-kind.sh" --files); ok "no files changed: notes" "$([ "$k" = notes ] && echo 1)" "$k"
# The merge queues route by the same idea (B119, P-376 (1)): records-only PRs to "records", below m2 and m3. CI runs
# this file, so the queue check rides here and ci.yml (a shared file: every suite) stays as it is.
q=$(python3 -I "$T/check-queue-rules.py" 2>&1); qrc=$?
ok "merge queues (.mergify.yml, check-queue-rules.py): $(tail -1 <<< "$q")" "$([ $qrc = 0 ] && echo 1)" "$(grep -E '^FAIL' <<< "$q" | head -3 | tr '\n' ' ')"
echo "$pass passed, $fail failed"; [ "$fail" = 0 ]
