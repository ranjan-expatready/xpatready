# QA-237 + QA-239 (Bake row 6): held conditions, independent review

Reviewer agent, 11 Nov 2026, who did not build it. PR #1534, branch `claude/youthful-sagan-ewt0fk`, commit **915278fcd**, against `origin/main` fbfb263c7. Read word for word: BUGS.md QA-237 and QA-239, bake plan row 6, B86 concept §3, §7 Q3, §8. There is no concept or build notes for this row: I reviewed against those three and the tech lead's brief. Copies on :4460 and :4461, stopped after. US$0.

## Verdict: Ship. Journey score 9 / 10 (pass, no 0): `journey-test-reviewer-2026-11-11.md`
| Done when (brief) | Result | Evidence |
|---|---|---|
| Each bug's reproduction is a test that fails on main and passes here | **Met** | `tests/check_forms_qa237_qa239_held.ts`: **22/22 twice** on 915278fcd. **11/22 on main's source** (my worktree of fbfb263c7 with only the test copied): the Hiding error, Submit refused for it, Study permit's Submit 400 and its fingerprint moved |
| A second pathway reading the same question releases after the first approves the condition | **Met** | Study permit: fingerprint `9c2a0854…` before and after, release 201, the 5 published placements carry no condition |
| Accepting a proposed condition leaves the draft saveable | **Met** | Visitor visa: 0 Hiding errors and 6 warnings. Its Submit is still 400, but only for setup the test does not do (filing, a document line, a source). The release itself is proven on Study permit |
| Suites stay green | **Met for what I ran** | check_engine 44/44, b86_fill 35/35, b88_fill 34/34, check_case_engine 86/86, graph exit 0, explicit `any` 418 (baseline 433). The coordinator reports the C4.11 pack 30/30 on this head. The others I did not re-run (see below) |
| No pathway name or form number in engine or API code; schema and case-prepare untouched | **Met** | The added lines in `engine/`, `api/`, `web/src` contain none. Neither baton file is in the diff |

## The tech lead's four points
**(1) Is this faithful to SA-1B-7 rule 3 / SA-1B-9 (E2), or does it weaken the guard?** Faithful. The team's rule is about what a release carries: "publish blocks a placement that hides a field a form box or rule reads". After this change, a combination's snapshot never carries a condition its own forms, rules, lines or checks read outside that condition. Such a placement is built with `condition: null` (`engine/snapshot.ts:233`, placement map). So nothing is hidden, and in the team's validation list a warning is "listed to the approver, never blocks".
The guard is not relaxed. `validate.ts` reachability still runs on every built snapshot, with unchanged messages. So any condition the hold logic misses (the 8-pass cap at `snapshot.ts:143`, an unknown deciding field, an eligibility gate) still refuses. **Every way this can fail ends in a refusal, never in a hidden value.**
What did change is who resolves the conflict. Visitor visa's own approved condition is no longer used on Visitor visa until its form fields are confirmed, and only the Review and release warning says so. That is the row's stated outcome, and it supersedes B86 BR-4 ("Submit refuses in today's words") and §7 Q3 ("Not chosen: conditions per combination"). Neither B86's folder nor a decision line records the supersession (m7).
Could a released snapshot still hide something a form or rule reads? Not through this change. One older gap is unchanged on main and here: a derived field whose input is conditioned. Neither the error nor the hold looks at derived inputs. No case of it exists on the six.

**(2) The hold loop.** Holds are only ever added, never removed. Every reason to hold already shows on pass 1, where the most is placed and pulled. Readers do not depend on placements, and unreachable facts can only grow as more is held. So the loop settles, and holding nothing that it did not need to.
Draft and published fingerprints match whenever the hold reason is a reader. The form maps, lines, rules and checks that hold a condition are the ones this release publishes. Proven on Study permit's release.
One asymmetry, by reading only (m2). `known` in `engine/held-conditions.ts:57` reads the snapshot's own fields. A hold whose **only** reason is an unreachable deciding field can then be taken in the draft (the field exists as a draft) and not in the published rebuild (the field is not published, because the held condition no longer pulls it in). `publishRow` would then refuse with "was changed while it was being released" (`api/src/studio.ts:1231`). It needs a deciding field with no question anywhere in the library. That does not happen on the six today (all 12 holds I saw have a form reason). It fails safe.

