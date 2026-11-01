# J2 — Field mapping (pack 1: C2.12, C3.1, C3.2, C3.3, C3.8, C11.8, C11.14)

Numbered steps with the expected result at each step; the builder turns them into a browser check in the PR that makes them pass. The data underneath is checked by `acceptance/<capability>.test.ts`. Written 1 Nov 2026 against main 25cefb67; "today" marks what is missing.

**Every run:** an isolated copy (`zsh tools/isolated.sh j2 4581 start`; Part C also needs `STUDIO_FAULT_SOURCE=imm5707e.pdf`, a test-only fault switch), Reset then Load sample, **no live switch**: saved AI answers only, US$0, the AI ledger must not move. People: Configuration author (user-A), Approver (user-B), Content reviewer (user-C), Case officer (user-O), Client A (user-P). Widths 400, 1024 and 1440 px, axe clean, keyboard only possible.

**One file is mapped once (P-38):** IMM 5257 (09-2023) is shared by Visitor visa and Super visa and its saved field-map draft lives on Super visa. Visitor visa's guided path (Part A) links to that job; Part B's steps are done on that job, reached from Visitor visa.

## Part A — one guided path per form (Visitor visa)

1. As the author, Visitor visa › Forms tab. **Expected:** each form line has a step chip ("Step 2 of 6 · AI maps" etc.)
   that agrees with GET …/forms/:code/progress.
2. Click IMM 5257's chip. **Expected:** the guided path with six steps (Read and add · AI maps · Review · New shared fields
   · Second person · Field map complete), "your next step" and "What's left"; step 2 says "Being mapped in Super visa" with a
   link there and no Draft button (the same file is mapped once).
3. Reload with `?setup=IMM 5257`. **Expected:** the same step is open (resume); Escape returns focus to the chip.
4. Follow the link to Super visa's job; decide two proposals; go back. **Expected:** step 3 now names the same next step
   and link as To review for the same person.
5. Open To review from step 3 ("See on To review"). **Expected:** To review opens filtered to IMM 5257 (`?form=IMM 5257`)
   with the filter shown and counts for that form only (today the screen ignores `?form=`).
6. Approve a new shared field as the Approver. **Expected:** step 4 turns done; a "What IRCC accepts" change is never step 4.
7. Decide every remaining form field (mapped, not a fact, or filled by hand). **Expected:** only then step 6 "Field map
   complete", and the Forms list's Field map says complete for the edition (IRCC-F08). While any form field is undecided,
   step 6 is open and What's left says "Decide n form fields" (fails today: C2.12 AT-5/AT-6).
8. A validator problem about IMM 5257 shows on its path's step 6 only, not on IMM 5707's (problems carry their forms).
9. As Content reviewer: the path shows, each step not theirs says who acts and offers no button. As Case officer and
   Client: no chips, and the path address says it is not for them in words.

## Part B — AI maps form fields, a person reviews (IMM 5257, reached from Visitor visa)

10. Configuration author opens Visitor visa › Forms › IMM 5257 (09-2023), follows step 2 of its guided path to the form's mapping job (on Super visa) and clicks Draft field map there.
   Expected: before anything starts, a cost line: "Saved AI answer for this same form: no model call, US$0." With live AI off on this copy, no live button is offered, and the dialog says AI now is switched off and what to use instead (C11.8 AT-1, today: missing).
