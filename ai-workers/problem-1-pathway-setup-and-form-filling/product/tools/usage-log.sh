#!/bin/bash
# Append one weekly-plan reading to cockpit/usage-log.tsv (P-602 (4)): the board's "24 h: % of a weekly plan used" reads it.
# One line per Lead check: time_ist (the time of logging, TZ=Asia/Kolkata date, ISO with +05:30: run it right after reading
# the percent), weekly_pct, account, by (the Lead's "Lead N" from tools/current-lead.sh). Refuses a percent that is not a
# whole number from 0 to 100, an account that is not one word, and a name with a tab or a line break. Adds a line break
# first when the file does not end with one.
# Commit the file with the records (the board reads it at the records sha).
# Usage: bash product/tools/usage-log.sh <weekly_pct> <account>      e.g. bash product/tools/usage-log.sh 66 A1
# USAGE_LOG_FILE and USAGE_LOG_BY override the file and the name (tests only).
set -u
pct="${1:-}"; acct="${2:-}"
[ $# -eq 2 ] || { echo "usage: usage-log.sh <weekly_pct> <account>" >&2; exit 2; }
[[ "$pct" =~ ^[0-9]{1,3}$ ]] && [ "$((10#$pct))" -le 100 ] || { echo "usage-log: weekly_pct '$pct' is not a whole number from 0 to 100; nothing written" >&2; exit 2; }
[[ "$acct" =~ ^[A-Za-z0-9_-]+$ ]] || { echo "usage-log: account '$acct' must be one word (letters, digits, - or _); nothing written" >&2; exit 2; }
here="$(cd "$(dirname "$0")" && pwd)"
file="${USAGE_LOG_FILE:-$here/../cockpit/usage-log.tsv}"
by="${USAGE_LOG_BY:-$(bash "$here/current-lead.sh" 2>/dev/null | grep -oE 'Lead [0-9]+' | head -1)}"
[ -n "$by" ] || { echo "usage-log: tools/current-lead.sh gave no \"Lead N\" name; nothing written" >&2; exit 1; }
case "$by" in *$'\t'*|*$'\n'*|*$'\r'*) echo "usage-log: the name contains a tab or a line break; nothing written" >&2; exit 2;; esac
t="$(TZ=Asia/Kolkata date +%Y-%m-%dT%H:%M:%S)+05:30"
if [ -s "$file" ]; then
  [ "$(tail -c 1 "$file" | od -An -c | tr -d ' ')" = '\n' ] || printf '\n' >> "$file"
else
  printf 'time_ist\tweekly_pct\taccount\tby\n' > "$file"
fi
printf '%s\t%s\t%s\t%s\n' "$t" "$((10#$pct))" "$acct" "$by" >> "$file"
echo "usage-log: $t $((10#$pct))% $acct ($by) appended to $(basename "$file")"
