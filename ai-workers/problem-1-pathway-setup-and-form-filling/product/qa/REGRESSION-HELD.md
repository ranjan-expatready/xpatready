# Regression set: held packs (qa's call)

The protected regression set (P-320 (b), `prototype/studio/tools/works-set.mjs`) re-runs every M2 Works capability's acceptance pack in each merge-queue batch, reading this file on the batch's base. A line below holds a capability (`- C<n.n> <reason>`) or one pack file (`- C<n.n>-name.test.ts <reason>`) out of the set: its pack was red on main, and qa decides whether to demote the row or log a bug. Remove the line when the pack is green again. Each hold names its run.

- C6.9 red on main f18fb0e66 on the configured checkpoint: run 42464045938 (job 128679355266, nightly dispatched by the tech lead 8 Nov 14:12 IST) and #1337's batch run 42460302002 (job 128668204613, red twice), each exit 1, 20/21, only C6.9-18. A pack fault since #1246 (C6.18, P-244), not a product fault: QA-312. Remove this line when the pack has the client re-confirm the officer-recorded background answer and is green on main.

- C11.12-runtime.test.ts checkpoint row (P-322): not run on the six, where it is red (exit 2: no released combination there); green on the configured checkpoint (4/4, run 41866440174, main 0ced96dda). Its setup pack `C11.12.test.ts` stays in the set on the six (20/20, run 41879678336), the data the row's setup side counts on, so the row is not moved to the checkpoint in `REGRESSION-DATA.md` (B77 runs a whole row on one data set).

Step hold, not a pack hold (qa lane, 6 Nov ~12:30 IST, at the tech lead's ruling): the C10.1 pack (`C10.1.test.ts`) stays in the set, because it is green with no folder (GitHub, the merge queue): 28/28, run 42175798473 on the configured checkpoint. Inside it, step R12c part B (Download of the four validated IMM 5257 copies, 200 with the saved sha256) prints `HELD … red, held` naming QA-285 (closed): the validated PDFs stay on the Mac (founder ~10:05 IST 6 Nov), so R12c runs only on the Mac with `STUDIO_VALIDATED_DIR` set (qa copy qa_c101f, main fd29643aa: exit 0, 28/28, R12c PASS). The pack checks R12d (the kept-on-the-Mac words) in its place. This line is prose on purpose: a list line naming C10.1 here would take the whole pack out of the set.

Earlier (qa lane, 4 Nov ~19:15 IST): no pack was held. C11.3 is green on main (26/26, AT-5 reported as held, run 41833528376, after #933); C4.7, C3.6 and C11.12 were Partial, so they were not in the Works set.

The hold on the release row (red on the six, run 41867612816) was removed on 5 Nov (qa lane): since #991 (B77) the set runs it on the configured checkpoint, named in `REGRESSION-DATA.md`.
