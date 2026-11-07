# B149 journey test: reviewer, 7 Nov 2026 (PR #1261, commit e9f2e6e79)

**Copy:** isolated `rev_b149` on :4447, stopped and dropped afterwards. Live AI off, US$0.
**Persona:** case officer of the Sample firm, with the representative of record on the case.
**Script:** `journey_b149.mts` and `j3.mts` in the reviewer's scratchpad (not committed). Playwright Chromium, axe WCAG 2.2 A/AA, 1440, 1024 and 400 px, and 720 × 450 as the 200 % zoom stand-in.
**Screenshots:** the reviewer's scratchpad `shots/` (J1–J6, local evidence only, not committed).

## Journeys
| # | Persona · goal | Steps | Result |
|---|---|---|---|
| J1 main | Case officer: "record the filings and attach IRCC's Transaction Approved page" | Record the submission… (Enter) → numbers → Tab to "IRCC's "Transaction Approved" page (optional)" → choose a PDF → Record the submission (Enter) | Holds. Recorded. The principal's filing reads "Transaction Approved page: transaction-approved-R.pdf (PDF, 1 KB; uploaded by Case officer, …)". One row, none on the spouse's filing, one audit line. Focus goes back to the panel heading. Axe 0 on the dialog and on the recorded state. |
| J2 alternate | Case officer: "add the spouse's page later" | Spouse's filing: "No Transaction Approved page uploaded" → Upload the Transaction Approved page… (Enter opens the chooser) → PNG → then Upload a new page… → PDF | Listed in 1.3 s, including the refetch. The newest page is shown, with "1 earlier upload kept". **Focus drops to `<body>` after each upload** (Major 1). |
| J3 error | Case officer: "the page I picked is not accepted" | In the dialog, choose a `.heic` file → Record | **The record is saved first**. Then a red toast for 9 s: "Submission recorded: … Sample Client X's fee receipt was not stored (Send IRCC's … Nothing was stored.); upload it on the filing." After 10 s there is no reason left on the screen; the filing reads "No Transaction Approved page uploaded" and has its button (Major 2). A file over 20 MB is refused with "larger than 25 MB" (curl, Major 2). |
| J4 error | Case officer: "upload a wrong file on the filing" | Upload a new page… → `MZ` bytes named `.pdf` | Holds. "Not stored: Send IRCC's "Transaction Approved" page as a PDF, JPEG or PNG (judged by the file itself, not its name). Nothing was stored." It shows on the filing and focus moves to it. Axe 0. |
| J5 wrong role | Client, another firm, configuration person | API: 403, 404 and 403 | Holds (`check_c82_record_api` 70/70; the breaker covered it in depth). |
| J6 C7.6 words | Case officer on a filing not yet reviewed | Open the case → Ready to file panel | Holds. "CRITICAL: The representative of record has not reviewed this filing. Passing it needs a reason, which is kept in the history." It sits beside "Pass with a reason…" (screenshot J6). The old promise is gone. Axe 0. |
| J7 recovery | Reload after uploads | Reload the case | Holds: both uploads are kept and listed. |
| Boundary | C7.6 → C8.2 | Ready to file → Record the submission… | Holds: the button opens only when both filings are Ready to file. |

## Data underneath
* `fee_receipt_file`: one row per upload, each with its sha256, and on the filing it was sent to only.
* Every refusal left zero rows.
* An UPDATE is refused by the trigger.
* Audit: one "fee receipt" line per upload, with no file name or number.
* The record rows are untouched by the uploads.

## Break-it (short; the breaker's report `B149-break-report.md` goes deeper)
* A 20 MB + 1 PDF gives 413 with the wrong limit ("25 MB").
* A `.heic` file chosen in the dialog is accepted by the field and refused only after the record is saved.
* Two quick uploads append, by design.
* No console or page errors in any journey.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 and J2 complete. C8.2 pack 19/19 on the checkpoint. |
| Next step obvious | 1 | The empty state, "No Transaction Approved page uploaded", has its upload button. |
| Plain words | ½ | C7.6 is good, but the 25 MB limit is wrong, "Nothing was stored." is nested inside "Submission recorded", and "if you want it searchable" promises a search that does not exist. |
| Feedback and state | ½ | A page refused after recording is only in a 9 s toast. Upload success and the earlier uploads kept are clear. |
| Correct data | 1 | Rows, sha256, filing scope, audit and append-only, as above. |
| Error recovery | ½ | You can recover through the filing's button, but there is no check before the record, which cannot be undone. |
| Accessibility and screen sizes | ½ | Axe 0 everywhere and no sideways scroll at 400, 1024 or 720 px, but focus is lost after an upload. |
| Speed | 1 | Upload → listed in 1.3 s; the dialog closes when its sends finish. |
| Visual quality | ½ | Team look, except the dialog's bare native "Choose File", whose text sits at the top of the box. |
| Trust and sources | 1 | Each page shows its file, type, size, who and when, with earlier uploads kept. No AI. |

**Score 7.5 / 10: below the pass of 8** (no criterion at 0).

**Fixes that would raise it, most valuable first:**
1. Keep focus on the upload button (the C6.4 pattern).
2. Check type and size in the dialog before the record, and show the refusal on the field.
3. Word a page refused after recording as its own sentence, and use the route's own 20 MB words.
4. Change the "searchable" hint.
5. Use a team-styled file control in the dialog.

With 1–3 fixed, the score would be about 9.

**Not tested:** a real screen reader, Safari and Firefox file pickers, and an intended user's unaided walk (D17 and D20 stay with the founder).
