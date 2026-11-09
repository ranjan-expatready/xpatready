#!/bin/zsh
# One copy at a time on :4470: the two packs, qa's QA-309 probe, the family probe, then the builder's check on its own copy.
R=<home>/Desktop/Xpatready/.claude/worktrees/qa-2026-11-06-m2-walk-c8dd7e
ST=$R/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio
SP=<scratchpad>
zsh $SP/rescore5/run_packs.zsh 4470 C7.3 C10.2
for f in c102_sheet.mts:qa_r309 c102_family.mts:qa_r309f; do FILL=${f%%:*} zsh $SP/rescore5/run_probe.zsh ${f##*:} 4470; echo "$f done $(TZ=Asia/Kolkata date +%H:%M)"; done
cd $ST
(
zsh $ST/tools/isolated-sb.sh qa_r309c 4470 start --ttl 30 || exit 1
trap "zsh $ST/tools/isolated-sb.sh qa_r309c 4470 stop" EXIT
for i in {1..120}; do c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4470/); [ "$c" != 000 ] && break; sleep 2; done
TSX_TSCONFIG_PATH=api/tsconfig.json $R/.tools/node-v24.21.0/bin/node --import tsx tests/check_qa309_online_done.ts 4470 xr_studio_qa_r309c
echo "check exit $?  end $(TZ=Asia/Kolkata date)"
) 2>&1 | grep -vE 'trust settings|nice\(5\)' > $SP/rescore5/mac-check-qa309.txt
echo "check: $(tail -2 $SP/rescore5/mac-check-qa309.txt | tr '\n' ' ')"
