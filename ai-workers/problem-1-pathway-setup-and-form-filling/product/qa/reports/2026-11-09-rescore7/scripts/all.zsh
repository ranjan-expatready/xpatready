#!/bin/zsh
SP=<scratchpad>
zsh $SP/rescore7/run_packs.zsh 4470 C7.6
FILL=b162_probe.mts zsh $SP/rescore7/run_probe.zsh qa_rb162 4470
zsh $SP/rescore7/chk.zsh check_c76_readiness_api qa_c76a 4470
