#!/usr/bin/env bash
# Guard 5 (founder, 6 Nov ~03:00 IST): tools work when gh is broken. A stand-in gh fails TLS the way the Mac's did
# (x509 OSStatus -26276) but still gives `gh auth token`; a stand-in curl answers GitHub from fixtures. factory-board.sh
# must print the board, not TLS errors (that night it printed only errors); gh.sh's reads are checked one by one; a
# working gh, or a failure that is not TLS, never falls back. No network, US$0.
#   bash product/tools/check-gh-fallback.sh
set -u
. "$(dirname "$0")/guard-test-lib.sh"
command -v jq >/dev/null && command -v python3 >/dev/null || { echo "jq or python3 is missing; nothing was checked"; exit 2; }
T=$(mktemp -d "${TMPDIR:-/tmp}/guard.XXXXXXXX") && [ -d "$T" ] || { echo "no temp dir: nothing was checked"; exit 2; }; trap 'rm -rf "$T"' EXIT; mkdir "$T/bin"
cat > "$T/bin/gh" <<'EOF'
#!/bin/bash
echo "gh $*" >> "$FX/gh.log"
[ "$1 $2" = "auth token" ] && { echo tok123; exit 0; }
[ "${FAKE_GH:-tls}" = ok ] && { echo '[{"number":1}]'; exit 0; }
[ "${FAKE_GH:-tls}" = 404 ] && { echo "HTTP 404: Not Found (https://api.github.com/repos/o/r/pulls/9)" >&2; exit 1; }
echo 'Post "https://api.github.com/graphql": tls: failed to verify certificate: x509: OSStatus -26276' >&2; exit 1
EOF
cat > "$T/bin/curl" <<'EOF'
#!/bin/bash
m=GET; u=""; hdr=""; auth=""; body=""; echo "$*" >> "$FX/argv.log"
while [ $# -gt 0 ]; do case "$1" in -X) m=$2; shift;; -D) hdr=$2; shift;; -H) case "$2" in Authorization*) auth=$2;; @*) auth=$(grep Authorization "${2#@}");; esac; shift;;
  --data-binary) body=$(cat); shift;; http*) u=$1;; esac; shift; done
echo "$m $u | $auth | $body" >> "$FX/curl.log"; : > "$hdr"
case "$u" in
  */graphql) case "$body" in
      *pullRequest\(number*) cat "$FX/view.json";;
      *search\(type*) cat "$FX/search.json";;
      *) echo '{"data":{"viewer":{"login":"me"}}}';; esac;;
  */actions/runs*) cat "$FX/runs.json";;
  */issues/1/events) echo "link: <https://api.test/repos/o/r/issues/1/events?page=2>; rel=\"next\"" > "$hdr"; echo '[{"event":"labeled"},{"event":"x"}]';;
  */issues/1/events?page=2) echo '[{"event":"labeled"}]';;
  *) echo '{}';;
esac
EOF
chmod +x "$T/bin/"*
now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
cat > "$T/search.json" <<EOF
{"data":{"search":{"pageInfo":{"hasNextPage":false,"endCursor":null},"nodes":[
 {"number":1052,"title":"forms: C10.1 (steps F10) — Family sponsorship set up","isDraft":false,"body":"x","labels":{"nodes":[{"name":"review: approved"}]},
  "comments":{"nodes":[]},"scr":{"nodes":[{"commit":{"statusCheckRollup":{"contexts":{"nodes":[{"__typename":"CheckRun","name":"ci","status":"COMPLETED","conclusion":"SUCCESS"}]}}}}]}},
 {"number":1131,"title":"runtime: QA-271 (C6.1) — B115 the sponsor","isDraft":false,"body":"x","labels":{"nodes":[]},
  "comments":{"nodes":[]},"scr":{"nodes":[{"commit":{"statusCheckRollup":{"contexts":{"nodes":[{"__typename":"CheckRun","name":"ci","status":"COMPLETED","conclusion":"FAILURE"}]}}}}]}}]}}}
EOF
echo '{"data":{"repository":{"pullRequests":{"nodes":[{"number":1052,"commits":{"nodes":[{"commit":{"committedDate":"'"$now"'"}}]}},{"number":1131,"commits":{"nodes":[{"commit":{"committedDate":"'"$now"'"}}]}}]}}}}' > "$T/gql-dates.json"
echo '{"data":{"repository":{"pullRequest":{"number":1052,"files":{"nodes":[{"path":"a.ts","additions":1,"deletions":0}]},"mergeable":"MERGEABLE"}}}}' > "$T/view.json"
echo '{"workflow_runs":[{"id":42,"status":"completed","conclusion":"success","head_branch":"main","created_at":"'"$now"'"},{"id":43,"status":"queued","conclusion":null,"head_branch":"x","created_at":"'"$now"'"}]}' > "$T/runs.json"
# factory-board's own graphql (the push dates) goes through `gh api graphql`: answer it with the dates fixture.
sed -i.bak 's#\*) echo .{"data":{"viewer":{"login":"me"}}}.;;#*) cat "$FX/gql-dates.json";;#' "$T/bin/curl"
run() { out=$(env -u GH_TOKEN -u GITHUB_TOKEN PATH="$T/bin:$PATH" FX="$T" "$@" 2>"$T/err"); r=$?; err=$(cat "$T/err"); }
GH="$TOOLS/gh.sh"

