# BK-24 review: IMM 1295 question 7 and the required-box check (forms lane)

Reviewer: fresh context, did not build it. Commit reviewed: `a1044a8e79ed865bb6827e3da99c9ecdbdb18451` (PR #1733, draft), diff `origin/main...a1044a8e7`. Copy: :4453 / `xr_studio_forms_bk24` (the builder's). US$0, live AI off.

**Verdict: Block.** 2 Majors open (M1, M2), no Blocker. Both are small fixes; the q7 data fix itself is right.

## What holds (checked, not taken from the PR)
* The spouse's IMM 1295 on :4453, read from the file: q7 country `205` (India), status `01` (Citizen), q8 A `N`, `SameAsCORIndicator` `Y`. The 19 box corrections landed (`form_field_map`, IMM 1295 rows now read the same keys as IMM 1294 and IMM 5257, transforms the same code list 01–09).
* `check_bk24_required_boxes.ts` 21/21, run twice (13 s each, the same result both times). Its fail case is real: with q7 emptied, the box is open and our engine's run of IRCC's own Validate stops on "7. Current country or territory of residence".
* The new IMM 1295 script rules (`form-script-requirements.json`) match the template: SHA-256 `57fc256e…` equals `official-sources/ircc/forms/imm1295e.pdf`; `validateDetailsOfIntendedWork` says what the cite quotes; the WorkPermitType list is ELMO, LMOS, OWP, Other, SAWP, SBC. I ran `mandatoryOpen` with the data: for OWP with nothing given nothing is open; SBC opens job title and duties; ELMO opens all four.
* IMM 5707 derivation follows the form's own `validateFields`: first section complete, other non-empty rows complete, MarriageInPerson only when MaritalStatus = 5.
* P-449: BK-13's scan PASS (454 files). No personal names. The values are cited or Sample.

## Majors
**M1. The check misses boxes IRCC's Validate requires, and it says "every box … is written".** These 4 boxes are required by the forms' own scripts (no `nullTest` flag), are empty on the walk's copies, and are not on the GAP list:
* IMM 1294 for Student A and IMM 1295 for the spouse: background 2c `…BackgroundInfo2[0].VisaChoice3[0]` ("Have you previously applied to enter or remain in Canada?").
* Background 6 `…PageWrapper[0].GovPosition[0].Choice[0]` (ill treatment of prisoners or civilians) on both forms.

All four are `by_hand` ("Not proposed by the saved AI answer … QA-144").

Failure scenario, reproduced: I took the spouse's copy, filled the six F3 boxes in a scratch file (`read_choice_values.py --set`) and ran `askXfaEngine`. Validate stopped at "2c) Have you previously applied to enter or remain in Canada?". With 2c filled it stopped at "6. Have you ever witnessed…". With 6 filled it stopped at the consent (F2). The Lead's Adobe Validate (BK-20) will stop on these after F3 is fixed, while this check stays green: BK-13's failure again.

Why the check misses them: at `check_bk24_required_boxes.ts:291-292` an engine stop at a listed GAP box ends the check for that form ("boxes after it are not reached"). For IMM 1294, `:289` prints a NOTE (the engine cannot read the form) and the PASS line at `:283` still says every box its file requires is written. `qa/built/BK-24.md` repeats that claim.

Fix:
* When the stop is a listed GAP box, write placeholders into the listed GAP boxes in a temporary copy and run Validate again, until it passes, stops at an unlisted box (FAIL) or cannot read the form.
* Name the 4 boxes as GAP lines with a follow-up, or fix them by data as was done for q7 (IMM 5257 already maps 2c to `person.previously_applied_to_canada`).
* For IMM 1294, report the unreadable engine as a WAIT (or "flags only") in the PASS line and the summary, not as a full pass.
* Correct the qa/built line.

**M2. The per-box correction works only through the Sample loader, and it is recorded as a person's decision (P-33; trust and sources).** At `040-field-map-review.ts:116-125` the loader calls `revise()` directly. It writes `origin: "HUMAN"`, and the reason is `${note} (${author.name})` with no "sample loader" in it. No audit line is written. Every other loader decision says "by the sample loader". The product's doors write an audit line: `screen02.ts:64`, `form-field-condition.ts:129`. A real author has no door to remap one mapped box (`screen02.ts:52` refuses a mapped box and points to "its field map", which has no such action).

Scenario: an RCIC opens IMM 1295's field map and reads q7–q8 as decided by the named author. No person decided it, and the activity log has no line for it.

Fix:
* Make the reason say "Changed by the sample loader: …" (as the loader's other decisions do).
* Write one audit line per box.
* Name the missing per-box remap door as a follow-up in the PR's Questions.

My view: this is acceptable as "data first" for the walk only on those terms. It is not a product capability.

## Minors
* **m1** `040-field-map-review.ts:53-54`: the "already done" test comes after the "proposed key" test, so for 16 of the 19 rows it can never be reached. If the step runs again on the same workspace, it refuses every corrected box ("it reads person.current_residence_country") and row 4 turns "partial". The loop also has no `timed`/try, so a thrown error stops the whole step instead of being listed as refused. Fix: swap the two tests and wrap the loop as the jobs loop is.
* **m2** `form-script-requirements.json` (new IMM 1295 rows): the script's "for OWP and WHP, job title and duties are required when either one is given" (and the same for the from/to dates) cannot be written as `equals`. Run: OWP with a job title only leaves the duties box not open, while IRCC's Validate requires it. Before this PR the duties box was always open. Record this limit in the cite. These rows also have no pass/fail test in the repo; the walk's OWP case is their only exercise. Add an SBC fail case next to QA-165's R4.
* **m3** `screens/BK-24/bk24-spouse-imm1295-still-empty-1440.png` is stale: the server started before the data edit. It still lists job title, duties and the start and end dates as "needs an answer"; with the committed data, OWP shows none of them. Take the screenshot again after a restart.
* **m4** `qa/built/BK-24.md:1` says "by data only", but 040 changed. The PR body's "why below" is still empty.
* **m5** `check_bk24_required_boxes.ts`: the fail case covers only (a) flags and (d) the engine. Nothing breaks (b) IMM 5707's rows or (c) a script condition. `:278` compares counts, not path sets. The header says "never listed by hand" while `OPEN` is a hand list (BK-13's GAP pattern is fine; say it).

## Your three questions
1. **Loader-side per-box correction:** acceptable for the walk as Sample review data, on M2's terms (marked as the loader's, audited, missing door named). A product door is the real capability and is a follow-up row, not this one. A per-proposal correction would be wrong here, because it would also change IMM 5532 and 5669 and q8.
2. **Derivation:** the reading is sound: `nullTest` flags matched against the template, IMM 5707's own lists, cited conditions. It is incomplete in the case that matters, script-required boxes, because the engine pass stops at the first GAP and IMM 1294 is never checked (M1).
3. **GAP list:** F1–F4 are named honestly, but F3 hides 2c and Q6 on IMM 1295, and IMM 1294 hides the same two (M1). F2 (consent) is the same kind of fix as q7 (IMM 5257 maps it), so it could be done by data. That is the Lead's call, not a finding.

## D1–D20 and BIC (data and test row, no new screen)
D1–D16 and D18–D19: N/A or unchanged (no UI or route change; graph shows no new page or route). D5 data: q7 correct (as above), M2 on provenance. D10 tests: M1, m2, m5. D17/D20: simulated only (no intended user walked it). BIC-01–BIC-20: N/A (no case-side screen change); the case page's mandatory list is pre-existing.

## Not checked
* A fresh copy: `isolated.sh` refuses at the cap of 4 copies (4453–4456 running), so "on a fresh copy" and "BK-13 45/45" are the builder's evidence only.
* My BK-13 run on the reused :4453 copy: 41/43. The 2 FAILs come from re-running (`sampleAnswers > 100`; 409 stale answer on the relatives), not from this diff; the P-449 scan passed.
* Adobe's own Validate. CI (the engine is not built there: WAIT).
