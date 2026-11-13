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
# B121 re-review after B120 (#1158): the app loads api/src/features/<dir>/ by listing the folder (features.ts featureSteps,
# demo.ts's checkpoint), never by an import the graph can follow. A helper there (_parts.ts, _constants.ts) runs everything,
# as its sibling steps do; before this rule _constants.ts left out check_qa144_vv_release.ts and the other checkpoint suites.
for f in "$S/api/src/features/placement/_parts.ts" "$S/api/src/features/placement/_chosen-sections.ts" "$S/api/src/features/checkpoint/_constants.ts" "$S/api/src/features/checkpoint/combination/200-place-from-parts.ts"; do
  o=$(sel "$f"); ok "${f#$S/}: a step folder's file runs everything (B120 loads it by listing)" "$(all "$o" && echo 1)" "$(head -1 <<< "$o")"
done
o=$(sel "$S/api/src/runtime.ts"); ok "pass: a module directly in api/src (runtime.ts) still chooses its own suites, not everything" "$(! all "$o" && has "$o" check_s5_slice1.ts && echo 1)" "$(head -1 <<< "$o")"
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
# No scratch folder, no synthetic repo: an empty $G would write its fixtures over the real tree (10 Nov, a sandboxed mktemp).
G=$(mktemp -d) && [ -d "$G" ] || { echo "FAIL  mktemp -d gave no scratch folder: the synthetic-repo checks did not run"; exit 1; }
[ -n "${KEEP_G:-}" ] && echo "synthetic repo: $G" || trap 'rm -rf "$G"' EXIT
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
  printf '# isolated copies\ntsx engine/boot.ts\n' > "$S/tools/isolated.sh"
  # review m6: ./x.js resolving to x.ts; a lister of code under tests/ (a use) and outside it (none); a fingerprint line;
  # the R1 set-up; Python imports.
  printf 'import { core } from "../engine/core.js";\nconsole.log(core);\n' > "$S/tests/check_l.ts"
  printf 'import { readdirSync } from "node:fs";\nreaddirSync(join(STUDIO, "engine"));\n' > "$S/tests/check_n.ts"
  printf 'import { readdirSync } from "node:fs";\nexport const all = readdirSync(join(STUDIO, "engine"));\n' > "$S/tools/scan.mjs"
  printf 'import { execSync } from "node:child_process";\nexecSync("node tools/scan.mjs");\n' > "$S/tests/check_m.ts"
  printf 'import { readdirSync } from "node:fs";\nreaddirSync(join(STUDIO, "logs"));\nconst k = fp("kept", under(join(STUDIO, "samples")));\n' > "$S/tests/check_k.ts"
  mkdir -p "$S/tests/runtime" "$Q/prototype/p1"
  printf 'import { other } from "../../engine/other.ts";\n' > "$S/tests/runtime/setup_visitor_visa.ts"
  printf 'console.log(1);\n' > "$S/tests/runtime/check_runtime_r1a.ts"
  printf 'import helper_b\n' > "$Q/prototype/p1/helper_a.py"; printf 'X = 1\n' > "$Q/prototype/p1/helper_b.py"
  printf 'execSync("python3 prototype/p1/helper_a.py");\n' > "$S/tests/check_p.ts"
  # The API rules: demo.ts imports the engine; main.ts's DemoController serves /demo/load (a set-up endpoint: called by
  # more than a third of the suites) and /demo/pack; the shell (App.tsx) calls /demo/pack; one browser suite.
  mkdir -p "$S/api/src" "$S/web/src"
  printf 'import { core } from "../../engine/core.ts";\nexport class Demo { load() { return core; } pack() { return 1; } }\n' > "$S/api/src/demo.ts"
  printf 'import { Demo } from "./demo.ts";\n@Controller("api/demo")\nexport class DemoController {\n  constructor(private d: Demo) {}\n  @Post("load") load() { return this.d.load(); }\n  @Post("pack") pack() { return this.d.pack(); }\n}\n' > "$S/api/src/main.ts"
  printf 'export function App() { return fetch("/api/demo/pack"); }\n' > "$S/web/src/App.tsx"
  for n in check_s7_load check_q1 check_q2 check_q3 check_q4 check_q5 check_q6 check_q7; do printf 'await fetch(`${BASE}/api/demo/load`);\n' > "$S/tests/$n.ts"; done
  printf 'await fetch(`${BASE}/api/demo/pack`);\n' > "$S/tests/check_i.ts"
  printf 'const { chromium } = require("playwright");\nawait page.goto(`${BASE}/other`);\n' > "$S/tests/check_j_browser.cjs" )
