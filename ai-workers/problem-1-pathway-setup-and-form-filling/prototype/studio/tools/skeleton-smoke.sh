#!/usr/bin/env bash
# PF-7: the walking skeleton's smoke journey against a running container (deploy/compose.test.yml in CI; later the
# Canadian test environment, PF-8). Exit 0 only when every step passes; each step prints PASS or FAIL with what it saw.
#   bash studio/tools/skeleton-smoke.sh <base-url> [--image <image>]
#     1. GET /api/health answers 200 with status "ok" (else the parts that are not well, in the app's own words);
#     2. GET / answers 200 with the web app's page, and the page's script bundle answers 200 as JavaScript (the SPA
#        fallback answers any missing path with the page itself, so a 200 alone proves nothing: review Minor 1);
#     3. GET /api/platform/me after the local stand-in's sign-in (contracts §1.2), once PF-4 is on main: run when
#        PLATFORM_ME=required (the workflow sets it when PF-4's api/src/features/platform-identity.ts exists), else
#        "SKIP" in words. The sign-in body is {"email": SMOKE_STAFF_EMAIL} (default: a seeded Sample staff member of
#        samples/firms.json); PF-4 adjusts this step to its own request shape if it differs;
#     with --image (needs docker): 4. the image's user is not root, and the image runs as a non-root uid;
#     5. the image's environment and `docker history` hold nothing secret-shaped: secret-sounding names (password,
#        secret, token, credential, any NAME ending in KEY, _SK, _PASS or _PWD), and secret-shaped values (a private
#        key, a URL with a password, Stripe sk_/rk_/whsec_, AWS AKIA…, GitHub gh?_…, a JWT eyJ….…, Slack xox?-…).
#        What it finds is shown masked: the log never repeats a secret.
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
# get <path> <out-file> [curl args]: prints the HTTP status ("000" when nothing answered); headers in <out-file>.h.
get() { curl -sS -o "$2" -D "$2.h" -w '%{http_code}' --max-time 20 "${@:3}" "$BASE$1" 2>"$TMP/curl.err" || true; }

# 1. health
code=$(get /api/health "$TMP/health.json")
if [ "$code" = 200 ] && grep -q '"status":"ok"' "$TMP/health.json"; then pass "health: GET /api/health 200, status ok"
else
  # Only the parts that are not well ("ok":false), in the app's words.
  why=$(grep -oE '"ok":false[^}]*"words":"[^"]*"' "$TMP/health.json" 2>/dev/null | sed -E 's/.*"words":"//; s/"$//' | paste -sd '|' - | sed 's/|/; /g')
  fail "health: GET /api/health answered $code${why:+ — $why}$( [ "$code" = 000 ] && printf ' — %s' "$(head -c 200 "$TMP/curl.err")")"
fi

# 2. first page and its bundle
code=$(get / "$TMP/page.html")
if [ "$code" = 200 ] && grep -q '<div id="root">' "$TMP/page.html"; then
  pass "first page: GET / 200 with the web app's root"
  js=$(grep -oE 'src="/assets/[^"]+\.js"' "$TMP/page.html" | head -1 | sed 's/^src="//; s/"$//')
  if [ -z "$js" ]; then fail "first page: no /assets/*.js script in the page (was the web app built?)"
  else
    c2=$(get "$js" "$TMP/bundle.js"); ct=$(grep -i '^content-type:' "$TMP/bundle.js.h" | tail -1 | tr -d '\r' | sed 's/^[^:]*: *//')
    if [ "$c2" = 200 ] && printf '%s' "$ct" | grep -qi javascript && [ -s "$TMP/bundle.js" ] && ! head -c 64 "$TMP/bundle.js" | grep -qi '<!doctype\|<html'; then
      pass "first page: its bundle $js 200 ($ct)"
    else fail "first page: its bundle $js answered $c2 as '${ct:-no content type}' (not the JavaScript bundle)"; fi
  fi
else fail "first page: GET / answered $code$(grep -q '<div id="root">' "$TMP/page.html" 2>/dev/null || echo ' without the web app root')"; fi

