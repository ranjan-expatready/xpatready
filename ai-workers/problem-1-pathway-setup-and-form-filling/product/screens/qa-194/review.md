# QA-194 review: the tolerant matcher never guesses between twins (C4.7, C4.11)

Reviewer: independent reviewer agent (did not build it) · 3 Nov 2026 · branch `claude/forms-twins`.
* **Re-review: `dc31958e..4602767d`. Verdict is for 4602767d.**
* While I worked, the branch moved to 535c543b, a merge of `origin/main`. It leaves all six QA-194 files exactly as at 4602767d (fact-words, pqr-picks, qd-conditions, the C4.7 pack, both qa162 suites). Some of my runs may have used the merged tree. I did not review the main changes it brings in.
* Earlier rounds: `origin/main..6d83353e`, then `..dc31958e`. Their findings are kept below, marked closed or open.

Bar: QA-194 in `qa/BUGS.md`, the QA-162 fix ("never guessed"), P-76, the tech lead's six requirements, `QUALITY.md`, and WAY-OF-WORKING P-291 ("when a decision changes behaviour, its pack changes in the same PR").

This is engine code, not a screen, so the concept, menu-word and retrofit checks do not apply. The visible effect (the Left out list and the "named exactly" line) was walked in a browser again at 4602767d. Journey report: `journey-test-reviewer-2026-11-03.md` (**8.5/10, pass**).

Runs: an isolated copy `forms_qa194rev` on :4457 (forms range), started fresh before each run. Visitor visa set up by `tests/runtime/setup_visitor_visa.ts`. Replay and rules only: no model call, no `STUDIO_*_LIVE`.

## Re-review of 4602767d (my own runs)
* **Unit suite** `check_forms_qa162_fact_words`: 53/53.
* **Mutation checks**:
  * "to" taken out of the stop words: the "to never picks a twin" test and the "Relationship to applicant" test fail.
  * The veto taken out: the "lone question for the other end" test fails.
* **Suites and packs**:
  * `check_forms_qa162_saved_matching`: 23/23. C4.7 lands 10 of 23 picks; C4.11 lands 2 of 22 conditions.
  * `acceptance/C4.7.test.ts`: **17/17** on a fresh copy, including the new third-pick setup.
* **Probe on the real Visitor visa questions** (all give no match, with every holder named):
  * The four examples: "Intended stay dates", "Intended stay", "Purpose of visit", and "Previous residence" (5 holders).
  * "Criminal record".
  * "Intended stay to Canada" and "Intended stay to date": none, [from, to].
  * "Relationship to applicant": none, 3 holders named, the same as main.
  * Funds, health and "Purpose of visit to Canada" still match on their own.
* **Browser walk**: the Left out lines name every candidate. axe finds nothing, there is no sideways scroll at 1024 or 400 px, there are no page errors, and the draft takes 325 ms.
* **B1 closed.** `:38` now expects proposed ≥ 6 and at most 13 left out, with the QA-194 reason in a comment. The third pick is the first later pick whose fact the PUT to AGENT accepts, and the pack passes 17/17. The comment above it (`:59-60`, "chosen by the fact's own offer, never by queue order") is now only half true, because the loop falls back to queue order. That is a nit.
* **M1 closed.** "to" is filler again, so it never decides. A direction word only ever vetoes a lone holder for the other end (`fact-words.ts:76-79`); it never picks between twins.
* **M2 closed.** `listed()` names every candidate (`:85`).
* **m3 closed.** The header comments are now true.
* **New n1 (Minor, Should): the M2 test cannot fail.** It uses "Previous residence" with 3 holders in the unit pool, so putting back the old "first three, then *and n more*" `listed()` still passes it (checked by mutation). Use a pool with 4 or more holders, as the real Visitor visa has.
* **New n2 (Minor, note): the veto misses some keys.** It reads only keys that end in `_to` or `_from`. `person.education_to_date` and `person.employment_to_date` and their `_from_date` twins are not covered. This matters only when a pool holds one twin without the other; on Visitor visa both are present. If it is ever needed, widen the pattern to `_(to|from)(_date)?$`.

## What holds (first round, still true)
* **The tie-break is gone.** Several full holders now give `why: "several"` with every holder in `several` (`fact-words.ts:74-77`). Mutation check: putting the tie-break back fails the two QA-194 fail cases it should ("Purpose of visit", "Criminal record").
* **The four examples on the real Visitor visa questions** (probe through `factSources` on the copy) give no automatic match. On main they gave a match. "Intended stay dates" and "Intended stay" → none [from, to]. "Purpose of visit" → none [visit_purpose, visit_purpose_other]. "Previous residence" → none, 5 named (country, from, status, status_other, to).
* **A single full match still matches**: funds, health, both "Accompanying …" picks, and "Previous residence end date".
* **The `takenAs` line is now true.** It is only written when exactly one question in the person's pool (their own questions, plus the case questions for the principal) holds every word, and "of this person" says what was searched.
* **Callers.** Only `engine/pqr-picks.ts:66` and `engine/qd-conditions.ts:50` call `findFact`. `matchFact` (`pqr-picks.ts:46`) is exported but nothing calls it. `api/src/pqr-drafts.ts:18` imports only `namesOf`. The other `wordsOf` functions (`engine/structure.ts`, `api/src/saved-readings.ts`, `api/src/rule-facts.ts`, `engine/runtime/mandatory.ts`) are separate local functions. Nothing else relied on the tie-break or on "to" being filler.
* **"Criminal record" → none is right under the rule.** "Details of criminal history" holds both words (record = history). The criminal-history item still arrives, from round 1's exact "Criminal history", now as Decide (one reading) instead of Check. That is honest.
* **Words such as "to"**: at 4602767d "to" is filler again, as it was on main, so no pick misses because of it. "from" is a word, as it was on main.
* The C4.11 pack scores 14/23, the same as recorded on main (`reports/verify-2026-11-03/V2-rule-engine.md:40`, "14 PASS, 9 FAIL with setup_visitor_visa"). Its failures are not from this change.

