#!/bin/bash
# Lanes (P-64, product/LANES.md): which lane this copy is, binding it, making it runnable, syncing it, and the status of all.
#   lane.sh whoami            -> lead | screens | forms | evidence | runtime | qa | unbound
#   lane.sh bind <lane>       bind this lane copy (git worktree) to a lane, once
#   lane.sh setup             make this copy runnable: link .tools when present, npm ci when node_modules is missing
#   lane.sh sync              merge main into this lane copy; stops on a conflict
#   lane.sh status            one line per lane copy (its own lane file, and who acts according to main)
#   lane.sh table             the lanes table from each lane's newest copy (else main); STATE.md and the Lead's replies use it
#   lane.sh state             rewrite the generated table in STATE.md (main copy only, on branch main)
LANES="screens forms evidence runtime qa"
P="ai-workers/problem-1-pathway-setup-and-form-filling"
HERE="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "not in the repository"; exit 2; }
MAIN="$(cd "$(git rev-parse --git-common-dir)/.." && pwd)"
whoami_() {
  # lead only on branch main in the primary copy (P-82); a lane branch prefix (screens/, forms/, evidence/,
  # runtime/, qa/, or the existing claude/<lane>-* branches and <lane>-* worktree names) maps to that lane;
  # anything else is unbound, never lead.
  local br; br=$(git -C "$HERE" branch --show-current 2>/dev/null)
  [ "$HERE" = "$MAIN" ] && [ "$br" = main ] && { echo lead; return; }
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
    note() { awk '/^## From the Lead/{on=1; next} /^Command:/{on=0} on' "$1"; }
    pending=""; [ "$f" != "$m" ] && [ "$(note "$m")" != "$(note "$f")" ] && pending="Lead note waiting for sync · "
    item=$(field current_screen "$f"); [ -n "$item" ] || item=$(field current_item "$f")
    sl=$(field current_slice "$f"); [ -n "$sl" ] && item="$item ($sl)"
    nx=$(field next_action "$f" | tr -d '`' | tr '|' '/'); [ ${#nx} -gt 110 ] && nx="${nx:0:107}…"
    bl=$(field blocked_by "$f"); [ -n "$bl" ] && [ "${bl%% *}" != none ] && nx="Blocked: ${bl:0:80}"
    echo "| $ln | $item | $(field stage "$f") | $(field owner "$f") | $pending$nx |"
  done
}
case "$1" in
  whoami) whoami_ ;;
  bind)
    [ "$HERE" = "$MAIN" ] && { echo "This is the Lead's main copy; lanes run in their own copies."; exit 2; }
    echo " $LANES " | grep -q " $2 " || { echo "Lane must be one of: $LANES"; exit 2; }
    cur=$(whoami_); [ "$cur" != unbound ] && [ "$cur" != "$2" ] && { echo "This copy is already the $cur lane. Type: /next $cur"; exit 3; }
    mkdir -p "$HERE/.claude" && echo "$2" > "$HERE/.claude/lane" && echo "bound to $2" ;;
  setup)
    [ "$HERE" = "$MAIN" ] && { echo "main copy: nothing to link"; exit 0; }
    # .tools stays optional (P-82): link it when the primary copy has one (Mac node runtime, venv, PDFs, pg data).
    [ -e "$HERE/.tools" ] || { [ -e "$MAIN/.tools" ] && ln -s "$MAIN/.tools" "$HERE/.tools" && echo "linked .tools"; }
    # Packages: every copy installs its own from the committed lockfile (P-82); a prisma generate here can
    # never touch another copy's client, so the copy-on-write clone step is gone.
    SN="$P/prototype/studio"
    [ -d "$HERE/$SN/node_modules" ] || { echo "installing studio packages (npm ci)"; (cd "$HERE/$SN" && npm ci); }
    git config core.hooksPath .githooks && echo "hooks: core.hooksPath=.githooks" ;;
  sync)
    [ "$HERE" = "$MAIN" ] && { echo "main copy: nothing to sync"; exit 0; }
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
      echo "$ln | stage: ${st:-?} | owner: ${ow:-?} | last commit: ${up:-none} | uncommitted: $dirty | behind main: $(git -C "$wt" rev-list --count HEAD..main 2>/dev/null) | $wt"
    done ;;
  table) table_ ;;
  state)
    [ "$HERE" = "$MAIN" ] || { echo "Only the Lead's main copy writes STATE.md."; exit 2; }
    S="$MAIN/$P/product/STATE.md"; t=$(mktemp); tb=$(mktemp); table_ > "$tb"
    awk -v tf="$tb" '/<!-- lanes:start -->/{print; while ((getline l < tf) > 0) print l; skip=1; next} /<!-- lanes:end -->/{skip=0} !skip' "$S" > "$t" && mv "$t" "$S" && rm -f "$tb" && echo "STATE.md table regenerated" ;;
  *) sed -n 2,10p "$0"; exit 2 ;;
esac