# 3. who am I (PF-4's local stand-in)
if [ "${PLATFORM_ME:-}" = required ]; then
  code=$(get /api/platform/session/local "$TMP/session.json" -X POST -H 'content-type: application/json' --data "{\"email\":\"${SMOKE_STAFF_EMAIL:-representative@sample-firm.example.com}\"}")
  token=$(grep -oE '"(token|accessToken)":"[^"]+"' "$TMP/session.json" 2>/dev/null | head -1 | sed -E 's/^"[^"]+":"//; s/"$//')
  if [ -z "$token" ]; then fail "me: the local sign-in POST /api/platform/session/local answered $code without a token"
  else
    code=$(get /api/platform/me "$TMP/me.json" -H "authorization: Bearer $token")
    if [ "$code" = 200 ] && grep -q '"firmId"' "$TMP/me.json"; then pass "me: GET /api/platform/me 200 with firmId"; else fail "me: GET /api/platform/me answered $code"; fi
  fi
else echo "SKIP  me: GET /api/platform/me waits for PF-4 on main (PLATFORM_ME=required runs it)"; fi

# 4-5. the image
if [ -n "$IMAGE" ]; then
  user=$(docker image inspect -f '{{.Config.User}}' "$IMAGE" 2>/dev/null)
  uid=$(docker run --rm --entrypoint id "$IMAGE" -u 2>/dev/null)
  case "$user" in ""|root|0|0:*|root:*) fail "non-root: the image's user is '${user:-unset (root)}'";;
    *) if [ -n "$uid" ] && [ "$uid" != 0 ]; then pass "non-root: the image runs as '$user' (uid $uid)"; else fail "non-root: the image runs as uid '${uid:-?}'"; fi;; esac
  docker image inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$IMAGE" > "$TMP/env.txt" 2>/dev/null
  docker history --no-trunc --format '{{.CreatedBy}}' "$IMAGE" > "$TMP/history.txt" 2>/dev/null
  if [ ! -s "$TMP/env.txt" ] || [ ! -s "$TMP/history.txt" ]; then fail "no secret: could not read the image's environment or history"
  else
    # Names (shown as NAME=***): any case for the words; upper case for the endings, so "--recv-keys" or "keyserver"
    # in the base image's own history are not names.
    names=$( { grep -hoiE '[a-z0-9_]*(password|passwd|secret|token|credential|api[_-]?key|access[_-]?key|private[_-]?key)[a-z0-9_]*=' "$TMP/env.txt" "$TMP/history.txt"
               grep -hoE '\b[A-Z0-9_]*(KEY|_SK|_PASS|_PWD)=' "$TMP/env.txt" "$TMP/history.txt"; } | sed 's/=$/=***/')
    # Values (shown as their first characters and ***).
    values=$(grep -hoE 'BEGIN [A-Z ]*PRIVATE KEY|://[^/[:space:]:@]+:[^@[:space:]]+@|(sk|rk)_(live|test)_[A-Za-z0-9]{6,}|whsec_[A-Za-z0-9]{6,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+|xox[abprs]-[A-Za-z0-9-]{6,}' "$TMP/env.txt" "$TMP/history.txt" \
      | sed -E 's#^(://[^:]+:).*@$#\1***@#; /^:\/\//!{/PRIVATE KEY/!s/^(.{5}).*/\1***/}')
    hits=$(printf '%s\n%s\n' "$names" "$values" | grep . | sort -u | head -8 | paste -sd ',' -)
    if [ -n "$hits" ]; then fail "no secret: secret-shaped text in the image's environment or history: $hits"
    else pass "no secret: environment ($(wc -l < "$TMP/env.txt" | tr -d ' ') names) and history ($(wc -l < "$TMP/history.txt" | tr -d ' ') layers) hold nothing secret-shaped"; fi
  fi
fi

[ "$fails" = 0 ] && { echo "skeleton smoke: all steps passed ($BASE)"; exit 0; }
echo "skeleton smoke: $fails step(s) failed ($BASE)"; exit 1
