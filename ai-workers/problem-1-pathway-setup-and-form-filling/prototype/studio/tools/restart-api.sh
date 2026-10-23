#!/bin/zsh
# Development helper: restart the studio API (the web app is served from web/dist by the same process).
cd "${0:A:h}/.."
export PATH="${0:A:h}/../../../../../.tools/node-v24.21.0/bin:$PATH"
pkill -f "studio/api/src/main.ts" 2>/dev/null; pkill -f "api/src/main.ts" 2>/dev/null; sleep 1
nohup ./node_modules/.bin/tsx --tsconfig api/tsconfig.json api/src/main.ts > var/api.log 2>&1 &
for i in {1..40}; do curl -s -o /dev/null localhost:${STUDIO_PORT:-4400}/api/session && { echo "api up"; exit 0; }; sleep 0.5; done
echo "api did not start"; tail -30 var/api.log; exit 1
