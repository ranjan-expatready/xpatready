Verdict: Changes f798e79d2219f686e31514404c2048012b553e32

# QA-402 review: an author's condition on a case-level question (PR #1587)

Reviewer: independent, fresh context, 11 Nov 2026. Diff: `git diff origin/main...f798e79d2` (held-conditions.ts, validate.ts, check_forms_held_conditions_pure.ts, new check_qa402_case_condition.ts). Skill verdict: **Ship after fixes**. Journey score: **9/10** (`journey-test-reviewer-2026-11-11.md`). The core fix is sound, and the main path works by screen. It is blocked by one Major (M1): the contradiction the bug row reported is still on screen on the held path.

## What I re-ran
I used an isolated copy rv_q402 on :4493 with the configured checkpoint. It was never :4400, live was off, cost US$0, and the copy was stopped in the same command (run 4 times).
* `check_forms_held_conditions_pure`: **22/22** on the branch. With main's `held-conditions.ts` and `validate.ts` swapped in, it gives **17/22**: the 5 new pass/fail lines fail. So the rule's test fails when the rule is removed.
* `check_qa402_case_condition`: **11/11 on four fresh copies**.
* `tsc -p api --noEmit`: no error in the touched files.
* My Playwright walk at 1440, 1024 and 400 px (scratchpad script): 23/25. One FAIL is my own wrong assertion (see the journey report). The other FAIL is M1.

## Soundness (the questions asked)
1. **A gate equal to the SHOW condition is safe (rule 3 holds).** On a case, the gate and the question's condition are evaluated about the same subject:
   * The gate goes through `case.ts gatedOff` and `forms.ts rulesInForce`, with `b.about === "case" ? "case" : about.split("/")[0]`.
   * The question goes through `render.ts:270-274` (`about === FILING ? FILING : about.split("/")[0]`, with `FILING = "case"`).
   * Both drop `subjectKind` (`evalCondition` strips it).

   So the `EACH_APPLICANT` that the author's builder emits for a case field changes nothing. The question and the box are the same fact, so the box's person is the question's subject, also for a per-person fact gated on a per-person answer.

   Value coding matches on this checkpoint. The client's select offers `<option value="Other">`, which is the gate's literal `"Other"`. A different coding could only fail the comparison and **hold** the condition (the safe direction). It cannot release it wrongly.

   HIDE stays incompatible, and there is a test for it. A gate that cannot tell (purpose unanswered) gives `hidden: true` with the box unwritten. That behaves the same as a B86 rule.
2. **No wrong release elsewhere.** The compatibility check is per snapshot and per form. Every reading form field of a form must be compatible, so one ungated reader in the same form (or in another form of the combination) still holds the condition. Only an exact match with an **approved** gate counts: `form-field-gates.ts apply()` writes `condition_rule` at approval only. Rules, document lines and checks that read the answer are unchanged. A combination where the gated edition is absent keeps the condition held.
3. **The runtime hides exactly when the form would not write.** Business: the client screen does not show the follow-up, the routes do not list it, and `gatedOff` writes no box. Other: it is shown and fills 1 box ("read by IMM 5257 (1 form field)"). Unanswered: `hidden: true`, and the officer sees "Not asked now: a rule hides it." After a change from Other to Business, the earlier answer is "kept and not used", and the gate blanks the box. These agree.
4. **Words.** The warning is plain and has no field code: "IMM 5257 reads its answer only when the purpose of the visit is Other (the form's own condition). To use the condition here, make it the same as the form's own condition…". **But the B86 panel still misleads on the held path (M1).**

## Issues, ranked
**M1 (Major, Must): on the held path, Review and release still shows "No form reads this answer" directly under the warning that says IMM 5257 reads it.**
* Reproduced on :4493: the author sets "Business" on the field page, then opens Review and release. The warning is correct. Under the problems, "FORM FIELDS THAT READ THIS ANSWER — No form reads this answer." is still shown. Screenshots: `j2-business-review-1440.png` and `-1024.png` (my walk).
* Why: `web/src/pages/review.tsx:78` puts every HELD fact in `underProblem`, and `:104` renders `FormFieldsPanel`. `api/src/form-field-condition.ts:220` (`rowsOf`) leaves gated form fields out. So `form-field-conditions.tsx:39` prints "No form reads this answer."
* This is the second symptom in the QA-402 row. The PR changed the warning's tail so that it no longer sends the author to that panel, but the panel itself still shows and contradicts the warning.
* Fix (either way):
  * Leave a fact out of `underProblem` when all of its held reasons are gated forms. For example, carry `gate` on the problem, or test the "(the form's own condition)" words, as validate.ts already does for its tail.
  * Or give the panel a `why` for a gated-only reader, such as "IMM 5257 writes this answer only when the purpose of the visit is Other (the form's own condition); this is not changed here".
* Add a pass/fail line: the check_qa402 Business step, or check_forms_b86_panel_browser.

**m1 (Minor, Should): the refusal's way out still points to the B86 door for a gate.** In `validate.ts:282`, the not-held "Hiding a value a form reads" error now names the form's own condition. It still ends with "Make the form or its form fields apply under the same condition", which the door cannot do for a gated form field. Use the same gated tail as the warning (`validate.ts:224`).

**m2 (Minor, Should): check_qa402's `asked()` tests whether the item is present, not `!hidden`.** With an unanswered purpose the routes return the follow-up with `hidden: true` (both views), so this helper would call it "asked". It passes today only because with Business the item is absent. Read `hidden` as the screen does (`questionnaire.tsx:484`), and add the unanswered case as a fail line.

## Standards, retrofit, graph
* [M] lines touched: plain words / no field codes are met for the warning and not met for M1's panel. AA is met: axe is clean on Review and release and on the client part. No sideways scroll at 1024, 1440 or 400 px (client).
* No migration, no new route, no per-row request. The server refuses placement saves from the content reviewer and the client (403).
* `graph.mjs`: no gap names this row. G1, G2, G4 and G5 are at 0.
* Pre-existing, not counted against this PR: the "Changes in the draft" table prints the item as `case.visit_purpose_other`, and Review and release takes 1.9 to 2.5 s to show validation.
* BIC-01–20: N/A for this row. It changes no case-side screen element, and the client part is unchanged apart from the condition taking effect.

## What I could not check
* The C4.11 / C4.11-spread packs: I did not re-run them.
  * The tech lead's done-when asks for them **green on the configured checkpoint**. The builder reports that both fail there with the same FAIL set as main 68a7b59d1 (pre-existing).
  * As written, that part of the done-when is not met. That is the tech lead's call, not a code finding.
* The builder's other fresh-copy suites. D17 and D20 (an intended user's own walk) stay with the founder.
