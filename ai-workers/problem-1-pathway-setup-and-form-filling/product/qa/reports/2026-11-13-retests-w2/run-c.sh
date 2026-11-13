#!/bin/zsh
# QA-401 by the picker (part 2, fixed setup): a fresh copy each run; headed once on a virtual display, then twice headless.
cd "${0:A:h}/../../../../prototype/studio" || exit 2
S=../../product/qa/reports/2026-11-13-retests-w2/shots
git log --oneline -1
pgrep -x Xvfb >/dev/null || { Xvfb :99 -screen 0 1600x1100x24 >/dev/null 2>&1 & XV=$!; sleep 2; }
trap 'zsh tools/isolated.sh qa_r4 4475 stop; [[ -n "$XV" ]] && kill $XV' EXIT
echo "== headed (DISPLAY=:99), fresh copy"; zsh tools/isolated.sh qa_r4 4475 start --ttl 30 | tail -1
DISPLAY=:99 node tests/qa/check_qa401_picker_review.cjs 4475 $S; echo "exit $?"
for i in 1 2; do echo "== headless run $i, fresh copy"; zsh tools/isolated.sh qa_r4 4475 start --ttl 30 | tail -1; env -u DISPLAY node tests/qa/check_qa401_picker_review.cjs 4475; echo "exit $?"; done
