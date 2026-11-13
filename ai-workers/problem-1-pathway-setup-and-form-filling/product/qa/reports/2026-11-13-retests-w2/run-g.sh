#!/bin/zsh
# Self-review record, run 4: the check ticks the self-review box once the server asks for it and presses Approve again (as a person would); fresh copy, headless.
cd "${0:A:h}/../../../../prototype/studio" || exit 2
git log --oneline -1
trap 'zsh tools/isolated.sh qa_r8 4478 stop' EXIT
zsh tools/isolated.sh qa_r8 4478 start --ttl 30 | tail -1
SHOTS=../../product/qa/reports/2026-11-13-retests-w2/shots node tests/qa/check_qa447_self_review_record.cjs 4478; echo "exit $?"
