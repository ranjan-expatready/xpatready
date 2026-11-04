# Regression set: held packs (qa's call)

The protected regression set (P-320 (b), `prototype/studio/tools/works-set.mjs`) re-runs every M2 Works capability's acceptance pack in each merge-queue batch, reading this file on the batch's base. A line below holds a capability (`- C<n.n> <reason>`) or one pack file (`- C<n.n>-name.test.ts <reason>`) out of the set: its pack was red on main, and qa decides whether to demote the row or log a bug. Remove the line when the pack is green again. Each hold names its run.

- C11.12-runtime.test.ts checkpoint row (P-322): not run on the six, where it is red (exit 2: no released combination there); green on the configured checkpoint (4/4, run 41866440174, main 0ced96dda). Its setup pack `C11.12.test.ts` stays in the set on the six (20/20, run 41879678336), the data the row's setup side counts on, so the row is not moved to the checkpoint in `REGRESSION-DATA.md` (B77 runs a whole row on one data set).

Earlier (qa lane, 4 Nov ~19:15 IST): no pack was held. C11.3 is green on main (26/26, AT-5 reported as held, run 41833528376, after #933); C4.7, C3.6 and C11.12 were Partial, so they were not in the Works set.

The hold on the release row (red on the six, run 41867612816) was removed on 5 Nov (qa lane): since #991 (B77) the set runs it on the configured checkpoint, named in `REGRESSION-DATA.md`.
