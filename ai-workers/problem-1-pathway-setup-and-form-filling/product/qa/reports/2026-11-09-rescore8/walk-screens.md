# C7.7 screen walk, main fc49dc5a4, 9 Nov 2026, 09:17–09:21 IST

Case officer, browser pane, 1024 px, one pass. Fresh checkpoint copy qa_walk77 on :4472. Web build unchanged since the merge that built it (`git diff` of `web/` to fc49dc5a4 is empty).
Setup, not under test (`scripts/walk_two.mts`): two Visitor visa family cases opened by the pack helper. One has no answers. One has every fact answered and confirmed by `fillEverything`.
The quoted words were read from the page.

## Case with no answers
Prepare application's rows: IMM 5257, IMM 5257 SCH1, IMM 5476 and IMM 5645 for each adult; IMM 5257 for each child; then the Online line for IMM 5257.

Agent view › Sample Client A › Personal details › Current marital status › Add:
* Save with nothing chosen: "Give an answer; an answer can be changed but not cleared."
* Choose Common-Law, Save. Toast: "Saved. It fills IMM 5257 for Sample Client A (1 form field)."
* Prepare application then has "IMM 5409 for Sample Client A: 14 facts to answer or confirm before filing", for Client A only. No other person gains it.

## Case with every fact answered
* IMM 5257: pills "Copy, not for filing", "Facts confirmed". "Generate a copy"; after pressing it, "Generated", "Copy of 9 Nov, 09:19 · 81 form fields written, 10 by hand · read back and checked", "Download". "Validated copy uploaded back" and "Filed" are off: "Not yet: IMM 5257 is filed Online: this PDF is a copy, not for filing." "Who signs: Sample Client A · how it is signed is not set on the release's line yet."
* IMM 5257 SCH1: pills "Checked copy, not for filing", "Facts confirmed", "5 mandatory form fields left empty". The list:
  1. "Whether the person has ever served in any military, militia, civil defence unit, security organization or police force…": filled by hand, the step "is not in the executable set".
  2. "Question 5. Have you ever witnessed or participated in the ill treatment of prisoners or civilians, looting or desecration of religious buil…": "no question asks it yet: nothing in this release fills it".
  3. "Question 6 Membership or Association with Organizations.": "no question asks it yet: nothing in this release fills it".
  4. "Whether the person has ever held any government position…": filled by hand, the step "is not in the executable set".
  5. "Country or territory the person travelled to on one trip": "needs an answer: not answered yet (Sample Client A: Previous travel)".
* Ready to file, Client A: "CRITICAL: IMM 5257 SCH1 for Sample Client A: 5 form fields IRCC's form marks mandatory would be left empty (…)", with "Pass with a reason…".
* IMM 5476: Sign and scan, "To do": "1. Printed: next". Steps 2 to 4 read "Cannot start yet" with a reason.
* IMM 5645: "Generate a copy" gives "46 form fields written, 4 by hand". "Not yet: IMM 5645: no fill trial is recorded for edition IMM 5645 (01-2021), so this copy is for checking only, not for filing."
* The Online line, last in the section, under the form rows: "IMM 5257 · filed Online (later wave)", pill "PDF copy, not for filing". "Application for visitor visa (temporary resident visa), for Sample Client A, Sample Spouse A, Sample Child A1, Sample Child A2. It is filed online: the case officer types it into the IRCC account from the answer sheet; a PDF copy, not for filing, is listed with the forms below." The section's only buttons are "Generate a copy"; this line has none.

## The answer sheet
* The server route is `@Get("items/:id/answer-sheet")` in `api/src/case-prepare.ts`.
* A search of `web/src` for "answer-sheet", "portal-sheet" and "/sheet" finds no call. The words "answer sheet" appear only in sentences: `web/src/runtime/forms.tsx`, `web/src/pages/workspace/forms.tsx`, `web/src/components/demo-finished-story.tsx`.
* The case page has no link or button that opens a sheet.
