#!/usr/bin/env bash
# The running test copies: one port per line for every server listening on the lanes' ports 4420-4499 (tech lead,
# runtime, screens, forms, qa; WAY-OF-WORKING "Roles"). The demo (:4400) is not a test copy. Used by isolated.sh (refuses
# a 5th copy) and product/tools/lane-preflight.sh. Usage: bash studio/tools/test-copies.sh [--count]
ports=$(lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | awk '{n = split($9, a, ":"); p = a[n] + 0; if (p >= 4420 && p <= 4499) print p}' | sort -un)
if [ "${1:-}" = --count ]; then printf '%s\n' "$ports" | grep -c .; else printf '%s\n' "$ports" | grep .; fi
exit 0
