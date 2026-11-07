# B124 review (M3 row A8, P-393; C6.9): the outcome says when it rests on unconfirmed answers

Reviewer (fresh context, did not build it), 7 Nov. PR #1197, branch `claude/screens-b124-unconfirmed`, **commit ca72fa195** (HEAD checked). Scaled to a wording change on a built page. Read: the tech lead's ask, P-393 and `reports/best-in-class-C6.9-A4-2026-11-07.md` improvement 7 (on `lead/2026-11-05-lead14b`), `build-notes.md`, C6.9 concept BR-9/BR-10/§5, `git diff origin/main..ca72fa195`, the engine's `gateResult`/`withUnconfirmedNow`, the gate editor's rule builder. Ran my own copy on :4442 (`isolated.sh rev124`, live AI off, stopped after).

**Overall: Ship after fixes.** On the shipped Visitor visa gates (both are "and" style and "the representative reviews it") everything works and agrees. Two of the questions the tech lead asked come out wrong for gates an author can build today in the product's own gate editor (B106): an "or" gate, and a gate that reads an application-level (`case.*`) fact.

## Evidence run
* `tests/check_b124_unconfirmed_browser.cjs 4442 xr_studio_rev124`: **14/14**.
* Fresh copy → `demo/load configured` → `acceptance/C6.9.test.ts 4442 xr_studio_rev124`: **20/20** (C6.9-16..19 included).
* Mutants of `restingOn` (Not eligible counts every gate; Not eligible counts review gates too): both make C6.9-19 fail. Taking out the Likely branch fails C6.9-16, and taking out `withUnconfirmedNow` fails C6.9-17. So the rules for which facts are named have tests that fail when the rule goes.
* My own journey script (scratch, Playwright, `/opt/pw-browsers/chromium`): two-person case (principal confirmed, spouse not). Keyboard only: Run → move to the spouse in the list → Run → Tab to the link → Enter. Then History, Override, the case card, 400 px and 512 px (1024 px at 200 %) with axe, an out-of-date run, and the client role.

## Issues (ranked)
**Major 1: "deciding" names facts that do not decide, so the line stays after every deciding fact is confirmed.** `web/src/runtime/eligibility-unconfirmed.ts:17-20` takes every unconfirmed fact of a deciding gate. The gate's `unconfirmed` (`engine/runtime/eligibility.ts:55`) lists every answered, unconfirmed fact the gate reads, whichever branch settled it.
* (a) An "or" gate met on a confirmed branch, with the other branch answered but not confirmed. `restingOn` returns that other fact, and the page says "Likely eligible, on 1 answer not yet confirmed … rests on: B". Run on the function: `[ 'p.b' ]`.
* (b) A Not eligible gate "A and B" that fails on a confirmed A while B is unconfirmed (and true). The page says Not eligible rests on B, but B did not cause the failure. Run on the function: `[ 'p.num' ]`.
* The concept says an "or" gate "settles once one branch is true" (C6.9 concept, BR-9 line 78). The gate editor offers "or" (`web/src/components/conditions.tsx:93`, `combine === "or"`). The ask and the line's own sentence ("this line goes once every deciding answer is confirmed") both fail in (a) and (b).
* To answer the tech lead's two questions: in (a) the other branch's fact is **not** deciding, and the build names it. A met gate's unconfirmed fact is correctly **not** counted for Not eligible.
* Fix (preferred): work out the deciding set in the engine. Inside `withUnconfirmedNow`, or a `deciding` list per gate written by `gateResult` and refreshed when read, evaluate the gate again with its unconfirmed facts treated as missing. If the state stays the same, nothing unconfirmed decides that gate. Otherwise name the unconfirmed facts whose removal changes it. This also moves a gate-semantics rule out of `web/` into `engine/` (STANDARDS §3 ports, §6 "no duplicated logic"). Add a pass and a fail test with an "or" gate fixture.
* If the tech lead accepts deciding at the level of whole gates instead, record that in `challenge.md`. Then reword the line so it does not claim "deciding" or "rests on", and still add the "or" test.

