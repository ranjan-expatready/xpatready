#!/usr/bin/env bash
# gh with a way round a broken TLS (founder, 6 Nov ~03:00 IST: "tools work when gh is broken"; P-363: on the Mac gh fails
# TLS verification, x509 OSStatus -26276, while curl with `gh auth token` works). Runs the real gh; when it fails on TLS,
# the same read is answered by gh-fallback.py through curl, with one line on stderr saying so. Other failures pass
# through unchanged. Tools use it as:  gh() { bash "$TOOLS/gh.sh" "$@"; }   Test: check-gh-fallback.sh.
err=$(mktemp); trap 'rm -f "$err"' EXIT
if [ "${GH_FALLBACK:-auto}" != always ]; then
  out=$(command gh "$@" 2>"$err"); rc=$?
  if [ "$rc" = 0 ] || ! grep -qiE 'x509|certificate|tls:|tls handshake|OSStatus|SSL' "$err"; then
    [ -n "$out" ] && printf '%s\n' "$out"; cat "$err" >&2; exit "$rc"
  fi
  echo "gh: TLS failed ($(head -1 "$err" | cut -c1-120)); answered through curl with gh auth token (P-363)" >&2
fi
python3 -I "$(cd "$(dirname "$0")" && pwd)/gh-fallback.py" "$@"
