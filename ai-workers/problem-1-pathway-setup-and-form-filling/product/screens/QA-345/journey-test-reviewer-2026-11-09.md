# Journey test, reviewer: QA-345 (C8.3, an approval stamps the file it approved), 9 Nov 2026

PR #1440 at 7456e5347, on an isolated copy (rv_qa345, :4466, configured checkpoint plus the pack's Visitor visa setup). Never :4400. No model calls, US$0. Walked headless in Playwright (no visible pane in this sandbox), using what a person sees: clicks, keys, text. The setup and the Adobe Validate step went through the product's routes (`validateRoundTrip`, as the pack does). The "copy kept before the fix" in J3 was inserted with SQL, as C8.3-23 does; that is scaffolding, used only to reach the legacy state. The scripts and screenshots stayed in the reviewer's scratchpad and were not committed.

## Journeys (main path first)
1. **J1, representative of record (main path).** Goal: "approve round 2 after the send back; the file sent to IRCC carries my approval." Steps: open round 2 (IMM 5257 reads "Changed since review", e-mail before → after), press Approve by keyboard, read the dialog, confirm. The officer then reads back the validated copy, and the representative reloads.
   * Expected: the form is stamped with that validated copy.
   * Result: **held.** After approval the stamp kind is `none`. After the read-back it is `validated_copy|656c…`, with one audit line ("… stamped to the approval of round 2, which stamped no file (QA-345)"). The page reads "Approved, still current · Stamped with the validated copy read back", with the fingerprint under Details.
2. **J2, case officer (across the screen boundary).** Ready to file shows "Prepared by · Reviewed by: Case officer (Sample) · Representative (Sample) (licence R000000)". **Held.**
3. **J3, representative (alternate and error).** A fact changes, the approval is withdrawn naming the fact and who typed it, and Re-approve stamps `none`. Then a validated copy appears that was kept without the stamp.
   * Expected: re-approval is asked.
   * Result: **held.** The page reads "Approval withdrawn: its validated copy was read back without this approval's stamp. Re-approve to stamp the file that is filed." The button "Re-approve 1 changed form" works by keyboard, and the new round stamps `validated_copy|ddd…`.
   * Words gap: Ready to file says "The filing changed after it was reviewed … (or the representative of record changed)". Neither happened (m5).
4. **J4, wrong role.** The case officer on the same review sees 0 Approve or Re-approve buttons. **Held.**
5. **J5, recovery.** Reloading after the read-back keeps the stamp, and the move is written once: a second update is refused by the database (C8.3-22's last clause and my probe T2). **Held.**

## Break-it pass
* **A second validated copy of the same facts after a validated-copy stamp (Major, M1 in review.md).** The newest copy, `cf62…`, is the one filed. The page and C7.6 still say Approved, with stamp `ddd…`. This is the QA-345 symptom, reached by another path.
* **Two read-backs of two copies of the same form at once (Minor).** The second one fails inside the trigger ("a stamp is written once"), which is a raw 500. I reproduced it with two SQL sessions. A retry succeeds.
* **Approve while a read-back commits (Minor).** The approval stamps `none` and at once reads "Approval withdrawn … Re-approve". This fails safe.
* **Generated-copy stamp moved (Major, M2).** The approved sha of the generated copy is overwritten, and the audit line keeps only its kind.
* **Words (Minor, m4).** IMM 5476 (no Validate) says "A validated copy read back later for these facts is stamped to this approval". It never will be.

## Checks
* axe (WCAG 2.2 A/AA): none on round 2 under review, the approve dialog, round 2 approved, or round 3 withdrawn ("file").
* No sideways scroll at 400, 1024 or 1440 px. No console or page errors.
* Timings: the review loaded in 528 ms and approve took 297 ms.
* Data underneath: one stamp move per approval and one audit line. Nothing else changed: hash, by and at stayed equal (DB read).

## Score (QUALITY.md "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1: the stamp moved to the filed copy; J3: re-approve stamped it |
| Next step obvious | 1 | The withdrawn words say "Re-approve…"; the button is beside them |
| Plain words | ½ | m4 (the promise on a non-barcode form), m5 (C7.6's reason) |
| Feedback and state | ½ | M1: "Approved, still current" while another file is filed |
| Correct data | ½ | M2: the stamped generated-copy sha is lost; M1 |
| Error recovery | ½ | Concurrent read-backs give a raw 500; a retry and re-approve recover |
| Accessibility and screen sizes | 1 | axe clean; 400/1024/1440 px; Approve and Re-approve by keyboard |
| Speed | 1 | 528 ms and 297 ms |
| Visual quality | 1 | The dialog and form panel are unchanged in layout (j1-dialog-1440) |
| Trust and sources | 1 | Audit line, fingerprint under Details, Sample labels |

**8/10: pass, no 0.** To raise it, fix in this order: M1 (compare the sha in `fileStampCurrent`), M2 (keep `was_sha256`), m1 (a conditional update), then m5 and m4 (words).

Not tested: a real screen reader, a real Adobe Validate, and an intended user's own walk (D17 and D20 stay with the founder).
