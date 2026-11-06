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

# What still runs everything (B121 kept these: they shape every copy or every run).
for f in "$S/prisma/schema.prisma" "$S/prisma/migrations/x/migration.sql" "$S/api/src/main.ts" "$S/tools/isolated.sh" "$S/start.sh" "$Q/prototype/env/requirements-linux.lock"; do
  o=$(sel "$f"); ok "${f#$Q/}: everything" "$(all "$o" && echo 1)" "$(head -1 <<< "$o")"
done
# B121 (P-376 (4)): engine/, contracts/, prototype/p1, p2, p5, samples/, acceptance/, test helpers and studio/tools/ go
# through the reference graph: the suites that use them, not everything (before B121 each of these ran everything).
o=$(sel "$S/engine/where-used.ts"); ok "an engine file runs the suites that use it (check_sh2_where_used.ts), not everything" "$(! all "$o" && has "$o" check_sh2_where_used.ts && echo 1)" "$(head -1 <<< "$o")"
o=$(sel "$Q/prototype/p2/prompts/who-can-be.v1.md"); ok "an AI prompt (.md the app reads) runs the suites that use it (check_ai_drafting.ts); before I1 it chose nothing" "$(! all "$o" && has "$o" check_ai_drafting.ts && ! only_smoke "$o" && echo 1)" "$(head -1 <<< "$o")"
o=$(sel "$Q/prototype/p1/xfa_texts.py"); n=$(grep -c . <<< "$o"); ok "prototype/p1/xfa_texts.py runs the suites that name or reach it ($n), not everything" "$(! all "$o" && has "$o" check_b78_section_names.ts && [ "$n" -lt 100 ] && echo 1)" "$(head -1 <<< "$o")"
o=$(sel "$S/acceptance/C5.1.test.ts"); n=$(grep -c . <<< "$o"); ok "an acceptance pack (gate B and the queue run it, no suite does) chooses fewer than 30 suites ($n)" "$(! all "$o" && [ "$n" -lt 30 ] && echo 1)" "$(head -1 <<< "$o")"
o=$(sel "$S/contracts/counts.ts"); ok "a contract runs its seam check (P-376 (7)) and its users, not everything" "$(! all "$o" && has "$o" check_contract_seams.ts && echo 1)" "$(head -1 <<< "$o")"
o=$(sel "$S/prisma/schema.prisma"); ok "the schema still runs everything (check_prisma_schema.ts among them)" "$(all "$o" && [ -f "$S/tests/check_prisma_schema.ts" ] && echo 1)" "$(head -1 <<< "$o")"
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

# The graph's rules, each with a passing and a failing case, on a made-up repository (fixed files, so the real code
# changing never moves these): who uses what is read from the files themselves.
G=$(mktemp -d); trap 'rm -rf "$G"' EXIT
( cd "$G" && git init -q && mkdir -p "$S/engine" "$S/tests" "$S/samples" "$S/tools" "$T" && cp "$ROOT/$T/select-suites.mjs" "$T/"
  printf 'export const core = 1;\n' > "$S/engine/core.ts"; printf 'export const other = 2;\n' > "$S/engine/other.ts"
  printf 'export const boot = 3;\n' > "$S/engine/boot.ts"
  printf 'import { core } from "../engine/core.ts";\nexport const h = core;\n' > "$S/tests/helper.ts"
  printf 'import { h } from "./helper.ts";\nconsole.log(h);\n' > "$S/tests/check_a.ts"
  printf 'import { other } from "../engine/other.ts";\nconsole.log(other);\n' > "$S/tests/check_b.ts"
  printf 'import { readFileSync } from "node:fs";\nreadFileSync(join(STUDIO, "samples", "data.json"));\n' > "$S/tests/check_c.ts"
  printf 'import { readdirSync } from "node:fs";\nreaddirSync(join(STUDIO, "samples"));\n' > "$S/tests/check_d.ts"
  printf '{ "files": { "core.ts": 3 } }\n' > "$S/tools/baseline.json"
  printf 'import { readFileSync } from "node:fs";\nreadFileSync("tools/baseline.json");\n' > "$S/tests/check_e.ts"
  printf '{}\n' > "$S/samples/data.json"; printf '{}\n' > "$S/samples/new.json"
  printf '# isolated copies\ntsx engine/boot.ts\n' > "$S/tools/isolated.sh" )
gsel() { (cd "$G" && printf '%s\n' "$@" | node "$T/select-suites.mjs"); }
o=$(gsel "$S/engine/core.ts"); ok "graph pass: a suite importing a helper that imports the file is chosen (check_a)" "$(has "$o" check_a.ts && echo 1)" "$(tr '\n' ' ' <<< "$o")"
ok "graph fail: a suite importing another file of the same folder is not (check_b; an import path is no folder use)" "$(! has "$o" check_b.ts && echo 1)" "$(tr '\n' ' ' <<< "$o")"
ok "graph fail: a JSON file naming the file is no use (check_e reads tools/baseline.json, which lists core.ts)" "$(! has "$o" check_e.ts && echo 1)" "$(tr '\n' ' ' <<< "$o")"
o=$(gsel "$S/samples/data.json"); ok "graph pass: a suite naming a data file is chosen (check_c), so is one listing its folder (check_d)" "$(has "$o" check_c.ts && has "$o" check_d.ts && echo 1)" "$(tr '\n' ' ' <<< "$o")"
o=$(gsel "$S/samples/new.json"); ok "graph fail: a suite naming only another file of the folder is not chosen (check_c), a lister is (check_d)" "$(! has "$o" check_c.ts && has "$o" check_d.ts && echo 1)" "$(tr '\n' ' ' <<< "$o")"
o=$(gsel "$S/engine/boot.ts"); ok "graph pass: a file isolated.sh names runs everything" "$(all "$o" && echo 1)" "$(head -1 <<< "$o")"
o=$(gsel "$S/engine/other.ts"); ok "graph fail: a file nothing that runs every suite uses does not (check_b only)" "$(! all "$o" && has "$o" check_b.ts && ! has "$o" check_a.ts && echo 1)" "$(tr '\n' ' ' <<< "$o")"
(cd "$G" && rm -rf .git); gsel "$S/engine/core.ts" >/dev/null 2>&1; c=$?; ok "graph fail-safe: outside a git copy the selector stops with an error (run-suites.sh then fails: exit 2)" "$([ "$c" != 0 ] && echo 1)" "exit $c"

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
echo "$pass passed, $fail failed"; [ "$fail" = 0 ]
