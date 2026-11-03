# qa capability re-test — C4.7, C5.4, C5.5, C5.6 on main 4a7c14dfc (3 Nov)

**Brief:** Lead 4, founder's Go at 19:48 IST ("Yes, re-test now"). Re-test the four M2 rows whose fixes merged after qa's last re-score on 762dbae6: #735 (QA-194) and #730 (QA-197, QA-198). The tester built none of these fixes; its earlier work today was the Opus re-review that found QA-194, QA-197 and QA-198.

**How (P-290, P-291):**
* main at 4a7c14dfc.
* Each check ran on its own freshly started isolated copy (`studio/tools/isolated.sh … start`), twice. The web was rebuilt from main by the start script (QA-181).
* Live AI off (`STUDIO_*_LIVE` unset). US$0.
* Judged by exit codes.
* A person walk on an own copy (:4479). The shared demo (:4400) was only read (GET), never written.

## Verdicts

| Row | Verdict | Why |
|---|---|---|
| C4.7 AI drafts PQR picks with a reason per pick | **Works** | Pack 17/17 twice and v2 jobs 14/14 twice. A person can do it. QA-194 is closed. QA-162 still names C4.7, but only its C4.11 part is open (see the question) |
| C5.4 Release refused while a number has no source | **Partial** | The pack passes 22/22 twice and QA-197 is closed. But **QA-184** (UX · Major, open, not re-tested here) names C5.4's Demo path, so P-305 (3) keeps it Partial |
| C5.5 Release only with a passing signed answer-key test | **Works** | G2 API 74/74, firm 27/27 and browser 15/15, each twice. QA-197 and QA-198 are closed |
| C5.6 Sample content releases only in the demo, as a Demo release | **Works** | G3 browser 11/11 twice; the firm suite 27/27 twice proves the "refused anywhere else" half. QA-198 is closed. QA-158 (Minor) stays open |

## Runs (exit code; tests passed)

| Check | Round 1 | Round 2 |
|---|---|---|
| `tests/runtime/setup_visitor_visa.ts` (C4.7 setup) | 0 · 13/13 | 0 · 13/13 |
| `acceptance/C4.7.test.ts` | 0 · 17/17 | 0 · 17/17 |
| `tests/check_forms_c47_v2_jobs.ts` (stub launcher only, US$0) | 0 · 14/14 | 0 · 14/14 |
| `acceptance/C5.4.test.ts` (browser walk through the Demo menu) | 0 · 22/22 | 0 · 22/22 |
| `tests/check_g2_answer_key_gate.ts` | 0 · 74/74 | 0 · 74/74 |
| `tests/check_g2_answer_key_gate_firm.ts` | 0 · 27/27 | 0 · 27/27 |
| `tests/check_g2_answer_key_gate_browser.cjs` | 0 · 15/15 | 0 · 15/15 |
| `tests/check_g3_demo_release_browser.cjs` | 0 · 11/11 | 0 · 11/11 |

**Disclosure:** one extra run of the firm suite was the tester's own setup error, not a product fail. I started its copy already as "firm", but the suite must start as the demo, load the sample, then restart itself as "firm" (its header says so). It failed 0/2 at its first step, the refused sample load. The two rounds above are the correct runs.

## QA-197 probed directly (copy started with `STUDIO_WORKSPACE_KEY=firm`, author)

The following routes were each sent once:
* `POST /api/demo/load` with no body, with `{"sample":"six"}` and with `{"sample":"configured"}`;
* `/demo/reset-to-six` (`{"confirm":"RESET"}`);
* `/demo/reset`;
* `/demo/release-with-sources`;
* `/demo/forms-story`.

Every one answers **409**, "This demo control works only in the demo workspace.", as Problem Details. Afterwards the database holds 0 config releases and 0 programs. A grep of `api/src/demo.ts` and `forms-demo.ts` finds the demo-workspace guard on every Demo entry (`load`, `resetToSix`, `releaseWithSources`, `reset`, `seedFormsStory`).

## Person walk: C4.7 (author, headed, own copy :4479, Visitor visa from its setup)

1. Immigration programs › Visitor visa › Smart questionnaire (SQR) › Prospect questionnaire (PQR) › **Draft Prospect questionnaire (PQR) picks**.
2. The dialog shows Live as not open ("each paid run is approved first") and Saved at US$0, with its four steps (rules, AI, a blind second AI round, rules).
3. **Draft with Saved (US$0)** gives "6 picks for To review, 13 left out with the reason … Ready to accept 0 · Check 4 · Decide 2 · Saved, US$0".
4. The left-out list names the twins and never guesses:
   * "Purpose of visit" could be 2 questions of this person ("Purpose of the visit to Canada", "Description of the visit purpose when it is 'other'"), so it is not guessed: pick it by hand.
   * "Planned dates of stay" names the first and the last day the same way.
5. **Open To review** shows each pick at Check, with "Why a person looks" ("Both readings pick it, in the AI's own words …").
6. Open › **Accept** on "Funds available for the stay": "Decided 1 proposal", with Undo for 10 seconds. The toast reads "Decided. It landed as case|case.funds_available_cad".

**Minor:** the toast shows a raw key, which PRODUCT §4 rules out (no codes). It is not logged as its own row: it belongs to the shared decide toast, not to C4.7.

C5.4's person path is the pack itself (a browser walk through the Demo menu). C5.5 and C5.6 have their browser checks. The walk also saw "Live · Demo release" on Visitor visa's header in the demo workspace.

## Bugs
* **Closed** (moved to `qa/BUGS-CLOSED.md`): QA-194 (#735), QA-197 (#730), QA-198 (#730).
* **New:** none. 0 Blocker · 0 Critical · 0 Major · 0 Minor rows.

## Not tested
* QA-184, the C5.4 Demo path state after a release: it was not in the brief, and nothing has merged that fixes it.
* Keyboard, 200% zoom and 400/1024 px on these screens, beyond what the browser checks cover (axe clean in the G2 browser check).
* Coverage (c8) was not run in this round.

## Questions for the Lead
1. **QA-162** is still Open, with "Major (C4.11; C4.7 part fixed, 2 Nov)", and lists C4.7 among its capabilities. qa reads it as not disputing C4.7 under P-305 (3), because the open Major is C4.11's step 5. Agree? If not, C4.7 is Partial until QA-162 is split or closed.
2. C5.4 stays Partial on QA-184 alone. Should qa re-test QA-184 next?

## Suggestions
* *Later · Capability:* the decide toast should say the question's words, not `case|case.funds_available_cad`.
