# Shared by the guard tests (check-*.sh, founder 6 Nov ~03:00 IST: "make them hard rules"). Sourced, never run.
# ok NAME 1|0 DETAIL counts a result; finish prints the totals and exits 1 on any FAIL.
# docs_copy DIR makes a throwaway git copy holding check-docs.sh, a one-page STATE.md and nothing else.
pass=0; fail=0
ok() { if [ "$2" = 1 ]; then pass=$((pass + 1)); echo "PASS  $1"; else fail=$((fail + 1)); echo "FAIL  $1 — ${3:-}"; fi; }
finish() { echo "$pass passed, $fail failed"; [ "$fail" -eq 0 ]; exit $?; }
TOOLS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRODREL="ai-workers/problem-1-pathway-setup-and-form-filling/product"
docs_copy() {  # $1 dir → a git copy at $1 with product/tools/check-docs.sh and STATE.md (one current_lead line)
  mkdir -p "$1/$PRODREL/tools" && cp "$TOOLS/check-docs.sh" "$TOOLS/current-lead.sh" "$1/$PRODREL/tools/"
  git -C "$1" init -q -b main && git -C "$1" config user.email t@t && git -C "$1" config user.name t && git -C "$1" config commit.gpgsign false
  printf '# State\n\nupdated: %s IST by Lead 1\ncurrent_lead: local_aaa Lead 1 · 6 Nov 01:00 IST\n' \
    "$(TZ=Asia/Kolkata date '+%Y-%m-%d %H:%M')" > "$1/$PRODREL/STATE.md"
  git -C "$1" add -A && git -C "$1" commit -qm init
}
