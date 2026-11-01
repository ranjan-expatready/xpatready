# Review: QA-101, QA-102, QA-103 (PR #274)

## Re-review at c6272893 (fixes M1, M2 of the first pass below)

**Verdict: Approve** on c6272893. No open Blocker or Major.

* Builder check, run on my own copy `rv_qa101` on :4473 (started after the web build, stopped after): **22/22**. It now covers the M1 regression (a Rules-only find) and both directions of M2.
* **M1 closed.**
  * The line's library edition now comes from the line's own record (`api/src/workspace.ts`: one `govFormDef` query per tab; the newest PDF edition with a checksum).
  * I ran Find again › Rules only (US$0) myself. The IMM 1294 line still reads "IMM 1294 (06-2026) · 0 form fields matched · File in the library · Step 2 of 6 · Field map · Your step".
  * The library link is gone, so the one next step is the step chip. I reached it with Tab and Enter opens the panel at "Draft with AI or add from the library".
  * "No file yet" did not appear on any line of the 6 combinations.
* **M2 closed.** `libraryType` in `api/src/finder.ts` is the only rule, and `form-library.ts`'s `TYPE_OF` uses it. The check runs it both ways: a `document` row whose title says "form" is filed; one whose title does not is a checklist.
* Screens and accessibility: axe WCAG 2.2 AA finds 0 issues at 1440, 1024 and 400 px, with no sideways scroll at any of them and no page errors.
* Journey score: **9.5/10** (see the journey-test file).
* Still open (Minor, Should; the builder lists them in the PR):
  * m1 below.
  * m2 below.
  * m3 (new): a form whose library editions are all online-only has no `libraryEdition`, so its line would say "No file yet: upload it…". No line in the demo is like this.

---

## First pass at 1b99e233 (code 379b380c + records-only 1b99e233)

Reviewer: separate context, not the builder. Copy `rv_qa101` on :4473 (stand-in AI launcher, US$0), stopped after.
Journey test: `journey-test-reviewer-2026-11-01-qa101-c6272893.md`, **8/10**.

**Verdict: Block.** There are two open Majors, M1 and M2. QA-101 and QA-102 hold. QA-103 holds only until the next find, and the next step it shows sends the person somewhere that has no way to do it.

## What was run
* `tests/check_forms_qa101_103.cjs 4473 xr_studio_rv_qa101`: **19/19**.
* Walked the Study permit Forms tab as the content publisher (`user-A`) at 1440, 1024 and 400 px, and at 512×450 (about 200 % zoom at 1024). No sideways scroll at any size. axe WCAG 2.2 AA on `main`: 0 at each width. No page or console errors. The tab loaded in 479 ms.
* Keyboard only: "Open the Form library" (IMM 5483 finder row) and "Shared library › Forms" (IMM 1294 line) can be reached with Tab and show a 2 px solid focus outline. Enter opens `/library/forms`.
* Followed both links into Shared library › Forms. Ran Find again › Rules only (US$0). Replayed the stand-in finder on the three work-permit combinations (it could not run there: their recorded pages print no form numbers).
* 379b380c..1b99e233 only moves `product/qa/CAPABILITIES.md` C11.11 to "Built, awaiting qa" (P-219). That fits the process and needs nothing.

## Issues

**M1 (Major, Must): QA-103 is fixed only while the newest find still lists the form, and the next step it gives is a dead end.**
1. The edition and the "File in the library" words come from the newest find's row (`web/src/pages/workspace/forms.tsx:70`, `:136`, `:165-167`), not from the line.
   * Reproduce: Study permit › Find again › Rules only. The same IMM 1294 line then reads "No edition read yet · 0 form fields matched · No file yet: upload it or find it in Shared library › Forms".
   * In the same state, the line's own setup panel says "IMM 1294 (06-2026) is in the library and on this combination", and the library lists IMM 1294 as 06-2026, Ready.
   * The same false "No file yet" shows on any line added from the library whose edition has no field map, because `l.edition` is set only from a field map (`api/src/workspace.ts:69`).
   * So a click that costs nothing brings back the QA-103 symptom with a new false statement.
