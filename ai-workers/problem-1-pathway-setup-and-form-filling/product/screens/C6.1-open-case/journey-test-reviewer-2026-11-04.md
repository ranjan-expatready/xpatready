# Journey test (reviewer): QA-180 release gate → Open a case, 4 Nov 2026

Commit c9b910ae7. Own copies: `rv8_qa180` :19400 (the V3 replay, run twice) and `rv8_b1` :19401 (API suites). US$0, Saved only, no STUDIO_*_LIVE, never :4400. Replay: a scratch copy of `product/reports/verify-2026-11-03/V3/v3_golden_replay.cjs` with only its qa-port guard removed. Browser checks were Playwright, headless. No screen reader.

## Journeys
1. **Main.** The configuration author sets up Visitor visa (Reset to the six, IMM 5257's Saved draft, sections, placements). On Review and release they see which forms block and why, fix them, and release. The officer then opens a family case on release 1.
2. **Alternate.** With every form mapped (setup_visitor_visa.ts), the combination releases and the officer opens a case.
3. **Error.** A released combination gets a form with no field map in its draft. The next release is refused and names the form; cases still open on release 1.
4. **Error.** A combination that was never released: Open a case is refused (409) and names what is missing.
5. **Recovery.** The author takes the unmapped forms off, as the line suggests, then releases.
6. **Across the boundary.** The Release page shows the held row and the reason that names the forms.

## What held
* **J1, the first half: pass.** Review and release lists one error per form with no field map. Each line names the form by number and title in plain words, e.g. "Forms · IMM 5476 (Use of Representative): No form fields mapped yet: a case could not fill this form, so firms could not open cases on a release with it. Map its form fields (Draft setup), or remove the form." In replay run 2, step 2f named all three forms (IMM 5409, 5476, 5707). There are no codes and no "box". Submit is disabled with "Fix the problems first".
* **J2, J3, J4, J6: pass**, from `check_b1_release_unmapped.ts` 14/14 and `check_s4_startable.ts` 10/10 on :19401. The submit refusal names exactly the unmapped forms (400). Release 2 is not made, and cases still open on release 1 (201). The Release page's `why` names IMM 5475 and gives its step. A combination that was never released is refused with 409.
* **The data underneath.** The refusal lists the same forms as the config snapshot's unmapped set. Nothing is released (`config_release` is unchanged), and the draft forms stay DRAFT.

## Findings
* **Blocker for this journey (in the review as Major M1): J1 and J5 do not complete.** Taking the three forms off leaves a new error: "IMM 5707 (Family Information) is in this combination's application package but not in its forms. IRCC returns an application without it…" (engine/form-completeness.ts:41). The release step never starts, so no case is opened. P-297 (3) says to map IMM 5707 with its Saved draft. In run 2, the replay also left "IMM 5257: 14 form fields have no decision" open. In run 1 it crashed earlier, at the IMM 5409 Change dialog (flaky).
* **Minor: the next step leads nowhere for IMM 5707.** The line offers "or remove the form" for a form that the package rule then requires.
* **Minor: one form is named two ways in the same list.** "IMM 5409: Turn …" sits beside "IMM 5409 (STATUTORY DECLARATION OF COMMON-LAW UNION): No form fields mapped yet …". The submit refusal nests brackets: "IMM 5257 (Application for visitor visa (temporary resident visa)): …".
* **Break-it pass.** The rule is pure. Two editions, 0 entries and an online-only map are covered by `check_qa180_one_rule.ts` 22/22. The duplicate-title check does not apply here. I added no new routes, so the wrong-role checks are unchanged.

## Score (0, ½ or 1 each)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 0 | The golden journey does not reach a release or a case (replay run 2, steps 2–3). |
| Next step obvious | ½ | The form is named with its step, but "remove the form" leads nowhere for IMM 5707. |
| Plain words | 1 | Number and title, no codes, no "box" (P-63). |
| Feedback and state | 1 | Error pill and count; Submit disabled with its reason. |
| Correct data | 1 | B1 14/14: the refusal names exactly the unmapped forms, and no stray release is made. |
| Error recovery | ½ | Removing IMM 5707 brings a second error. Mapping is the only way on. |
| Accessibility and screen sizes | 1 | axe WCAG 2.2 A/AA: none on Review and release. Sideways scroll 0 px at 400, 1024 and 1440, and at 512 px (200 % of 1024). |
| Speed | ½ | Review and release took 3.6 s on my copy after heavy setup (existing behaviour; nothing slower was added). |
| Visual quality | 1 | Team list and pills; long lines wrap cleanly. |
| Trust and sources | 1 | Sample labels unchanged; no AI output added. |

**Score 7.5/10, with a 0 (task completed). Verdict: fail.**

**What would raise it:**
1. Apply IMM 5707's Saved draft in the replay (P-297 (3)), make the IMM 5257 decide step reliable, and show step 4 opening on release 1 with no 409. This raises task completed and error recovery.
2. Drop "or remove the form" for forms the package requires.
3. Name each form one way per list.

**Not tested:** a real screen reader; an intended user's unaided walk (D17 and D20 stay with the founder); the builder's uncommitted replay edits in the working copy; a keyboard-only walk of the release step (not reached).
