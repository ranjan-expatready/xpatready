# Journey test: D3 slice, the Saved field-map answer's edition (reviewer, 2 Nov 2026, commit 6f6e7a40)

* **Setup:** isolated copies on 4481 and 4482 run the PR code. A scratch copy of the merge base 2c6cb092 runs on 4483.
* **Browser:** headless Chrome through Playwright. These are scripted walks of what a person sees, not an unaided person's walk.
* **Cost:** US$0. No `*_LIVE` variable was set, and the spend ledger is unchanged.

## Journeys
1. **Content author, main path.** "I loaded the sample. Which forms already have an AI draft for me to review?"
   * Steps: Demo › Load sample… › Load sample, then Shared library › Forms.
   * Expected: every form with a replayed Saved answer reads "AI draft · N to review".
   * **Held.** IMM 1344, IMM 5257 SCH1, IMM 5409, IMM 5475, IMM 5476 and IMM 5707 show 48 / 29 / 11 / 18 / 24 / 9 to review.
   * On the base commit all six read "Not mapped yet".
2. **Content author.** "Review the AI proposals by form."
   * Steps: To review › Proposals.
   * Expected: each group is titled with the form's edition.
   * **Held.** The groups read, for example, "IMM 5475 (05-2021)" and "IMM 1344 (09-2024)".
   * On the base commit the titles were the model's text cut at 60 characters, for example "IMM 5409 (E): edition date not given in the inventory; confi", and "IMM 1344 (07-2014)" for a 09-2024 file.
3. **Content author, IMM 5257 on Visitor visa.** "Use the saved AI answer for the visitor visa form."
   * Steps: Visitor visa › Forms › IMM 5257 row › Draft with AI › Use the saved AI answer (the 21 Oct run is offered) › Use saved AI answer.
   * **Failed. This gap is older than this PR.**
     * The request returns 400, and a toast says "IMM 5257 is already in this combination's configuration."
     * The Form library still reads "Not mapped yet".
     * The six load's form finder puts IMM 5257 into the configuration first, and the REPLAY plan then skips it (ai.ts:118).
4. **Same goal on the suites' fixture** (`/demo/load` with no body; this is what `check_d3_saved_edition.ts` uses).
   * **Held.** 161 of 242 form fields mapped; all 84 proposals carry IMM 5257 (09-2023); the library reads "AI draft · 84 to review".
   * The model's reading (06-2018) is kept in the job's detail but not shown on any screen.
5. **Error, fail-first.** I ran the same check on the merge base: 6/8, with proposals labelled 06-2018 and the library reading "Not mapped yet". The rule's check fails without the fix.
6. **Recovery and repeat.** Each check ran twice on fresh resets with identical results (8/8, 48/48). C11.13 acceptance on the six sample: 21/21.
7. **Across the screen boundary.** The applied map lands on the library row found by sha256 (sources.ts:799). That is the same row the proposals are now labelled with, so the Form library count and the apply step agree.

## Accessibility and screen sizes
* axe (WCAG 2.2 A/AA): 0 violations on the Draft with AI dialog, the Form library and Proposals.
* The IMM 5257 Form library row has no sideways scroll at 1440, 1024 or 400 px.
* No page errors. The only console error is the 400 in journey 3.
* I did not do a keyboard-only walk.

## Break it (short)
* Old waiting proposals keep their old labels until the next Load sample or Compare again. There is no migration; this is acceptable for the demo.
* For sha 938af318… (imm5475e.pdf), the library label (05-2021) and the manifest (12-2022) disagree. Proposals follow the library, and `source.edition` still follows the manifest (Minor 3 in review.md).
* The check's port 4474 is in qa's range, and `isolated.sh` kills any listener there.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Journeys 1, 2 and 4 held. Journey 3 (IMM 5257 on the Demo sample) did not; the gap is older than this PR. |
| Next step obvious | ½ | "AI draft · N to review" leads to review. The IMM 5257 dialog offers the saved answer, then refuses it. |
| Plain words | 1 | Model text is gone from the group titles (journey 2). |
| Feedback and state | 1 | The library state is correct, and the refusal is shown in a toast. |
| Correct data | 1 | 84/84 proposals on the file's edition. The ledger is unchanged. The apply row matches the label. |
| Error recovery | ½ | Journey 3 gives no way forward. |
| Accessibility and screen sizes | ½ | axe 0 and three widths checked. No keyboard-only walk. |
| Speed | 1 | Each replay finishes in seconds. Load six took 17 s. One query per ingest. |
| Visual quality | 1 | No visual change, and the screenshots are clean. |
| Trust and sources | ½ | "Saved AI answer, US$0" is labelled. The model's misread edition is kept but not shown. |

**7.5/10, no criterion at 0. Below the pass mark of 8.** The points lost come from the older D3 gap, not from this diff.

Fixes that would raise the score, most valuable first:
1. Let Visitor visa's IMM 5257 Saved answer replay on the Demo sample, or stop offering it when it will be refused. This is D3 / QA-144 work.
2. Do a keyboard-only walk.
3. Show the model's edition reading where the AI draft is shown, if the concept wants it.

## Could not test
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* The printed edition inside imm5475e.pdf: it is an XFA form, and pdftotext gives no footer.
