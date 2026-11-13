#!/bin/zsh
# qa retests before walk 2 (13 Nov): one fresh copy, the configured checkpoint (scaffolding, P-33), then QA-397's check and C7.2's pack.
cd "${0:A:h}/../../../../prototype/studio" || exit 2
T=node_modules/.bin/tsx
zsh tools/isolated.sh qa_r2 4472 start --ttl 90 || exit 2
curl -s -X POST -H 'x-actor: user-A' -H 'content-type: application/json' -d '{"confirm":"RESET"}' localhost:4472/api/demo/reset >/dev/null
curl -s -X POST -H 'x-actor: user-A' -H 'content-type: application/json' -d '{"sample":"configured"}' localhost:4472/api/demo/load | head -c 300; echo
echo "== QA-397 check"; $T tests/qa/check_qa397_draft_account_reaches_case.ts 4472 xr_studio_qa_r2; echo "exit $?"
echo "== C7.2 pack on the configured checkpoint"; $T acceptance/C7.2.test.ts 4472 xr_studio_qa_r2; echo "exit $?"
