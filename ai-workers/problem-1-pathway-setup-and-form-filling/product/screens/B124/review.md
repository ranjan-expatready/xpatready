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
