# QA-318 review: IMM 5257 SCH1's five mandatory Yes/No fields (C7.2; P-46, P-171)

Reviewer (fresh context, did not build it) · 9 Nov 2026 · PR #1272, branch `claude/relaxed-cray-2x5cfc`.
**Head reviewed: a668f2969a75acac23358bbbe66cd989aa5b51a6.** The head moved twice during the review. At e9064970 the server's "needs an answer" → "not answered" change was reverted; the rule now lives only on the forms card (`cardFacts`). At a668f2969 only `tests/runtime/check_runtime_r1c.cjs` and the walk PNGs changed, no product code. Scope: `git diff fc4afd976..a668f2969` and the conflict resolution in merge fc4afd976.

**Verdict: Block** (skill wording: Ship after fixes). There is one open Major, M1 below. Everything else holds.

## What I ran (my own copy rvq318 on :4435, a second copy rvq318b on :4436 for c72; both stopped; live AI off; nothing priced)
* `check_qa318_sch1.ts` at e9064970, the same product code as a668f2969: **15/15** (A1–A7, B0–B7). At 0562bde59 it was 14/14.
* `check_qa165_readiness_paths_api.ts`: **9/9**. `check_c72_imm5257_fill.ts` on a fresh copy: **57/57** (its setup line is back to the original assertion). Type check (product/tools/typecheck.mjs): api 15 known errors, 0 new; web 0.
* Data underneath: in SCH1's copy, all five boxes were `written` and `intact`. The answers behind them are booleans (`false`), and case.ts:170 only accepts booleans for yes_no. Q8 says `nothing_recorded: "none apply" answered in Previous travel`.
* Browser (Playwright, Case officer) at 1440 and 1024 px. axe WCAG 2.2 A/AA: 0 violations. No sideways scroll, no console errors. Keyboard reaches "Facts to answer or confirm".

## Findings

