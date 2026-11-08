# Facts: qa re-score of C6.15, C6.18, C6.4, C8.1, C9.5 on main 65fed1e7f, 8 Nov 2026, 04:24–04:40 IST

Recorded by the qa lane (Mac copy). No model call, US$0, no priced button. Every person and value is Sample.

## What was asked
The tech lead (Lead 33, 04:24 IST) asked for the rows named by five PRs merged after the M2-hot list emptied (P-415, #1304): #1268 (C6.15, B137), #1290 (C8.1, B130), #1246 (C6.18, B140), #1222 (C6.4, A6 = B102) and #1252 (C9.5, B145). It asked for a re-score on main's head (P-277), each pack on its verdict's data (P-339). #1251 (C6.6/C6.3, B150) was still queued, so it is not scored here.

## Commit
`origin/main` = **65fed1e7f** (merge of #1252) at 04:24 IST. All five PRs are in it.
* **Mac copies:** each was built from this qa copy's working tree, which was main 65fed1e7f's tree.
* The first four runs print "on b9ee39760": a `git switch` updated the files and the index to 65fed1e7f, but HEAD's write was refused (sandbox), so `git rev-parse HEAD` still named the previous branch.
* `git status` afterwards showed no difference from 65fed1e7f except two `.claude/skills` files (not read by any pack) and `tests/qa/check_qa_explore_1025.cjs` (this PR's edit, not read by any pack). HEAD was then repointed. The later runs print "on 65fed1e7f". At 04:41 IST, `git diff --stat 65fed1e7f -- ai-workers .github` lists only `check_qa_explore_1025.cjs` (edited during the runs, read by no pack), so the copies ran main 65fed1e7f's code.

## Packs on GitHub's runners (P-339)
Run **42422840997**: nightly.yml, `workflow_dispatch` by Lead 33, head 65fed1e7f, capabilities "C6.15 C6.18 C6.4 C8.1 C9.5", `data=checkpoint`; conclusion success. Each job's own lines (`github-42422840997-<cap>.txt`):

| Job | Line | Gate B |
|---|---|---|
| 128554786338 packs (C6.15) | "C6.15.test.ts on the checkpoint: exit 0, 28/28 passed" | passed |
| 128554786263 packs (C6.18) | "C6.18.test.ts on the checkpoint: exit 0, 20/20 passed" | passed |
| 128554786279 packs (C6.4) | "C6.4-screen.test.ts on the checkpoint: exit 0, 17/17 passed"; "C6.4.test.ts on the checkpoint: exit 0, 30/30 passed" | passed |
| 128554786324 packs (C8.1) | "C8.1.test.ts on the checkpoint: exit 0, 14/14 passed" | passed |
| 128554786284 packs (C9.5) | "C9.5.test.ts on the checkpoint: exit 0, 49/49 passed" | passed |

## Packs on Mac copies (independent re-run)
Fresh isolated copy each, then Demo › Reset and Demo › Load the configured checkpoint as the author (gate-b's order), then the pack once (`mac-<cap>-65fed1e7f.txt`):

| Pack | Copy | Result |
|---|---|---|
| C6.15 | qa_r615 :4470 | exit 0, 28/28 |
| C6.18 | qa_r618 :4471 | exit 0, 20/20 |
| C6.4 | qa_r64 :4472 | exit 0, 30/30 |
| C8.1 | qa_r81 :4471 | exit 0, 14/14 |
| C9.5 | qa_r95b :4473, blank copy (its header's run: the pack resets and loads the checkpoint itself) | exit 0, 49/49 |
| C9.5 | qa_r95 :4473, checkpoint loaded first, while three other copies loaded theirs | exit 1, 0/1: its own Load answered 500 |
| C6.4-screen | qa_r64s :4470 | **Not tested on the Mac.** Chrome cannot start in this sandbox ("Failed to create a ProcessSingleton") |

**The C9.5 500:** a later Reset then Load on an already loaded copy (qa_r64w, 04:37 IST, one load at a time) answered 201 and 201, and GitHub's job did the same order with 49/49. So it does not reproduce; it was most likely the four loads at once. The API log of qa_r95 was not kept, so the cause is not shown.

## By screens: QA-226 (C6.4), copy qa_r64w :4472, checkpoint, case officer (user-O), browser pane
Case SAMPLE-VV-FAMILY-1, case page › Documents (page text read at 04:33 IST):
* Each person shows "Age N on 2026-11-02 (the application date)": Client A 36, Partner 35, Child 10, Child 18 or over 19.
* **Child (Sample), 10:** under "May be needed" are the five minor lines, each with its reason and "Answer first, in the Agent view: …". They are: Adoption or guardianship papers; Copy of the absent parent's signed passport or national ID; Copy of the minor's birth certificate; Custody documents; Letter of authorization for a minor. The questions to answer first are "If under 18: what is the custody arrangement for this person" or "If under 18: who is this person travelling to Canada with".
* **Child 18 or over (Sample), 19:** three lines needed; "Not needed now (5)".
* Footer: "Ages are worked out on the application date."
* QA-226's last open part was "the child on SAMPLE-VV-FAMILY-1 gets no minor line by screens; closes with row A6". It is now met.

## By screens: J-B3 for QA-251 (C8.1), same copy, case officer, browser pane at 1024 px (the pane's own size)
* **SAMPLE-VV-FAMILY-1 is on Release 1.** Each of its 13 "Who signs" lines ends "how it is signed is not set on the release's line yet", and the page has 0 Sign and scan blocks. Its header shows "Release 6 of Visitor visa is out … This case stays on Release 1 until you move it."
* **Setup, not under test (P-33):** a new case on the latest release, "Sample Sign A", represented. It was opened with the pack helper `openCase` and its facts filled with `fillEverything` ("all confirmed"). The case header shows "Release 6".
* **IMM 5476's row:** "Who signs: Sample Sign A and the representative of record (Representative (Sample)) · Signed by hand and scanned". Under it, the "Sign and scan" block lists steps 1–4, with only the next step offered.
* **Steps by screens:**
  1. "Generate a copy" on IMM 5476 (click).
  2. "Printed: the copy of 8 Nov, 04:34" (click). It shows done: "Copy of 8 Nov, 04:34 · recorded by Case officer (Sample), 8 Nov, 04:35".
  3. "Signed by hand" (click). Done, recorded by Case officer (Sample), 8 Nov, 04:35.
  4. "Upload the signed scan…": a file input that accepts PDF, JPEG and PNG, up to 20 MB. The pane cannot open the OS file picker, so a 193-byte Sample PDF was given to the input by script; this one step is not by a person's hand. Done: "sample-signed-imm5476.pdf · PDF · 193 bytes · recorded by …", with a "Checksum" disclosure. The block reads "Ready … upload it to IRCC once the filing is Ready to file".
  5. Step 4 said "Cannot start yet: IMM 5476 is uploaded to IRCC only once its filing is Ready to file", with a "Go to Ready to file" link.
  6. The Ready to file panel had 4 open warnings: CRITICAL representative not reviewed; passport copy, fee receipt and financial support not received. Each was passed by keyboard ("Pass with a reason…", focus lands in "Why is this passed?", Tab, Enter) with a test reason. The panel then read "Nothing stands before Ready to file"; pressed "Ready to file" (Enter).
  7. "Uploaded to IRCC" (Enter). The block reads "Done: IMM 5476 is signed, its signed scan is in, and it is uploaded to IRCC."
* **Underneath (psql):**
  * `sign_step` holds print / signed / scan_received / uploaded_to_ircc, each by user-O, at 04:35:10, 04:35:23, 04:35:34 and 04:36:50; only print names a copy; none superseded.
  * `signed_scan` holds one row: sample-signed-imm5476.pdf, application/pdf, 193 bytes, a 64-character sha256.
* Screenshot `c81-sign-and-scan-done-800.jpg`: the Done block, the Ready to file badge and the passed reasons.
* **Not done:** the client's view (the concept says it shows no block); a stale tab; 1440 and 400 px; axe.

## Open bugs that name these rows (`qa/BUGS.md` at 65fed1e7f)
* **C6.15, C6.18, C9.5:** none.
* **C6.4:** QA-226 (Gap · Major; met above). Also QA-254, QA-292, QA-168 and QA-155, all Minor.
* **C8.1:** QA-251 (Gap · Major: the sign-step and signed-scan routes have no caller in `web/src`; now both are called from `web/src/runtime/sign-steps.tsx:113` and `:128`, and walked above). QA-300 (Gap · Major: 17 IMM 5476 representative facts that nobody can answer; owner B107, "no owner yet"; **not re-tested**). The walk's case had its facts filled by the helper, so it says nothing on QA-300.

## Other
* `tests/qa/check_qa_explore_1025.cjs` line 83: B145 makes the case header show `c.release.label` ("Release <pack version>", `contracts/runtime.ts:281`). The step expected `Release <combination version>`. It now reads the pinned version from the API and the label from the pack version.
  * Line 82's "IMM 5707 for …" heading is right on this check's own data: setup_visitor_visa, plus the check's own release 2, which only files IMM 5257 Online.
  * **Not run:** it needs Chrome. Syntax checked with `node --check`.
* Copies: qa_r615, qa_r618, qa_r64, qa_r95, qa_r95b, qa_r64s and qa_r81 stopped in their own commands; database and files removed.
* qa_r64w's stop was refused (a later call's kill, as before). It stops itself at its ttl, about 05:17 IST.
