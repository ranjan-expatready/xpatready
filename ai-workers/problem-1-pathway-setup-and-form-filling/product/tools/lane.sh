#!/bin/bash
# Lanes (P-64, product/LANES.md): which lane this copy is, binding it, making it runnable, syncing it, and the status of all.
#   lane.sh whoami            -> lead | screens | forms | evidence | runtime | qa | unbound
#   lane.sh bind <lane>       bind this lane copy (git worktree, or a cloud clone: checks out the lane's newest branch) once
#   lane.sh branch <lane>     the lane's newest branch on origin (<lane>/* or claude/<lane>-*)
#   lane.sh setup             make this copy runnable: link .tools when present, npm ci when node_modules is missing
#   lane.sh sync              merge main into this lane copy; stops on a conflict
#   lane.sh status            one line per lane copy (its own lane file, and who acts according to main)
#   lane.sh table             the lanes table from each lane's newest copy (else main); STATE.md and the Lead's replies use it
#   lane.sh state             rewrite the generated table in STATE.md (main copy only, on branch main)
#   lane.sh leads             Lead commits on main in the last 30 minutes and on other claude/* branches not yet in main (one Lead at a time, P-87)
LANES="screens forms evidence runtime qa"
P="ai-workers/problem-1-pathway-setup-and-form-filling"
HERE="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "not in the repository"; exit 2; }
MAIN="$(cd "$(git rev-parse --git-common-dir)/.." && pwd)"
whoami_() {
  # lead only on branch main (P-82: the Mac's main copy, or a cloud clone checked out on main); a lane branch prefix (screens/, forms/, evidence/,
  # runtime/, qa/, or the existing claude/<lane>-* branches and <lane>-* worktree names) maps to that lane;
  # anything else is unbound, never lead.
  local br; br=$(git -C "$HERE" branch --show-current 2>/dev/null)
  [ "$br" = main ] && { echo lead; return; }
  [ -f "$HERE/.claude/lane" ] && { cat "$HERE/.claude/lane"; return; }
  case "$br" in
    screens/*|claude/screens-*) echo screens;;
    forms/*|claude/forms-*) echo forms;;
    evidence/*|claude/evidence-*) echo evidence;;
    runtime/*|claude/runtime-*) echo runtime;;
    qa/*|claude/qa-*) echo qa;;
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
field() { grep -m1 "^$1:" "$2" 2>/dev/null | cut -d' ' -f2-; }
table_() {
  echo "| Lane | Item | Stage | Who acts | Next |"; echo "|---|---|---|---|---|"
  for ln in $LANES; do
    m="$MAIN/$P/product/lanes/$ln.md"; [ -f "$m" ] || continue
    # Read the lane's newest copy (its own state between merges); flag a Lead note it has not synced yet.
    f="$m"; best=0
    for wt in $(git -C "$MAIN" worktree list --porcelain | awk '/^worktree /{print $2}'); do
      [ "$(cat "$wt/.claude/lane" 2>/dev/null)" = "$ln" ] || continue
      t=$(git -C "$wt" log -1 --format=%ct 2>/dev/null || echo 0); [ "$t" -gt "$best" ] && { best=$t; f="$wt/$P/product/lanes/$ln.md"; }
    done
    # Cloud lane sessions (P-82) push origin/<lane>/* or origin/claude/<lane>-*: a newer lane file there wins.
    for rb in $(git -C "$MAIN" for-each-ref --format='%(refname:short)' "refs/remotes/origin/$ln/" "refs/remotes/origin/claude/$ln-*"); do
      t=$(git -C "$MAIN" log -1 --format=%ct "$rb" 2>/dev/null || echo 0); [ "$t" -gt "$best" ] || continue
      tmpf=$(mktemp); tmps="$tmps $tmpf"; git -C "$MAIN" show "$rb:$P/product/lanes/$ln.md" > "$tmpf" 2>/dev/null && { best=$t; f="$tmpf"; }
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
      if [ -n "$lb" ]; then
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
      echo "$ln | stage: ${st:-?} | owner: ${ow:-?} | last commit: ${up:-none} | uncommitted: $dirty | behind main: $(git -C "$wt" rev-list --count HEAD..origin/main 2>/dev/null || git -C "$wt" rev-list --count HEAD..main 2>/dev/null) | $wt"
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
    for b in $(git -C "$HERE" for-each-ref --format='%(refname:short)' refs/remotes/origin/claude/); do
      [ "$b" = "origin/$me" ] || git -C "$HERE" log "origin/main..$b" --no-merges --format="$b %h %cr %s" | grep -m1 ' lead:'
    done; true ;;
  *) sed -n 2,11p "$0"; exit 2 ;;
esac