**Major 2: a link for an application-level fact lands on the wrong person's tab.** `web/src/runtime/eligibility.tsx:202` always builds `lineId(a.person, f)`.
* A gate may read a `case.*` fact: the release check allows any asked fact (`engine/eligibility-gates.ts:210-221`), and the engine reads its holder (`aboutOf`, resolver R6b). The library has 60 such fields (e.g. `case.funds_available_cad`, `case.study_start_date`).
* The Agent view gives that question the id `a-<case subject>-case-…`. So the link opens the person's tab (`questionnaire.tsx:649-652`), finds no element and focuses nothing: the "link to confirm it" goes nowhere.
* Fix: use the holder, as `checklist.tsx:86` already does (`x.on === "case" ? caseSubject : …`). That is the case subject from `useCaseView` (`people` role `case`) when `f` is a filing fact (`isFilingFact`/`aboutOf`). Extend the browser check or an acceptance line so it fails if this is taken out.

**Minor 1: on an out-of-date run the line asks for a confirm that cannot clear it.** I changed the spouse's passport number and then confirmed every section. The page showed the orange band "Run again to see today's result" and also "Likely eligible rests on an answer not yet confirmed: Passport number. Confirm it in the Agent view; this line goes once …". Passport number is already confirmed (with the new value). `withUnconfirmedNow` correctly keeps the fact, because the value the run read was never confirmed, but the instruction is wrong. Fix: when `out_of_date`, leave facts in `changed` out of the line (the band covers them), or say "changed since this check: run again".

**Minor 2: the Not eligible words have no rendered or unit test.** Removing `restingWords(n)` or `few` from `eligibility.tsx:53` fails nothing. C6.9-19 tests only `restingOn`, and the browser check reaches only Likely and Possibly. Fix: move the outcome text to the pure module, or test `outcomeWords` for `NOT_ELIGIBLE` with 1 and 0 unconfirmed facts.

**Minor 3: one idea, three spellings.** The pill and the line say "not yet confirmed", the short pill says "not confirmed", and the gate rows and concept BR-9 say "(not confirmed yet)" (EXPERIENCE §5, plain words used the same way). Fix: pick one, ideally the concept's "not confirmed yet" or the ask's "not yet confirmed", and use it everywhere.

Seen, not a finding (already true before this change; P-26): after following a link, browser Back returns to the Eligibility page with the **first** person selected, not the one whose link was followed (`chosen` is not in the address).

