#!/bin/bash
# Scout lane (P-91): the founder's one command for the outside-in explorer (Goose on Ollama Cloud), and the
# scope check its pushes must pass. Skill: .agents/skills/scout/SKILL.md · recipe: .goose/recipes/scout.yaml.
#   tools/scout.sh [charter]     run one charter (default: the next unchecked one) in the scout copy, then push its branch
#   tools/scout.sh scope <sha>   refuse a scout commit that changes more than its own files and small fixes (pre-push)
#   tools/scout.sh busy <file>   "free", or the lanes whose open branch changes this file
# Settings (environment): SCOUT_MODEL (default kimi-k2.6), SCOUT_TURNS (default 200).
set -u
P="ai-workers/problem-1-pathway-setup-and-form-filling"; PP="$P/product"; PS="$P/prototype/studio"
HERE="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "run this inside the xpatready repository"; exit 2; }
MAIN="$(cd "$(git rev-parse --git-common-dir)/.." && pwd)"
LINES_MAX=40

busy() {  # which open lane branches change this file
  local f="$1" out="" ln lb
  for ln in screens forms evidence runtime qa; do
    lb=$(bash "$HERE/$PP/tools/lane.sh" branch "$ln"); [ -n "$lb" ] || continue
    git -C "$HERE" merge-base --is-ancestor "origin/$lb" origin/main 2>/dev/null && continue
    git -C "$HERE" diff --name-only "origin/main...origin/$lb" 2>/dev/null | grep -qxF "$f" && out="$out $ln"
  done
  [ -n "$out" ] && echo "busy:$out" || echo free
}

scope() {  # the effective change of a scout tip against main (merges of main excluded)
  local tip="$1" base bad=0 f n total=0 fixes=""
  git -C "$HERE" fetch -q origin main 2>/dev/null
  base=$(git -C "$HERE" merge-base origin/main "$tip") || { echo "scout scope: no merge base with origin/main"; return 1; }
  while read -r f; do
    [ -n "$f" ] || continue
    case "$f" in
      "$PP/scout/"*|"$PS/tests/scout/"*) ;;
      "$PP/lanes/scout.md")
        note() { git -C "$HERE" show "$1:$f" 2>/dev/null | awk '/^## From the Lead/{on=1; next} /^Command:/{on=0} on'; }
        [ "$(note "$base")" = "$(note "$tip")" ] || { echo "SCOUT: the Lead's note in lanes/scout.md was changed (only the Lead writes it)"; bad=1; } ;;
      */migrations/*|"$PS/prisma/"*|"$PS/contracts/"*|*package.json|*package-lock.json)
        echo "SCOUT: not a small fix (schema, migration, contract or packages): $f"; bad=1 ;;
      "$PS/web/src/"*|"$PS/api/src/"*|"$PS/engine/"*)
        fixes="$fixes $f"
        [ "$(busy "$f")" = free ] || { echo "SCOUT: $f is changed on an open lane branch ($(busy "$f")); send it to the Lead"; bad=1; } ;;
      *) echo "SCOUT: outside the scout lane's files: $f"; bad=1 ;;
    esac
  done < <(git -C "$HERE" diff --name-only "$base" "$tip")
  for f in $fixes; do
    n=$(git -C "$HERE" diff --numstat "$base" "$tip" -- "$f" | awk '{s+=$1+$2} END{print s+0}'); total=$((total + n))
  done
  [ "$total" -le "$LINES_MAX" ] || { echo "SCOUT: small fixes change $total app lines (limit $LINES_MAX); send the rest to the Lead"; bad=1; }
  [ "$bad" = 0 ] && echo "scout scope: clean ($total app lines)" || { echo "scout scope: REFUSED (P-91: scout/ files, tests/scout/ and small fixes only)"; return 1; }
}

run() {
  local charter="${1:-next}" day wt br
  command -v goose >/dev/null || { echo "Goose is not installed. Install the Goose CLI (goose-docs.ai), run 'goose configure', choose the Ollama Cloud provider and paste your Ollama API key, then run this again."; exit 3; }
  day=$(date +%Y-%m-%d); wt="$(dirname "$MAIN")/xpatready-scout"
  git -C "$MAIN" fetch -q origin || { echo "cannot reach GitHub; try again later"; exit 3; }
  if [ ! -d "$wt" ]; then
    git -C "$MAIN" worktree add -q "$wt" -b "scout/$day" origin/main && echo "scout copy created: $wt"
  fi
  cd "$wt" || exit 3
  git diff --quiet && git diff --cached --quiet || { echo "The scout copy has uncommitted changes from an earlier run: $wt. Open it, commit or discard them, then run again."; exit 3; }
  br=$(git branch --show-current)
  if git merge-base --is-ancestor HEAD origin/main 2>/dev/null; then   # the last branch is merged (or empty): start today's
    br="scout/$day"; git show-ref -q "refs/heads/$br" && br="scout/$day-$(date +%H%M)"
    git checkout -q -b "$br" origin/main
  else
    git merge -q --no-edit origin/main || { echo "Merging main into $br conflicts; tell the Lead."; exit 4; }
  fi
  mkdir -p .claude && echo scout > .claude/lane
  bash "$PP/tools/lane.sh" setup >/dev/null || exit 5
  echo "scout: $br · charter: $charter · model: ${SCOUT_MODEL:-kimi-k2.6} · app http://localhost:4480"
  zsh "$PS/tools/isolated.sh" scout_x1 4480 start >/dev/null || { echo "the scout app did not start (see $PS/var/isolated-scout_x1)"; exit 5; }
  GOOSE_MODE=auto GOOSE_PROVIDER=ollama_cloud GOOSE_MODEL="${SCOUT_MODEL:-kimi-k2.6}" OLLAMA_STREAM_TIMEOUT=600 GOOSE_CLI_SHOW_COST=true \
    goose run --recipe .goose/recipes/scout.yaml --params charter="$charter" \
      --max-turns "${SCOUT_TURNS:-200}" --max-tool-repetitions 3 -n "scout-$day-$charter"
  zsh "$PS/tools/isolated.sh" scout_x1 4480 stop >/dev/null 2>&1
  git diff --quiet && git diff --cached --quiet || echo "Note: the run left uncommitted changes in $wt (not pushed)."
  [ "$(git rev-list --count origin/main..HEAD)" -gt 0 ] || { echo "Nothing new to push."; exit 0; }
  git push -q -u origin "$br" && echo "Pushed $br. Tell the Lead: \"scout pushed $br\" (the report is in $PP/scout/reports/)."
}

case "${1:-run}" in
  scope) scope "${2:-HEAD}" ;;
  busy) busy "$2" ;;
  run) shift; run "${1:-next}" ;;
  -h|--help|help) sed -n 2,7p "$0" ;;
  *) run "$1" ;;
esac
