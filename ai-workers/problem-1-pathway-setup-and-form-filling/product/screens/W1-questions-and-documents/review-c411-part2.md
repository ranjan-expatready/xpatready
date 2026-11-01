# Review: C4.11 part 2 (2a step 2, 2b step 5), forms lane, builder B4b

Reviewed: `git diff f333cb79 1f493b96` (only files C4.11 touches), commit 1f493b96 on claude/hopeful-maxwell-4etgzs. The reviewer did not build this.
Spec: CAPABILITIES C4.11; concept-draft §4; W1-ai-drafting plan §1 (steps 3, 6) and §2 (R-1, R-3, R-4, R-5); part-1 record review-c411.md.
Evidence: isolated copy rv412 on :24472 (never :4400), now stopped. `check_forms_c411_draft_qd.ts` gave 45/45. A headless browser walk of the saved-answers run, keyboard only, at 1024 px and 400 px: axe clean, no sideways scroll, no page errors. The To review queue was read with the step-5 items on it. The database was read underneath. Journey report: `journey-test-reviewer-2026-11-01-c411p2.md` (7.5/10).

## Verdict: Block (one Major)

## Blockers
None.

## Majors
* **M1 Rule C4 ("valid condition") passes a condition that can never be true, and an agreed one is marked Ready.** The cause is in three places.
  * `engine/qd-conditions.ts:46` builds `{op:"eq", value: answerOf(when)}`.
  * `answerOf` (`:31`) turns "yes" and "no" into `true` and `false` for any field, and lowercases every other answer.
  * `checkCondition` (`:48`, `engine/validate.ts:32`) checks only that the field exists and that ordered operators are used on dates and numbers. It never checks the value against the field's `value_type` or its `answer_list`.
  * `contracts/rules.ts` evaluates `eq` with `===`.

  What the live run shows: the test's own items in rv412 are `organisation.name eq true` (a text field) and `person.caregiver_persons_requiring_care eq false` (a number field). Both carry `valid_condition: passed`. The queue shows "Asked only when "Legal or operating name of an organisation…" is yes." The same happens with code and country fields. The sample stores `marital_status = "common_law"` and `passport_country_of_issue = "Venezuela"`. `answerOf("Common-law")` gives `"common-law"` and `answerOf("Venezuela")` gives `"venezuela"`, so neither ever matches.

  Failure scenario: both readings agree on "Country of passport" = "Venezuela" and no form reads the hidden answer. The item reads Ready, so it can be bulk-accepted (R-10) once part 3's lander exists. The question is then hidden for every case. R-4 says "Ready = rules pass", and the rule passed a condition that does nothing.

  Fix:
  * Check the value against the decider's type in C4. `yes_no` takes a boolean only. `code` takes an answer-list code; map the label or the code, case-insensitive, to the stored code. `country` takes a value from its list as stored. `number` and `date` take a parsed value. Text deciders are dropped with the reason, or Check at most.
  * Stop lowercasing the value.
  * Add a fail test: "yes" on a text decider is left out with the reason.

## Minors (Should)
* **m1 Tests: the Ready path and three rules can be removed without a test failing.**
  * `tests/check_forms_c411_draft_qd.ts:176` accepts `cf1 === (rules1 === "t" ? "ready" : "check")`. In the sample it is always `check` (form_still_reads fires), so no test ever sees Ready.
  * C3 (reason in words), C5 (unreachable/loop drop) and the "removed before, not proposed again" filter (`api/src/draft-qd.ts` rejected set) have no pass/fail test. Removing any of them leaves 45/45.
  * Fix: one pure-snapshot case per rule, plus an agreed pair whose target no form reads, which must be Ready.
* **m2 The queue row does not name the conditional question.** The row reads only "Asked only when "X" is yes." (`engine/qd-conditions.ts:79`, `condition.sentence`; there is no label). The question it hides appears only in the opened detail. Fix: "<Question>: asked only when "X" is <answer>." (PRODUCT §4 plain words).
* **m3 The reason is cut mid-sentence.** `qd-conditions.ts:91` slices the form_still_reads reason to 500 characters, and the detail ends "…under the same condition, or". Fix: shorten the prefix, or cut at a sentence boundary.
* **m4 Step 2 can under-report.** `api/src/draft-qd.ts:80-84` counts earlier COMPLETED or APPLIED replay jobs. When only an APPLIED job exists, `Checklists.replay` makes a new job with new lines, but the step says "replayed before" and adds 0 to `proposed`. Fix: base the count on whether `replay` created the job (return `made`), not on `before`.
* **m5 R-5 shared-condition reuse is not attempted.** `sharedConditionKey: null` is always set. No shared-condition store exists in the app yet, so this is a recorded gap, not a defect. Note it in `qa/built/C4.11.md` beside the part-3 lander.
* **Carried from part 1, still open (were marked "part 2"):**
  * m8: the run page has no next step (runs.ts is unchanged).
  * m9: the audit line "drafted … N findings" is written whatever the outcome (`draft-qd.ts:255` is unchanged; a failed step 5 or step 6 is still audited as drafted).

## What held
* Step 2 replays C2.6 unchanged under C2.6's own advisory lock. The 3 lines from IMM 5488 are not duplicated over three runs. IMM 5483 says "no saved AI reading". No recognised checklist gives FAILED with how to attach one. Rules only gives SKIPPED "AI work".
* The deviation (C2.6 rows not sent through insertProposals because the payload parse strips the legacy fields) is sound and recorded. The rows stay on the checklist page's own apply path.
* Step 5:
  * Both rounds come from StepRunner replay, and a missing saved answer gives FAILED in words at US$0.
  * C1 (matchFact, never guessed) and C2 (the quote is found in the guide) each have a fail test.
  * The run is dedupe-safe under `pg_advisory_xact_lock` for waiting and rejected items, so a second run adds nothing ("2 already waiting").
  * Differing answers give Check, never Ready. form_still_reads caps the item at Check with the reason.
  * Accept answers 409 in words.
  * The prompts treat the guide as data and never state eligibility or fees. The schema is strict.
* UI: in replay the plan pills read "saved AI answers" and in rules they read "AI work: with saved AI answers". The run card names each checklist. The run took 2 s, with 150 ms of slowing added per step.

## Scores (changed from part 1 only)
* D2 Data integrity: 4 (no duplicates, locks).
* D4 Rule integrity: 2 (M1; m1).
* D7 AI trust: 3 (a Ready label on a no-op condition, M1).
* D10 Language: 4 (m2, m3).
* D16 Testability: 3 (m1).
* D19 Closure: 4 (steps 2 and 5 are real; the lander is in part 3, as stated).
* D17 and D20: simulated only.

## Not checked
* A real saved AI run (none exists, P-131): step 5 was run only on answers the test planted.
* A screen reader.
* The 200 % zoom pass beyond the 400 px reflow check.
* Two browsers running step 2 at the same moment as C2.6's own replay button. Both paths share C2.6's lock, so this was judged by reading the code.

To fix before Approve: **M1** (with its fail test). The Minors can follow; m1's Ready-path test should come with M1.
