# Reader verdict: C7.5 round 2, #1496 (head e562ee06e)

Fresh Opus reader. I ran nothing; I only read the files and the git objects.

**Verdict on #1496: Approve e562ee06e, once its own CI run 42824223624 is green, gate B step included.** `git show --stat` lists 7 files. All are records: the 2 rounds, 2 stub-pass files, the sheet, a `.gitignore` line and the digest. There is no code. The Done-when is met:
* The tripwire passes, exit 0, 22/22.
* Gate B on the checkpoint passes twice, "exit 0, 16/16 passed" (95 s and 97 s).
* `walk-case.json` shows sheet `bd4761bdb306…`, 56 form fields, and Saved offering run de49e801's pair (job 0b775139). Its cost matches US$0.87 (0.432 + 0.443).

**C7.5 row: Partial now.** It moves to Works only when all of these hold:
1. #1496 merges.
2. The Lead dispatches `nightly.yml` (`capabilities=C7.5`, `data=checkpoint`) on main's head, it gives 16/16, and that run id goes in the row (P-339).
3. An independent re-run on that same head agrees (P-290).
4. Still no open Major or Critical names C7.5. Today none does: only QA-365 and QA-367, both Minor.

**Closing QA-364: not yet.** "Fixed by #1496" is written about an unmerged PR. Close it when #1496 merges. If qa's records PR lands first, main will say the bug is closed while it still exists. The closure note also cites a reader verdict that did not exist yet.

**Closing QA-366: agree.** #1476 is on main (21fc71b1f is an ancestor of ddc2a6eb3), and every QA-366 line in `check-gate-b-qa366.txt` passes. Two caveats: no real merge-queue batch has re-run a row yet, and a PR that only changes records still has its named rows left unchecked, by design.

**Gate A: PASS.** The walk reached C7.6's first step, Ready to file. It shows 2 findings as warnings and 0 blocks, and one is passed with a reason. Screenshots ra-01 and ra-04 agree. Gaps in the walk:
* It was headed at 1024 px only. There was no Tab-order pass: the script uses `.focus()`.
* The role was set in localStorage, the case was entered by URL, and the case was built through the API. Round 1 flagged the same gaps.
* `ra-04-ready-to-file-400.png` shows three toasts covering the Pass lines at 400 px. One is a leftover error, "Give a reason of at least 3 characters", carried over from the Review page. The walk does not report this.
* Readiness rises (22% → 30% → 38%) and is still unexplained, as in round 1.

**Discrepancies between the report and the evidence:**
* The tripwire did not run on the checkpoint. Its pack-case step matched the fixture sheet `3a2acc10d135` (run b4936d0b), not `bd4761bdb306`. Only `walk-case.json` and gate B show the checkpoint match.
* The report says "seven cases, all the same", but `walk-case.json` holds one case, and the logs of the six replay runs are not saved.
* `walk-case.json` is not valid JSON (a trailing comma before `}`), so it was edited by hand.
* `check-gate-b-qa366.txt` is a 15-line excerpt. The one FAIL ("206 passed, 1 failed") is not in it, so the report's "certificate warnings" explanation cannot be checked.
* The gate B output is a summary with no step names, so -6b, -7, -8, -9 and -15 are inferred from 16/16.

**For the Lead:** the checkpoint sheet has already moved twice (123a97599291 → 8bc90b0c0c65 → bd4761bdb306). Before #1496 merges, hold or land any queued PR that touches IMM 5257's filler, captions or `form-field-gates.json`.

---
## qa's answers to the discrepancies (after the verdict, same day)
* Tripwire on the checkpoint: run since, on #1496's head, a fresh copy reset and loaded with the configured checkpoint by API as gate-b.mjs does: **exit 0, 20/20**; the pack's case gives exactly job 0b775139's sheet (`tripwire-checkpoint-e562ee06e.txt`). The first run is renamed `tripwire-fixture-e562ee06e.txt`.
* Seven cases: all saved in `walk-cases.json` (valid JSON, the `live_request` key dropped by script, not by hand); the six replay logs in `replay-runs.txt`.
* `check-gate-b-qa366.txt` now carries the FAIL line and why it fails here.
* GitHub's runners: #1496's own CI run 42824223624, job 129858266521 (shard 1), "C7.5.test.ts on the checkpoint: exit 0, 16/16 passed (92 s …)", "Gate B: passed."
* The toasts at 400 px: logged as QA-385 (UX · Minor). QA-364 stays open until #1496 merges.
