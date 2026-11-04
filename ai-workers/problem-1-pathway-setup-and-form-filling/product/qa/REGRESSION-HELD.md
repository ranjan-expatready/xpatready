# Regression set: held packs (qa's call)

The protected regression set (P-320 (b), `prototype/studio/tools/works-set.mjs`) re-runs every M2 Works capability's acceptance pack in each merge-queue batch, reading this file on the batch's base. A line below holds a capability (`- C<n.n> <reason>`) or one pack file (`- C<n.n>-name.test.ts <reason>`) out of the set: its pack was red on main, and qa decides whether to demote the row or log a bug. Remove the line when the pack is green again. Each hold names its run.

- C11.3 red on main, re-test run 41788362078 (4 Nov 12:38 IST): C11.3.test.ts on the six 26/27, AT-5 (the AI "did you mean" says AI is switched off on this copy)
- C11.12-runtime.test.ts red on main, re-test run 41788362078 (4 Nov 12:38 IST): it calls the Mac's psql path and needs the suites' fixture (C11.12.test.ts is 20/20 on the six; QA-215)
- C4.7 red on main, re-test run 41788362078 (4 Nov 12:38 IST): C4.7.test.ts on the six exits 2 (setup missing or refused)
- C3.6 red on main, re-test run 41788362078 (4 Nov 12:38 IST): C3.6.test.ts on the six exits 2 (setup missing or refused)
