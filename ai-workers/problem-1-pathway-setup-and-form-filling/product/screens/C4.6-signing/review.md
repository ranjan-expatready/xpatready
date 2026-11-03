# Review: C4.6 "Preview by person: who signs each form" — commit a2aafd31c

Reviewer: fresh context, did not build it. Not a new screen: engine + contract + one UI line, reviewed against STANDARDS/EXPERIENCE, AGENTS.md rule 4, IRCC-P2-06/P2-09/VV-R09.

**Verified:** acceptance/C4.6.test.ts 17/17 on a fresh isolated copy (port 4452, stopped after); sources trace: P2-06 and VV-R09 quote Guide 5256 with date, P2-09 cites IMM 5484/5476 pages (compliance-trace.md:42, 88, 91); additive contract only; the UI change is one line with `data-sign`. Journey score (reviewer role, scripted pack walk of Preview as principal, child, spouse, representative): **8/10**. A child sees a guardian signing, the representative sees the IMM 5476 they sign with whose it is, Online lines say "later wave"; lost points for the open inconsistencies below and for no keyboard/1024 px pass (one added text line, no new control).

## Your three questions
(a) **Sample ages with no DOB question** (preview.ts:70-74): honest enough, not hiding a gap that matters. The people are labelled "Sample people, never saved", questions are unchanged, and engine/validate.ts:66 still errors at release when a minimum age exists but nobody is asked a date of birth. The residual: for such a combination Preview now says "applies" or "does not apply" where a real case would say "Cannot tell yet". Acceptable because release cannot go out in that state; Minor only.
(b) **Guardian vs formSigners elsewhere**: not a Blocker. Preview (via `minorFromAnswers`) says a guardian signs a child's "person" line, but engine/render.ts:183 calls `formSigners(people, f.who, f.signed_by)` with no `minor`, so the Documents-tab "signed by hand and scanned" lines still ask the child for the scan on a "person" line. Same form, two answers. IRCC-P2-06 is already recorded "Open: conflicts with main's Sample rule" for the founder and expert, and the tests ask only that someone other than the child signs. The fix is one argument, but it changes Documents and checklist counts, so it belongs to a separate item after the founder rules. It must be written in the PR and BACKLOG, not left silent (Major-in-waiting if the founder rules for the guardian).
(c) **Wording / other consumers**: wording is plain and cited. `people[].forms` now counts the representative's signed forms (preview.ts:148), which is intended (chip count equals the list). `check_c3_11_signed_scan` and `check_preview_sets` use previewFamily; I did not get a clean pass line from them in the time available, so the builder should state their result in the PR.

## Findings
**Blockers:** none. **Majors:** none.

**Minors**
1. preview.ts:128 (`signWords` call with `minor(subject)`): for a `parent_for_minor` line the child reads "The principal applicant, as their parent (under 18)" while a `person` line reads "A parent or legal guardian, for them (under 18)". Two phrasings for one rule on the same child; consistent only because P2-06 is open. Use one phrase once the founder rules.
2. preview.ts:215 (`signWords`, role `representative` word): lower-case "the representative" is capitalised only when first; "Spouse or partner themselves" reads awkwardly. Cosmetic.
3. preview.ts:70-74 / tests R8: the Sample-age override is not shown to the user; consider a note "ages are Sample" only if the founder asks. Not needed for Approve.
4. preview.ts:137 (`signedForOthers`): the representative's why text is built with a prefix plus the first row's why; with many applicants the line is long. Cosmetic.
5. Tests: R8/R9 fail-checks exist for both; removing `sampleBirthDates(…, true)` or the representative branch fails R8/R9 (checked by reading, not mutating).

## Rule 4
Immigration statements are cited (Guide 5256 quote, dated 2026-03-31, read 2026-11-01; IMM 5476 page 2025-12-12). The "parent, for a minor = principal" rule stays labelled Sample. "Unconfirmed: no counsel" is not claimed anywhere new. Met.

## Could not check
Keyboard-only and 1024 px / 200 % zoom visually (no browser pass; the change is a text line in an existing list). D1–D20 scoring is not applicable to a one-line UI change. Graph check not re-run (builder: exit 0).

**Verdict: Approve** (no open Blocker or Major). Follow-ups for the builder to record in the PR/BACKLOG: (1) render.ts:183 does not pass `minor`, so Documents signed-scan lines disagree with Preview for a child on a "person" line, pending the founder's ruling on IRCC-P2-06; (2) state the check_preview_sets and check_c3_11_signed_scan results.
