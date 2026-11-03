# C7.7 review r3 — commit c207fd9fe (runtime lane, resolver contract items (a) forms/checks and (c))

Tests run (tsx, api/tsconfig.json): check_sh3_resolver 75/75, check_engine 43/43, check_gcore_engine 130/130, check_line_holders 19/19, check_vv_checklist 60/60. No servers started.

## 1. Correctness of the new rules
- Forms: the rule part goes to the condition's subject (lineCondition → `about` of the first undecided subject), the age part to the person (`ageGate(known, person…)`, deciders use `f.person`). Correct. When the rule is false, `both` is false and nothing is asked; when both are open, both are asked.
- formWaits `${form}|${person}`: one row per form per person unless a snapshot lists the same `form_number` twice. The existing `forms.filter(x => x.form === f.form_number)` in keepAnswered already assumes unique form numbers, so no new assumption; on a duplicate, the later row's waits overwrite. No test covers it. Minor.
- No applicants → `[FILING]`: `conditionSubjects(people, FILING, kind)`: DOCUMENT → "document" (dropped); CASE → filing; a role kind → `find(people, role)` (principal if on the case, else none, so the check does not fire); no kind → the principal's id, or FILING when there is no principal. Sensible. Untested (no pass or fail test for a case with no applicant).
- Placement map: case-checklist takes the LAST placement per fact (`new Map(entries)`), render takes the FIRST, and case.ts `placementOf` and api/runtime.ts use the first (`find`). Only differs for a fact placed in two sections with different `repeats`; then the checklist could disagree with render and case. Minor: build the map first-wins (`if (!m.has)`).

## 2. Regressions
- DOCUMENT-condition form: lineCondition returns `cannot_tell` with `missing: []` forever; prepare.ts lists it as a form that "cannot tell" with no question to ask. I found no DOCUMENT-subject condition in samples/ or tests; the DB snapshots were not inspected (no servers). The old code evaluated it on answers, so this is a deliberate change, but there is no test for a DOCUMENT form. Minor: add one pass/fail test, or confirm none exists in the real data.
- min_age plus a role condition: logic is right by reading (see 1), but no test combines them. Minor.
- case.ts checks mapping (:342) keys on `c.person` and `subjectId`; it handles "case" and person ids, and drops nothing by itself. Fewer rows (a spouse or child no longer gets a principal check, a representative gets none) means those sections lose the notice; that is the intended change. forms.ts:122 (filing blockers) and questionnaire.tsx key on `subjectId|fact` of fired checks, so a blocking check that used to fire for a spouse no longer blocks on the spouse's part. This is the intended change; I found nothing that requires a row for a person who no longer gets one. The dedupe on the merged subject list means a PRINCIPAL check fires once even with two applicants.
- Keep-answered (r2-m1) is kept: tries the placement's scope first, then the id rule.

## 3. Contract text
- R3, "Not yet" (a) and (c) now state what the code does.
- Stale: contracts/resolver.ts:33-34 (R5) still says "render's deciders pass no placement, see (c)". Now false. Minor: edit that clause. Also (d)/(a) file:line anchors point at the old base; they say so.

## Findings
- No Blocker. No Major.
- Minor: stale R5 clause (resolver.ts:34); checklist last-wins placement map; no tests for DOCUMENT form, min_age + role, no-applicant check, duplicate form row.

**Verdict: Approve**

## Round 2 (diff-only)

Reviewed `git diff c207fd9fe HEAD` (resolver.ts comment, case-checklist.ts, check_sh3_resolver.ts). `check_sh3_resolver.ts` run: 78/78 pass. No servers started.

- R5 text: now says render's deciders and the case checklist pass the placement since C7.7. Matches the code. Correct.
- case-checklist.ts: `placed` keeps the first placement of each fact (`if (!placed.has(...))`), the same rule as render.ts. Correct, and the type is explicit.
- New test 1 (minimum age plus PRINCIPAL condition): the spouse's row stays `cannot_tell` and its only decider is the spouse's own date of birth. It breaks if the role condition reads the holder instead of the principal, or if the age is read from the wrong person. A paired fail case (principal not employed means not needed for anyone) covers the other branch. Meaningful.
- New test 2 (only an applying representative on the case): a no-kind check fires for nobody, and render puts it on the filing. It breaks if the check ever lands on the representative. Meaningful.
- I did not mutate the code to prove each test fails; the judgement rests on reading the assertions.

**Verdict: Approve**
