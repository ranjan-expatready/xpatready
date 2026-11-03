#!/usr/bin/env bash
# typecheck.mjs on throwaway projects (the #703 Opus re-review, Lead 3): an error tsc reports without a file must never
# pass. A missing tsconfig (TS5058), an include that finds nothing (TS18003) and a missing type library (TS2688) each
# stop the check (exit 2), and so does a project whose own sources tsc never read (files: [], .d.ts only); noCheck in a
# tsconfig cannot hide errors; a bad tsconfig option is a new error (exit 1); known errors pass; --write only removes.
# Needs the studio's packages (tsc). Runs in seconds, US$0.
#   bash product/tools/check-typecheck.sh
set -u
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT" || exit 2
TC="$ROOT/ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/typecheck.mjs"
pass=0; fail=0
ok() { if [ "$2" = 1 ]; then pass=$((pass + 1)); echo "PASS  $1"; else fail=$((fail + 1)); echo "FAIL  $1 — $3"; fi; }
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
mk() {  # $1 dir, $2 compilerOptions extra JSON, $3 include JSON, rest: "file:content" pairs
  local d="$T/$1"; mkdir -p "$d"; printf '{"compilerOptions":{"noEmit":true,"strict":true,"types":[]%s},"include":%s}\n' "$2" "$3" > "$d/tsconfig.json"; shift 3
  for fc in "$@"; do printf '%s\n' "${fc#*:}" > "$d/${fc%%:*}"; done
}
mk clean '' '["*.ts"]' 'a.ts:export const a: number = 1;'
mk bad '' '["*.ts"]' 'a.ts:export const a: number = "x";' 'b.ts:export const b: string = 2;'
mk empty '' '["nothing/*.ts"]'
mk notypes ',"types":["no-such-lib"]' '["*.ts"]' 'a.ts:export const a: number = 1;'
mk notypesbad ',"types":["no-such-lib"]' '["*.ts"]' 'a.ts:export const a: number = "x";'
run() { node "$TC" "$@" > "$T/out" 2>&1; echo $?; }
: > "$T/none.txt"
c=$(run --project p="$T/clean/tsconfig.json" --known "$T/none.txt"); ok "a clean project passes (exit 0)" "$([ "$c" = 0 ] && echo 1)" "exit $c: $(tail -2 "$T/out")"
c=$(run --project p="$T/missing/tsconfig.json" --known "$T/none.txt"); ok "TS5058 a missing tsconfig: the check could not run (exit 2), never PASS" "$([ "$c" = 2 ] && grep -q TS5058 "$T/out" && ! grep -q '^PASS' "$T/out" && echo 1)" "exit $c: $(tail -3 "$T/out")"
c=$(run --project p="$T/empty/tsconfig.json" --known "$T/none.txt"); ok "TS18003 an include that finds no file: exit 2" "$([ "$c" = 2 ] && grep -q TS18003 "$T/out" && echo 1)" "exit $c: $(tail -3 "$T/out")"
c=$(run --project p="$T/notypes/tsconfig.json" --known "$T/none.txt"); ok "TS2688 a missing type library: exit 2" "$([ "$c" = 2 ] && grep -q TS2688 "$T/out" && echo 1)" "exit $c: $(tail -3 "$T/out")"
c=$(run --project p="$T/clean/tsconfig.json" --project q="$T/empty/tsconfig.json" --known "$T/none.txt"); ok "one good project and one that cannot be checked: exit 2" "$([ "$c" = 2 ] && echo 1)" "exit $c"
# tsc stops at TS2688 before checking any file, even one with an error: still "could not check", never a pass.
c=$(run --project p="$T/notypesbad/tsconfig.json" --known "$T/none.txt"); ok "TS2688 with a broken file too: exit 2 (tsc checked no file)" "$([ "$c" = 2 ] && grep -q TS2688 "$T/out" && echo 1)" "exit $c: $(tail -3 "$T/out")"
mk badopt ',"noSuchOption":true' '["*.ts"]' 'a.ts:export const a: number = 1;'
c=$(run --project p="$T/badopt/tsconfig.json" --known "$T/none.txt"); ok "an unknown compiler option (reported at the tsconfig): a new error, exit 1" "$([ "$c" = 1 ] && grep -q TS5023 "$T/out" && echo 1)" "exit $c: $(tail -3 "$T/out")"
c=$(run --project p="$T/bad/tsconfig.json" --known "$T/none.txt"); ok "two file errors not in the known list: exit 1, both named" "$([ "$c" = 1 ] && grep -q 'a.ts(1): TS2322' "$T/out" && grep -q 'b.ts(1): TS2322' "$T/out" && echo 1)" "exit $c: $(tail -3 "$T/out")"
# The known list: path as tsc prints it (relative to the studio folder, where typecheck.mjs runs tsc).
node "$TC" --project p="$T/bad/tsconfig.json" --known "$T/none.txt" | sed -nE 's/^  p  (.+)\([0-9]+\): (TS[0-9]+): (.*)$/p \1: \2: \3/p' | sort > "$T/known.txt"
c=$(run --project p="$T/bad/tsconfig.json" --known "$T/known.txt"); ok "the same errors, now known: exit 0" "$([ "$c" = 0 ] && echo 1)" "exit $c: $(tail -3 "$T/out")"
grep -v 'b.ts' "$T/known.txt" > "$T/short.txt"
c=$(run --project p="$T/bad/tsconfig.json" --known "$T/short.txt" --write); ok "--write that would add a line: refused (exit 1), the list unchanged" "$([ "$c" = 1 ] && [ "$(grep -c . "$T/short.txt")" = 1 ] && echo 1)" "exit $c: $(tail -2 "$T/out")"
sed -i.bak 's/= "x"/= 1/' "$T/bad/a.ts"
c=$(run --project p="$T/bad/tsconfig.json" --known "$T/known.txt" --write); ok "--write after a fix: only removes the fixed line" "$([ "$c" = 0 ] && [ "$(grep -vc '^#' "$T/known.txt")" = 1 ] && grep -q 'b.ts' "$T/known.txt" && echo 1)" "exit $c: $(cat "$T/known.txt")"
# #734 review Minor 1: tsc exits 0 yet checks none of the project's sources.
mk filesempty '' '[]' 'a.ts:export const a: number = "x";'; sed -i.bak 's/"include":\[\]/"files":[],"references":[]/' "$T/filesempty/tsconfig.json"
c=$(run --project p="$T/filesempty/tsconfig.json" --known "$T/none.txt"); ok "files: [] (Vite's references layout): no source checked, exit 2" "$([ "$c" = 2 ] && echo 1)" "exit $c: $(tail -2 "$T/out")"
mk dtsonly '' '["*.d.ts"]' 'a.d.ts:export declare const a: number;'
c=$(run --project p="$T/dtsonly/tsconfig.json" --known "$T/none.txt"); ok "an include that finds only .d.ts files: exit 2" "$([ "$c" = 2 ] && echo 1)" "exit $c: $(tail -2 "$T/out")"
mk nocheck ',"noCheck":true' '["*.ts"]' 'a.ts:export const a: number = "x";'
c=$(run --project p="$T/nocheck/tsconfig.json" --known "$T/none.txt"); ok "noCheck: true in the tsconfig cannot hide an error: exit 1" "$([ "$c" = 1 ] && grep -q TS2322 "$T/out" && echo 1)" "exit $c: $(tail -2 "$T/out")"
echo "$pass passed, $fail failed"; [ "$fail" = 0 ]
