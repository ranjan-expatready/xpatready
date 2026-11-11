#!/usr/bin/env bash
# L1 (B170a, Lead 16, 11 Nov): push-guard.sh admits the XFA engine's four made-up test PDFs by path AND SHA-256 only.
# Each case commits into a throwaway git repository and runs the guard on that commit; the real repository is never
# touched. Run by check-guards.sh (with --mutate: the allow-list check switched off, this test must fail). US$0, no network.
#   bash product/tools/check-push-guard-fixtures.sh
set -u
TOOLS="$(cd "$(dirname "$0")" && pwd)"; ROOTD="$(cd "$TOOLS/../../../.." && pwd)"
G="$TOOLS/push-guard.sh"
LIST='packages/xfa-engine/fixtures/synthetic/synthetic-form.pdf
packages/xfa-engine/src/__tests__/fixtures/aesv2-cleartext-metadata.pdf
packages/xfa-engine/src/__tests__/fixtures/aesv2-sample.pdf
packages/xfa-engine/src/__tests__/fixtures/rc4-sample.pdf'
pass=0; fail=0
ok() { if [ "$2" = 0 ]; then pass=$((pass+1)); echo "PASS  L1: $1"; else fail=$((fail+1)); echo "FAIL  L1: $1${3:+ — $3}"; fi; }

# One case: a fresh repository, a base commit, then the given files (each "path<TAB>source file") in one commit; prints
# the guard's verdict ("clean" or "refused") for base..HEAD.
verdict() {
  local R; R=$(mktemp -d "${TMPDIR:-/tmp}/pg-fixtures.XXXXXXXX") && [ -d "$R" ] || { echo "no-temp"; return; }
  git -C "$R" init -q && : > "$R/README" && git -C "$R" add README \
    && git -C "$R" -c user.name=t -c user.email=t@example.invalid commit -qm base || { echo "no-repo"; rm -rf "$R"; return; }
  local dst src
  while IFS=$'\t' read -r dst src; do [ -n "$dst" ] || continue; mkdir -p "$R/$(dirname "$dst")"; cp "$src" "$R/$dst"; git -C "$R" add -f "$dst"; done <<< "$1"
  git -C "$R" -c user.name=t -c user.email=t@example.invalid commit -qm case
  local out; out=$(cd "$R" && bash "$G" HEAD~1..HEAD 2>&1); local rc=$?
  rm -rf "$R"
  if [ $rc = 0 ] && printf '%s' "$out" | grep -q "push guard: clean"; then echo clean; else echo refused; fi
}

missing=""; while read -r f; do [ -f "$ROOTD/$f" ] || missing="$missing $f"; done <<< "$LIST"
ok "the four engine test PDFs are in this copy (the cases below need their real bytes)" "$([ -z "$missing" ] && echo 0 || echo 1)" "missing:$missing"

ALL=$(while read -r f; do printf '%s\t%s\n' "$f" "$ROOTD/$f"; done <<< "$LIST")
FIRST=$(head -1 <<< "$LIST")
OTHER=$(mktemp "${TMPDIR:-/tmp}/pg-other.XXXXXXXX"); printf '%%PDF-1.4\n%% not the listed bytes\n' > "$OTHER"
trap 'rm -f "$OTHER"' EXIT

v=$(verdict "$ALL"); ok "pass: the four test PDFs at their listed paths with their listed bytes are admitted" "$([ "$v" = clean ] && echo 0 || echo 1)" "$v"
v=$(verdict "$(printf '%s\t%s\n' "$FIRST" "$OTHER")"); ok "fail: other bytes at a listed path are refused" "$([ "$v" = refused ] && echo 0 || echo 1)" "$v"
v=$(verdict "$(printf '%s\t%s\n' "packages/xfa-engine/fixtures/synthetic/copy.pdf" "$ROOTD/$FIRST")"); ok "fail: the listed bytes at another path in the package are refused" "$([ "$v" = refused ] && echo 0 || echo 1)" "$v"
v=$(verdict "$(printf '%s\t%s\n' "docs/synthetic-form.pdf" "$ROOTD/$FIRST")"); ok "fail: the listed bytes outside the package are refused" "$([ "$v" = refused ] && echo 0 || echo 1)" "$v"
v=$(verdict "$(printf '%s\t%s\n' "packages/xfa-engine/fixtures/new-sample.pdf" "$OTHER")"); ok "fail: a new, unlisted PDF in the package is refused" "$([ "$v" = refused ] && echo 0 || echo 1)" "$v"

echo "$pass passed, $fail failed"
[ "$fail" = 0 ]