gsel() { (cd "$G" && printf '%s\n' "$@" | node "$T/select-suites.mjs"); }
o=$(gsel "$S/engine/core.ts"); ok "graph pass: a suite importing a helper that imports the file is chosen (check_a)" "$(has "$o" check_a.ts && echo 1)" "$(tr '\n' ' ' <<< "$o")"
ok "graph fail: a suite importing another file of the same folder is not (check_b; an import path is no folder use)" "$(! has "$o" check_b.ts && echo 1)" "$(tr '\n' ' ' <<< "$o")"
ok "graph fail: a JSON file naming the file is no use (check_e reads tools/baseline.json, which lists core.ts)" "$(! has "$o" check_e.ts && echo 1)" "$(tr '\n' ' ' <<< "$o")"
o=$(gsel "$S/samples/data.json"); ok "graph pass: a suite naming a data file is chosen (check_c), so is one listing its folder (check_d)" "$(has "$o" check_c.ts && has "$o" check_d.ts && echo 1)" "$(tr '\n' ' ' <<< "$o")"
o=$(gsel "$S/samples/new.json"); ok "graph fail: a suite naming only another file of the folder is not chosen (check_c), a lister is (check_d)" "$(! has "$o" check_c.ts && has "$o" check_d.ts && echo 1)" "$(tr '\n' ' ' <<< "$o")"
o=$(gsel "$S/engine/boot.ts"); ok "graph pass: a file isolated.sh names runs everything" "$(all "$o" && echo 1)" "$(head -1 <<< "$o")"
o=$(gsel "$S/engine/other.ts"); ok "graph fail: a file nothing that runs every suite uses does not (check_b only)" "$(! all "$o" && has "$o" check_b.ts && ! has "$o" check_a.ts && echo 1)" "$(tr '\n' ' ' <<< "$o")"
o=$(gsel "$S/engine/core.ts")
ok "graph pass: an import of ./x.js reaches x.ts (check_l)" "$(has "$o" check_l.ts && echo 1)" "$(tr '\n' ' ' <<< "$o")"
ok "graph pass: a suite listing a folder of code is chosen (check_n); fail: a tool listing it is no use (check_m runs tools/scan.mjs)" "$(has "$o" check_n.ts && ! has "$o" check_m.ts && echo 1)" "$(tr '\n' ' ' <<< "$o")"
ok "set-up endpoint pass: /demo/load's own suite (check_s7_load) is chosen; fail: its other callers are not (check_q1..q7)" "$(has "$o" check_s7_load.ts && ! has "$o" check_q1.ts && ! has "$o" check_q7.ts && echo 1)" "$(tr '\n' ' ' <<< "$o")"
ok "a reached endpoint below the set-up share is chosen through main.ts's controller (check_i calls /demo/pack)" "$(has "$o" check_i.ts && echo 1)" "$(tr '\n' ' ' <<< "$o")"
ok "shell rule fail: an engine change reaching an endpoint the shell calls runs no browser suite (check_j_browser)" "$(! has "$o" check_j_browser.cjs && echo 1)" "$(tr '\n' ' ' <<< "$o")"
o=$(gsel "$S/api/src/demo.ts"); ok "shell rule pass: a change to the module serving that endpoint still runs every browser suite (check_j_browser)" "$(has "$o" check_j_browser.cjs && echo 1)" "$(tr '\n' ' ' <<< "$o")"
o=$(gsel "$S/samples/new.json"); ok "graph fail: a folder named only on a fingerprint line (fp(...)) is no use (check_k)" "$(! has "$o" check_k.ts && has "$o" check_d.ts && echo 1)" "$(tr '\n' ' ' <<< "$o")"
o=$(gsel "$S/engine/other.ts"); ok "graph pass: the R1 set-up (setup_visitor_visa.ts) using the file runs the R1 suites" "$(has "$o" check_runtime_r1a.ts && echo 1)" "$(tr '\n' ' ' <<< "$o")"
o=$(gsel "$Q/prototype/p1/helper_b.py"); ok "graph pass: a Python import (helper_a.py imports helper_b) reaches the suite running helper_a.py (check_p)" "$(has "$o" check_p.ts && echo 1)" "$(tr '\n' ' ' <<< "$o")"
o=$(dsel "$S/prisma/migrations/x/migration.sql"); ok "--direct: a migration alone chooses check_prisma_schema.ts (review m3)" "$(has "$o" check_prisma_schema.ts && echo 1)" "$(head -2 <<< "$o" | tr '\n' ' ')"
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
# D2 (P-416, 8 Nov): --packs, the acceptance packs and test files that are, or read, a changed file (gate B's set by diff).
psel() { printf '%s\n' "$@" | node "$T/select-suites.mjs" --packs | cut -f1 | sed -n "s|^$S/acceptance/||p"; }
o=$(psel "$S/acceptance/C7.3.test.ts"); ok "--packs: a changed pack is itself, and no other pack" "$([ "$(grep '\.test\.ts$' <<< "$o")" = C7.3.test.ts ] && echo 1)" "$o"
o=$(psel "$S/acceptance/lib/declared.ts"); ok "--packs: a pack helper reaches the packs that import it (C6.3, C6.6), not the others" "$(grep -qx C6.3.test.ts <<< "$o" && grep -qx C6.6.test.ts <<< "$o" && ! grep -qx C7.3.test.ts <<< "$o" && echo 1)" "$(tr '\n' ' ' <<< "$o")"
o=$(psel "$S/acceptance/lib/m3.ts"); ok "--packs: the M3 helpers reach the M3 packs and their set-up (setup_vv_m3.ts), not an M2 pack" "$(grep -qx C7.3.test.ts <<< "$o" && grep -qx lib/setup_vv_m3.ts <<< "$o" && ! grep -qx C1.6.test.ts <<< "$o" && echo 1)" "$(tr '\n' ' ' <<< "$o" | cut -c1-200)"
o=$(psel "$S/api/src/case-prepare.ts" "$Q/product/STATE.md" .github/workflows/ci.yml x); ok "--packs: an API module (packs call it over HTTP), a record, a workflow and a stray name reach no pack" "$([ -z "$o" ] && echo 1)" "$o"
o=$(psel "$S/api/src/question-condition.ts"); ok "--packs (review of #1337, Major 3): an API module packs import (via proposals.ts) reaches them (C11.13, C11.14)" "$(grep -qx C11.13.test.ts <<< "$o" && grep -qx C11.14.test.ts <<< "$o" && echo 1)" "$(tr '\n' ' ' <<< "$o")"
o=$(psel "$Q/official-sources/ircc/manifest.json"); ok "--packs (review m5): the IRCC manifest pack2.ts reads reaches packs" "$(grep -q '\.test\.ts$' <<< "$o" && echo 1)" "$(head -3 <<< "$o" | tr '\n' ' ')"
o=$(printf '%s\n' "$S/api/src/own-yes-no.ts" | node "$T/select-suites.mjs" --packs --assume-deleted | cut -f1 | sed -n "s|^$S/acceptance/||p"); ok "--packs (review of #1337 round 2, m1): a deleted API module a pack helper imports still reaches packs (pack2.ts imports own-yes-no.ts)" "$(grep -q '\.test\.ts$' <<< "$o" && echo 1)" "$(head -3 <<< "$o" | tr '\n' ' ')"
o=$(psel "$S/web/src/App.tsx"); ok "--packs (Devin on #1337): packs that read App.tsx's routes as text reach it (C2.12, C11.1)" "$(grep -qx C2.12.test.ts <<< "$o" && grep -qx C11.1.test.ts <<< "$o" && echo 1)" "$(tr '\n' ' ' <<< "$o" | cut -c1-200)"
o=$(psel "$Q/prototype/expected/source-text/imm5484e.xfa-template.txt"); ok "--packs (Devin on #1337): the committed official text C4.5 checks quotes against reaches C4.5" "$(grep -qx C4.5.test.ts <<< "$o" && echo 1)" "$(tr '\n' ' ' <<< "$o" | cut -c1-200)"
o=$(psel "$S/acceptance/lib/run_pack4.sh"); n=$(grep -c '\.test\.ts$' <<< "$o"); ok "--packs: a non-code file in acceptance/lib does not reach every pack through their \"./lib/…\" import paths ($n packs)" "$([ "$n" -lt 10 ] && echo 1)" "$n"
o=$(psel "$S/acceptance/M3-CONTRACT.md" "$S/tests/fixtures/change_one_value.py"); n=$(grep -c '\.test\.ts$' <<< "$o"); ok "--packs (review round 4): a pack note and a test fixture script reach no pack through generic folder names ($n)" "$([ "$n" = 0 ] && echo 1)" "$(head -3 <<< "$o" | tr '\n' ' ')"
o=$(printf '%s\n' "$S/tools/any-baseline.json" | node "$T/select-suites.mjs" --packs | grep '/acceptance/C.*\.test\.ts'); ok "--packs (review round 4): tools/any-baseline.json reaches only the packs whose chain names it (no \"tools\" folder edge: $(grep -c . <<< "$o") packs)" "$(! grep -vq 'any-baseline.json ←' <<< "$o" && [ "$(grep -c . <<< "$o")" -le 6 ] && echo 1)" "$(cut -f2 <<< "$o" | head -3 | tr '\n' ' ')"
o=$(psel "$S/acceptance/lib/no-such-helper-zz9.ts"); ok "--packs: a deleted path that nothing names reaches no pack" "$(! grep -q '\.test\.ts$' <<< "$o" && echo 1)" "$o"
# (4a) P-446 (founder via Lead 9, 10 Nov): gates and the other checkpoint steps reach the app only when a pack loads the
# configured checkpoint (POST /demo/load {sample:"configured"} runs api/src/features/checkpoint/*). Packs reach API files
# only by imports, so #1450 broke C6.19's pack after approval: a gate file or a checkpoint step reaches every pack that
# loads the configured checkpoint, itself or through a helper it imports (acceptance/lib/declared.ts: C6.3, C6.6).
o=$(psel "$S/samples/form-field-gates.json"); ok "--packs (4a): the gates file reaches the packs that load the configured checkpoint (C6.19, C1.3), not a pack that never does (C1.5)" "$(grep -qx C6.19.test.ts <<< "$o" && grep -qx C1.3.test.ts <<< "$o" && ! grep -qx C1.5.test.ts <<< "$o" && echo 1)" "$(tr '\n' ' ' <<< "$o" | cut -c1-200)"
o=$(psel "$S/api/src/form-field-gates.ts"); ok "--packs (4a): the gates' API code reaches them too, and through declared.ts (C6.19, C6.6)" "$(grep -qx C6.19.test.ts <<< "$o" && grep -qx C6.6.test.ts <<< "$o" && ! grep -qx C1.5.test.ts <<< "$o" && echo 1)" "$(tr '\n' ' ' <<< "$o" | cut -c1-200)"
o=$(psel "$S/api/src/features/checkpoint/110-release-one.ts"); ok "--packs (4a): any checkpoint step reaches the packs that load the configured checkpoint (C6.19, C6.3)" "$(grep -qx C6.19.test.ts <<< "$o" && grep -qx C6.3.test.ts <<< "$o" && ! grep -qx C1.5.test.ts <<< "$o" && echo 1)" "$(tr '\n' ' ' <<< "$o" | cut -c1-200)"
o=$(psel "$S/api/src/demo.ts"); o2=$(psel "$S/api/src/features/form-field-condition.ts"); ok "--packs (4a, review of #1504, Major 2 and minor 1): the code that loads the checkpoint (demo.ts) reaches C6.19, and so does the gate registration on its own" "$(grep -qx C6.19.test.ts <<< "$o" && grep -qx C6.19.test.ts <<< "$o2" && echo 1)" "$(tr '\n' ' ' <<< "$o$o2" | cut -c1-200)"
o=$(psel "$S/samples/routes.json"); ok "--packs (4a, review of #1504, Major 2): a data file a checkpoint step reads, reached on the walk, reaches C6.19 and C1.3" "$(grep -qx C6.19.test.ts <<< "$o" && grep -qx C1.3.test.ts <<< "$o" && echo 1)" "$(tr '\n' ' ' <<< "$o" | cut -c1-200)"
o=$(printf '%s\n' "$S/api/src/core.ts" "$S/api/src/runtime.ts" | node "$T/select-suites.mjs" --packs | grep -c 'configured checkpoint'); ok "--packs (4a, review of #1504 round 2): a hub module the steps import (core.ts, runtime.ts) does not fire the checkpoint rule" "$([ "$o" = 0 ] && echo 1)" "$o"
c=$(printf '%s\n' "$S/samples/form-field-gates.json" | node "$T/select-suites.mjs" --packs | grep '/C6.19.test.ts' | cut -f2); ok "--packs (4a): the chain says why (the configured checkpoint)" "$(grep -q 'configured checkpoint' <<< "$c" && echo 1)" "$c"
echo "$pass passed, $fail failed"; [ "$fail" = 0 ]
