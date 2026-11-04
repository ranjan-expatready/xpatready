# Regression set: held packs (qa's call)

The protected regression set (P-320 (b), `prototype/studio/tools/works-set.mjs`) re-runs every M2 Works capability's acceptance pack in each merge-queue batch, reading this file on the batch's base. A line below holds a capability (`- C<n.n> <reason>`) or one pack file (`- C<n.n>-name.test.ts <reason>`) out of the set: its pack was red on main, and qa decides whether to demote the row or log a bug. Remove the line when the pack is green again. Each hold names its run.

No pack is held (qa lane, 4 Nov ~19:15 IST): C11.3 is green on main (26/26, AT-5 reported as held, run 41833528376, after #933); C4.7, C3.6 and C11.12 are Partial, so they are not in the Works set.
