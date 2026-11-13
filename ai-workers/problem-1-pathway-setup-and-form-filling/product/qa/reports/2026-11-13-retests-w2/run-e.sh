#!/bin/zsh
# Self-review record (P-154, P-510 (4)): QA-447 W5 with contrast case B (the Representative as the only officer) and the fixed preparer assertion; fresh copy, headless.
cd "${0:A:h}/../../../../prototype/studio" || exit 2
git log --oneline -1
trap 'zsh tools/isolated.sh qa_r6 4476 stop' EXIT
zsh tools/isolated.sh qa_r6 4476 start --ttl 30 | tail -1
node tests/qa/check_qa447_self_review_record.cjs 4476; echo "exit $?"
