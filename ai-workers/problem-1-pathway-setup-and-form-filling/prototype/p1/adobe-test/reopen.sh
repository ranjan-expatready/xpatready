#!/bin/zsh
# Rebuild the complete IMM 1295 copy as version $1 and open only that copy in Adobe Reader (test helper).
cd /Users/ranjansingh/Desktop/Xpatready
.tools/solution-1-prototype/.venv/bin/python -I ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p1/adobe_complete_1295.py "$1" 2>&1 | grep -v -E "padding|incorrect header" | cut -c1-160
pkill -x AdobeReader; pkill -x AdobeAcrobat; sleep 3
open -a "/Applications/Adobe Acrobat DC/Adobe Acrobat.app" "ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p1/adobe-test/imm1295e.complete-$1.append-only-encrypted-diagnostic.pdf"; sleep 8
