# Regression set: held packs (qa's call)

The protected regression set (P-320 (b), `prototype/studio/tools/works-set.mjs`) re-runs every M2 Works capability's acceptance pack in each merge-queue batch, reading this file on the batch's base. A line below holds a capability (`- C<n.n> <reason>`) or one pack file (`- C<n.n>-name.test.ts <reason>`) out of the set: its pack was red on main, and qa decides whether to demote the row or log a bug. Remove the line when the pack is green again. Each hold names its run.

- C4.8 checkpoint row (P-322): not run on the six, where it is red (6/11, run 41867612816, a release step the six do not reach); green on the configured checkpoint on main 5ac8bd71c (11/11, run 41876041638). Corrected P-339 (4): a row counts on the data its verdict counts on. This line goes when the set runs checkpoint rows on the checkpoint (B77).
- C11.12-runtime.test.ts checkpoint row (P-322): not run on the six, where it is red (exit 2: no released combination there); green on the configured checkpoint (4/4, run 41866440174, main 0ced96dda). Its setup pack `C11.12.test.ts` stays in the set (20/20 on the six). This line goes with B77.

Earlier (qa lane, 4 Nov ~19:15 IST): no pack was held. C11.3 is green on main (26/26, AT-5 reported as held, run 41833528376, after #933); C4.7, C3.6 and C11.12 were Partial, so they were not in the Works set.
