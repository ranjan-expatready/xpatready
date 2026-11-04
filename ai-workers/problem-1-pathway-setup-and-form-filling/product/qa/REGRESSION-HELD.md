# Regression set: held packs (qa's call)

The protected regression set (P-320 (b), `prototype/studio/tools/works-set.mjs`) re-runs every M2 Works capability's acceptance pack in each merge-queue batch, reading this file on the batch's base. A line below holds a capability (`- C<n.n> <reason>`) or one pack file (`- C<n.n>-name.test.ts <reason>`) out of the set: its pack was red on main, and qa decides whether to demote the row or log a bug. Remove the line when the pack is green again. Each hold names its run.

- C4.8 red on main 5ac8bd71c on the six: 6/11 twice in the merge queue (run 41867612816, checking #883); Submit is refused, "IMM 5707: 5 form fields have no decision … IMM 5409: 13 form fields …". The set runs a pack alone on the six, but C4.8 (a release step) was scored Works on the configured checkpoint (P-322; 11/11, run 41836344209), where qa re-scores it. Held by the qa lane, 4 Nov ~23:05 IST, as a merge-flow fix (P-214). This line goes when the pack's setup decides the leftover IMM 5707 and IMM 5409 boxes through the product route (#883's lane) and the pack is green on the six.

Earlier (qa lane, 4 Nov ~19:15 IST): no pack was held. C11.3 is green on main (26/26, AT-5 reported as held, run 41833528376, after #933); C4.7, C3.6 and C11.12 were Partial, so they were not in the Works set.