**(3) Who reads placement conditions.** These read the stored release or the built snapshot, and now see "asked every time", which is correct for the combination: runtime (`engine/runtime/questionnaires.ts`, `case.ts`, `gates.ts`), the form fill (B86 BR-5: the rule is not in force, so the field is written, consistent with the question being asked), preview, and eligibility gates.
The library view is used where the library's condition is what matters: the B86 and B88 doors (`api/src/form-field-condition.ts:165`) and step 5 (`api/src/draft-qd.ts`).
Two places still read the draft snapshot without it:
* (a) The change-set check R8 (`api/src/change-sets.ts:114`). It simulates a question condition on the draft. Where the condition is held, the deciding question is not pulled in, so a new "Unreachable question" appears for that combination and the change is refused. Only routes reach it, no screen (m4).
* (b) The questionnaire table (`web/src/pages/configuration.tsx:182`) and the rules list (`api/src/rule-facts.ts:79`) show no condition for a held question, with no hint (m6).

**(4) Words.** In plain words, using the question's meaning and the form number. No field codes, no bug numbers (checked on the screen and in the API messages). "Held" is explained wherever it is used. Wording Minors: m5.

## D1–D20 (1–5, reviewer evidence: script and browser, not walked by a person)
D1 4 the row's three outcomes met, BR-4 superseded but not recorded · D2 5 no write path added; the doors are unchanged · D3 5 one library condition, not copied per combination · D4 5 nothing a form or rule reads is hidden; validate still backs it up · D5 4 fingerprints stable; m2 is theoretical · D6 4 B86's approval history unchanged · D7 5 the AI's words are quoted, "Sample, Unconfirmed: expert" · D8 4 the warning sits under its combination's path · D9 3 the next step is on the screen, but the panels do not say which question they belong to (m5) · D10 4 plain, slightly long · D11 4 the state is said on Review and release only (m6) · D12 3 25 long warnings and five identical panel headings (`sp-1440.png`) · D13 5 axe 0 at 1440, 1024, 720 and 400 px, no sideways scroll, keyboard reachable · D14 5 the team's components · D15 5 under 1 s; held state comes from the snapshot, no request per row · D16 4 reproductions fail on main and pass here, but no pure test of the hold reasons (m3) · D17 simulated only · D18 4 the "why" names the form that reads the answer · D19 4 Study permit releases; a case on a held question is not walked · D20 simulated only.

## BIC-01–BIC-20 (EXPERIENCE §6)
N/A: a set-up screen (Review and release), outside §6's case-side scope.

## Issues (all Should; no Must)
* **m1** `engine/held-conditions.ts:56`. The hold reasons leave out eligibility gates. A gate in another combination that reads a conditioned question still refuses (`engine/eligibility-gates.ts:222`), which is QA-239's pattern for gate readers. This fails safe and has no case on the six. Fix: add gate readers as a hold reason, or record that they are out of scope.
* **m2** `engine/held-conditions.ts:57`. An unreachable-only hold can differ between draft and published (point 2). Fix: decide `known` the same way in both modes, for example from the library field in either status, or keep unreachable-only an error.
* **m3** No pure test of `conditionsToHold` or of the loop. Only the "form reads it" reason is exercised (by DB tests). The rule, line or check reason, the unreachable reason, HIDE, and a second-pass hold are untested. A regression would only show as a refusal. Fix: add cases to `tests/check_engine.ts`.
* **m4** `api/src/change-sets.ts:114`. R8 simulates on the held view (point 3a). Fix: simulate on `withHeldConditions(s)`, or skip combinations that hold the condition.
* **m5** `engine/validate.ts:218`. The way out starts with "make the form … apply under the same condition". QA-237 says that makes no sense for IMM 5257. Lead with confirming its form fields. Also, each "Form fields that read this answer" panel (B86 layout, now shown on every combination that reads the question) does not name its question (`sp-1440.png`: five in a row).
* **m6** `web/src/pages/configuration.tsx:182` and `api/src/rule-facts.ts:79`. A held question shows "—" for its condition, with no "held here" hint.
* **m7** Records. B86's BR-4 and §7 Q3 are superseded by this row, but nothing records it. Builder notes or a challenge line would close this.

