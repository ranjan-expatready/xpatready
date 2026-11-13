#!/usr/bin/env bash
# PF-7: the walking skeleton's smoke journey against a running container (deploy/compose.test.yml in CI; later the
# Canadian test environment, PF-8). Exit 0 only when every step passes; each step prints PASS or FAIL with what it saw.
#   bash studio/tools/skeleton-smoke.sh <base-url> [--image <image>]
#     1. GET /api/health answers 200 with status "ok" (else the parts that are not well, in the app's own words);
#     2. GET / answers 200 with the web app's page, and the page's script bundle answers 200 (Vite's build is served);
#     3. GET /api/platform/me with the local stand-in's sign-in (contracts §1.2), once PF-4 is on main: run when
#        PLATFORM_ME=required (the workflow sets it when api/src/platform/ exists), else "skipped" in words;
#     with --image (needs docker): 4. the image's user is not root, and the image runs as a non-root uid;
#     5. the image's environment and `docker history` hold nothing secret-shaped (password, secret, token, key names,
#        a private key, a URL with a password in it).
# bash 3.2 compatible (the Mac). Needs curl. Never calls a model; US$0.
set -uo pipefail
BASE="${1:-}"; shift || true
[ -n "$BASE" ] || { echo "usage: skeleton-smoke.sh <base-url> [--image <image>]" >&2; exit 2; }
BASE="${BASE%/}"; IMAGE=""
while [ $# -gt 0 ]; do case "$1" in --image) IMAGE="${2:-}"; shift 2;; *) echo "unknown argument: $1" >&2; exit 2;; esac; done
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
fails=0
pass() { echo "PASS  $*"; }
fail() { echo "FAIL  $*"; fails=$((fails + 1)); }
# get <path> <out-file>: prints the HTTP status ("000" when nothing answered).
get() { curl -sS -o "$2" -w '%{http_code}' --max-time 20 "${@:3}" "$BASE$1" 2>"$TMP/curl.err" || true; }

# 1. health
code=$(get /api/health "$TMP/health.json")
if [ "$code" = 200 ] && grep -q '"status":"ok"' "$TMP/health.json"; then pass "health: GET /api/health 200, status ok"
else
  why=$(grep -oE '"words":"[^"]*"' "$TMP/health.json" 2>/dev/null | sed 's/"words":"//; s/"$//' | paste -sd '|' - | sed 's/|/; /g')
  fail "health: GET /api/health answered $code${why:+ — $why}$( [ "$code" = 000 ] && printf ' — %s' "$(head -c 200 "$TMP/curl.err")")"
fi

# 2. first page and its bundle
code=$(get / "$TMP/page.html")
if [ "$code" = 200 ] && grep -q '<div id="root">' "$TMP/page.html"; then
  pass "first page: GET / 200 with the web app's root"
  js=$(grep -oE 'src="/assets/[^"]+\.js"' "$TMP/page.html" | head -1 | sed 's/^src="//; s/"$//')
  if [ -z "$js" ]; then fail "first page: no /assets/*.js script in the page (was the web app built?)"
  else c2=$(get "$js" "$TMP/bundle.js"); [ "$c2" = 200 ] && [ -s "$TMP/bundle.js" ] && pass "first page: its bundle $js 200" || fail "first page: its bundle $js answered $c2"; fi
else fail "first page: GET / answered $code$(grep -q '<div id="root">' "$TMP/page.html" 2>/dev/null || echo ' without the web app root')"; fi

# 3. who am I (PF-4's local stand-in)
if [ "${PLATFORM_ME:-}" = required ]; then
  code=$(get /api/platform/session/local "$TMP/session.json" -X POST -H 'content-type: application/json' --data "{\"email\":\"${SMOKE_STAFF_EMAIL:-owner@sample-firm.example}\"}")
  token=$(grep -oE '"(token|accessToken)":"[^"]+"' "$TMP/session.json" 2>/dev/null | head -1 | sed -E 's/^"[^"]+":"//; s/"$//')
  if [ -z "$token" ]; then fail "me: the local sign-in POST /api/platform/session/local answered $code without a token"
  else
    code=$(get /api/platform/me "$TMP/me.json" -H "authorization: Bearer $token")
    [ "$code" = 200 ] && grep -q '"firmId"' "$TMP/me.json" && pass "me: GET /api/platform/me 200 with firmId" || fail "me: GET /api/platform/me answered $code"
  fi
else echo "SKIP  me: GET /api/platform/me waits for PF-4 on main (PLATFORM_ME=required runs it)"; fi

# 4-5. the image
if [ -n "$IMAGE" ]; then
  user=$(docker image inspect -f '{{.Config.User}}' "$IMAGE" 2>/dev/null)
  uid=$(docker run --rm --entrypoint id "$IMAGE" -u 2>/dev/null)
  case "$user" in ""|root|0|0:*|root:*) fail "non-root: the image's user is '${user:-unset (root)}'";;
    *) [ -n "$uid" ] && [ "$uid" != 0 ] && pass "non-root: the image runs as '$user' (uid $uid)" || fail "non-root: the image runs as uid '${uid:-?}'";; esac
  SECRET='(password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|credential|anthropic|BEGIN [A-Z ]*PRIVATE KEY|://[^/[:space:]:@]+:[^@[:space:]]+@)'
  docker image inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$IMAGE" > "$TMP/env.txt" 2>/dev/null
  docker history --no-trunc --format '{{.CreatedBy}}' "$IMAGE" > "$TMP/history.txt" 2>/dev/null
  if [ ! -s "$TMP/env.txt" ] || [ ! -s "$TMP/history.txt" ]; then fail "no secret: could not read the image's environment or history"
  # Only the matched words are shown, a password in a URL masked: the log must never repeat the secret it found.
  elif hits=$(grep -hoiE "$SECRET" "$TMP/env.txt" "$TMP/history.txt" | sed -E 's#(://[^:]+:)[^@]+@#\1***@#' | sort -u | head -5 | paste -sd ',' -) && [ -n "$hits" ]; then
    fail "no secret: secret-shaped text in the image's environment or history: $hits"
  else pass "no secret: environment ($(wc -l < "$TMP/env.txt" | tr -d ' ') names) and history ($(wc -l < "$TMP/history.txt" | tr -d ' ') layers) hold nothing secret-shaped"; fi
fi

[ "$fails" = 0 ] && { echo "skeleton smoke: all steps passed ($BASE)"; exit 0; }
echo "skeleton smoke: $fails step(s) failed ($BASE)"; exit 1
