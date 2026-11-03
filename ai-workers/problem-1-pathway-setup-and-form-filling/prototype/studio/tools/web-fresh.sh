#!/usr/bin/env bash
# The web bundle must match the code it is served with (QA-181, 3 Nov). A cloud clone bound to an old lane branch built
# web/dist there; after switching to main, isolated copies served 4-day-old screens over today's API, and a time check
# cannot see it (the old bundle was built today, after main's newest web commit). So each build records what it was built
# from: a fingerprint of web/, contracts/, engine/ and package-lock.json (committed and uncommitted content), written to
# web/dist/.source-stamp. vite empties web/dist on every build, so a build that did not stamp leaves no stamp.
#   bash studio/tools/web-fresh.sh stamp    print the sources' fingerprint
#   bash studio/tools/web-fresh.sh ensure   rebuild web/dist unless its stamp equals the sources' fingerprint (exit 1
#                                           when the build fails; isolated.sh then refuses to start)
#   bash studio/tools/web-fresh.sh build    build and stamp (start.sh, cloud-setup.sh)
# bash 3.2 (the Mac) compatible. Test: product/tools/check-lane-bind.sh. US$0.
set -u
STUDIO="$(cd "$(dirname "$0")/.." && pwd)"; cd "$STUDIO" || exit 2
INPUTS="web contracts engine package-lock.json"
STAMP="web/dist/.source-stamp"
if command -v sha256sum >/dev/null 2>&1; then SHA="sha256sum"; else SHA="shasum -a 256"; fi
stamp() {
  # The working content of every tracked or untracked file under the inputs (web/dist is ignored), so committing a change
  # does not alter the fingerprint and a deleted file does.
  local list; list=$(git ls-files -c -o --exclude-standard -- $INPUTS | while IFS= read -r f; do [ -f "$f" ] && printf '%s\n' "$f"; done)
  [ -n "$list" ] || { echo none; return; }
  local hashes; hashes=$(printf '%s\n' "$list" | sed "s|^|$STUDIO/|" | git hash-object --stdin-paths) || return 1   # absolute: git reads these from the top
  printf '%s\n' "$list" | paste - <(printf '%s\n' "$hashes") | LC_ALL=C sort | $SHA | cut -c1-64
}
build() {  # $1: the fingerprint of the sources this build starts from
  # vite's own output goes to var/web-build.log and its end is shown when it fails (#727 m4).
  (cd web && ../node_modules/.bin/vite build > "$STUDIO/var/web-build.log" 2>&1) || { echo "vite build failed (web/dist not rebuilt); the end of var/web-build.log:" >&2; tail -20 "$STUDIO/var/web-build.log" >&2; return 1; }
  printf '%s\n' "$1" > "$STAMP"
}
# One build at a time per copy: a second caller waits, then finds the bundle current.
LOCK="$STUDIO/var/web-build.lock"; mkdir -p "$STUDIO/var"
# A lock whose owner is gone (a killed build) is taken over at once, not after a 5-minute wait (#727 m3).
lock() {
  local i=0 pid
  until mkdir "$LOCK" 2>/dev/null; do
    pid=$(cat "$LOCK/pid" 2>/dev/null); if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then rm -rf "$LOCK"; continue; fi
    [ -z "$pid" ] && find "$LOCK" -maxdepth 0 -mmin +1 -exec rm -rf {} \; 2>/dev/null   # made but never owned
    i=$((i + 1)); [ "$i" -gt 600 ] && { echo "web build lock held over 5 min by pid ${pid:-?}: $LOCK" >&2; return 1; }; sleep 0.5
  done
  echo $$ > "$LOCK/pid"; trap 'rm -rf "$LOCK"' EXIT
}
case "${1:-}" in
  stamp) stamp ;;
  build) lock || exit 1; build "$(stamp)" && echo "web app built" ;;
  ensure)
    want=$(stamp); [ -f web/dist/index.html ] && [ "$(cat "$STAMP" 2>/dev/null)" = "$want" ] && exit 0
    lock || exit 1
    want=$(stamp); [ -f web/dist/index.html ] && [ "$(cat "$STAMP" 2>/dev/null)" = "$want" ] && exit 0
    echo "web bundle does not match web/, contracts/, engine/ (missing, unstamped or built from other code; QA-181): rebuilding" >&2
    build "$want" ;;
  *) echo "usage: web-fresh.sh stamp | ensure | build" >&2; exit 2 ;;
esac
