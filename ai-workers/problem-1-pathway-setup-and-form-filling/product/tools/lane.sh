#!/bin/bash
# Lanes (P-64, product/LANES.md): which lane this copy is, binding it, making it runnable, syncing it, and the status of all.
#   lane.sh whoami            -> lead | screens | forms | evidence | runtime | m3 | qa | scout | unbound
#   lane.sh bind <lane>       bind this lane copy (git worktree, or a cloud clone: checks out the lane's newest branch, or
#                             stays on origin/main when that branch is merged, unrelated or older than 24 h: QA-181) once
#   lane.sh branch <lane>     the lane's newest branch on origin (<lane>/* or claude/<lane>-*)
#   lane.sh setup             make this copy runnable: link .tools when present, npm ci when node_modules is missing
#   lane.sh sync              merge main into this lane copy; stops on a conflict
#   lane.sh status            one line per lane copy (its own lane file, and who acts according to main)
#   lane.sh table             the lanes table from each lane's newest copy (else main); STATE.md and the Lead's replies use it
#   lane.sh state             rewrite the generated table in STATE.md (main copy only, on branch main)
#   lane.sh leads             Lead commits on main in the last 30 minutes and on other claude/* branches not yet in main (one Lead at a time, P-87)
#   lane.sh inbox             findings dropped for the Lead: files in product/inbox/ on main and unmerged devin/* branches (inbox/README.md)
LANES="screens forms runtime m3 evidence qa"  # scout retired 29 Oct (P-146)
P="ai-workers/problem-1-pathway-setup-and-form-filling"
HERE="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "not in the repository"; exit 2; }
MAIN="$(cd "$(git rev-parse --git-common-dir)/.." && pwd)"
whoami_() {
  # lead on branch main or lead/* (P-82, P-87: the Mac's main copy, or a cloud clone checked out on main); a lane branch prefix (screens/, forms/, evidence/,
  # runtime/, qa/, or the existing claude/<lane>-* branches and <lane>-* worktree names) maps to that lane;
  # anything else is unbound, never lead.
  # P-188: the tech lead is the Mac's main copy only. A cloud machine (CLAUDE_CODE_REMOTE, or not macOS) is never lead,
  # whatever its branch or .claude/lane says; it falls through to its lane, or unbound.
  local br cloud=""; br=$(git -C "$HERE" branch --show-current 2>/dev/null)
  { [ "${CLAUDE_CODE_REMOTE:-}" = true ] || [ "$(uname)" != Darwin ]; } && cloud=1
  if [ -z "$cloud" ]; then
    [ "$br" = main ] && { echo lead; return; }
    case "$br" in lead/*) echo lead; return;; esac
  fi
  if [ -f "$HERE/.claude/lane" ]; then
    local ln; ln=$(cat "$HERE/.claude/lane")
    [ -n "$cloud" ] && [ "$ln" = lead ] && { echo unbound; return; }
    echo "$ln"; return
  fi
  case "$br" in
    screens/*|claude/screens-*) echo screens;;
    forms/*|claude/forms-*) echo forms;;
    evidence/*|claude/evidence-*) echo evidence;;
    runtime/*|claude/runtime-*) echo runtime;;
    qa/*|claude/qa-*) echo qa;;
    scout/*) echo scout;;
    *) case "$(basename "$HERE")" in
         screens-*) echo screens;; forms-*) echo forms;; evidence-*) echo evidence;;
         runtime-*) echo runtime;; qa-*) echo qa;; *) echo unbound;; esac;;
  esac
}
lane_branch() {  # the lane's newest origin branch with work not yet in main (else its newest), short name
  local rb first=""; for rb in $(git -C "$HERE" for-each-ref --sort=-committerdate --format='%(refname:short)' "refs/remotes/origin/$1/" "refs/remotes/origin/claude/$1-*"); do
    [ -n "$first" ] || first="$rb"
    git -C "$HERE" merge-base --is-ancestor "$rb" origin/main 2>/dev/null && continue
    echo "${rb#origin/}"; return; done
  [ -n "$first" ] && echo "${first#origin/}"
}
# Why bind should not continue the lane's branch origin/$1 (QA-181), or nothing: its last commit is older than
# LANE_STALE_HOURS (24; an abandoned copy such as the qa lane's claude/qa-l10-e3c849 of 30 Oct, which a fresh cloud clone
# checked out on 3 Nov and built 4-day-old screens from), it is already in main, or it shares no history with main.
# Staleness comes first, from the tip's time alone, so an old branch never costs a fetch. A shallow clone (cloud sessions
# fetch 50 commits) is then only ever deepened, 250 commits at a time up to 1000 (--deepen adds history; --shallow-since
# could also cut it, #727 review M1), so an old fork point is not mistaken for no common history.
stale_() {
  local r="origin/$1" t h i; t=$(git -C "$HERE" log -1 --format=%ct "$r" 2>/dev/null) || { echo "not on origin"; return; }
  h="${LANE_STALE_HOURS:-24}"; case "$h" in ''|*[!0-9]*) h=24;; esac
  [ $(($(date +%s) - t)) -gt $((h * 3600)) ] && { echo "older than $h h (last commit $(git -C "$HERE" log -1 --format=%cd --date=format:'%d %b %H:%M' "$r"))"; return; }
  if [ "$(git -C "$HERE" rev-parse --is-shallow-repository 2>/dev/null)" = true ]; then
    for i in 1 2 3 4; do
      git -C "$HERE" merge-base origin/main "$r" >/dev/null 2>&1 && break
      git -C "$HERE" fetch -q --deepen=250 origin main "$1" 2>/dev/null || break
    done
  fi
  git -C "$HERE" merge-base --is-ancestor "$r" origin/main 2>/dev/null && { echo "already in main"; return; }
  git -C "$HERE" merge-base origin/main "$r" >/dev/null 2>&1 || { echo "unrelated to main (no common history$([ "$(git -C "$HERE" rev-parse --is-shallow-repository)" = true ] && echo " in main's last 1000+ commits"))"; return; }
  return 0
}
field() { grep -m1 "^$1:" "$2" 2>/dev/null | cut -d' ' -f2-; }
table_() {
  echo "| Lane | Item | Stage | Who acts | Next |"; echo "|---|---|---|---|---|"
  for ln in $LANES; do
    m="$MAIN/$P/product/lanes/$ln.md"; [ -f "$m" ] || continue
    # Stage, owner and next action come from the lane's own newest copy: main's file is newer whenever the Lead edits
    # its note, but its lane fields are only as fresh as the lane's last merged commit. A candidate (a worktree or a
    # pushed branch) counts only when its newest lane commit on this file (not "lead:") is in neither this copy nor
    # origin/main (ancestry), and is not older than the lane's last commit this copy has (an abandoned branch never rolls
    # the table back); an equal time counts as newer. Among candidates the newest wins, ties by name. The Lead note
    # itself is compared below.
    f="$m"; rel="$P/product/lanes/$ln.md"; bestn=""
    lanec() { git -C "$1" log --no-merges --format='%H %ct %s' "${2:-HEAD}" -- "$rel" 2>/dev/null | grep -v '^[0-9a-f]* [0-9]* lead' | head -1 | cut -d' ' -f1-2; }
    best=$(lanec "$MAIN" | cut -d' ' -f2); best=${best:-0}
    known() { git -C "$MAIN" merge-base --is-ancestor "$1" HEAD 2>/dev/null || git -C "$MAIN" merge-base --is-ancestor "$1" origin/main 2>/dev/null; }
    pick() { set -- $1 "$2" "$3"; [ -n "$1" ] || return 1; known "$1" && return 1
      { [ "$2" -gt "$best" ] || { [ "$2" -eq "$best" ] && [[ "$3" > "$bestn" ]]; }; } || return 1; best=$2; bestn=$3; }
    for wt in $(git -C "$MAIN" worktree list --porcelain | awk '/^worktree /{print $2}'); do
      [ "$(cat "$wt/.claude/lane" 2>/dev/null)" = "$ln" ] || continue
      pick "$(lanec "$wt")" "$wt" && f="$wt/$rel"
    done
    # Cloud lane sessions (P-82) push origin/<lane>/* or origin/claude/<lane>-*.
    for rb in $(git -C "$MAIN" for-each-ref --format='%(refname:short)' "refs/remotes/origin/$ln/" "refs/remotes/origin/claude/$ln-*"); do
      pick "$(lanec "$MAIN" "$rb")" "$rb" || continue
      tmpf=$(mktemp); tmps="$tmps $tmpf"; git -C "$MAIN" show "$rb:$rel" > "$tmpf" 2>/dev/null && f="$tmpf"
    done
    note() { awk '/^## From the Lead/{on=1; next} /^Command:/{on=0} on' "$1"; }
    pending=""; [ "$f" != "$m" ] && [ "$(note "$m")" != "$(note "$f")" ] && pending="Lead note waiting for sync · "
    item=$(field current_screen "$f"); [ -n "$item" ] || item=$(field current_item "$f")
    sl=$(field current_slice "$f"); [ -n "$sl" ] && item="$item ($sl)"
    nx=$(field next_action "$f" | tr -d '`' | tr '|' '/'); [ ${#nx} -gt 110 ] && nx="${nx:0:107}…"
    bl=$(field blocked_by "$f"); [ -n "$bl" ] && [ "${bl%% *}" != none ] && nx="Blocked: ${bl:0:80}"
    echo "| $ln | $item | $(field stage "$f") | $(field owner "$f") | $pending$nx |"
  done
  rm -f $tmps
}
case "$1" in
  whoami) whoami_ ;;
  bind)
    [ "$(whoami_)" = lead ] && { echo "This is the Lead's main copy; lanes run in their own copies."; exit 2; }
    echo " $LANES " | grep -q " $2 " || { echo "Lane must be one of: $LANES"; exit 2; }
    cur=$(whoami_); [ "$cur" != unbound ] && [ "$cur" != "$2" ] && { echo "This copy is already the $cur lane. Type: /next $cur"; exit 3; }
    # A cloud clone on a session branch (P-82): continue on the lane's own branch so its pushes reach the Lead.
    if [ "$HERE" = "$MAIN" ] && [ "$cur" = unbound ]; then
      git -C "$HERE" fetch -q origin 2>/dev/null; lb=$(lane_branch "$2")
      # QA-181: a merged, unrelated or stale lane branch is not continued: the lane starts from origin/main on this
      # copy's own branch (its old branch stays on origin; continue it by hand if it holds work you need).
      why=""; [ -n "$lb" ] && why=$(stale_ "$lb")
      if [ -n "$why" ]; then
        git -C "$HERE" diff --quiet && git -C "$HERE" diff --cached --quiet || { echo "Commit or discard local changes before binding."; exit 3; }
        cb=$(git -C "$HERE" branch --show-current); [ -n "$cb" ] || cb="$2/from-main-$(date -u +%Y%m%d-%H%M)"
        if git -C "$HERE" merge-base --is-ancestor HEAD origin/main 2>/dev/null; then
          git -C "$HERE" checkout -q -B "$cb" origin/main && echo "the $2 lane's newest branch $lb is $why: this branch $cb starts from origin/main ($(git -C "$HERE" rev-parse --short origin/main)) and becomes the lane's branch"
        else
          # This copy has its own commits: never moved. A detached HEAD gets a name so the work is not anonymous (#727 m1).
          [ -n "$(git -C "$HERE" branch --show-current)" ] || git -C "$HERE" checkout -q -b "$cb"
          echo "the $2 lane's newest branch $lb is $why; this branch $cb has commits not in main, so it stays as it is (merge origin/main into it)"
        fi
      elif [ -n "$lb" ]; then
        git -C "$HERE" diff --quiet && git -C "$HERE" diff --cached --quiet || { echo "Commit or discard local changes before binding."; exit 3; }
        git -C "$HERE" checkout -q -B "$lb" "origin/$lb" && git -C "$HERE" branch -q -u "origin/$lb" && echo "on the $2 lane's branch $lb"
      else echo "no $2 branch on origin yet: this branch becomes the lane's branch ($(git -C "$HERE" branch --show-current))"; fi
    fi
    mkdir -p "$HERE/.claude" && echo "$2" > "$HERE/.claude/lane" && echo "bound to $2" ;;
  setup)
    [ "$(whoami_)" = lead ] && { echo "main copy: nothing to link"; exit 0; }
    # A cloud clone (Linux, not a Mac lane worktree): run the cloud setup every time. It is idempotent (seconds when
    # done) and finishes what an interrupted run left, or restarts a database a container restart stopped (P-82).
    if [ "$HERE" = "$MAIN" ] && [ "$(uname -s)" = Linux ]; then bash "$HERE/$P/product/tools/cloud-setup.sh" || exit 5; fi
    # .tools stays optional (P-82): link it when the primary copy has one (Mac node runtime, venv, PDFs, pg data).
    [ -e "$HERE/.tools" ] || { [ -e "$MAIN/.tools" ] && ln -s "$MAIN/.tools" "$HERE/.tools" && echo "linked .tools"; }
    # Packages: every copy installs its own from the committed lockfile (P-82); a prisma generate here can
    # never touch another copy's client, so the copy-on-write clone step is gone.
    SN="$P/prototype/studio"
    [ -d "$HERE/$SN/node_modules" ] || { echo "installing studio packages (npm ci)"; (cd "$HERE/$SN" && npm ci); }
    git config core.hooksPath .githooks && echo "hooks: core.hooksPath=.githooks" ;;
  sync)
    [ "$(whoami_)" = lead ] && { echo "main copy: nothing to sync"; exit 0; }
    git -C "$HERE" diff --quiet && git -C "$HERE" diff --cached --quiet || { echo "Commit this lane's work before syncing."; exit 3; }
    git -C "$HERE" fetch -q origin 2>/dev/null || true
    ref=main; git -C "$HERE" rev-parse -q --verify refs/remotes/origin/main >/dev/null 2>&1 && ref=origin/main
    git -C "$HERE" merge --no-edit "$ref" >/dev/null 2>&1 && echo "in sync with $ref ($(git -C "$HERE" rev-parse --short "$ref"))" || {
      echo "CONFLICT merging $ref:"; git -C "$HERE" diff --name-only --diff-filter=U; exit 4; } ;;
  status)
    git -C "$MAIN" worktree list --porcelain | awk '/^worktree /{print $2}' | while read -r wt; do
      [ "$wt" = "$MAIN" ] && continue
      ln=$(cat "$wt/.claude/lane" 2>/dev/null || echo unbound); f="$wt/$P/product/lanes/$ln.md"
      st=$(field stage "$f"); ow=$(field owner "$f"); mo=$(field owner "$MAIN/$P/product/lanes/$ln.md")
      [ -n "$mo" ] && [ "$mo" != "$ow" ] && ow="$ow (main says: $mo)"
      up=$(git -C "$wt" log -1 --format='%cd' --date=format:'%d %b %H:%M' 2>/dev/null)
      dirty=$(git -C "$wt" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
      # Commits not on GitHub: never remove a copy unless this is 0 (no upstream = "no upstream", treat as unpushed).
      unp=$(git -C "$wt" rev-list --count '@{upstream}..HEAD' 2>/dev/null || echo "no upstream")
      echo "$ln | stage: ${st:-?} | owner: ${ow:-?} | last commit: ${up:-none} | uncommitted: $dirty | unpushed: $unp | behind main: $(git -C "$wt" rev-list --count HEAD..origin/main 2>/dev/null || git -C "$wt" rev-list --count HEAD..main 2>/dev/null) | $wt"
    done
    # Lanes pushed from the cloud or another machine (P-82): their newest branch on origin.
    for ln in $LANES; do lb=$(lane_branch "$ln"); [ -n "$lb" ] || continue
      echo "$ln | origin/$lb | last commit: $(git -C "$HERE" log -1 --format='%cd' --date=format:'%d %b %H:%M' "origin/$lb") | behind main: $(git -C "$HERE" rev-list --count "origin/$lb..origin/main" 2>/dev/null)"
    done ;;
  table) table_ ;;
  branch) lane_branch "$2" ;;
  state)
    [ "$HERE" = "$MAIN" ] || { echo "Only the Lead's main copy writes STATE.md."; exit 2; }
    S="$MAIN/$P/product/STATE.md"; t=$(mktemp); tb=$(mktemp); table_ > "$tb"
    awk -v tf="$tb" '/<!-- lanes:start -->/{print; while ((getline l < tf) > 0) print l; skip=1; next} /<!-- lanes:end -->/{skip=0} !skip' "$S" > "$t" && mv "$t" "$S" && rm -f "$tb" && echo "STATE.md table regenerated" ;;
  leads)
    git -C "$HERE" fetch -q origin 2>/dev/null; me=$(git -C "$HERE" branch --show-current)
    git -C "$HERE" log origin/main --since=30.minutes --format='main %h %cr %s' | grep ' lead:'
    # Lead branches too, this copy's own included: at the start of a chat any unmerged Lead commit of the last day is
    # another chat's (24 h, not 30 min: a paused Lead still counts; older unmerged ones are parked branches).
    for b in $(git -C "$HERE" for-each-ref --format='%(refname:short)' refs/remotes/origin/lead/); do
      git -C "$HERE" log "origin/main..$b" --since=24.hours --no-merges --format="$b %h %cr %s" | grep -m1 ' lead:'
    done
    for b in $(git -C "$HERE" for-each-ref --format='%(refname:short)' refs/remotes/origin/claude/); do
      [ "$b" = "origin/$me" ] || git -C "$HERE" log "origin/main..$b" --no-merges --format="$b %h %cr %s" | grep -m1 ' lead:'
    done; true ;;
  inbox)  # findings dropped for the Lead (inbox/README.md): files on main, then unmerged devin/* branches.
    # Acknowledged = merged: the Lead merges each checker branch into its own PR, so a handled branch drops out here.
    git -C "$HERE" fetch -q origin || { echo "Cannot refresh the inbox from GitHub: retry before treating it as empty." >&2; exit 3; }
    git -C "$HERE" ls-tree --name-only origin/main "$P/product/inbox/" | grep -v -e '/README.md$' -e '/DEVIN-PROMPTS.md$' | sed 's|^|main |'
    for b in $(git -C "$HERE" for-each-ref --format='%(refname:short)' refs/remotes/origin/devin/); do
      git -C "$HERE" merge-base --is-ancestor "$b" origin/main 2>/dev/null && continue
      echo "$b $(git -C "$HERE" log -1 --format='%h %cr' "$b") · $(git -C "$HERE" diff --name-only "origin/main...$b" | tr '\n' ' ')"
    done; true ;;
  *) sed -n 2,12p "$0"; exit 2 ;;
esac
