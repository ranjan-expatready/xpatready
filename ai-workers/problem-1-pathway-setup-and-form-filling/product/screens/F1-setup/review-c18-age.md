# Review: C1.8 rest (minimum age reaches a case), commit e260a098

Reviewer: independent (did not build it). Branch `claude/screens-c18-age`, diff `origin/main...e260a098`: one new file,
`prototype/studio/tests/check_c18_age_case.ts` (71 lines). No product code changed. 31 Oct 2026, US$0.

## How it was checked
- The check run on its own copy (database `xr_studio_screens_rev`, started on :4443). Another lane's copy took over :4443
  partway through (`var/isolated-screens_qa77`) and the shared checkout moved to another branch. So the rest of the
  review ran from a detached worktree of e260a098, with its own API on :4447 (same database, web built from e260a098).
  Result: 12/12, then 12/12 again on a second run. Never :4400.
- Mutation runs, each on a worktree copy of `engine/` that was restored after the run:

| Mutation | Result | Caught? |
|---|---|---|
| M1: `ageGate` stops asking the date of birth (`missing: []` when unknown, render.ts:96) | **12/12** | **No** |
| M2: release rule off (validate.ts:62) | 11/12, "release is refused" fails | Yes |
| M3: age gate off entirely (render.ts:94) | 8/12 | Yes |
| M4: `>` instead of `>=` | 11/12, birthday edge fails | Yes |
| M5: birthday month and day ignored | 11/12, one-day-before edge fails | Yes |

- Browser walk at 1440 px (headless Chromium, run by script):
  - On the Forms tab, open IMM 1295 and set "From age" 18 and "Signed by: The person the form is about", then Save to draft.
  - The page shows "Last change: Changed IMM 1295". The draft snapshot underneath has `min_age: 18, signed_by: "person"`.
  - Preview, under Principal applicant, lists IMM 1295 as "always required for this combination; from age 18".
  - No page errors.

## Findings
**Major 1. The "asks the date of birth" assertion is vacuous.** That is the one part C1.8 had as "Not walked".
- Where: test line 48 only checks that the principal's working view has one unanswered `person.date_of_birth` question.
- Why it proves nothing: the sample asks that question anyway. It fills boxes on IMM 1295, IMM 5257 SCH1, IMM 5475,
  IMM 5476 and IMM 5707, and it already decides whether IMM 5707 applies.
- Evidence: with the minimum age cleared, or with M1 in place, the assertion still passes.
- Fix (tested by the reviewer, it tells the two cases apart): also assert that the question's `why` names the
  age-gated form, for example `/IMM 1295/.test(asked[0].why)`.
  - With the age gate the `why` reads "decides whether IMM 1295 applies to Principal applicant; …".
  - Under M1 it reads "decides whether IMM 5707 applies …" only.

**Minor 2. The design-point comment (test lines 45–46) gives the wrong reason.**
- What the code does: `caseView` in sqr mode leaves the date of birth out because its placement is
  `collected_from: verified_document` (`isClientField`, case.ts:26). The passport being on the checklist plays no part.
  The test passes no `skipDocumentFacts`.
- Preview does the same: `engine/runtime/preview.ts:82` passes it, but `isClientField` filters the field out first.
- Result: a person with no passport line is still never asked the date of birth in the client questionnaire. Only the
  staff working view asks it (agent mode shows every needed fact).
- Does it hide a gap in C1.8? No. "Cases ask the date of birth when it is unknown" is met by the staff working view,
  and testing agent mode is the right choice.
- Fix: reword the comment to "collected from a verified document, so the client questionnaire never asks it; the
  staff working view does".
- For the owner, outside this PR: Preview's sentence "Not asked while the document is on the checklist; if it is
  missing or cannot be read, the question is asked instead" overstates what happens for document-sourced facts such
  as the date of birth.

**Minor 3. Clean-up can be skipped.**
- If the check stops on an exception, the final PATCH that clears min_age and signer never runs.
- Harmless on a fresh isolated copy. The sample has no minimum age to begin with.

## Questions asked of the check
- **Labels:** all 12 name C1.8 and say pass or fail.
- **Pass and fail per rule:**
  - Age gate: yes. Unknown date of birth gives "cannot tell"; 30 and 10; on the birthday and one day before; a date in
    the wrong format.
  - Release rule: yes, with the date of birth asked and without.
  - Clearing the age: yes.
  - "Asked when unknown": pass only, and that pass is vacuous (Major 1).
  - Who signs: checked only for being saved and reaching the snapshot. That is all C1.8 asks.
- **Waits and timeouts:** the check has no wait, sleep or timeout, so none can swallow a timeout.
  - The `try/catch` around the database check ends in `STOP`, exit 2.
  - The outer `catch` ends with exit 1.
  - `fetch` has no timeout, so a hung server would make the check hang, not pass.
- **Hard-coded psql path:** `/opt/homebrew/...` is the same pattern as the other checks. Not a finding.

## Journey score (reviewer, the one score for this check): 8/10
Journey: the content publisher sets an age and a signer on a form line, then sees it applied in Preview.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Saved, and the snapshot shows 18 and person |
| Next step obvious | 1 | Header shows "Next step: Review and release" |
| Plain words | 1 | "From age (optional)", "Leave empty for any age. Sample." |
| Feedback and state | 1 | "Last change: Changed IMM 1295", draft banner |
| Correct data | 1 | API snapshot matches what was entered |
| Error recovery | ½ | Field errors not exercised in this walk (earlier checks cover 1–99) |
| Accessibility and screen sizes | ½ | 1440 px only; no axe, keyboard or 200 % zoom run |
| Speed | ½ | Preview loaded in 1.66 s |
| Visual quality | 1 | Team look, drawer and Preview as in the screenshots |
| Trust and sources | ½ | "Sample" marked; Preview's "asked instead" overstates for document facts (Minor 2) |

Not tested: a real screen reader, keyboard-only use, 1024 px and 200 % zoom, and an intended user's own unaided walk
(D17 and D20 stay with the founder). The journey score is recorded here rather than in a separate journey-test file,
as the caller asked for one short file.

**Verdict: Block** (commit e260a098). To fix:
1. Major 1: make the date-of-birth assertion name IMM 1295 in the question's `why`, so that M1 fails it.
2. Minor 2 (should): correct the comment on test lines 45–46.

## Re-review: commit f8c37bee
Reviewer: independent. Diff `e260a098..f8c37bee`. The test changes 8 lines; this review file is added.

Run from the worktree `/tmp/wt-c18-age` on its own copy, :4447, database `xr_studio_screens_rev` (fresh start).

**Results:**
- Unchanged code: 12/12, run twice.
- M1, the age gate stops asking the date of birth (render.ts:96): 11/12. The "asks the principal's date of birth because
  it decides IMM 1295" step fails. Major 1 is closed.
- M3, the age gate off entirely: 7/12.
- The engine was restored after each mutation.

**The other findings:**
- Minor 2 is closed. The comment now gives the real reason: the placement is collected from a verified document
  (`isClientField`).
- Minor 3 (clean-up skipped if the check throws) is left as is. That is accepted: it is harmless on a fresh copy and
  is listed in the PR.

**New note (not a finding):** the question's `why` lists only the first three things the question decides
(render.ts:223, `slice(0, 3)`). If more forms come to depend on the date of birth, the check could fail even though
the product is right. It cannot pass when the product is wrong, so it is safe.

**Verdict: Approve** (commit f8c37bee). No Blocker or Major is open.
