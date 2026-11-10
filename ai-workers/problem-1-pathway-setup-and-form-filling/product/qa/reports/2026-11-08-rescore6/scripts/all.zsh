#!/bin/zsh
# One copy at a time on :4470. C7.7 first (P-418), then C7.3, C10.2, qa's QA-153/QA-246 and QA-165 probes, the builders' checks.
SP=<scratchpad>
zsh $SP/rescore6/run_packs.zsh 4470 C7.7 C7.3 C10.2
for f in qa153_246_probe.mts:qa_r153a qa153_246_probe2.mts:qa_r153b qa165_fill.mts:qa_r165a qa165_fill2.mts:qa_r165b; do FILL=${f%%:*} zsh $SP/rescore6/run_probe.zsh ${f##*:} 4470; echo "$f done $(TZ=Asia/Kolkata date +%H:%M)"; done
zsh $SP/rescore6/chk.zsh check_b155_siblings qa_cb155 4470
zsh $SP/rescore6/chk.zsh check_qa165_taiwan_israel_api qa_cq165 4470
