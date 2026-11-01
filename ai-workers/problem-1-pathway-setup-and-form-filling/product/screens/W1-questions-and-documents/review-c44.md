# Review: C4.4 part 1, P-47 question types (runtime, commit 987c1041)

Reviewer: a fresh agent that did not build this. Branch `claude/beautiful-tesla-kortle`, diff `origin/main..987c1041` (17 files).
Isolated copy `rev_c44` on :4439 (db `xr_studio_rev_c44`), web rebuilt, copy stopped at the end. No AI, US$0.

**Verdict: Block (changes needed).** One Major (M1). Everything else is Minor.

## What I ran (on 987c1041)
- `setup_visitor_visa.ts` 13/13, `setup_c44_types.ts` (5 fields, 1 derived field, 1 section check).
- `tests/check_c44_question_types.ts`: **40/40**. `acceptance/C4.4.test.ts`: 22/28. The 6 fails are the part-2 checks the builder named (error summary, ready-to-file, check authoring route 404, officer cannot author 403, tier 3 route 404, PQR mode). Part 1 is green.
- `check_c44_question_types_browser.cjs`, run from a temp copy so the repo screenshots stayed untouched: **31/31**. axe found nothing at 390, 1024 and 1440, and there is no sideways scroll.
- My own journeys and break-it probes (headless Playwright plus the API, script in /tmp). Results below.
- `tsc` for web and api: clean for this diff. The one error is in `tests/check_c18_age_case.ts:59`, which this PR does not touch.

## Scope check
The C4.4 row (CAPABILITIES.md:52) listed as missing: multi choice, person name, period history with gap check, document upload, declaration, tier 3. Part 1 delivers four types and the gap check as tier 2. "Document" is refused as a question (P-130 amends P-47), with words that point to the checklist (case.ts:216, questionnaire.tsx `k === "document"`). Tier 3, the error summary, check authoring and PQR are part 2 and stay red on purpose, so they are not findings here (P-26).

The gap check is a derived field (`months_uncovered_10y`) with a `gt 0` check. That keeps the 11-op vocabulary closed, and it matches the tech lead's tier-2 ruling on #295. I agree with the builder's deviation from the proposed `covers_years`. A history that cannot be read, or a case with no application date, gives "cannot tell" and never a pass (tested).

## Findings

### Major
**M1. The case officer can make the client's declaration.** `api/src/runtime.ts:222` refuses a client on non-client fields but lets the officer write any fact. Nothing excludes the new `declaration` type, and the officer's Edit dialog renders the same first-person checkbox.
- Failure I reproduced on :4439: the officer opens the case, clicks Edit on "Declaration (Sample)" (the button is there) and ticks "I declare that this is true and complete".
- Result: `PUT …/person.c44_sample_declaration` returns 200 with no problems and the message "Saved. It fills IMM 5257…". The stored source is `{"actor":"user-O","channel":"agent_view"}`. The case view then reads "Declared" and the form box fills, although the client never declared anything.
- This breaks P-97 ("declaration questions stay with the client"), P-130 ("declarations always Client") and P-155 ("Case officer as an answer source … never declarations"). P-155's "staff may correct any answer with a reason" does not cover it: a declaration made by someone else is not a correction.
- Fix: in `putAnswer`, refuse an officer write to a `declaration` field with 403 and plain words, e.g. "Only the client makes this declaration." In the agent view, show the declaration read-only with who declared it. Add a pass (client) and a fail (officer 403, nothing stored) to `check_c44_question_types.ts`.

### Minor
1. **Misleading message for a period that starts in the future.** `engine/runtime/case.ts:171` checks the end but never the start. Saving `{from:"2030-01", to:""}` returns "Period 1: the end is before the start; check both months.", but the person left the end empty on purpose. Fix: add a "the start is in the future" message, and test it.
2. **A real year below 1900 gets a format message.** For `from:"1800-01"`, case.ts:169 says "enter the start as month and year, for example 2019-06", which is untrue because that is already a month and year. The cause is `realDate`'s 1900 to 2100 window. Fix: give a range message for this case.
3. **The client's gap words and the officer's check use different 10-year windows.** questionnaire.tsx:212 computes "Gaps in the 10 years to today" from the browser's date (line 245). The tier-2 check (rules.ts `months_uncovered_10y`) uses `case.application_date`.
   - Example: application date 2026-06-01 and a history from 2016-08 to now. The client sees no gap words, but the officer's check fires for Jun to Jul 2016.
   - Fix: use the case's application date when it is known, and say "before the application date".
4. **Stale "covers_years" comments in the acceptance test.** `acceptance/C4.4.test.ts:11` and `:70` still describe a proposed op `covers_years`. The code at :123 uses `gt` on the derived field, and the header at :17 says why. Fix: change those two comments.
5. **The new types are reachable only through the API or the fixture.** The library's `TYPE_WORD` (`web/src/pages/library.tsx:14`) has none of the new types, and neither does job.tsx:194.
   - An author cannot choose them on screen.
   - A field given one through the API shows the raw key (e.g. `person_name`) in the library table.
   - Its "Value type" select displays "Text".
   - No demo combination carries the types, so this PR's evidence runs on `setup_c44_types.ts`, which patches the release snapshot.
   - This is another lane's file. Record it in part 2 or on the screens lane. C4.4 should not read "Works" until an author can pick the type on screen (P-33).
