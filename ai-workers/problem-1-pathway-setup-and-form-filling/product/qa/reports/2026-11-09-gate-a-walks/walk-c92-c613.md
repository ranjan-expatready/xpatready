# Gate A walks of C9.2 and C6.13, main 1a2823c53, 9 Nov 2026, 15:31–15:36 IST

Browser pane, 1024 px, one pass, as the case officer, every press by mouse. Fresh checkpoint copy qa_w1 on :4472. The quoted words were read from the page. US$0. Setup, not under test: `scripts/walk_c92.mts` (a filled family case, IMM 5476 signed by hand and scanned for each adult) and `scripts/walk_case.mts`.

## C9.2 A changed fact marks a signed item out of date and never changes it
* Before: Client A's and the spouse's IMM 5476 are signed and uploaded (item state "ready").
* Agent view › Sample Client A › "Family name as shown on passport or travel document" › Edit. "Now: SAMPLE (Confirmed by the officer)." The dialog names what it fills: "IMM 5257 for 2 people (2 form fields), IMM 5257 SCH1 for Sample Client A (1 form field), IMM 5476 for Sample Client A (1 form field)". Changed to SAMPLEDZ, Save.
* Prepare application, Client A's IMM 5476: "The signed IMM 5476 (scan in 9 Nov 2026) is out of date: family name as shown on passport or travel document of Sample Client A changed from "SAMPLE" to "SAMPLEDZ" on 9 Nov 2026. A new signed IMM 5476 is needed: print the new copy, have it signed and upload the scan, or undo the change before filing."
* A button: "Undo: Family name as shown on passport or tra… back to SAMPLE".
* Ready to file: "CRITICAL: IMM 5476 for Sample Client A is out of date: "Family name as shown on passport or travel document" changed on 2026-11-09 after it was signed or uploaded. Make a new copy."
* **Scope:** the spouse's own IMM 5476 stays as it was ("Generated", "Facts confirmed").
* **The next capability's first step (C8.1, a new signed copy):** a new line is open for the form, "IMM 5476 for Sample Client A · Checked copy, not for filing · 1 fact to answer or confirm before filing · Generate a new copy", with its old copy marked "Out of date · Facts changed since this copy was made; generate a new copy to file it", and the sign steps ("1. Printed") on the page.
* **Undo by mouse:** the out-of-date words are gone (0 mentions on the page), and the line reads "Facts confirmed".

## C6.13 Filing changes while preparing
On a family case with no person added since it was opened:
* Actions for Sample Child A2: "Make principal…" is off, "Refused: a child cannot swap with a parent…". "Remove filing… Sample Child A2 stays on the case, not travelling."
* **Remove filing: a warning by name:** "2 other filings depend on this one and change: Sample Client A's filing · Biometrics fee: CAD 170 → CAD 85; Sample Spouse A's filing · Biometrics fee: covered by the family maximum → CAD 85". Reason typed, "Remove filing". Toast: "Sample Child A2's filing removed. Fees worked out again." with Undo. The row reads "No filing: not travelling · Removed Nov 9 by Case officer (Sample): "Not travelling after all (Sample, qa walk)."". "3 filings". "Total for this submission: CAD 470". The IMM 5257 line for that child has left Prepare application.
* **Make principal, Sample Spouse A:** "Sample Spouse A becomes principal applicant; Sample Client A becomes spouse or partner…", "1 other filing depends on this one and changes: Sample Child A1's filing · Signed for as their parent by Sample Spouse A instead of Sample Client A". Reason typed, "Make principal". Toast: "Sample Spouse A is now the principal applicant. Filings and fees worked out again." The roles swap on the row.
* **The next capability's first step (C7.6, Ready to file; C7.7, Prepare application):** Ready to file lists "Visitor visa: Sample Spouse A" first, 22%, "2 of 9 done"; then Client A; then Child A1.

**The bug found (QA-329).** On the case where a child had been added by "Add child (travelling)" (the C6.12 walk), "Remove filing" for Child A3, with a reason, showed: "Changed since you opened this. This case changed since you opened this. Look again before changing it; nothing was changed." Pressing again gave the same. Nothing else had touched the case. A probe on that case (`scripts/walk_q329.mts`): preview 200 then apply **409** for every kind tried: Remove filing for each of the spouse and three children, and Make principal for the spouse. Three previews in a row were identical. On the case with no added person the same changes applied.
Likely cause (read in the code): `api/src/filing-changes.ts`'s lock check compares `JSON.stringify` of two objects built from `case_participant`: one from the case's participants (`orderBy: { order: "asc" }`), and one from an unordered `findMany`. The added person's row comes first in the unordered read, so the strings differ.

## Not covered
1024 px, one pass, one case type. C9.2's employer breadth (P-417) was not walked by screens; the pack holds it. The copy refuses a stop from a later call and stops itself at about 15:56 IST.
