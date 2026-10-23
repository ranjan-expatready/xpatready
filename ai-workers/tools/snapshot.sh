#!/bin/bash
# Never-lose-work guard (AIW-D204 checkpoint, 17 Oct 2026; coverage extended
# under AIW-D256, 19 Oct 2026).
# Copies every protected Workstream 2 file into archive/ai-workers/snapshots/
# whenever its current content has not been saved before. Runs from the
# SessionStart, PreToolUse and Stop hooks, so the version that existed before
# any edit, by any tool, is kept. Never blocks; always exits 0.
#
# Two lists:
#   FILES  - the original list, paths under ai-workers/, saved as
#            <basename>@<hash10>-<stamp>.<ext> (naming unchanged since 17 Oct).
#   COVER  - Solution 1 specification, rebuild/check dependencies, ledger
#            inputs and outputs, and prototype working files (D256). Paths are
#            relative to the project root. An entry ending in "/" is a folder,
#            covered recursively, including files created later; any other
#            entry may be a shell wildcard. Saved with the path in the name:
#            ai-workers/tools/s3/s3_data.py -> ai-workers__tools__s3__s3_data@<hash10>-<stamp>.py
# A copy is logged "saved" only after the copied file's hash is checked; any
# failure is logged "FAILED" in INDEX.log (and on stderr) and the partial copy
# is removed, so the next run tries again.
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
AW="$ROOT/ai-workers"
DEST="$ROOT/archive/ai-workers/snapshots"
LOG="$DEST/INDEX.log"
if ! mkdir -p "$DEST" 2>/dev/null; then
  echo "snapshot: FAILED cannot create $DEST" >&2
  exit 0
fi

# Speed (Lead, 23 Oct 2026, founder go R-72): one run at a time, and folders are swept only for files changed since
# the last clean run, with a full sweep at least every 6 hours. Before this, every tool call re-hashed ~2,500 files
# (~1.4 GB, including the Studio's runtime data) and overlapping runs drove the machine to load 17-35.
# Lane copies (git worktrees, P-64) are protected by a commit per stage; only the main copy keeps snapshots.
[ -t 0 ] || { hin=$(cat 2>/dev/null); hcwd=$(printf '%s' "$hin" | jq -r '.cwd // empty' 2>/dev/null); }
CHK="${hcwd:-$ROOT}"
[ "$(cd "$CHK" 2>/dev/null && git rev-parse --absolute-git-dir 2>/dev/null)" = "$(cd "$CHK" 2>/dev/null && cd "$(git rev-parse --git-common-dir 2>/dev/null)" 2>/dev/null && pwd -P)" ] || exit 0
LOCK="$DEST/.run.lock"; MARK="$DEST/.last-clean-run"; NEXT="$DEST/.this-run"
if ! mkdir "$LOCK" 2>/dev/null; then
  # Another run is working; it saves the same versions. A lock older than 20 minutes is stale.
  [ -n "$(find "$LOCK" -maxdepth 0 -mmin +20 2>/dev/null)" ] || exit 0
  rm -rf "$LOCK"; mkdir "$LOCK" 2>/dev/null || exit 0
fi
trap 'rm -rf "$LOCK"' EXIT
touch "$NEXT"
NEWER=()
[ -f "$MARK" ] && [ -z "$(find "$MARK" -maxdepth 0 -mmin +360 2>/dev/null)" ] && NEWER=(-newer "$MARK")
FAILED_ANY=0

FILES=(
  "problem-1-pathway-setup-and-form-filling/solution-1-pathway-setup-to-form-filling.html"
  "tools/s2/s2_data.py"
  "tools/s2/s2_exec.html"
  "tools/s2/s2_detail.html"
  "tools/s2/journey.html"
  "problem-1-pathway-setup-and-form-filling/CLAUDE.md"
  "problem-2-ai-across-case-and-business/ai-across-case-and-business.html"
  "NEXT.md"
  "decisions.md"
  "terminology-register.md"
  "research/founder-intent-patterns-2026-10-17.md"
)