6. **The officer's name reads as "(no given name) Sampled"** (questionnaire.tsx:84). "Sampled (no given name)" reads more naturally, family name first as on the passport.
7. **Small accessibility issues on the period history.**
   - Every input in every row gets `aria-invalid` when any one row is wrong, so a screen reader cannot tell which box is the problem. The messages do name the period.
   - The gap line's `aria-live` (line 245) is mounted only when gaps exist, so its first announcement may not be read.
   - The name and period inputs are 40 px tall on a phone (`h-10`). That matches the existing address parts (line 281), and every check box sits on a label of at least 44 px.
8. **Mixed limits on long text.** It has a 4,000-character limit (case.ts:32) and no counter (the counter shows only when `maxLength < 500`, line 311). Over 4,000 is flagged after saving, as P-71 requires. Over 4,000 sent through the API, it is refused 400 "An answer is at most 4000 characters." That is an existing body limit and nothing is stored, but it is a mixed message with "never blocked".

### What held
- P-71: an invalid history, an unticked declaration and an unlisted multi-choice key all save with 200 and are flagged in words.
- The name is stored in its parts. Non-English names (`José Núñez 李`) save clean and show correctly.
- Gap words are right at the edges: "Feb 2019 to May 2020" is 16 months, and a late start leaves Nov to Dec 2016 uncovered.
- Removing the period-history branch or `historyGaps` would fail named checks, so each rule has a pass and a fail.
- No `any` was added. No decision numbers appear on screen (the tests assert it). The `document` value type is refused 400 (in words).

## Journey test (reviewer, scored once for this check)
Journeys:
- J1, client at 390 px: fill all five types, save, reload. Resumes on `?part=3`.
- J2, officer at 1440, 1024 and 512 px (1024 at 200 %): reads, edits the history, the check clears.
- J3, client error: end before start. Flagged, saved, fixed.
- J4, client error: month 13. The gap words stop and a tier-1 message appears after saving.
- J5, wrong role: the officer declares for the client (M1).
- J6, break-it: 20,000 characters, 3,000 rows (400, refused whole), duplicate and unknown keys, a string "yes" sent as the declaration, non-English text.

Keyboard check: Space ticks a check box and the focus ring is 2 px. At 512 px there is no sideways scroll and axe is clean.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 and J2 end to end, data stored as entered |
| Next step obvious | 1 | "Add a period", "Choose all that apply", "Leave To empty…" |
| Plain words | ½ | Minors 1, 2 and 6 |
| Feedback and state | 1 | Gaps shown live in words; problems under the field after Save |
| Correct data | 1 | Stored values match, append-only, one current answer, audit line |
| Error recovery | 1 | Invalid answers saved and flagged; reload returns to the same part |
| Accessibility and screen sizes | 1 | axe clean at 390, 1024, 1440 and 512; keyboard works; targets 44 px or more except existing-pattern inputs (Minor 7) |
| Speed | ½ | Pages settled quickly, but I did not time them against STANDARDS §9 |
| Visual quality | 1 | Screenshots 01–05: team look, one column on the phone |
| Trust and sources | ½ | M1: an officer-made declaration reads "Declared" like the client's own |

**Score 8.5 / 10. Pass** (8 or more, no 0). The most valuable fix is M1, then Minors 3 and 1.

## Could not check
- A visible (headed) browser, because this environment has no display. I used headless Chrome.
- A real screen reader.
- An intended user's unaided walk (D17 and D20 are simulated only; they stay with the founder).
- `graph.mjs` was not run, because it rewrites `qa/GRAPH.md` and I may edit only this file.
- D1–D20 are not scored one by one: this is a capability PR with no screen concept of its own. The journey table above is the score.

**Verdict: Block.** Fix M1 (an officer cannot make or change a client's declaration, with a pass and a fail test). Then re-request review on the new commit. The Minors may follow in part 2.

## Round 2: commit 80b631fa (`git diff 987c1041..80b631fa`)

**What I ran:** web rebuilt; a fresh `rev_c44` copy on :4439, stopped afterwards.
- `check_c44_question_types.ts`: **44/44**.
- Browser check, run from a temp copy so the repo screenshots stayed untouched: **32/32**. It includes the step "officer: the declaration reads "Declared" with no Edit".
- `acceptance/C4.4.test.ts`: 22/28. The same 6 part-2 checks are still red on purpose.

**Fixes:**
- **M1, closed.** `api/src/runtime.ts:223-224`: an officer save to a `declaration` field returns 403 with "Only the client makes this declaration…".
  - The test confirms the stored answer stays the client's own (`false|user-P`), and a client save returns 200.
  - The officer view replaces Edit with "Only the client makes this declaration" (questionnaire.tsx:708).
  - There is one other answer write: section confirmation (runtime.ts:367). It only re-stamps the client's own value as VERIFIED, so it cannot make a declaration.
  - Without the guard, the 403 test would fail.
- **m1, m2, closed.** case.ts:169-173 adds "the start is in the future" and "before 1900; check the year". Each has a failing-input test.
- **m4, m6, closed.** The acceptance test's comments match the code, and the name reads "Sampled (no given name)".
- **m3, m5, m7, m8: accepted as follow-ups listed in the PR.** None blocks:
  - m3: the hint should say "to today".
  - m5: the library type list is the screens lane's, for part 2. C4.4 must not read Works until an author can pick the type on screen.
  - m7: the period-row accessibility points (P-71 behaviour is intact).
  - m8: the 4,000-character cap is the contract's.

**Journey score, round 2: 9 / 10, Pass.** Trust and sources rises to 1 because only the client can make the declaration. Plain words and speed stay at ½ (m3 is open; speed was not timed against §9).

**Verdict: Approve** for commit 80b631fa. There is no open Blocker or Major.
