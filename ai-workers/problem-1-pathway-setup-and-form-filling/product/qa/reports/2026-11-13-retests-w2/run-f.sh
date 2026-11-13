#!/bin/zsh
# Self-review record, run 3: as run-e, with the team officers and the page's words after Approve logged (contrast B did not approve in run-e); fresh copy, headless.
cd "${0:A:h}/../../../../prototype/studio" || exit 2
git log --oneline -1
trap 'zsh tools/isolated.sh qa_r7 4477 stop' EXIT
zsh tools/isolated.sh qa_r7 4477 start --ttl 30 | tail -1
SHOTS=../../product/qa/reports/2026-11-13-retests-w2/shots node tests/qa/check_qa447_self_review_record.cjs 4477; echo "exit $?"