## Concept, words, standards (scaled)
* Words agree across the views: pill "Likely eligible, on 3 answers not yet confirmed"; short pill "Likely · 3 not confirmed" in the people list, the case card and History; "1 answer" / "an answer" / "it" in the singular. The line goes when the count is 0. Possibly eligible is unchanged ("Possibly eligible — needs …", no line). The override field reads the long words. Keeping the page's own Likely / Not eligible wording instead of "Qualifies" is reasoned in the build notes and matches concept §5.
* BR-9 is unchanged: an unconfirmed answer still counts. No new route, record, migration or AI. The client gets 403 and the page "for the firm's staff". Status is shown by text, not colour alone. Team tokens, `Pill` and `Link` are used.
* [M] "A rule's test fails when removed": met for the naming rules, not for Not eligible words (Minor 2), and not for the "or" or case cases (Majors).
* [M] axe on every state: 0 violations at 1440, 400 and 512 px with the line showing (mine), plus the builder's 1440 and 1024 px. No sideways scroll.
* [M] "no duplicated logic / engine has the rules": the deciding rule sits in `web/` and is imported by the acceptance test (folded into Major 1's fix).
* Graph: not run (`graph.mjs` writes `qa/graph.json` in the tree; this brief allows writing only this file). The diff adds no page or route. The new module is imported by `eligibility.tsx` and named by C6.9-16..19.

## D1–D20
D1 Requirement fit 3 (right for "and" gates; wrong for "or" and failed "and" gates, Major 1) · D2 Data integrity 5 (read-only wording, nothing written) · D3 Reuse 4 (reuses `lineId`, `withUnconfirmedNow`) · D4 Rule integrity 3 (Major 1) · D5 Stability 4 (no new run needed, survives reload; Back loses the person, pre-existing) · D6 Governance 4 (P-393 cited, "Unconfirmed: no counsel") · D7 AI trust n/a, no AI · D8 Orientation 4 · D9 Flow 4 (link → focused question → Confirm section → count drops; the case-fact link is dead, Major 2) · D10 Language 4 (clear; three spellings, Minor 3; out-of-date contradiction, Minor 1) · D11 Feedback 4 · D12 Visual 4 (`walk/1-…png`, my 400 px shot) · D13 Accessibility 4 (keyboard path held, focus lands on the question, axe 0; links are inline text) · D14 Team look 4 · D15 Speed 5 (page 0.78 s, run 87 ms, worked out client-side with no extra request) · D16 Testability 3 (real tests for the naming rules; gaps in Minor 2 and the Majors) · D17 simulated only · D18 Provenance 4 (each named fact links to its answer) · D19 n/a for a wording row · D20 simulated only.

## Journey test (reviewer, the one score for this check)
Journeys: J1 a case officer checks a two-person case and sees the spouse's result rests on 3 unconfirmed answers (main). J2 follows a link by keyboard and confirms a section. J3 all confirmed, line gone (builder's check plus C6.9-18). J4 Possibly eligible unchanged. J5 out of date after a change. J6 the client tries the page. J7 400 px and 200 % zoom. J8 History and Override words.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J3 complete; the count drops 3 → 1 → gone |
| Next step obvious | ½ | Link and "Confirm them in the Agent view" are clear; Back loses the person; the case-fact link is dead (Major 2) |
| Plain words | ½ | Clear sentence; three spellings; out-of-date contradiction (Minors 1, 3) |
| Feedback and state | 1 | Pill, short pill and line agree everywhere; the line goes at 0 |
| Correct data | ½ | Right on the shipped gates; names non-deciding facts for "or" and failed "and" gates (Major 1) |
| Error recovery | ½ | Out of date shows the band but also a wrong instruction (Minor 1) |
| Accessibility and sizes | 1 | Keyboard path, focus on the question, axe 0 at 1440/400/512 px, no sideways scroll |
| Speed | 1 | 0.78 s view, 87 ms run |
| Visual quality | 1 | Calm line under the pill, team pill and link |
| Trust and sources | 1 | Each fact named and linked; P-393 cited; "Unconfirmed: no counsel" kept |

**Journey score 8/10, no criterion at 0: pass.** Most valuable fixes: Major 1 (correct data), Major 2 (next step), then Minor 1 (recovery and words).

## Could not check
A real screen reader. An intended user's unaided walk (D17 and D20 stay with the founder). An "or" gate and a `case.*` gate end to end in the browser: authoring and releasing one was out of scope for this review. Both Majors are shown by running the function and reading the code paths above. The filed (read-only) case state with the line showing. No separate journey-test file was written, because the brief allows only this file; the score is here.

