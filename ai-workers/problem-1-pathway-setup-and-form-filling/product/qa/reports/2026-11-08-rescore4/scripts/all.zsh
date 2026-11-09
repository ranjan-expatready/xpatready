#!/bin/zsh
# One copy at a time on :4470: the packs (each its own copy), then QA-165 runs 1 and 2 and the QA-309 probe (each its own copy).
zsh <scratchpad>/rescore4/run_packs.zsh 4470 C7.2 C7.3 C7.6 C7.7
for f in qa165_fill.mts:qa_r165a qa165_fill2.mts:qa_r165b c102_sheet.mts:qa_r309; do FILL=${f%%:*} zsh <scratchpad>/rescore4/run_qa165.zsh ${f##*:} 4470; echo "$f done $(TZ=Asia/Kolkata date +%H:%M)"; done