P1="ai-workers/problem-1-pathway-setup-and-form-filling"
COVER=(
  # Accepted specification (draft 4.3) and its control records
  "$P1/solution-1-one-pager.html"
  "$P1/README.md"
  "$P1/delivery-control.md"
  "$P1/conflict-table-*.md"
  "$P1/acceptance-card-*.md"
  "$P1/prototype-workflow-proposal-*.md"
  "ai-workers/PROGRESS.md"
  # Authoring home, builder, ledgers, checks, publish copy
  "ai-workers/tools/s3/"
  # Embedded and check-time dependencies
  "ai-workers/illustrations/actor-handoff-demo/bpmn-viewer-18.16.0.min.js"
  "ai-workers/requirements/change-notes/CN-SA-01B.md"
  "ai-workers/requirements/team-change-register-2026-10-13.md"
  # Ledger inputs (frozen earlier sources the *_ledger.py scripts compare against)
  "archive/ai-workers/s3_data-v3-draft1-2026-10-17.py"
  "archive/ai-workers/solution-1-v3-draft3-before-cohesion-2026-10-18/ai-workers/tools/s3/"
  "archive/ai-workers/solution-1-v3-draft4.1-before-desktop-pass-2026-10-18/"
  "ai-workers/illustrations/actor-handoff-demo/draft-4-validator-2026-10-18/inputs-4.2/"
  "ai-workers/illustrations/actor-handoff-demo/draft-4-validator-2026-10-18/manifest-4.2.json"
  # Ledger and check outputs the builder and ledgers regenerate
  "ai-workers/checks/one-pager-*-ledger-*.md"
  "ai-workers/checks/one-pager-*-preservation-*.md"
  "ai-workers/checks/one-pager-*-checks-*.json"
  "ai-workers/checks/one-pager-diagram-geometry-*.json"
  # Prototype working edition and prototype files (covered once they exist)
  "ai-workers/tools/s3-working/"
  "$P1/solution-1-one-pager-working.html"
  "$P1/solution-1-one-pager-prototype-edition.html"
  "$P1/prototype/"
)

# save <absolute source> <snapshot name stem> <path shown in the log>
save() {
  local src="$1" stem="$2" shown="$3" h ext stamp target tmp h2
  h=$(shasum -a 256 "$src" 2>/dev/null | cut -c1-10)
  if [ -z "$h" ]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) FAILED $shown (cannot read or hash)" >> "$LOG" 2>/dev/null
    echo "snapshot: FAILED $shown (cannot read or hash)" >&2
    FAILED_ANY=1
    return
  fi
  # Already saved? (a loop, not ls: safe whether or not nullglob is on)
  for e in "$DEST/${stem}@${h}"*; do [ -e "$e" ] && return; done
  case "$(basename "$src")" in *.*) ext=".${src##*.}" ;; *) ext="" ;; esac
  stamp=$(date +%Y-%m-%dT%H%M)
  target="$DEST/${stem}@${h}-${stamp}${ext}"
  tmp="$DEST/.partial-$$-${stem}"
  if cp -p "$src" "$tmp" 2>/dev/null; then
    h2=$(shasum -a 256 "$tmp" 2>/dev/null | cut -c1-10)
    if [ "$h2" = "$h" ] && mv -f "$tmp" "$target" 2>/dev/null; then
      echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) saved $shown as $(basename "$target")" >> "$LOG" 2>/dev/null
      return
    fi
  fi
  rm -f "$tmp" 2>/dev/null
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) FAILED $shown (copy not saved)" >> "$LOG" 2>/dev/null
  echo "snapshot: FAILED $shown (copy not saved)" >&2
  FAILED_ANY=1
}

for f in "${FILES[@]}"; do
  src="$AW/$f"
  [ -f "$src" ] || continue
  base=$(basename "$f")
  save "$src" "${base%.*}" "ai-workers/$f"
done

# save_cover <path relative to ROOT>
save_cover() {
  local rel="$1" noext
  case "$rel" in archive/ai-workers/snapshots/*) return ;; esac
  case "$(basename "$rel")" in *.*) noext="${rel%.*}" ;; *) noext="$rel" ;; esac
  save "$ROOT/$rel" "$(printf '%s' "$noext" | sed 's#/#__#g')" "$rel"
}

shopt -s nullglob
for pat in "${COVER[@]}"; do
  case "$pat" in
    */)
      [ -d "$ROOT/$pat" ] || continue
      while IFS= read -r -d '' p; do
        save_cover "${p#$ROOT/}"
      done < <(find "$ROOT/${pat%/}" -type f ! -name '.DS_Store' ! -name '*.pyc' ! -path '*/__pycache__/*' ! -path '*/node_modules/*' ! -path '*/studio/var/*' ! -path '*/web/dist/*' ! -name '*.log' "${NEWER[@]}" -print0 2>/dev/null)
      ;;
    *)
      for p in "$ROOT"/$pat; do
        [ -f "$p" ] && save_cover "${p#$ROOT/}"
      done
      ;;
  esac
done
# Advance the mark only after a run with no failure, so a failed copy is retried by the next run.
[ "$FAILED_ANY" = 0 ] && mv -f "$NEXT" "$MARK"
exit 0
