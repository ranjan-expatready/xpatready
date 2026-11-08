#!/usr/bin/env bash
# The PR's base, worked out when the job runs (D6, P-416, founder "Approve all stands" 8 Nov ~09:05 IST; the review of
# 8 Nov: a re-run kept the old base). GitHub's pull_request event fixes base.sha and the test merge (refs/pull/N/merge at
# github.sha) when the event fires, and "Re-run failed jobs" replays that event, so a re-run after a fix on main tested
# the old main again. This script rebuilds the test merge on origin/main as the job finds it (actions/checkout with
# fetch-depth 0 fetches every branch at job start), in GitHub's parent order (HEAD^1 = main, HEAD^2 = the PR head), and
# prints the range "<base>..<head>" with base = git merge-base origin/main HEAD, which every guard and selection reads
# (push guard, change-kind.sh, run-suites.sh --changed, count-any, gate B's and works-set's files at the base).
# Note: git merge-base origin/main HEAD on GitHub's own merge commit gives the OLD base on a re-run (that merge holds
# only the old main), which is why the merge is rebuilt first.
#   bash product/tools/pr-base.sh merge <head-sha> [<pinned-main-sha>]   rebuild, print the range (a pull request)
#   bash product/tools/pr-base.sh range <head-sha>                       no rebuild: merge-base origin/main <head>..<head>
#   bash product/tools/pr-base.sh queue                                  a Mergify batch: GitHub's merge kept, merge-base origin/main HEAD..HEAD^2
#   bash product/tools/pr-base.sh --self-test
# <pinned-main-sha>: the main the job "kind" merged onto in the same run attempt, so the parts of one attempt test one
# tree; a re-run attempt passes none and takes today's main. A pinned sha that is not on origin/main is refused.
# A PR that no longer merges cleanly onto today's main stops the job (exit 1) with the files in conflict.
# Exit: 0 range printed on stdout (the last line) · 1 conflict or refused · 2 could not run.
set -uo pipefail
SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
say() { echo "pr-base: $*" >&2; }
sha() { [[ "${1:-}" =~ ^[0-9a-f]{7,40}$ ]]; }

merge_cmd() {
  local head="$1" pin="${2:-}" main
  sha "$head" || { say "want a head sha, not '$head'"; return 2; }
  git rev-parse -q --verify origin/main >/dev/null || { say "no origin/main here (checkout needs fetch-depth: 0)"; return 2; }
  git cat-file -e "$head^{commit}" 2>/dev/null || git fetch -q --no-tags origin "$head" || { say "cannot fetch the PR head $head"; return 2; }
  main=$(git rev-parse origin/main)
  if [ -n "$pin" ]; then
    sha "$pin" || { say "want a pinned sha, not '$pin'"; return 2; }
    git merge-base --is-ancestor "$pin" origin/main 2>/dev/null || { say "pinned base $pin is not on origin/main"; return 1; }
    main=$(git rev-parse "$pin")
  fi
  git checkout -q --detach "$main" || { say "cannot check out main $main"; return 2; }
  if ! git -c user.name=ci -c user.email=ci@localhost merge -q --no-ff --no-edit -m "test merge of $head onto main $main (pr-base.sh, D6)" "$head" >&2; then
    say "the PR does not merge cleanly onto today's main ${main:0:12}; files in conflict:"
    git diff --name-only --diff-filter=U >&2
    git merge --abort 2>/dev/null
    return 1
  fi
  [ "$(git rev-parse HEAD^2)" = "$(git rev-parse "$head")" ] || { say "the rebuilt merge does not hold the PR head"; return 2; }
  echo "$(git merge-base origin/main HEAD)..$(git rev-parse "$head")"
}

range_cmd() {
  local head="$1" b
  sha "$head" || { say "want a head sha, not '$head'"; return 2; }
  git cat-file -e "$head^{commit}" 2>/dev/null || git fetch -q --no-tags origin "$head" || { say "cannot fetch the PR head $head"; return 2; }
  b=$(git merge-base origin/main "$head") || { say "no merge base between origin/main and $head"; return 2; }
  echo "$b..$(git rev-parse "$head")"
}

queue_cmd() {
  local b h
  h=$(git rev-parse -q --verify HEAD^2) || { say "HEAD is not a merge commit (want GitHub's test merge)"; return 2; }
  b=$(git merge-base origin/main HEAD) || { say "no merge base between origin/main and HEAD"; return 2; }
  echo "$b..$h"
}