11. Starts the saved answer. Expected: a run card follows the person (top-bar chip): steps listed, each marked AI or rules, status in words, Stop button; when done "Done", spent US$0.00 (C11.8 AT-4/5).
12. Opens the draft's form-field page. Expected: a summary "242 form fields: 161 mapped, 65 not a fact, 2 never filled, 14 open; 84 shared fields: 34 reuse, 23 new, 27 ambiguous, 0 conflicting"; items ordered conflict, ambiguous, new, reuse (C3.1 AT-5, AT-7).
13. Opens one proposal (e.g. "Country or territory from which the person is submitting the application"). Expected beside it: each form field it fills with the form's own caption and the quote, the candidates with why and a score, the AI's recommendation in words; never a PDF path as the main text (C3.1 AT-6, P-63 words).
14. Looks at the family name form field. Expected: its format from the PDF next to the type: "Text, at most 100 characters (from the form)"; a choice field shows the form's own choices (C3.1 AT-8, AT-9 [IRCC-F07]; today: missing).
15. Clicks Accept on one reuse proposal (as Content reviewer). Expected: marked accepted with who; Undo next to it puts it back (C3.2 AT-1, AT-6).
16. Changes an ambiguous proposal to "Family name" from the library; then types a key "Person.Family-Name". Expected: first saved; second refused in words ("A new key is area.name in lower case…"), nothing changed (C3.2 AT-2).
17. Accepts a proposal that would make a new shared field while a near one exists, without a reason. Expected: refused, asks why it is a different meaning (8 characters); with a reason, accepted (C3.2 AT-5).
18. Rejects a proposal without a reason, then with one. Expected: first refused ("Say why…"), second saved and shown on its form fields (C3.2 AT-4).
19. Clicks "Accept all exact reuse matches". Expected: only reuse proposals are accepted; ambiguous, new and conflicting stay; one Undo for the whole batch appears (C3.2 AT-8, AT-9; today: no batch Undo). No "accept all new" button (C3.2 AT-7; today: the server still accepts it).
20. Clicks Apply with proposals undecided. Expected: refused naming one undecided proposal; nothing written (C3.1 AT-14). Content reviewer has no Apply (author only).
21. Decides the rest, Configuration author applies. Expected: "IMM 5257 (09-2023) added with 242 form fields"; a second click (double click) does not apply twice (C3.1 AT-15).
22. Opens Review. Expected: an error "14 form fields have no decision in this draft (for example "From")…" and Submit refused with the same words (C3.8 AT-1 [IRCC-F08]).
23. On To review › Form fields marks the "From" field "not a fact" with a 2-letter reason, then a full sentence. Expected: first refused; second saved; the count drops (C3.8 AT-2, AT-4).
24. Marks the tuberculosis Background information question "not a fact". Expected: refused, or an error on Review saying every Background information question must be answered (C3.8 AT-3 [IRCC-F08]; today: accepted silently).
25. Review with IMM 5707 attached from the package but not in Forms. Expected: an error that the family information form from the country package is missing; after "Add from library" the error goes; adding it twice is refused (C3.8 AT-8 [IRCC-F09]; today: no error).
26. To review (queue): the IMM 5257 group shows Ready · Check · Decide; within Ready, Select all ticks every Ready item, Deselect all clears; a Check or Decide item cannot be ticked and says why; "Accept selected (n)" accepts them as one batch with one Undo (10 s), only by the person who decided (C11.14 AT-4..AT-9; today: field-map items say "decided on its form-field page").
27. Each queue item shows both readings (draft and checker) and the rules; High only when both agree and the rules pass (C11.14 AT-2, AT-3; today: one round only).
28. Demo reset, Load sample. Expected: To review already holds the saved proposals, replayed through the same door with both rounds (C11.14 AT-1; today: empty).

## Part C — failures, Stop and cost

29. Start a draft for IMM 5257 and IMM 5707 together where IMM 5707 fails (test copy with the induced fault). Expected: run card "Done with problems", IMM 5257's draft complete and reviewable, IMM 5707's step says what went wrong in plain words and one next step; spent US$0 (C3.3 AT-3, AT-4; C11.8 AT-3: today the run's line is a count with "See the details").
30. Retry. Expected: only IMM 5707 runs again; after three attempts Retry is refused "needs a person" (C3.3 AT-5, AT-6).
31. While a run is queued, click Stop as Content reviewer (no button / refused), then as author. Expected: "Stopped", each step "nothing was sent", spent US$0; Stop again says the run has already ended (C11.8 AT-6).
32. With spend near the cap, ask for a live draft. Expected: a dialog with expected and worst cost in words, Continue and Cancel; Cancel starts nothing; Continue (author only) records who and the amount, starts exactly that run; Retry of that run needs no new Continue; past US$132 no Continue is offered (C11.8 AT-7..AT-10).

## The other five sample combinations

Today's sample still uses the older names and keys (`sv.super_visa`, `wp.family`, `fs.outside`, `sp.student`, `lm.high_wage`); the P-112 names come with C11.3 AT-9. Use whichever the sample loads.

### Guided path (Part A)
* **Super visa:** step 2 is the running/finished draft (replay, US$0); step 3 has the proposals.
* **With an LMIA:** IMM 1295 has 16 undecided form fields carried from the release: step 6 must stay open (today "done").
  Remove a form from the combination → its path reads "not on this combination", nothing after step 1 started.
* **Study permit, High-wage position, Applicant outside Canada:** after Find, forms with a library field map show step 2
  "Add from library"; a form listed with no file shows "Upload its PDF in the Form library"; an online-only LMIA form has
  no PDF path (P-152: drafted from ESDC's help pages, its own system code).

### Mapping and review (Parts B and C)
* Super visa (sv.super_visa): same IMM 5257 file as Visitor visa: after step 12, its draft button says the form is already mapped and adds it from the library (no second AI draft, P-38); IMM 5707 is listed in its package, so step 16 applies.
* Work permit, family (wp.family): forms already in the library (IMM 1295, 5409, 5476, 5475, 5257 SCH1, 5707) are added from the library with their reviewed maps (no AI); IMM 5257 SCH1 is conditional (background answers yes, [IRCC-F05]); IMM 5476 only with a representative; step 15's Background rule applies to IMM 1295's background questions too.
* Family sponsorship, outside Canada (fs.outside): IMM 5475 and IMM 5476 only; the family information form there is IMM 5645 or IMM 5406 per the package ([IRCC-F09]: confirm which with the Lead before writing the check).
* Study permit (sp.student): IMM 5475, 5476, 5707 from the library; IMM 5707 present, so step 16 passes.
* A new combination with no forms: the Draft field map button is absent until a form is added; Review shows the missing-forms line once (BR-8).
