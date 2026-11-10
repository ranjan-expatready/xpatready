# Reader verdict: Works for C7.5 and C10.2 (main 87212b14d, nightly 42841699712)

Fresh Opus reader. I ran nothing and only read files and git objects.

## 1. C7.5: Works
* **Main's head on the checkpoint:** job 129918382799 printed "C7.5.test.ts on the checkpoint: exit 0, 16/16 passed" and "Gate B: passed." Condition met (P-339).
* **Independent re-run (P-290):** met. `git diff e562ee06e 87212b14d` shows one file, `samples/validated-imm5257-paper.json`. C7.5's checkpoint load does read it (`200-finished-story.ts`). But it only affects the family case, and only when the Mac PDF is present. GitHub's green run already includes that file. The re-run is gate B 16/16 twice plus the tripwire on the checkpoint, 20/20.
* **Gate A:** PASS on e562ee06e. The walk reaches C7.6, Ready to file.
* **Open Majors:** none. Open Minors: QA-365, QA-367, QA-385. QA-383 is a Major but names C7.8 and C6.19, not C7.5.

## 2. C10.2: Works, if the row says exactly this
P-349 rules that a cloud copy shows the result, not the file, so the PDF never reaches GitHub. Job 129918383052 gave "exit 0, 14/14 passed". The missing two steps, 5b and 6d, print PENDING on GitHub by design: there is no PDF there (P-349, QA-285).
* The row must say they pass on the Mac: 16/16 on db61392dd, with the read-back committed in `samples/validated-imm5257-paper.json`.
* It must not count them green on GitHub (P-334 (6)). It must never say "fixture only" or "Not tested".
* db61392dd differs from main only by C7.5's run files, which C10.2 does not read. GitHub's 14/14 on the head agrees.
* **Gate A:** PASS. The walk reaches C9.5's first step on SAMPLE-VV-THIN-1. Screenshots 02 and 03 show "Validated copy read back" and step 1 "Validated in Adobe: done".
* **Open Majors:** none once QA-361 closes and QA-165 drops C10.2. Open Minors: QA-310, QA-362.

## 3. QA-165 and QA-361
* **QA-361: close.** Its own closing condition was the Lead's re-Validate passing, and it has. The JSON records "passed": true, "read_back_equal": 75, no mismatches, dated 2026-11-10. The fix is #1464, and the check is 4/4 on ddc2a6eb3. The closing note must point to P-442's follow-up (the filler for +1 numbers) and QA-362, because the data fix hides that bug without fixing it.
* **QA-165: narrow it to C7.2. Do not close it.** Its row lists C7.2, whose name includes "barcodes match the facts". The read-back says "barcode_checked": false and covers one copy only. C7.2 is also held by QA-315. Closing it outright would remove a Major from C7.2 with no evidence (P-305 (3)). The Lead should confirm the narrowing, as P-442 did for C7.3.

## 4. Evidence ids each row must cite
* **C7.5:** run 42841699712, job 129918382799 (16/16, checkpoint), main 87212b14d. Re-run on e562ee06e: `gateb-checkpoint-run{1,2}-e562ee06e.txt`, `tripwire-checkpoint-e562ee06e.txt`. Gate A: `2026-11-10-c75/walk-screens.md`. Paid run de49e801, sheet bd4761bdb306, #1496. Supporting only: #1496's own CI run 42824223624.
* **C10.2:** run 42841699712, job 129918383052 (14/14, checkpoint; 5b and 6d PENDING by design). Mac run on db61392dd: `gateb-checkpoint-db61392dd.txt` (16/16). Read-back `samples/validated-imm5257-paper.json` (validated_sha256 8f7ae900…). Then #1495, #1464, `check-qa361-main-ddc2a6eb3.txt` (4/4) and gate A `2026-11-10-c102/walk-screens.md`.

## 5. Discrepancies and notes for the tech lead
* The saved GitHub excerpt does not show the PENDING lines. qa should copy the two lines for 5b and 6d from the full job log so that 14 + 2 = 16 is shown, not inferred.
* The walk says "see the report", but there is no `2026-11-10-c102.md`. Screenshot 03 shows "Print and sign in pen · In progress" and "4. Mailed to IRCC … not recorded" on a filing that reads Filed and Submitted. qa should log this as UX · Minor.
* Item 5 of the 9 Nov list ("Then QA-165 closes") is superseded by the narrowing in point 3.

---
## qa's answers (after the verdict)
* PENDING lines: the full job log of 129918383052 (1,264 lines, read through the GitHub API) holds no step lines at all. `gate-b.mjs` prints only the pack's count (searched for PENDING, 5b, 6d, "validated": none). So 14 + 2 = 16 rests on the pack's code (`acceptance/C10.2.test.ts` lines 51–83: 5b and 6d `ok(...)` only when `validatedPaper`, else a `PENDING` print) and on the Mac run's 16/16, not on a GitHub line. Recorded as such in the row.
* The C10.2 report is written: `qa/reports/2026-11-10-c102.md`. The Paper card's words are logged as QA-386 (UX · Minor).
* QA-361 closed with the P-442 and QA-362 note. QA-165 narrowed to C7.2, and the tech lead is asked to confirm it on the records PR.