run bash "$TOOLS/factory-board.sh"
ok "factory-board with gh failing TLS prints the board (#1052 in the queue, #1131 red)" "$(echo "$out" | grep -q '#1052 .*Merge queue' && echo "$out" | grep -q '#1131 .*CI red' && echo 1)" "exit $r: $out / $err"
ok "... and says once per call that it went through curl, not a wall of TLS errors" "$( ! echo "$out" | grep -q x509 && echo "$err" | grep -q 'answered through curl' && echo 1)" "$err"
ok "... with gh's own token on every request" "$( ! grep -v 'Bearer tok123' "$T/curl.log" | grep -q . && echo 1)" "$(cat "$T/curl.log")"
ok "... and never on curl's command line, where ps shows it (review m8)" "$( ! grep -q tok123 "$T/argv.log" && echo 1)" "$(grep tok123 "$T/argv.log" | head -1)"

run bash "$GH" pr list --state merged --search "merged:>=2026-11-06T00:00:00Z" --json number,title -q '.[]|"#\(.number)"'
ok "pr list --state merged --search: a GraphQL search with is:merged and the terms, --jq applied" "$([ $r = 0 ] && echo "$out" | grep -qx '#1052' && tail -1 "$T/curl.log" | grep -q 'is:pr is:merged merged:>=2026-11-06T00:00:00Z' && echo 1)" "exit $r: $out $err"
run bash "$GH" pr view 1052 --json files,mergeable --jq '.files[].path'
ok "pr view --json files --jq" "$([ $r = 0 ] && [ "$out" = a.ts ] && echo 1)" "exit $r: $out $err"
run bash "$GH" run list --limit 2 --json databaseId,status,headBranch
ok "run list --json maps the REST names to gh's" "$([ $r = 0 ] && echo "$out" | jq -e '.[1] == {databaseId:43,status:"queued",headBranch:"x"}' >/dev/null && echo 1)" "exit $r: $out $err"
run bash "$GH" api repos/o/r/issues/1/events --paginate --jq '[.[]|select(.event=="labeled")]|length'
ok "api --paginate follows the Link header and joins the pages" "$([ $r = 0 ] && [ "$out" = 2 ] && echo 1)" "exit $r: $out $err"
run bash "$GH" repo view --json nameWithOwner -q .nameWithOwner
ok "repo view reads the repository from git, with no request" "$([ $r = 0 ] && echo "$out" | grep -qE '^[^/]+/[^/]+$' && echo 1)" "exit $r: $out $err"
run bash "$GH" pr merge 1052
ok "a write it does not cover (pr merge) is refused by name, exit 4" "$([ $r = 4 ] && echo "$err" | grep -q "'gh pr merge' is not covered" && echo 1)" "exit $r: $err"
: > "$T/curl.log"; FAKE_GH=ok run bash "$GH" pr list --json number
ok "a working gh is used as it is (no curl)" "$([ $r = 0 ] && [ "$out" = '[{"number":1}]' ] && [ ! -s "$T/curl.log" ] && echo 1)" "exit $r: $out"
FAKE_GH=404 run bash "$GH" pr view 9 --json number
ok "a failure that is not TLS keeps gh's error and exit code (no fallback)" "$([ $r = 1 ] && echo "$err" | grep -q 'HTTP 404' && [ ! -s "$T/curl.log" ] && echo 1)" "exit $r: $err"
for f in factory-board.sh lead-watch.sh flow-watch.sh; do
  # every gh call in a tool goes through gh.sh: the function is defined before the first call
  first=$(grep -nE '(^|[$( ;|])gh (api|pr|repo|run|search) |\["gh"' "$TOOLS/$f" | head -1 | cut -d: -f1)
  def=$(grep -nE 'gh\(\) \{ bash "\$TOOLS/gh.sh"|tools \+ "/gh.sh"' "$TOOLS/$f" | head -1 | cut -d: -f1)
  ok "$f sends gh through gh.sh" "$([ -n "$def" ] && { [ -z "$first" ] || [ "$def" -le "$first" ]; } && ! grep -q '\["gh",' "$TOOLS/$f" && echo 1)" "gh.sh at line ${def:-none}, first gh call at ${first:-none}"
done
finish