**Verdict: Block.** To fix: Major 1 (deciding facts for "or" and failed "and" gates, worked out in the engine, with a test) and Major 2 (link to the application-level question's holder, with a test). Minors 1–3 are welcome in the same PR.

## Re-review (diff ca72fa195..06cc27a24)
Same reviewer, 7 Nov, **commit 06cc27a24** (HEAD checked). Only `git diff ca72fa195..06cc27a24` was reviewed, with the builder's response (last section of `build-notes.md`). Read-only on the tree. My own copy ran on :4425 (`isolated.sh rev124b`, live AI off), started and stopped in the same command.

### Evidence run
* `tests/check_b124_unconfirmed_browser.cjs 4425 xr_studio_rev124b`: **18/18**. `walk/6-not-eligible-funds-1440.png` reads "Not eligible on this application's rules as written, on 1 answer not yet confirmed". The people list says "Not eligible · 1 not yet confirmed", and the line links "Funds available cad".
* `npx tsx studio/tests/check_b124_rests_on.ts`: **8/8**.
* Mutants of `restsOn` (scratch copies, the builder's test pointed at each one):
  * `return unconfirmed`: 6/8 (the "or" pass line and the "and" fail line catch it).
  * No guard for "removing them all changes nothing": 6/8.
  * No "together" fallback: 7/8.
  * Deleting `kkey(person, f)` instead of the holder's key: **8/8, not caught by the pure test.** Reading the code, the browser walk's funds steps catch it: the funds answer would never be deleted, so nothing would be named. The pure test has no `case.*` line.
* On ca72fa195 the pure test cannot even load (there is no `restsOn`). Its lines encode Major 1 (a) and (b). The walk's funds-link `href` step fails on the old `lineId(a.person, f)`.
* Probes of the real `restsOn` and `gateResult` (scratch script, results below).

### Earlier findings
* **Major 1: partly fixed, still open (narrowed).**
  * Fixed: the moved rule is in `engine/`, and the two cases I reported are now right. An "or" gate met on a confirmed branch names nothing. An "and" gate failed on a confirmed fact names nothing.
  * `case.*` facts are handled: the key is deleted from the holder through `aboutOf` on the original Known, so `case.funds_available_cad` is named. An "or" of a confirmed case fact and an unconfirmed person fact names nothing.
  * Calculated facts cannot reach a gate: release refuses them (`eligibility-gates.ts:211-212`), and the `derived_fields` filter in `evalCondition` is untouched. Not a concern.
  * Still open: the "together" fallback is wrong (see Major 1 below).
* **Major 2: fixed.**
  * The link uses `a.inputs[].about === "case"`. That is the run's own record of the holder ("case" is the Known key for application facts, `assessments.ts:43`). The link then goes to the case subject from `c.people` (role `case`), which is the same holder `checklist.tsx` uses.
  * Tested end to end: the author adds a gate and others release it, the `href` ends `#a-<case subject>-case-funds_available_cad`, and the tab opens with that question.
* **Minor 1: fixed, by reading the code.** An out-of-date or not-travelling run gets `"none"`, so `restsOn: []`. Because the web uses `??`, not `||`, the `[]` is kept and no line shows. The outcome keeps the band. No test covers it (Minor 4).
* **Minor 2: fixed.** The walk asserts the Not eligible long words and the people-list pill.
* **Minor 3: partly fixed, and the partial fix is reasonable.**
  * The new words all say "not yet confirmed": pill, short pill, line.
  * The per-gate mark "(not confirmed yet)" is C6.9's string, asserted by `check_c69_page_browser.cjs`. The two spellings still show on one screen (`walk/6`).
  * Accepted as a carry-over for a C6.9 words pass, not a blocker for this row.

### API wiring (`api/src/assessments.ts` `fresh`)
* The release is read only when it is the same release: the `snapshotOf(c)` pin is the run's release, otherwise the result is null and then `"none"`. An out-of-date run gives nothing, and so does a person who is not travelling. Correct.
* Cost: `snapshotOf` is a property read (`runtime.ts:72`), not a query.
* `restsOn` runs `evalCondition` up to U+1+U times per gate, and copies Known each time. This only happens for the rows that are not out of date, which is usually the latest run per person. That is negligible at case sizes.
* The web fallback to `unconfirmed` (when a gate key is missing or for an older server) is harmless. Every view that shows the words (people list, case card, Result, History, Override) reads the same list endpoint, so their counts agree.

### Issues (ranked)
**Major 1 (still open, narrowed): when no single answer flips the gate, `restsOn` names every unconfirmed answer, including ones that decide nothing. It also misses answers that decide only together, when another answer flips the gate on its own.** `engine/runtime/eligibility.ts:128-130` (`alone.length ? alone : unconfirmed`). I ran the real function on three gates.
* (a) An "or" gate, which the simple editor builds ("any of these is true"). A = yes and B = yes are met, C = no, and all three are unconfirmed. Result: `restsOn = [a, b, c]`. C is answered "no" and decides nothing, which is the same defect as the first review's (a).
* (b) An "and" gate, also built by the simple editor. It fails on A = no and B = no, C = yes passes, and all three are unconfirmed. Result: `restsOn = [a, b, c]`. The page would say "Not eligible rests on … A, B, C", and C passed: the same defect as the first review's (b).
* (c) A nested gate `(A or B) and C`, all three met and unconfirmed (reachable through Edit as JSON). Result: `restsOn = [c]`. After C is confirmed, the line comes back naming A and B. That breaks the line's own promise: "this line goes once every deciding answer is confirmed".
* Fix: name `f` when some set S of the other unconfirmed answers leaves the gate unchanged (`without(S) === state`) while removing `f` as well changes it (`without(S ∪ {f}) !== state`). A brute-force check over subsets is enough, because a gate reads a handful of facts; above about 12 unconfirmed answers, name them all. This gives `[a, b]`, `[a, b]` and `[a, b, c]` for (a)–(c), and keeps all eight current lines.
* Add (a), (b) and (c) to `check_b124_rests_on.ts`, plus one `case.*` line so the holder key is tested without the browser.

**Minor 4 (new): Minor 1's fix has no test.** Removing `o.out_of_date ||` from `fresh` fails nothing I can see. Fix: one walk step. Change an answer after a run and check that the band shows with no "rests on" line.

Seen, not a finding (already true before this change):
* `factWords` shows the test gate's fact as "Funds available cad" (lower-case "cad").
* Browser Back loses the person you had open.

### Journey test (reviewer, re-scored on this commit)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J3 complete again on :4425; the new J9 (Not eligible on the application's funds) also completes |
| Next step obvious | 1 | The case-fact link now opens the application's tab at the question; Back losing the person is older behaviour |
| Plain words | ½ | Two spellings still on one screen (Minor 3 carry-over); "Funds available cad" |
| Feedback and state | 1 | Pill, short pill and line agree; the line goes at 0 |
| Correct data | ½ | Right for single-branch and shipped gates; over-names in (a)/(b), under-names in (c) (Major 1) |
| Error recovery | 1 | An out-of-date run no longer asks for a confirm that cannot clear it |
| Accessibility and sizes | 1 | Builder's axe step passed at 1440 px in my run; 1024 px with no sideways scroll |
| Speed | 1 | Unchanged; the extra work is in memory |
| Visual quality | 1 | `walk/6` calm and consistent |
| Trust and sources | 1 | Test gate labelled Sample; P-393 cited |

**Journey score 9/10, no criterion at 0: pass.**

### Could not check
* A real screen reader.
* An unaided walk by an intended user.
* Cases (a)–(c) in the browser: shown on the function only.
* The out-of-date path in the browser: checked by reading the code.

**Verdict: Block** (commit 06cc27a24). To fix:
* Major 1: the "together" rule in `restsOn`, with tests (a)–(c).

Welcome in the same PR:
* Minor 4: a test for "out of date gives no line".
* A `case.*` line in the pure test.

## Re-review 2 (diff 06cc27a24..a02dbb945)
Same reviewer, 7 Nov, **commit a02dbb945** (HEAD). I reviewed only `git diff 06cc27a24..a02dbb945` and the builder's response (last section of `build-notes.md`). I kept the tree read-only. My copy ran on :4425 (`isolated.sh rev124c`, live AI off) and is stopped.

### What changed
* `engine/runtime/eligibility.ts` `restsOn`: the subset rule, a memo and `RESTS_MAX = 10`.
* `tests/check_b124_rests_on.ts`: four new lines.
* `tests/check_b124_unconfirmed_browser.cjs`: one new step (Minor 4).
* `build-notes.md`; this file (my earlier re-review, committed); the six walk PNGs (a02dbb945).
* Nothing else changed.

### Evidence run
* `npx tsx studio/tests/check_b124_rests_on.ts`: **12/12**.
* `check_b124_unconfirmed_browser.cjs 4425 xr_studio_rev124c`: **19/19**, including "minor 4: after an answer changes, the run is out of date and shows no 'not yet confirmed' line". `walk/6` still reads "Not eligible on this application's rules as written, on 1 answer not yet confirmed", with the funds link.
* A second run on the same database stopped at set-up ("Reset the demo first to load the sample inputs"). The walk needs a fresh copy. This is how the set-up works, not flakiness, and it is not a finding for this diff.
* The new pure-test lines on **06cc27a24's** `restsOn` (a scratch copy with the builder's test pointed at it): **9/12**. The (a), (b) and (c) lines fail, so the new lines encode Major 1.
* Mutants of the new code (scratch copies; each one is caught):
  * Deleting `kkey(person, f)` instead of the holder's key: 11/12. The new `case.*` line catches it, which closes the gap I filed last time.
  * Dropping "S leaves the gate unchanged": 10/12.
  * Trying only S = {}: 8/12.
  * Trying only S = {} and S = all the others: 11/12, caught by (c).
  * `RESTS_MAX = 0`: 10/12.
* Probes of the real function:
  * `(A and B) or C`, all met and unconfirmed: [a, b, c].
  * An "or" with A confirmed and B, C unconfirmed: [].
  * `(A or B) and C` with A confirmed: [c].
  * An "or" of 10 unconfirmed facts with only f0 = yes: [f0], in 46 ms. With 11 facts, all 11 are named (the stated cap).

### Earlier findings
* **Major 1 (narrowed): fixed.**
  * `restsOn` names `f` when some S of the other unconfirmed answers gives `stateOf(S) === state` and `stateOf(S ∪ {f}) !== state`. This is the rule I asked for.
  * It gives [a, b] for (a), [a, b] for (b) and [a, b, c] for (c), and all eight earlier lines still pass.
  * The guard "removing them all changes nothing → []" comes first, as before.
  * The memo is keyed on the sorted set ("|" cannot be in a fact key), so a gate costs at most 2^U evaluations, U ≤ 10.
  * `RESTS_MAX` is a module `const` read only when the function is called, so it is never read before it is set.
  * Past the cap, every answer is named. That leans toward naming too many, never too few, and the comment says so.
* **Minor 4: fixed.**
  * The step changes the funds answer from 8000 to 9000. The gate is still not met against CAD 100,000.
  * By reading `api/src/assessments.ts:177`: without `o.out_of_date ||`, the run's not_met state against today's Known would name the funds answer, so the line would show and this step would fail. The step guards the rule.
  * The answer is changed through the API as set-up. What the step checks is read through the screen.
* **Pure-test `case.*` line (welcome): added.** It catches the holder-key mutant without the browser.
* Minor 3: unchanged, accepted as a C6.9 words carry-over (see above).

### Issues
None open at Blocker or Major. No new Minor.

Seen, not a finding:
* About 46 ms for a gate at the cap. It happens only on rows that are not out of date and only for a gate reading 10 unconfirmed facts. Shipped gates read 1–2.

### Journey test (reviewer, re-scored on this commit)
Same journeys as above. Changes from the last score:
* Correct data rises to 1: (a)–(c) are now right on the function, and the shipped gates are right in the walk.
* Error recovery stays at 1, and the out-of-date path is now tested in the browser.
* Plain words stay at ½ (Minor 3 carry-over; "Funds available cad").
* The other criteria are as before.

**Journey score 9.5/10, no criterion at 0: pass.**

### Could not check
* A real screen reader.
* An unaided walk by an intended user (D17 and D20 stay with the founder).
* An "or" or nested gate end to end in the browser: checked on the function only.
* The out-of-date mutant against a running server: checked by reading the code, because the tree is read-only.

**Verdict: Approve** (commit a02dbb945). No open Blocker or Major. Minor 3's spelling carry-over is for a C6.9 words pass.
