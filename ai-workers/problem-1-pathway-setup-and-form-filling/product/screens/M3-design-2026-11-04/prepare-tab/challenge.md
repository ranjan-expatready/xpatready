# Prepare application tab: fresh challenge (4 Nov; screen-concept part B, P-316 (3), P-223 (4))

The challenger did not draft this concept. It read `concept-draft.md` and `design/draft-prepare-tab.html` against main 9caa043b plus the records: `api/src/case-prepare.ts`, `engine/runtime/{prepare,filings,signing,answer-sheet}.ts`, `M3-CONTRACT.md`, `web/src/runtime/{cases,forms}.tsx`, the packs C7.7, C11.6, C6.12-breadth and C7.3, `samples/fee-table.json`, J7, `rows.md`, EXPERIENCE, TEAM-PATTERNS, DECISIONS and the hot list. Nothing was run. `ai-workers/tools/freshness.sh` stops because `code/README-copies.md` is missing in this copy, so the team's names (AG-07 tabs, SI-15, SI-16) are **Unverified**. Paths are under `prototype/studio/` unless a path is given.

## Verdict
**Build after these changes.** The pattern is right: one tab, a split view, three cards, a right panel for the sheet, fees per group. But the board draws states and words that `/prepare` never returns, and retiring the forms panel removes built work. The claim "API: none" is wrong for the board as drawn.

## Objections
**Blockers**

