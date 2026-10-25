#!/bin/bash
# Scout lane (P-91): the founder's one command for the outside-in explorer (Goose on Ollama Cloud), and the
# scope check its pushes must pass. Skill: .agents/skills/scout/SKILL.md · recipe: .goose/recipes/scout.yaml.
#   tools/scout.sh [charter]     run one charter unattended (default: the next unchecked one) in the scout copy, then push its branch
#   tools/scout.sh open          prepare the scout copy and its app for a session with the founder in Goose
#   tools/scout.sh save          after such a session: commit the scout's files, stop the app, push
#   tools/scout.sh scope <sha>   refuse a scout commit that changes more than its own files and small fixes (pre-push)
#   tools/scout.sh busy <file>   "free", or the lanes whose open branch changes this file
# Settings (environment): SCOUT_MODEL (default kimi-k3), SCOUT_TURNS (default 200).
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

# The scout's own copy: ../xpatready-scout, a git worktree of the main copy on scout/<date>, fresh from origin/main
# (a worktree, not a second clone, so it shares the Mac's .tools: node, the PostgreSQL cluster, PDFs).
prepare() {  # create or refresh the scout copy, build it and start its app on :4480; leaves the working directory there
  local day br pgd
  day=$(date +%Y-%m-%d); WT="$(dirname "$MAIN")/xpatready-scout"
  git -C "$MAIN" fetch -q origin || { echo "cannot reach GitHub; try again later"; exit 3; }
  if [ ! -d "$WT" ]; then   # a branch left by a removed copy keeps its name, so pick a free one
    br="scout/$day"; git -C "$MAIN" show-ref -q "refs/heads/$br" && br="scout/$day-$(date +%H%M)"
    git -C "$MAIN" worktree add -q "$WT" -b "$br" origin/main && echo "scout copy created: $WT" || exit 3
  fi
  cd "$WT" || exit 3
  git diff --quiet && git diff --cached --quiet || { echo "The scout copy has unsaved work: run 'tools/scout.sh save' (or open $WT and commit or discard it), then run again."; exit 3; }
  BR=$(git branch --show-current)
  if git merge-base --is-ancestor HEAD origin/main 2>/dev/null; then   # the last branch is merged (or empty): start today's
    BR="scout/$day"; git show-ref -q "refs/heads/$BR" && BR="scout/$day-$(date +%H%M)"
    git checkout -q -b "$BR" origin/main
  else
    git merge -q --no-edit origin/main || { echo "Merging main into $BR conflicts; tell the Lead."; exit 4; }
  fi
  mkdir -p .claude && echo scout > .claude/lane
  bash "$PP/tools/lane.sh" setup >/dev/null || exit 5
  # As start.sh does: the database cluster running, the Prisma client generated, the web app built (a fresh copy has none).
  pgd="$WT/.tools/solution-1-prototype/pg18-data"
  ( export PATH="$WT/.tools/node-v24.21.0/bin:/opt/homebrew/opt/postgresql@18/bin:$PATH"; cd "$PS" || exit 1
    pg_ctl -D "$pgd" status >/dev/null 2>&1 || LC_ALL=en_US.UTF-8 pg_ctl -D "$pgd" -l "$pgd/server.log" -w start >/dev/null || exit 1
    ./node_modules/.bin/prisma generate >/dev/null && (cd web && ../node_modules/.bin/vite build >/dev/null)
  ) || { echo "could not prepare the scout app (database, Prisma client or web build)"; exit 5; }
  zsh "$PS/tools/isolated.sh" scout_x1 4480 start >/dev/null || { echo "the scout app did not start (see $PS/var/isolated-scout_x1)"; exit 5; }
}

push_() {  # push the scout branch when it has commits main lacks
  [ "$(git rev-list --count origin/main..HEAD)" -gt 0 ] || { echo "Nothing new to push."; return 0; }
  git push -q -u origin "$BR" && echo "Pushed $BR. Tell the Lead: \"scout pushed $BR\" (reports in $PP/scout/reports/)."
}

open_() {  # for a session with the founder in Goose Desktop or 'goose session'
  prepare
  echo "Scout copy ready: $WT (branch $BR) · app http://localhost:4480"
  echo "Start Goose in that folder (Desktop: choose it as the working directory; terminal: cd \"$WT\" && goose session),"
  echo "pick the model (${SCOUT_MODEL:-kimi-k3}), and paste the scout prompt. When done: bash $PP/tools/scout.sh save"
}

save() {  # commit what an interactive session left in the scout copy, stop its app, push
  WT="$(dirname "$MAIN")/xpatready-scout"; cd "$WT" 2>/dev/null || { echo "no scout copy yet: run tools/scout.sh open"; exit 3; }
  BR=$(git branch --show-current)
  git add -A -- "$PP/scout" "$PS/tests/scout" "$PP/lanes/scout.md" 2>/dev/null
  git diff --cached --quiet || git commit -q -m "scout: session with the founder — brief, review and findings

Co-Authored-By: Goose <noreply@goose-docs.ai>"
  git diff --quiet || echo "Note: changes outside the scout's files were left uncommitted in $WT."
  zsh "$PS/tools/isolated.sh" scout_x1 4480 stop >/dev/null 2>&1
  push_
}

run() {
  local charter="${1:-next}" day rc
  command -v goose >/dev/null || { echo "Goose is not installed. Install the Goose CLI (goose-docs.ai), run 'goose configure', choose the Ollama Cloud provider and paste your Ollama API key, then run this again."; exit 3; }
  day=$(date +%Y-%m-%d)
  prepare
  echo "scout: $BR · charter: $charter · model: ${SCOUT_MODEL:-kimi-k3} · app http://localhost:4480"
  goose recipe validate .goose/recipes/scout.yaml >/dev/null || { echo "The scout recipe does not validate with this Goose version; tell the Lead (goose --version)."; exit 5; }
  GOOSE_MODE=auto OLLAMA_STREAM_TIMEOUT=600 GOOSE_CLI_SHOW_COST=true \
    goose run --recipe .goose/recipes/scout.yaml --params charter="$charter" \
      --provider ollama_cloud --model "${SCOUT_MODEL:-kimi-k3}" \
      --max-turns "${SCOUT_TURNS:-200}" --max-tool-repetitions 3 -n "scout-$day-$charter"
  rc=$?
  zsh "$PS/tools/isolated.sh" scout_x1 4480 stop >/dev/null 2>&1
  [ "$rc" = 0 ] || { echo "Goose stopped with an error (exit $rc): nothing pushed. The work so far stays in $WT; run again to continue."; exit "$rc"; }
  git diff --quiet && git diff --cached --quiet || echo "Note: the run left uncommitted changes in $WT (not pushed)."
  push_
}

case "${1:-run}" in
  scope) scope "${2:-HEAD}" ;;
  busy) busy "$2" ;;
  run) shift; run "${1:-next}" ;;
  open) open_ ;;
  save) save ;;
  -h|--help|help) sed -n 2,9p "$0" ;;
  *) run "$1" ;;
esac
