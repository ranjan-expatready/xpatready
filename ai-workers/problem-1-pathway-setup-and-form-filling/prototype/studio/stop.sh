#!/bin/zsh
# Stops the studio API and the local demo database (data is kept; Reset demo is the way to clear it).
STUDIO="${0:A:h}"; ROOT="${STUDIO:h:h:h:h}"
pkill -f "api/src/main.ts" 2>/dev/null && echo "api stopped"
/opt/homebrew/opt/postgresql@18/bin/pg_ctl -D "$ROOT/.tools/solution-1-prototype/pg18-data" -m fast stop >/dev/null 2>&1 && echo "database stopped"
true
