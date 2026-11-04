#!/bin/zsh
# qa2 4 Nov: each check on a fresh isolated copy (port 4480, db xr_studio_qa2_ck), one at a time; exit code and last lines.
cd /Users/ranjansingh/Desktop/Xpatready/.claude/worktrees/qa2-2026-11-04-e3ae2d/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio
export PATH="/Users/ranjansingh/Desktop/Xpatready/.tools/node-v24.21.0/bin:/opt/homebrew/opt/postgresql@18/bin:$PATH"
OUT=$PWD/../../product/qa/reports/2026-11-04-qa2-m2-nopack; mkdir -p $OUT
FAKE=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs
run() { local row=$1 f=$2; shift 2; zsh tools/isolated.sh qa2_ck 4480 start "$@" >/dev/null 2>&1 || { echo "$row $f START-FAILED" >> $OUT/checks.txt; return; }
  local b=${f:t:r}; case $f in *.cjs) node tests/$f 4480 xr_studio_qa2_ck > $OUT/$b.txt 2>&1;; *) ./node_modules/.bin/tsx --tsconfig api/tsconfig.json tests/$f 4480 xr_studio_qa2_ck > $OUT/$b.txt 2>&1;; esac
  local e=$?; echo "$row | $f | exit $e | $(grep -E '[0-9]+/[0-9]+' $OUT/$b.txt | tail -1 | cut -c1-120)" >> $OUT/checks.txt; }
: > $OUT/checks.txt
run C1.1 check_screen01_smallfix.cjs
run C1.2 check_w1_programs_r3.cjs
run C1.4 check_setup_checklist.ts
run C1.8 check_c18_copies.ts
run C1.8 check_c18_copies_browser.cjs
run C1.8 check_c18_age_case.ts
run C2.1 check_forms_pdf_hardening.ts
run C2.2-C2.3 check_forms_p80_guard.ts
run C3.1 check_forms_c31_formats.ts
run C3.1 check_forms_c31_acceptance.ts STUDIO_FAKE_LAUNCHER=$FAKE
run C3.3 check_forms_c33_acceptance.ts STUDIO_FAULT_SOURCE=imm5707e.pdf STUDIO_FAKE_LAUNCHER=$FAKE
run C3.3 check_forms_c33_failed_run_browser.ts STUDIO_FAULT_SOURCE=imm5707e.pdf STUDIO_FAKE_LAUNCHER=$FAKE
run C3.5 check_forms_channels.ts
run C3.7 check_forms_s4_library_browser.cjs
run C3.7 check_w1_structure.ts
zsh tools/isolated.sh qa2_ck 4480 stop >/dev/null 2>&1; dropdb -h 127.0.0.1 -p 54329 -U xr_studio --if-exists xr_studio_qa2_ck 2>/dev/null
git status --short -- . | head -20 > $OUT/git-status-after.txt
echo DONE >> $OUT/checks.txt
