#!/usr/bin/env bash
# Drop left-over test databases (3 Nov: 977 xr_studio_* databases, 13 GB, on the Mac's one PostgreSQL). isolated.sh now
# drops a copy's database on stop; this cleans up copies whose run was killed before it stopped them.
#   bash studio/tools/prune-test-dbs.sh          dry run: list every xr_studio_* database and whether it is stale
#   bash studio/tools/prune-test-dbs.sh --yes    drop the stale ones
# Stale: no connection now, and none of its data files changed in PRUNE_HOURS (default 3). Never dropped, whatever their
# age: a name containing "demo", the lane databases cloud-setup.sh creates (xr_studio_<lane>), and names in PRUNE_KEEP
# (space-separated). PRUNE_MATCH (default xr_studio_) narrows the names looked at (the check uses its own). Each stale
# database is checked again just before it is dropped, and dropped without --force, so one that came back into use in
# between is skipped. Mac and Linux (bash 3.2). Test: product/tools/check-test-dbs.sh. US$0.
set -u
STUDIO="$(cd "$(dirname "$0")/.." && pwd)"; ROOT="$(cd "$STUDIO/../../../.." && pwd)"
export PATH="$ROOT/.tools/node-v24.21.0/bin:/opt/homebrew/opt/postgresql@18/bin:$PATH"
PGARGS=(-h 127.0.0.1 -p "${PRUNE_PGPORT:-54329}" -U xr_studio)
YES=0; [ "${1:-}" = --yes ] && YES=1
[ -z "${1:-}" ] || [ "$1" = --yes ] || { echo "usage: prune-test-dbs.sh [--yes]"; exit 2; }
HOURS="${PRUNE_HOURS:-3}"; case "$HOURS" in ''|*[!0-9]*) echo "PRUNE_HOURS must be a whole number of hours"; exit 2;; esac
LANES="screens forms runtime m3 evidence qa lead scout"
MATCH="${PRUNE_MATCH:-xr_studio_}"; [[ "$MATCH" =~ ^xr_studio_[a-z0-9_]*$ ]] || { echo "PRUNE_MATCH must start with xr_studio_ (letters, digits, _)"; exit 2; }
q() { psql "${PGARGS[@]}" -d postgres -XAtq -v ON_ERROR_STOP=1 -c "$1"; }
q "select 1" >/dev/null 2>&1 || { echo "PostgreSQL is not answering on ${PRUNE_PGPORT:-54329} (studio/start.sh starts it); nothing was dropped"; exit 2; }
DATA=$(q "show data_directory" 2>/dev/null); [ -d "$DATA/base" ] || DATA="$ROOT/.tools/solution-1-prototype/pg18-data"
[ -d "$DATA/base" ] || { echo "cannot find the database files ($DATA/base): no file age to judge by; nothing was dropped"; exit 2; }
protected() {  # $1 database name → why it is never dropped, or nothing
  case "$1" in *demo*) echo "contains demo"; return;; esac
  for l in $LANES; do [ "$1" = "xr_studio_$l" ] && { echo "lane database"; return; }; done
  for k in ${PRUNE_KEEP:-}; do [ "$1" = "$k" ] && { echo "in PRUNE_KEEP"; return; }; done
}
busy() {  # $1 name, $2 oid → why it is in use, or nothing
  local n; n=$(q "select count(*) from pg_stat_activity where datname = '$1'")
  [ "$n" != 0 ] && { echo "$n connection(s)"; return; }
  [ -n "$(find "$DATA/base/$2" -type f -mmin "-$((HOURS * 60))" -print 2>/dev/null | head -1)" ] && echo "files changed in the last $HOURS h"
}
stale=0; dropped=0; kept=0; failed=0
printf '%-44s %8s  %s\n' "database" "size" "verdict"
while IFS='|' read -r name oid size; do
  [ -n "$name" ] || continue
  why=$(protected "$name"); [ -z "$why" ] && why=$(busy "$name" "$oid")
  if [ -n "$why" ]; then kept=$((kept + 1)); printf '%-44s %8s  keep: %s\n' "$name" "$size" "$why"; continue; fi
  stale=$((stale + 1))
  if [ "$YES" = 0 ]; then printf '%-44s %8s  STALE (no connection, no change in %s h): --yes drops it\n' "$name" "$size" "$HOURS"; continue; fi
  why=$(busy "$name" "$oid")   # again, just before dropping
  if [ -n "$why" ]; then printf '%-44s %8s  skipped: %s since the first look\n' "$name" "$size" "$why"; continue; fi
  if dropdb "${PGARGS[@]}" --if-exists "$name" 2>/dev/null; then dropped=$((dropped + 1)); printf '%-44s %8s  dropped\n' "$name" "$size"
  else failed=$((failed + 1)); printf '%-44s %8s  could not drop (in use?)\n' "$name" "$size"; fi
done <<EOF
$(q "select datname || '|' || oid || '|' || pg_size_pretty(pg_database_size(oid)) from pg_database where datname like '$(printf '%s' "$MATCH" | sed 's/_/\\_/g')%' order by datname")
EOF
if [ "$YES" = 1 ]; then echo "$dropped dropped, $failed could not be dropped, $kept kept"
else echo "$stale stale, $kept kept (dry run: nothing dropped; --yes drops the stale ones)"; fi
[ "$failed" = 0 ]