self_test() {
  local T fail=0 r
  T=$(mktemp -d "${TMPDIR:-/tmp}/pr-base.XXXXXXXX") || return 2
  ok() { if [ "$2" = 1 ]; then echo "PASS  $1"; else echo "FAIL  $1 ($3)"; fail=1; fi; }
  (
    set -e; cd "$T"; g() { git -c user.name=t -c user.email=t@t "$@"; }
    git init -q -b main up; cd up; echo a > a.txt; g add a.txt; g commit -qm a; echo f > f.txt; g add f.txt; g commit -qm base
    git checkout -qb pr; echo p > p.txt; g add p.txt; g commit -qm pr
    git checkout -q main; cd ..; git clone -q up work
  ) >/dev/null 2>&1 || { echo "FAIL  self-test set-up"; rm -rf "$T"; return 2; }
  local up="$T/up" w="$T/work" old head new
  old=$(git -C "$up" rev-parse main); head=$(git -C "$up" rev-parse pr)
  git -C "$w" fetch -q origin pr
  r=$(cd "$w" && bash "$SELF" merge "$head" 2>/dev/null)
  ok "merge: base is main's tip, head is the PR head" "$([ "$r" = "$old..$head" ] && echo 1)" "$r"
  ok "merge: HEAD^1 is main, HEAD^2 the PR head (GitHub's order)" "$([ "$(git -C "$w" rev-parse HEAD^1)" = "$old" ] && [ "$(git -C "$w" rev-parse HEAD^2)" = "$head" ] && echo 1)" "$(git -C "$w" log --format=%P -1)"
  # a fix lands on main; the old merge commit is what GitHub's re-run checks out
  local stale; stale=$(git -C "$w" rev-parse HEAD)
  (cd "$up" && echo fixed > f.txt && git -c user.name=t -c user.email=t@t commit -qam fix) >/dev/null
  new=$(git -C "$up" rev-parse main); git -C "$w" fetch -q origin
  git -C "$w" checkout -q --detach "$stale"
  ok "the trap: merge-base origin/main on the stale merge commit is still the old base" "$([ "$(git -C "$w" merge-base origin/main HEAD)" = "$old" ] && echo 1)" "$(git -C "$w" merge-base origin/main HEAD)"
  r=$(cd "$w" && bash "$SELF" merge "$head" 2>/dev/null)
  ok "a re-run reads the new base (the fix on main)" "$([ "$r" = "$new..$head" ] && [ "$(cat "$w/f.txt")" = fixed ] && echo 1)" "$r $(cat "$w/f.txt")"
  r=$(cd "$w" && bash "$SELF" merge "$head" "$old" 2>/dev/null)
  ok "pinned: the parts of one attempt test kind's main" "$([ "$r" = "$old..$head" ] && [ "$(cat "$w/f.txt")" = f ] && echo 1)" "$r"
  (cd "$w" && bash "$SELF" merge "$head" "$(git -C "$w" rev-parse "$head")" >/dev/null 2>&1); r=$?
  ok "pinned: a sha not on main is refused" "$([ $r = 1 ] && echo 1)" "exit $r"
  r=$(cd "$w" && bash "$SELF" range "$head" 2>/dev/null)
  ok "range: merge-base origin/main <head>..<head>, no rebuild" "$([ "$r" = "$old..$head" ] && echo 1)" "$r"
  (cd "$w" && bash "$SELF" merge "$head" && bash "$SELF" queue) >/dev/null 2>&1; r=$(cd "$w" && bash "$SELF" queue 2>/dev/null)
  ok "queue: merge-base origin/main HEAD..HEAD^2" "$([ "$r" = "$new..$head" ] && echo 1)" "$r"
  # a conflict: main changes p.txt too
  (cd "$up" && echo other > p.txt && git add p.txt && git -c user.name=t -c user.email=t@t commit -qm clash) >/dev/null; git -C "$w" fetch -q origin
  (cd "$w" && bash "$SELF" merge "$head" >/dev/null 2>"$T/err"); r=$?
  ok "a PR that conflicts with today's main stops the job, naming the file" "$([ $r = 1 ] && grep -q '^p.txt$' "$T/err" && echo 1)" "exit $r $(tr '\n' ' ' < "$T/err")"
  (cd "$w" && bash "$SELF" merge nothing >/dev/null 2>&1); r=$?
  ok "a bad head is 'could not run'" "$([ $r = 2 ] && echo 1)" "exit $r"
  rm -rf "$T"
  [ $fail = 0 ] && echo "pr-base self-test: all passed" || echo "pr-base self-test: FAILED"
  return $fail
}

case "${1:-}" in
  merge) merge_cmd "${2:-}" "${3:-}" ;;
  range) range_cmd "${2:-}" ;;
  queue) queue_cmd ;;
  --self-test) self_test ;;
  *) say "usage: pr-base.sh merge <head> [<pinned-main>] | range <head> | queue | --self-test"; exit 2 ;;
esac