## Earlier rounds (6d83353e, dc31958e): issues as raised, all now closed
**B1 Blocker: suites and the pack still asserted the old behaviour (P-291).**
* `check_forms_qa162_saved_matching` was 19/23 at 6d83353e (main 23/23) and failed at `:69`, `:71`, `:81`, `:95`. dc31958e fixed it.
* `acceptance/C4.7.test.ts` was 14/17 (main 17/17): `:38` had 6 proposed and 13 left out against ≥ 7 and ≤ 10, and the third-pick setup got a 422 because `visit_purpose` no longer landed. 4602767d fixed it.

**M1 Major: with "to" counted as a word everywhere, a filler "to" decided matches.** "Relationship to applicant" landed on `case.visit_contact_relationship`, and "Intended stay to Canada" landed on the end date. 4602767d fixed it.

**M2 Major: `listed()` named only three candidates.** "Previous residence" hid the end-date twin behind "and 2 more", and the national-identity decider hid its 4th holder. 4602767d fixed it.

**m1 withdrawn.** I had suggested leaving the target out of its decider's candidates. The builder's counterexample is right: "Ever used other name" would then land on "Given name(s)" alone, a wrong guess.

**m2 addressed in dc31958e.** The Left out reasons are now asserted.

**m3 closed in 4602767d.** The header comments are now true.

## D1–D20 (engine change; scores from the evidence above)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | Twins → none, every candidate named, the reason line true, a single full match still matches. A direction word vetoes but never picks. |
| D4 Rule integrity | 4 | An ambiguous decider leaves its condition out, never guessed (m1 withdrawn). |
| D7 AI trust | 4 | Words-matches stay at Check with a true "taken as" line (screenshot 5 of the journey). |
| D10 Language | 4 | Reasons are plain and name every candidate. "Pick it by hand" (existing wording) does not say where. |
| D11 Feedback | 4 | "6 picks for To review, 13 left out with the reason", with the Left out list. |
| D13 Accessibility | 4 | axe finds nothing on the result state; no sideways scroll at 1024 and 400 px; keyboard opens the dialog. 200 % zoom not checked. |
| D15 Speed | 5 | The saved draft takes 210–862 ms. |
| D16 Testability | 4 | The "to" and veto rules fail when removed (mutation check). Suite and pack are updated and green. The listed test is weak (n1). |
| D18 Provenance | 4 | AI marked, both readings shown, IRCC's sentence found. |
| D17, D20 | simulated only | No intended user has walked it. |

D2, D3, D5, D6, D8, D9, D12, D14 and D19 are not affected by these diffs.

## What I could not check
* The full CI suite set. I ran `check_forms_qa162_fact_words`, `check_forms_qa162_saved_matching`, and the C4.7 and C4.11 packs. The C4.11 pack scored 14/23, the same as main.
* For the other direct suites I relied on the builder's report: `check_forms_c47_pqr_picks` 60/60, `check_forms_c411_draft_qd` 77/77, engine, sh3, w1, case engine, dv backbone.
* A real screen reader, 200 % zoom, and an intended user's unaided walk.
* The earlier changes on port 16432 were the builder's own suite run, now explained.

**Verdict: Approve** (for 4602767d)
* Blockers: none. B1 is closed.
* Majors: none. M1 and M2 are closed.
* Minors, which can follow and do not block: n1 (the listed test needs 4 or more holders), n2 (the veto does not cover `_to_date` and `_from_date` keys), and the nit on the C4.7 third-pick comment.

## Final diff: 535c543b..681e076e (PR #735). Verdict is for 681e076e.
The code changes are in three files, plus my two review files, which were added unchanged. I used no isolated copy for this round.
* **n1 closed.** The `listed()` test now uses a pool of 5 "Previous residence" holders, checks that every label is named, and checks there is no "more". I put the old "first three" `listed()` back and this test **FAILS**.
* **n2 closed.** `end()` now reads `/_(to|from)(?:_date)?$/` (`fact-words.ts:77`). The new test: "Employment period to" with only `person.employment_from_date` gives none, and "Employment period" alone names it. I put the old regex back and this test **FAILS**. In the studio's samples, engine, API and question lists, the only keys this pattern touches are `case.intended_stay_from`/`_to` and `person.employment_from_date`. Each is a true start or end date, so nothing is vetoed by mistake.
* **Nit closed.** The comment at C4.7 pack `:62` now says what the loop does.
* `check_forms_qa162_fact_words` passes 54/54 (my run). For the other direct suites I relied on the builder's report. Nothing else changed in the code.

**Verdict: Approve** (for 681e076e). Blockers: none. Majors: none. Minors: none open.