**M1 (Major, Must): SCH1 Q5 and Q6 are asked a second time under new library fields, though IMM 5257 already asks the same official questions for the same person.**
* Where: `studio/samples/own-yes-no.json:80-94`. The labels "Witnessed or took part in ill treatment" and "Member of a violent or criminal organization" do not match the existing fields. So step 140's reuse lookup (`api/src/features/checkpoint/combination/140-own-yes-no.ts:17`, `same` by `normalizeLabel`) finds nothing and creates `person.witnessed_or_took_part_in_ill_treatment` and `person.member_of_a_violent_or_criminal_organization`.
* What already existed: IMM 5257 maps `PageWrapper[0].GovPosition[0].Choice[0]` → `person.ill_treatment_of_prisoners_or_civilians` (label "Ill treatment of prisoners or civilians", B52's own Yes/No) and `PageWrapper[0].Occupation[0].Choice[0]` → `person.violent_organization_association`. Both are person yes_no fields, PUBLISHED.
* The words are identical: `imm5257e.xfa-template.txt` asks "Have you ever witnessed or participated in the ill treatment of prisoners or civilians, looting or desecration of religious buildings?" and "Are you, or have you ever been a member or associated with any political party, …criminal activity at any time?", word for word as SCH1 Q5/Q6.
* Measured on the case: Sample Client A's agent view lists "Background information › person.ill_treatment_of_prisoners_or_civilians" **and** a section "Ill treatment of prisoners or civilians › person.witnessed_or_took_part_in_ill_treatment". It also lists `violent_organization_association` **and** `member_of_a_violent_or_criminal_organization`. The same holds for Sample Spouse A.
* Failure scenario: the client answers Yes to IMM 5257's question (with details) and No to SCH1's question, or corrects one answer later and not the other. Both forms are then filed together for one applicant with contradictory answers to an inadmissibility question. No check compares the two fields.
* Standards broken: BIC-01 "Ask once" (Not met), QUALITY D3 "no near-duplicates in the library".
* Fix: point the two SCH1 entries at the existing fields, so one answer fills IMM 5257 and SCH1. Either use the existing fields' labels, which the `same` lookup already reuses, or name the field in the data. Keep the official question words. Add a pass/fail check: one person is asked each of these two official questions once, and the IMM 5257 answer writes SCH1 Q5/Q6.

**m1 (Minor, Should): on the card, one missing answer is counted and listed several times, in words that contradict each other.**
* Setup: Previous travel taken back, measured at e9064970 (my 1024 px shot). The pill reads "2 facts to answer or confirm" for one answer.
* The "Facts to answer" list contains the group line ("Entries in "Previous travel"…: not answered") and the Q8 box line. The box line reads "…(Sample Client A): **left empty on the form** — needs an answer…", so a fact to answer gives its reason as "left empty on the form".
* The same box appears again under "Marked mandatory on IRCC's form, still empty (1)".
* Where: `web/src/runtime/forms.tsx:164` prints `m.reason` raw; `forms.tsx:168` lists `f.fields_open` unfiltered; `engine/runtime/open-lines.ts:62-63`.
* Fix: on the card, print the card's own reason for such a line ("not answered"). Leave out a box line whose fact's group or question is already a line. Leave out of the "still empty" list the boxes that the facts list already names.

**m2 (Minor, Should): the Q8 Yes/No box is named after the trip-country row question.**
* The line reads "Country or territory the person travelled to on one trip". The form's question is "Since the age of 18 or during the past five years, have you travelled to any country or territory other than…?".
* Cause: `engine/runtime/mandatory.ts:70` uses the case's question label unless the transform starts with `derived:`. The new prose step starts with `derive:`.
* Fix: treat `proseRecorded` like `derived:` there, so the form's own words are used.

**m3 (Minor, Should): only the card follows the new rule; other places that say a form's facts are confirmed still use the old one.**
* `engine/runtime/prepare.ts:84-85` ("Every fact it reads is confirmed…") and the card's own lock `why` (`forms.tsx:131,135`) still filter `blocksLock`.
* Failure scenario: switch IMM 5257 to PDF upload and leave one of its own Yes/No questions unanswered (r1c/r1d's fixture). The card says "1 fact to answer or confirm before filing". The Prepare plan says "Every fact it reads is confirmed". The lock buttons stay enabled.
* I accept the lock part as #1318 M2's ruling. The Prepare words are the same honesty gap as this bug, on another screen. Fix: there, or in a follow-up row, use `cardFacts`.

**m4 (Minor, Should): no test fails if the card stops using `cardFacts`.**
* B6/B7 (`tests/check_qa318_sch1.ts`) test the pure function against API data. Putting `forms.tsx:131`'s old filter back into the pill fails nothing. Add one DOM check of the pill, for example in an existing browser suite on this case.

**m5: resolved at a668f2969.** The walk was re-taken. `walk/06` now shows the card as I measured it, including m1's double listing and its "left empty on the form" words under "Facts to answer".

## Checks the lead asked for
* **Wrong Yes/No from the prose step**: none found.
  * A boolean is written as given, which also covers a qualified prose step with a boolean answer.
  * An empty value without `nothingRecorded` stays blank (A4).
  * `markNothingRecorded` sets `nothing_recorded` for the prose step only when the box's own fact is asked only in a settled group with "none apply", or under a gate answered No (`forms.ts:88-110`). A yes/no asked outside a group never gets it.
  * A row fact read on a non-row box with the qualified shape is by hand whatever its value (A7). The unqualified shape gives Yes on any present value, which is what the drafted words say.
  * yes_no values are booleans only, so a string "No" cannot become Yes.
* **Moving lines between facts and empty fields**: at e9064970 the server is unchanged (`forms.ts:262`). So readiness.ts, finished-story.ts:41, m3.ts:165 fillEverything, blocksLock, Ready to file's CRITICAL lines, the client's view and #1318 M2 keep their behaviour. qa165_readiness_paths 9/9 and c72 57/57 confirm it.
* **The `qa165_readiness_paths` R5/R6 setup change** is not a weaker assertion. SCH1 no longer leaves a box empty on a fully answered case, so one recorded trip makes Q8 "filled by hand". R5/R6's assertions are unchanged and pass.
* **The c72 change** is reverted at e9064970.
* **The r1c change in 196ff7767** is not a weaker assertion.
  * The step it feeds ("with every required fact confirmed, IMM 5257 says \"Validate before filing\"") is unchanged.
  * The setup now also answers the own Yes/No questions that readiness names as "needs an answer: answer \"<question>\"". Its fixture had left other names, national ID and US card unanswered, yet still expected the pill that only a form with nothing to answer shows. So the setup now does what its comment says.
  * The fixture also shows m3's scenario is real: IMM 5257 filed as a PDF upload with those three questions unanswered.
  * The coordinator reports r1c 140/140, r1d 97/97, r1a 98/98. I did not re-run them.
* **P-425**: no form, program or combination is named in engine or filler code. `PROSE_RECORDED` (`p5/transforms.ts:73,128`), `cardFacts` and `markNothingRecorded` are generic, and forms are named only in comments. The SCH1 entries are data (`own-yes-no.json`, `form?`), on the configured checkpoint only.
* **Official words** (AGENTS rule 4, P-170): Q5's and Q6's `question` strings each occur exactly 5 times in `prototype/expected/source-text/imm5257_1e.xfa-template.txt`. B1 checks them on the released map.
* **Merge fc4afd976**: in all three files, every line that either parent added is in the merge, checked token by token. `KIND_NOUN`, `ACTION_WORD`, `changeNoun` and `changeView` carry main's `document_sets`/`SET_SETS`/`setsView` (C6.15) and B154's `section_background`/`SET_BACKGROUND`/`backgroundView`. `resubmitChange` and `withdrawChange` keep both branches. `renaming` lists `SETS_KIND` and `BACKGROUND_KIND`. review-queue keeps `bgd` and `sts`. In screen02.ts, B154's `background?` comment sits between B86's comment and `form_field?`; that placement was already in the approved B154.
* **C7.2 pack 3/11**: I agree QA-318 does not touch its failing steps. No changed file is the filler (`fill.py`), the barcode or Validate code, or the C7.2 pack. I could not run the Mac's Adobe evidence.

## D1–D20 (this item's scope)
| D | Score | Evidence |
|---|---|---|
| D1, D4, D19 | 4 | Done-when met on the case (B2–B4, card B6); Q5/Q6 asked and filled; SCH1 copy fully written and read back intact. M1 aside |
| D2, D3 | 2 | M1: two near-duplicate fields for one answer; contradictory filing possible |
| D5, D11 | 4 | Taking back "none apply" makes the copy out of date; "Facts confirmed" never shown over a missing answer on the card |
| D6, D18 | 4 | Sample / Unconfirmed: expert labelled; Q5/Q6 cite the form and say "fills IMM 5257 SCH1 for …" |
| D8–D10 | 3 | The card points to "Previous travel"; m1 double count and contradictory words; m2 label |
| D12–D15 | 4 | Team pill and list unchanged; axe clean at 1024/1440; card logic client-side, no added requests |
| D16 | 3 | Rule tests pass and fail (2/14 on the old code); m4 |
| D7 N/A (no AI) · D17, D20 simulated only | | |

## BIC (EXPERIENCE §6; only checks this change touches, the rest N/A)
| BIC | Result | Evidence |
|---|---|---|
| 01 Ask once | **Not met** | M1 (agent view, Sample Client A and Spouse A) |
| 02 Asked for a reason | Met | Q5/Q6 say "fills IMM 5257 SCH1 for Sample Client A" (walk/01, 02) |
| 04 Incomplete is normal | Met | "not answered" shown; nothing blocks saving |
| 18 States drawn | Met | Pill and lists match the data (1024 px shot) |
| 19 Low cognitive load | Partly | m1: "2 facts" for one answer |
| 20 Accessible | Partly | Keyboard and axe at 1024/1440 met; 200 % zoom not verified |

## Journey score (reviewer role): 8/10, pass
Detail in `journey-test-reviewer-2026-11-09.md`.

## Not checked
The Mac's Adobe Validate; the case page at 200 % zoom (my script did not reach the forms panel); r1c/r1d/r1a and Gate B (coordinator's numbers only); a real screen reader.

## To fix before Approve
1. M1: reuse the IMM 5257 fields for SCH1 Q5/Q6, with a pass/fail check. The Minors m1–m4 are fixed, or each gets a follow-up row.