2. "Next: read its form fields in Shared library › Forms" sends the person to a page where that cannot be done.
   * On the IMM 1294 library row, the actions menu offers Replace / **Re-read with AI (fields and boxes), greyed out** / See where it is used.
   * Its "Not mapped yet" tooltip says "add the form to a combination and map it from its Forms tab" (`contracts/form-library.ts:88`).
   * The real step is already on the same line: the chip "Step 2 of 6 · Field map · Your step" opens the panel at "Draft with AI or add from the library". The line now gives two different next steps, and one of them leads back to where the person started.
   * This breaks EXPERIENCE "one next step, never a dead end" and the expected result in QA-103.
   * **Fix:**
     * Take "file in the library" and the edition from the line's library record (the current edition of its `gov_form_def`, returned by the server with the line), not from `find/latest`.
     * Make the next step the line's own step ("Next: draft its field map with AI or add it from the library", or simply point at the step chip). Drop the link to Shared library › Forms for this state.
     * Show "No file yet" only when the library really has no edition.
     * Add a check step: after a Rules-only find, IMM 1294 still shows its edition and never "No file yet".

**M2 (Major, Must): the finder decides "not filed" with a different rule from the library.**
* `api/src/finder.ts:93,462` treats every `formKind` of `document` as not filed. The library decides the type with `TYPE_OF` (`api/src/form-library.ts:40`): a `document` whose title says "form" (and not "checklist") is a **Form**.
* In the demo, IMM 5802 "Offer of employment form (employer form)" is kind `document` and has type Form in the library. A find that names it would refuse it as a line and label it "Checklist · in the library, read for documents, not filed". That is QA-101 in reverse, and it breaks P-118: the library is the one authority for what a form is.
* I could not replay it: no recorded page prints IMM 5802 (Rules on With an LMIA, Applicant outside Canada and High-wage position printed no numbers). This finding comes from reading the code.
* **Fix:** export the library's `TYPE_OF`, use `TYPE_OF(kind, displayName) !== "form"` in the finder, and add a check case with a `document`-kind form whose title contains "form".

**m1 (Minor, Should):** existing data is not cleaned up.
* A checklist already attached as a line before this fix (the demo's IMM 5483 from the a9fe60c0 live find) stays a filed line with channel and signature columns. The workspace marks a line as "not filed" only for kind `document`, not `checklist` (`api/src/workspace.ts:69`).
* A new find then lists the same IMM 5483 both as a line and as a checklist row, because `CHECKLIST_IN_LIBRARY` skips `stateOf`.
* Fix: treat `checklist` like `document` on the line, or make the checklist row say "on this combination: remove it".

**m2 (Minor, Should):** "Open the Form library" on the checklist row opens the whole list, not IMM 5483. A filtered link (`/library/forms?q=IMM%205483`) would land on the row.

## D-dimensions (only those this change touches; the rest are as in `review.md`)
* D1 concept fit: QA-101 and QA-102 are as written; QA-103 is partly met (M1).
* D3 words: the new copy is plain and in PRODUCT §4 terms. The next-step sentence is wrong (M1).
* D5 next step: two conflicting next steps on one line (M1).
* D6 data truth: what the line shows depends on the newest find (M1). The not-filed rule differs from the library's (M2).
* D9 accessibility: axe 0, keyboard works, focus is visible, no scroll at 400 px or 200 %.
* D12 speed: 479 ms.
* D17, D20: simulated only.

## Code
* QA-102: `stateOf` is correct. Checked by `row("IMM 5707").state === "ATTACHED"`, which would fail if the rule were removed (it would read TO_DECIDE).
* QA-101: one `findMany` for the batch, so there is no request per row. Nothing changed for authorisation (same routes). No migration.
* The tests do fail when the rules are removed, as the builder reports (6 fail on main). No check covers M1's Rules-after-live case or M2's `document` form.

## Not checked
* `graph.mjs`: not run, because it rewrites the tracked `qa/GRAPH.md` and I may edit nothing else.
* A real screen reader. A live find against canada.ca (the cost gate and launcher were stand-ins).

First pass verdict: Block on 1b99e233 (M1, M2). Both are closed at c6272893, see the top.

**Verdict: Approve** on c6272893.
