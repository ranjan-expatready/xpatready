#!/bin/zsh
# Stops the studio API and the local demo database (data is kept; Reset demo is the way to clear it).
STUDIO="${0:A:h}"; ROOT="${STUDIO:h:h:h:h}"
# Only the API on this copy's port (STUDIO_PORT, default 4400); other copies keep running (QA-3).
pids=$(lsof -ti tcp:${STUDIO_PORT:-4400} -sTCP:LISTEN 2>/dev/null); [[ -n "$pids" ]] && kill ${=pids} 2>/dev/null && echo "api stopped"
# The database is shared by every copy: only the demo's own stop (port 4400) stops it (break m8).
[[ "${STUDIO_PORT:-4400}" == 4400 ]] && /opt/homebrew/opt/postgresql@18/bin/pg_ctl -D "$ROOT/.tools/solution-1-prototype/pg18-data" -m fast stop >/dev/null 2>&1 && echo "database stopped"
true
