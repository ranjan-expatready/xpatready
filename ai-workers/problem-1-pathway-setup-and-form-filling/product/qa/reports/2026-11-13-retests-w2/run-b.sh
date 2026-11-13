#!/bin/zsh
# QA-401 by the picker: a fresh copy, headed on the virtual display, then twice headless.
cd "${0:A:h}/../../../../prototype/studio" || exit 2
S=../../product/qa/reports/2026-11-13-retests-w2/shots
zsh tools/isolated.sh qa_r3 4473 start --ttl 60 || exit 2
echo "== headed (DISPLAY=:99)"; DISPLAY=:99 node tests/qa/check_qa401_picker_review.cjs 4473 $S; echo "exit $?"
for i in 1 2; do zsh tools/isolated.sh qa_r3 4473 start --ttl 60 >/dev/null 2>&1; echo "== headless run $i (fresh copy)"; env -u DISPLAY node tests/qa/check_qa401_picker_review.cjs 4473; echo "exit $?"; done
zsh tools/isolated.sh qa_r3 4473 stop