## Could not check
The DB and browser suites I did not re-run (b86 door, b88 spread, b114, grounding, both panel browser walks, check_qa262_row4, the C4.11 spread pack). For those I rely on the builder's evidence, the coordinator's C4.11 30/30, and CI. A visible-browser human walk; a screen reader; D17 and D20. The PR body (`gh` gave no output). The m2 scenario is reasoned from the code, not reproduced. My screenshots are in the session scratchpad, not committed.

**Blockers:** none. **Majors:** none. **Minors:** m1–m7 above (follow-up rows; none blocks this row's Done when).

Verdict: Approve

## Re-review fb4e565ec (diff only: `git diff 68edeebcc fb4e565ec`, 11 Nov)
**Diff:** `engine/validate.ts` (+6/−3) and the new `tests/check_forms_held_conditions_pure.ts`. Nothing else changed.

**Is the fix right? Yes, for the two checks it covers.** `withdrawnFieldLines` (`validate.ts:73`) and the condition-validity loop (`:187`) now read `withHeldConditions(s).placements`. So a held condition that reads a withdrawn field, or reads a field the library lacks, refuses Submit by name, as it did before holding. The hold itself and its warning are unchanged. The pure test gives 13/13 on fb4e565ec and 11/13 with 68edeebcc's `validate.ts` put back. The two failures are exactly the B83 M5 line and the invalid-condition line (my run, in a throwaway worktree). It also covers each kind of hold reason (closes m3). I did not re-run check_b83_undo_withdraw; I rely on the coordinator's 173/173 against 172/173.

**Can holding still hide another broken-condition check? Yes, one: the loop check.** `validate.ts:285` builds the "Questions decide each other in a loop" map from `s.placements`, where held conditions are stripped. Pure probe (made-up snapshot, scratchpad only): two questions whose conditions read each other, and form F reads both. Not held, 2 loop errors. Held, as `buildSnapshots` holds them, **0**.
This is the same class as the B83 M5 line the tech lead ruled must refuse: a condition that is broken in the library itself. The new comment at `:186` ("holding never hides a broken one") is not yet true.
Whether harm reaches a case: none on the holding combination (the question is asked every time). Combinations that use the condition still refuse. But the holding combination's release publishes the looping library rows. And the change-set R8 check (`api/src/change-sets.ts:114`, m4) simulates on the same stripped view, so it would not see such a loop being made either.
**Fix:** one line. Build `dep` from `withHeldConditions(s).placements` (the `s` passed into `reachability`), and add a loop case to the pure test.
The other readers of `s.placements[].condition` in Submit's problems are `derivedRead` (`:248`: warnings, and gate reads), `gateProblems` (correct to use the stripped view: the question is asked every time here) and `draftSourceProblems` (numbers, not validity). None of them is a broken-condition refusal.

**Major (re-review):** M1, the loop check, above. **Blockers:** none. **Minors:** m1, m2 and m4 to m7 stand; m3 is closed.

Verdict: Block (M1: walk `withHeldConditions` for the loop map too, with its pure test)

## Re-review 1b82360dc (diff only: `git diff fb4e565ec 1b82360dc`, 11 Nov)
**Diff:** three files.
* `engine/validate.ts`: one line. The loop map in `reachability` (`:286`) now reads `withHeldConditions(s).placements`.
* `tests/check_forms_held_conditions_pure.ts`: +7, a loop control and a held-loop case.
* This file: my Block section, unchanged from what I wrote.

**Result:** M1 is fixed.
* The pure test gives 15/15 on 1b82360dc.
* My probe from the last round (two held questions that decide each other) now gives 2 loop errors held and 2 not held. Before the fix it gave 0 held.
* The loop's words name only placed questions, so no field code reaches the message.
* `askedInOrder` shares `reachability`, so step 5 and the change-set R8 now see such a loop too. That narrows m4 for loops; R8's "Unreachable" part stands.

I did not re-run the DB suites. I rely on the coordinator's runs of B83, the held test and the C4.11 packs, which were re-running at the time of writing.

**Blockers:** none. **Majors:** none (M1 fixed). **Minors:** m1, m2 and m4 to m7 stand, as follow-up rows.

Verdict: Approve (1b82360dc85c73a8d107464eedd4ed327b9dc640)