**B1. Retiring the forms panel drops built capabilities and turns suites red.** *Needed for the proof.* Confidence: high.
* **What breaks.** `FormsPanel` is how an officer generates a copy, downloads it, sends the validated copy back (the input to P-237's only hard stop) and locks it (`web/src/runtime/forms.tsx:62,100,106`). `/prepare` items carry no copies. §6 lists only the channel PATCH, the entered tick and the Paper steps as writes (`concept-draft.md:82`).
* **Suites that read the panel.** `tests/runtime/check_runtime_r1c.cjs:281-290` (Generate a copy, Download, Filed; it runs in `product/tools/run-suites.sh:218`), `tests/check_s5_slice2_browser.cjs:196-201` (`[data-online-form]`) and `tests/qa/check_qa_s01_channels.cjs:60`.
* **Cases with nothing derived.** A case whose combination has no fee rule and no released filing modes gets `derived:false` and no items (`case-prepare.ts:81`). With the panel gone, its forms list disappears.
* **Fix.**
  * Put the existing copy block in the form row's detail: Generate, Download, Send validated copy back and Lock (`FormRow` and `ValidatedState`, read from `/forms` for that form and person). Every route is built.
  * Keep `FormsPanel` only where `/prepare` says `derived:false`, and show its `why`.
  * Change the three browser checks in the same PR and name them.

**B2. Rows show states `/prepare` never returns.** BR-3 says "the UI never writes its own reason" (`concept-draft.md:31`). *Needed.* Confidence: high. The facts:
* **PDF upload form.** It is only `to_do` or `cannot_start`: never In progress, Done or Out of date, and it has no `steps[]` (`case-prepare.ts:222-224`, C7.7-21). The board has IMM 5257 PDF upload "In progress" with three steps, and Spouse A "Out of date" (board l.29, 35, 43).
* **Document item.** It is always `to_do`, "Not requested yet" (`case-prepare.ts:226`), although `checklist_line` stores received and approved. The board has Passport "Done · received" (l.32).
* **Biometrics step.** It is always `cannot_start` (`case-prepare.ts:227`). The board has "To do" (l.33).
* **Exempt child.** An exempt child has **no** biometrics item (`engine/runtime/prepare.ts:38-41`). The board invents "Biometrics · Child A · Done" (l.37), which also inflates "9 of 14 done".
* **IMM 5476 with its signed scan in.** It is `ready`, not Done (`engine/runtime/signing.ts:55`). The board has Done (l.31).

**Fix.**
* Draw only API states.
* Make two small M3-only changes in `case-prepare.ts` (not on the hot list):
  * (a) a PDF-upload barcode line gets `validated{}` and In progress or Out of date by `readBackOf` and `paperLine`'s rule (Q2);
  * (b) a document item takes its state from its `checklist_line`.
* Move the exempt child's reason into the fee block (`fees[].exempt`, `why`). Correct §2's "API: none".

**Majors**

**M1. BR-3 lists five states; the API and the pack have seven.** `acceptance/C7.7.test.ts:14` adds `ready` (built, `engine/runtime/signing.ts:55`) and `not_needed` (P-137). The test "an unknown state is never shown as Done" (`concept-draft.md:88`) would then show a real Ready as unknown. *Needed.* High. **Fix:** seven words, adding Ready and Not needed, with one test each.

**M2. The channel select hides the refused options.** It contradicts three things. *Needed.* High.
* P-122: "a refused option says why".
* C11.6 (a): "A refused choice shows IRCC's line in words".
* J7 5.2: "IMM 5476 → Online … refused with IRCC's line".

With only `accepts[]` offered (`concept-draft.md:32`, board l.42), the officer never learns why. Each item already carries `accepts_quote` (`case-prepare.ts:222`). **Fix:** show all four channels. Those outside `accepts` are disabled with "Not accepted on APR Portal: IRCC's line …". The 422 on the field stays, for a stale read. Test: IMM 5476 shows Online and Paper disabled, with the quote.

**M3. The fee block shows neither fees per filing nor the words C6.12-25 checks.** *Needed.* High.
* **The arithmetic is right.** It is checked against `samples/fee-table.json` and the cited fees.asp lines (page date 2026-09-21; the biometrics exemption page dated 2026-03-30):
  * Visitor visa: 4 × CAD 100 = CAD 400. The CAD 500 cap starts at 5 people, so 400.
  * Biometrics: 3 people pay (the child of 10 is under 14), 3 × CAD 85 = CAD 255. The family maximum is CAD 170 from 2 people, so 170.
  * Group total: CAD 570.
* **What is wrong.**
  * The basis reads "per person", but `visitor_visa` is `family_maximum` (`fee-table.json:11`); the cap is not reached.
  * No payer is shown.
  * There is no "Sample until the immigration expert confirms", which the API's `basis` carries (`engine/runtime/filings.ts:268`).
  * C6.12-25 looks for `/visitor visa fee/i`, `/CAD\s?100/` and `/CAD\s?170/` on `/cases/:id` (`C6.12-breadth.test.ts:133-137`). The board prints "Visitor visa ×4 … 400" and "170", so it fails.
* **Fix.**
  * Per group, render:
    * each `fees[]` line with its label and `amount_words`;
    * who pays and on whose filing ("Family maximum CAD 170 … paid on this filing"; "Covered by the family maximum, paid by Client A"; the exempt reason);
    * `groups[].totals[].why`, e.g. "4 × CAD 100 = CAD 400, not above the family maximum CAD 500.";
    * the API's `basis` sentence.
  * Amend -25 to click the tab, as `rows.md` says. The concept does not list this.

**M4. Stage 1 has no data source, and the tab set leaves built panels without a home.** *Needed.* High.
* **Stage 1.** `/prepare` `stage1` holds `{filing, to_confirm (facts), confirmed 0|1}` and no sections (`case-prepare.ts:230`). "7 of 8 sections confirmed" and "Next: confirm Travel documents · Child A" (board l.26) come from nowhere. Confirming is done in the Agent view questionnaire (`web/src/runtime/cases.tsx:186-187`).
* **Panels with no tab.** The tabs Overview · Prepare · Review · History place none of these:
  * People;
  * `EligibilityCard` (r5c had an Eligibility tab, and the route `:id/eligibility` exists, `cases.tsx:65`);
  * `FindingsPanel` (C7.5, `cases.tsx:185`);
  * the Agent view and its `#agent-view` link (`cases.tsx:148`).
* **History.** It has no route: an empty stand-in (P-33).

**Fix.**
* Stage 1 is the Agent view (P-122: "facts stay one stage"). Its counts come from the case view's sections, which are already loaded.
* Map each panel to a tab: People and Eligibility to Overview, Findings to Review.
* History only once a case history exists (Q1).

**M5. The "Out of date" words cannot be produced.** §5 has "{fact} changed from {old} to {new} on {date}" (`concept-draft.md:79`) and the board "date of birth changed 3 Nov". The API names a section for an Online line (`case-prepare.ts:210`) and "a fact on X" for a Paper line (`engine/runtime/prepare.ts:78`). Fact, old and new value, and date are C9.2's (`M3-CONTRACT.md:34`; it waits for C7.6). *Needed* (BR-3). High. **Fix:** show the API's reason. The template moves to C9.2, Not built here.

**M6. "Download PDF copy" is drawn on a PDF upload row** (board l.44). The API refuses it with 409 (`case-prepare.ts:293`, C7.7-14). *Needed* (P-145). High. **Fix:** it appears only on Online rows. A PDF upload row's deliverable is its own copy (B1).

**M7. The answer sheet lacks a person per answer, a waiting state and a tick it can honour.** *Needed* (C7.3). High.
* **Person.** Each answer carries `person` (`engine/runtime/answer-sheet.ts:11`), and IMM 5707 mixes principal and spouse answers (C7.3-6). Unlabelled, the spouse's date of birth can be typed into the principal's box.
* **Waiting.** `waiting[]` exists, and QA-153 keeps IMM 5707 waiting today. The board draws neither.
* **Tick.** A checkbox implies un-ticking, but the only route is `POST …/entered`.
* **Source.** `source` is Document, Client or Case officer, not "Passport · confirmed by case officer".

**Fix:**
* add a Person column;
* add "Waits for: Parent 1 date of birth" per section;
* replace the checkbox with a "Mark entered" button and the who-and-when line;
* make the panel 480–560 px (EXPERIENCE §3).

**Minors**
* **m1.** "Filed through: IRCC secure account" (board l.24) should be the API's `portal_words`. The visitor visa uses the APR Portal (`acceptance/lib/setup_vv_m3.ts:17`; J7 2.3). *Needed.*
* **m2.** The board's counts disagree. The chip says 4 filings but the list shows 3, and "Biometrics ×3" implies a fourth person. **Fix:** draw the FAMILY case: Client A, Spouse A, Child A1 aged 10, Child A2 aged 15 (C7.7.test.ts:19). "Everything · 22 lines" should say what it counts (EXPERIENCE §2.7). *Needed.*
* **m3.** Every 409 is mapped to "Someone else changed this". Other 409s mean other things: `pdf-copy`, split, entered, and the release fingerprint (`case-prepare.ts:69-71, 275-277, 293, 318`). **Fix:** show the problem's `detail`. *Needed.*
* **m4.** Two states are drawn as if they work. "Read-only after filing" needs C8.2. "Nothing changes until you adopt it": ADOPT is not built (P-246 (2)). **Fix:** label both Not built and test neither. *Not built.*
* **m5.** States are missing from the board (EXPERIENCE §4):
  * running: a PDF copy is a 202 job, C7.7-10;
  * long names;
  * not derived (`derived:false` plus `why`).

  "No filings yet: add the people first" can never happen, because a principal always exists. *Needed.*
* **m6.** J7 5.1's "Everyone ▾" person filter (P-122) is not drawn. *Needed for J7.*
* **m7.** The Definition of ready leaves out gate B. QA-152 is an open Major on C7.7 and QA-153 on C7.3 (`rows.md:57-60`). qa's re-score of #709 is also missing. *Needed.*
* **m8. M2-hot.** No part needs a hot file, provided the `/prepare` types are **not** added to `studio/contracts/runtime.ts`: `studio/contracts/` is hot, and the concept does not say where the types live. **Fix:** put them in `prepare.tsx` or a new contracts file. `App.tsx` needs no route line, because `/cases/*` routes live in `cases.tsx:61-67`. *Needed.*

## What is sound
* One tab named "Prepare application" (P-272) in the route, and the absorption of challenge M7.
* Three cards as one switch over a split list with one next action. This is r5c's choice; it reads as P-122's progress strip.
* The portal is read-only (P-137) and the combination's line never changes (C11.6-12).
* The PDF copy is never an item and never counted (P-145, C7.7-12).
* Readiness is read from the API and never computed (P-237, P-238). Fees are per submission group with the cap inside one group only (P-247). Paying is not built.
* The answer sheet opens in a right panel labelled "PDF twin order (live portal order later)" (P-152).
* The fee sums are correct, and every amount on the board is cited or Sample.
* The concept adds no new scope. Waits and online-only copies are moved out of Works as breadth (Q3 agreed).

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Tab, route `/cases/:id/prepare` | — | `GET /prepare` | BR-1, P-272 | C7.7-27: the tab is reached by keyboard; the panels are mapped (M4) |
| Stage 1 | answers, confirmed sections | `GET questionnaire?mode=agent`, `stage1` | P-72, P-122 | the card count equals the unconfirmed sections; Confirm moves it |
| Form row state | `filing_item`, `validated_copy`, `entered_section`, `sign_step` | `/prepare items` + change (a) | BR-3 (7 states) | IMM 5257 PDF upload In progress after `validateRoundTrip`, Out of date after a change; 5476 Ready |
| Copy block | form copies | `/forms`, `…/generate`, `form-copies/:id/validated`, `…/lock` (built) | P-65, P-144 | `check_runtime_r1c.cjs` stays green against the tab |
| Channel | `filing_item.channel` | `PATCH items/:id/channel` | C11.6, P-122 | refused options disabled with the quote; Paper without a reason refused on the field |
| Document row | `checklist_line` | `/prepare` + change (b) | P-122 | received → In progress; approved → Done |
| Fees | `fee-table.json` (`fee_table_id` later) | `fees[]`, `groups[].totals`, `basis` | P-247, P-171 | C6.12-25 amended to click the tab: CAD 100 each, CAD 170, payer shown |
| Answer sheet | `entered_section` → `answer_snapshot` | `GET answer-sheet`, `POST …/entered` | C7.3, FQ-6 | person shown; waiting shown; a changed section warns only |
| PDF copy | form copy | `POST items/:id/pdf-copy` | P-145 | Online rows only (C7.7-10…14) |
| Readiness | (C7.6) | `readiness[]` (`built:false`, `why`) | P-237, P-238 | shows `why` until C7.6 lands |

## Questions for the founder (≤3, recommendation first)
1. **History tab:** *Recommend:* leave it out of the tab row until a case history exists (P-33). The alternative is a stand-in tab marked Not built.
2. **(Tech lead) The PDF upload line's state:** *Recommend:* change (a). It is about 20 lines in `case-prepare.ts`, reusing `readBackOf`, and gives In progress and Out of date from the read-back. The alternative leaves it "To do" with the copy block beside it, which leaves the main visitor visa form at To do after its read-back.

## Lead response

## Agreement

## Build discoveries
