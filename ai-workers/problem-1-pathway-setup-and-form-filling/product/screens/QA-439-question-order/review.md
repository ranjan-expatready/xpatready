# QA-439 review: deciding questions first in the client questionnaire (PR #1643)

Reviewer: independent, fresh context, 12 Nov 2026, at **2e562a381943ec7118cab80913883b11dda36d49** (`git diff origin/main...HEAD`; merge-base 3ea36a0d3; merges cleanly with origin/main 4cdd5925b, whose QA-415 change to `knownOf` does not touch the new code). Skill scale: **Ship after fixes**. Journey score **8.5/10** (`journey-test-reviewer-2026-11-12.md`). Isolated copy rv439 on :4457 with the configured checkpoint. I never used :4400. Live AI was off, cost US$0, and the copy is stopped.

## What I re-ran
* `check_qa439_question_order_api.ts`: **22/22**. `check_qa439_deciders_first.ts`: **10/10**. `check_b164_no_engine_keys`: 52/0. `check_case_engine`: 86/86. `check_b128_relatives`: 20/20. `check_qa76_words`: 10/10. `check_line_holders`: 19/19. `check_b128_parents` on :4457: 23/23. `check_c41_section_order`: **32/32**. `check_c18_age_case`: 12/12. `check_c44_part2` needs its own prepared database, so I did not run it.
* **Engine A/B** (scratchpad scripts; base = merge-base engine, head = branch engine, same five released snapshots). The simulated client walks every visible question in order and answers deciders as it reaches them (young family: child born 2024; older family: common-law). "Wasted" counts questions answered and then dropped by a later answer:
  * Visitor visa: 31→10 (young) and 22→10 (older).
  * Study permit: 21→0 and 13→0.
  * Work permit: 14→0 and 5→0.
  * Family sponsorship: 4→0 and 1→0.
  * PNP: 3→0 and 0→0.
  * "Moved" (an unanswered question placed behind the client's position) is **0 on every run**. The order does not move while answering.
* **Property port of the API test, with UUID independence added:**
  * Base fails 12 checks: Study permit's order depends on subject UUIDs, and the decided-before and moved checks fail for each person.
  * Head passes all of them.
* **Mutants** (one change each in `case.ts`):
  * Dropping `whatDecides` is caught.
  * Dropping `inPartOrder` is caught (parts move).
  * **`rank` → 0 (people back in UUID order) is not caught** by any check of the PR (M1).
  * **`authored` → false is not caught** (m4).

## Soundness (the questions asked)
1. **Dependency mapping.**
   * Filing facts go to the application through `isFilingFact` (same rule as render's `addDecider`).
   * A relative's (`<person>/parent_1`, `<person>/sibling`) condition facts go to the owner. That matches `evalCondition(…, subjectId.split("/")[0])` at case.ts:425.
   * The rule "every form the question fills waits" is right: a question kept by an always-applying form is never form-gated.
   * **Gaps:**
     * Form-field gates (B107, `gatesInForce`) are not read (M2).
     * `waits` (case.ts:541) maps a form's missing facts to the form's holder, so it ignores `lineCondition`'s `about` (m3). On the five releases every such wait is a filing fact, so nothing is wrong today.
2. **Stable while answering.** Yes. The part order is the no-answer view's order (case.ts:470), and "moved" was 0 on 20 walks. Reload keeps the overview order (journey J5).
3. **Cost.**
   * Each `caseView` now runs about 4 renders: its own, `whatDecides`, and the inner view's two.
   * Warm time is 32–87 ms against 15–33 ms on base, and the first call is 84–160 ms against 49–84 ms.
   * The GET questionnaire took 60–185 ms and the overview was ready in about 0.4 s.
   * This is inside STANDARDS §9, but callers that call `caseView` 2–3 times per request multiply it (m2).
4. **Agent and client views.** Both use the same rule. The officer's per-person tabs start with Personal details. C6.16: the inner view has no answers, so it reveals nothing about a private person. The `withoutHidden` path is unchanged.
5. **C4.1.**
   * The relative order of the author's chosen sections holds (`check_c41_section_order` 32/32).
   * A chosen section now follows the part that decides it. For example, the principal's Personal details now come before National identity document. That is the lead's (A) design.
6. **Other readers of the order.**
   * The web `byPerson` (questionnaire.tsx:399) sorts parts by person again, so the engine's cross-person moves never reach the screen (m1). This is not a regression: on the Study permit screen walk, wasted goes from 21 on base to 5.
   * PQR and Preview just follow the new order.
7. **Lead's done-when (PR comment, 09:57).**
   * #3 is met (overview: the application > principal > spouse > child).
   * #4 is met (B164 green; no snapshot or fingerprint change).
   * #1 has no test (M1).
   * #2 is met for dates of birth and marital status, but not for "each decider before the first question it decides" on the Visitor visa sample journey (M2).

## D1–D20 (1–5)
D1 4: the ruling's main case is fixed (a child sees Personal details first; Military, Government and Membership drop away after DOB); the gate half is open (M2) · D2 5: no write path changed; DOB and marital status are stored once each · D3 5: no new fields · D4 4: the cross-person moves are lost on screen (m1) · D5 5: reload keeps the order; moved 0 · D6 N/A · D7 N/A (no AI) · D8 5: "About <person>" blocks are in the case's order · D9 4: Personal details first; "_other" questions still come before their gate · D10 4: unchanged labels · D11 5: parts count drops 56→51 after the child's two answers · D12 5: unchanged look · D13 5: axe found no violations at 1440, 1024 and 400; no sideways scroll; Start reached by keyboard · D14 5 · D15 4: about 2× engine cost (m2) · D16 3: UUID and C4.1 wiring are untested (M1, m4) · D17 simulated only · D18 N/A · D19 4: C6.3 hand-back is not re-walked by me (the builder's gate B says 12/12) · D20 simulated only.

## BIC (EXPERIENCE §6)
* BIC-02: **Partly**. A decided question now follows its decider except for B107-gated details (M2).
* BIC-10: Met, unchanged. Parts can be done in any order from the overview (rv-overview-1440.png).
* BIC-18: Met. The parts count updates after answers.
* BIC-19: Met, unchanged layout (rv-child-part-1440.png, rv-part1-1024.png).
* BIC-20: Met. Keyboard Start works, there are no axe violations at 1024 or 400, and there is no sideways scroll. I did not test 200 % zoom (400 px stands in for it).
* All other checks are N/A: there is no document, signing, filing, review or case-structure surface in this change.

## Graph, retrofit, scaffolding
`graph.mjs` was not run (it rewrites `qa/GRAPH.md`, which is outside this review's files). This is a bug-fix row: there is no new page or route, so no retrofit mapping applies. No step relies on scaffolding; the client's own screen does the walk.

## What I could not check
A real screen reader. An unaided walk by an intended user (D17/D20 stay with the founder). C6.16 74/74 and C6.3 12/12 were not re-run by me (I ran B128, C4.1, C1.8 and the engine suites instead). 200 % zoom.

Verdict: Block
* **M1 (Major, Must): the lead's done-when #1 has no test, and the people-order rule is unguarded.**
  * Done-when #1 asks for the same case built twice with shuffled UUIDs giving the same order.
  * Replacing `rank` with `() => 0` at case.ts:462–463 (people back in UUID order) passes both QA-439 checks. The unit test checks `decidersFirst` with its own rank function, not the wiring in `caseView`.
  * Fix: add a check, API or engine, that builds the same family with UUIDs in opposite lexical order and compares the order by role. Also assert that each person's block follows the case's people order. Both must fail on the `rank` mutant.
* **M2 (Major, Must): done-when #2 and QA-439's own fix ("each gate question before its details") are not met for form-field gates on the Visitor visa journey.**
  * Each of these comes before its gate:
    * "Description of the visit purpose when it is 'other'" before "Purpose of the visit".
    * "Description of the status … when it is 'other'" before "Immigration status …", twice per person.
    * "immigration_history_details" before "refused_visa_entry_or_removed".
  * That leaves 10 wasted answers per Visitor visa walk.
  * The gate is release data: IMM 5257's field-map `condition_rule.gate`, for example `{eq, case.visit_purpose, "Other"}`. The built note's "QA-402's visit purpose has none" is wrong for this release.
  * Fix: in `whatDecides`, when every box a question fills is gated (`gatesInForce`), add the gate's fields as its deciders (generic, the same rule as form waits). Add a pass and a fail line on the Visitor visa.
  * Alternatively, get the lead's written split of this half to QA-402 or a new row, and correct `qa/built/QA-439.md`.
* m1 (Minor, Should): web `byPerson` (questionnaire.tsx:399) undoes the cross-person moves.
  * On screen, the Study permit custodianship questions still come before the child's "minor studying without parent", and the principal's life-insurance question still comes before the spouse's marital status.
  * The note "A part is never asked before what decides it" is true of the API only.
  * Reword the note and add a screens follow-up row (that file is off-limits here).
* m2 (Minor, Should): the cost is about 2× per view (4 renders).
  * Compute the no-answer order once per view: reuse one `whatDecides` for both passes, or memoise by snapshot, people, mode and opts.
* m3 (Minor, Should): `waits` (case.ts:541) ignores `lineCondition`'s `about`.
  * A form waiting on another person's non-filing fact would be keyed to the holder.
  * Carry the `about` from render's `formWaits`.
* m4 (Minor, Should): nothing fails when the C4.1 `authored` wiring (case.ts:465) is removed.
  * Add one assertion that a person's chosen sections lead their non-deciding parts.
