# C7.5 part 2: independent review (screen-reviewer, 8 Nov IST)

**Reviewed:** commit `8346005d7` on `claude/determined-maxwell-f33ogl`. While I was reviewing, the branch head moved to `7f872b70e`. That commit adds only `break-report-part2.md`, so the code is unchanged. **Bar:** `concept-part2.md` (with §8), rows.md "C7.5", sprint-plan "Row C6", P-110, P-121, P-141, P-164, P-168, P-71, P-227, P-232, P-295, STANDARDS, EXPERIENCE §2–§6. I did not build this screen. Live AI stayed off, no priced button was pressed, and I set no `*_LIVE` switch. Ports used: 4436 and 4437.

## Verdict: Rework (Block). Three Musts are open (M1–M3). Everything else holds up well.

## What I ran (US$0)
| Check | Result |
|---|---|
| `check_c75_form_review_engine.ts` | 47/47 |
| `check_c75_review_runs_api.ts` (copy :4436, `STUDIO_MADE_UP_REVIEW_RUNS=1`) | 35/35. The pack ran on the made-up run: 15/16, with -6b red by design. The stub pass of the launcher was free and left no file behind. |
| `check_c75_review_page_browser.cjs` (:4437, run twice) | 31/31, then 30/30 (the second run skips setup). It writes into the committed `screenshots/`; I restored those files. |
| Part 1 regression: `check_c75_findings_browser.cjs` · `check_c75_findings_api.ts` | 28/28 · 55/55 |
| Gate B, `C7.5.test.ts` (:4437) | **11/16 on the fixture and 11/16 on the configured checkpoint.** Red: -6b, 7, 8, 9, 15, which wait for the paid run, as the builder said. |
| `graph.mjs --check` | exit 0, and no gap names C7.5. The 3 routes are reached by `check_c75_review_runs_api.ts`. |
| My own walk and break-it pass | `journey-test-reviewer-part2.md`, scored **8.5/10** |

## D1–D20 (independent reviewer; script and browser evidence)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | BR-1, 3–7, 9 and 10 behave as written. BR-2 is broken on IMM 5707 (M1). BR-8 races (M2). |
| D2 Data integrity | 4 | Per-case advisory lock: two runs at once add each finding once. A dismissed finding is never raised again. Resolved by `rules`, checked in the DB. A reused `runId` is not refused (m1). |
| D3 Reuse | 4 | Reuses the filler's value step (`form-values.ts`), StepRunner, the guard and FindingsPanel. No new table; the departure from rows.md is recorded in concept §2. |
| D4 Rule integrity | 4 | AG-11-70 quote rule, P-121 High/Low and the guard each have a pass and a fail case, plus a property test (300 runs). |
| D5 Stability and recovery | 3 | Double click gives 1 run (audit). Reload is fine. After a 409 the card stays stale and loops (M3). |
| D6 Freshness and governance | 4 | One audit line per run (forms, mode, cost, counts), with no value, quote or reason. The Saved row does not show the run's date (m5). |
| D7 AI trust | 4 | Every AI row has: AI, Replayed, High/Low, both rounds' reasons, the quote, Show on the form, and the made-up banner on test copies. Nothing approves itself. |
| D8 Orientation | 5 | Path Cases › reference › Review, one h1, "Open Review" on the case page. |
| D9 Flow | 4 | One primary action, "Run review (Saved, US$0.00)". When nothing can run, the page says why. The step to Ready to file names the AI finding. |
| D10 Language | 3 | Decision numbers are on the main path (m3). IMM 5707 shows codes ("Marital status 4") (M1). |
| D11 Feedback and state | 3 | The result is in a live region, and dropped and unjudged items are listed. Live progress is invented (M2c). Focus is lost after Run (m6). |
| D12 Visual | 4 | Team tokens; Source + proposals side by side from xl, stacked at 1024. |
| D13 Accessibility | 4 | axe clean on every state I opened. Keyboard path: Run is the 10th Tab stop. 400, 1024, 1440 px and 200 % zoom have no sideways scroll. The High/Low tip opens on hover only (m2). |
| D14 Team look | 4 | Same panels and pills as the case page. |
| D15 Speed | 5 | Run card 196 ms, Saved run 126 ms, plan 28 ms, GET findings with resolve-on-read 71–163 ms. |
| D16 Testability | 3 | 113 checks pass, but the money and BR-10 guards have no failing test (M2b). |
| D17 First-use | simulated only | Needs an intended user's unaided walk. |
| D18 Provenance | 4 | Each finding shows its quote and highlights that line in the source. Run files are named on the card. |
| D19 Closure | 3 | Review → Ready to file warning works on the made-up run. Real closure waits for the paid run (not yet evidenced). |
| D20 Wow | simulated only | Needs the founder or an intended user. |

## Scorecard (EXPERIENCE §6; evidence: committed `screenshots/part2-01…03-*-1440/1024.png` plus the walk steps)
BIC-01 N/A · BIC-02 N/A · BIC-03 N/A: changing a quoted fact resolves the finding when the findings are next read (verified) · BIC-04 Met: Saved or Live, refused in words · BIC-05 Met as scoped: source line plus Acknowledge/Dismiss, writes no fact · BIC-06 Met: Low first, no bulk accept · BIC-07 N/A · BIC-08 N/A here, grouped per filing then person (Met) · BIC-09 N/A · BIC-10 N/A · BIC-11 Met · BIC-12 Met: warnings only; Ready to file names the AI finding · **BIC-13 Partly** (M3) · **BIC-14 Partly** (m2) · BIC-15 N/A · BIC-16 N/A · BIC-17 Met · **BIC-18 Partly** (M2c, m4) · **BIC-19 Partly** (m3) · BIC-20 Met.

## Issues, ranked
**M1 (Must, concept BR-2; D1, D10).** The page offers IMM 5707 and IMM 5476 too.
- *Problem:* IMM 5707's sheet and source panel print coded choices: "Marital status 4", "Whether this family member will accompany… 2", "has children 1".
- *Why:* `printedBoxes` (`api/src/review-runs.ts:320`) reads only `options_resolved`. The 5707 inventory has `options` as two parallel lists, `[[labels],[codes]]`.
- *Also:* the applicant's and the parents' rows share one fact key and one caption ("Date of birth 1986-04-13" and "Date of birth 1956-11-08"), with nothing saying whose row it is.
- *Fix:* read both option shapes, and add the person or section to the caption of repeated rows, with an engine test (pass and fail). Or offer only IMM 5257 in the Form select for now (P-164 (2); concept Q3 "IMM 5257 only now") and say why.

**M2 (Must, P-110, P-232, BR-8, BR-10; STANDARDS §3.10 and §7 [M] "a rule's test fails when the rule is removed").** Live is what the tech lead's paid run will use.
- (a) "One live run per case" races. The check is at `review-runs.ts:219`, but `going` is only set at `:227`, after awaits at `:224` and `:226`. Two Live POSTs from two tabs or a client retry both pass, which can spend 2 × US$4.80. Check and set with no await between them.
- (b) Removing any of these lines fails no test:
  - `:217` (one form);
  - `:219` (one per case);
  - `:220` (plan checksum required for Live);
  - `:221–222` (job cap and spending cap);
  - `:172` (a `test_fixture` record is refused outside made-up mode).

  Stop is tested only as a 404. Add the cases on a copy with `STUDIO_FAKE_LAUNCHER` (`tests/fixtures/fake-launch.mjs`, as other suites do):
  - two Live POSTs at once give one 201 and one 409;
  - two forms give 409;
  - a missing or stale checksum gives 409;
  - over the cap gives 409;
  - Stop during round 1 sends no round 2;
  - a `test_fixture` record in the runs folder is refused.
- (c) The steps are invented from `phase` (`web/src/runtime/review.tsx:126`). On Live, step 3 stays "waiting" through the whole checker round, and the list is not in a live region. That breaks concept §4 ("tick in order with a live region") and EXPERIENCE §4 [M] "real progress". Tick from the run's real round status (challenge M5).

**M3 (Must, EXPERIENCE §4 [M] conflict state; BIC-13).**
- *Problem:* after a 409 "Look at the run card again", the card keeps the old plan and still offers Saved. Pressing again gives the same 409 until a manual reload (walk step B3).
- *Why:* `onError` at `review.tsx:122` neither refetches the plan nor uses the `plan` that the 409 body already carries.
- *Fix:* refresh the card on 409, and add a browser step for it.

**Minors (Should; fix, or list with a follow-up row):**
- **m1.** A reused `runId` is refused only when that run wrote a finding (`review-runs.ts:226`). A second POST with the same id after a run that found nothing ran again (201, 201). Keep finished run ids in memory, or audit by run id (STANDARDS §4 [M] idempotent launches).
- **m2.** The High and Low pills have only a `title` (`findings.tsx:102–103` at this commit), so the tip does not open on keyboard focus. Concept BIC-14 says "hover and focus". Use `Tip focusable`, as the rule chip does.
- **m3.** Decision numbers are on the main path: "(P-295)" in the Live and no-saved texts (`review-runs.ts:56`, `:69`), and "(P-121)" in the pill tips. EXPERIENCE §5. The concept's copy carries them too.
- **m4.** The "nothing filled" state is a warning with Retry only. Concept §4 also asks for the link to the Agent view (`review.tsx:144`).
- **m5.** The Saved row does not show the date of the checked run (concept §4: "replays the checked run of <date>"; `review.tsx:150`).
- **m6.** Focus falls to `<body>` when Run is pressed, because the button becomes disabled (`review.tsx:162`). Move focus to the result, or keep the button focusable.

## Code notes (no finding)
- No migration.
- Authorisation is on the server: a client gets 403, another firm 404, a configuration author 403. Field errors come back as 400 Problem Details with `errors[]`.
- The audit holds no value. No `ai_batch` row is written. No request per row.
- Injection: `|` and contact facts are refused by both the engine and the guard; values are sent as data. This is tested.
- A sheet file is written to `p2/review-sheets` on each plan and on each findings read that has AI findings. These are client answers kept outside the database (Sample data here). This is the same pattern as `question-lists/`.

## Could not check
- A headed browser pane (I used a headless Chrome walk) and a real screen reader.
- D17 and D20, which need the founder or an intended user.
- The Live path itself (off) and the real saved run.
- Whether the PR's first line names the shared contract change (`contracts/drafting-run.v0.schema.json`, kind `form_review`).

**Verdict: Block** (commit `8346005d7`). Fix M1, M2 and M3, each with a test that fails without the fix. Fix m1–m6 or list them in the PR.

## Re-review: the changes only (P-293), `git diff 8346005d7 4d5ce4405` (8 Nov IST)
**What I ran myself, on fresh copies (:4436 and :4437, US$0):**

| Check | Result |
|---|---|
| Engine | 66/66 |
| API, on the made-up run (the pack: every step but -6b green; -6b red) | 41/41 |
| Review page browser | 37/37 |
| Part 1 findings browser | 28/28 |

I restored the committed screenshots after each test run. Head has since moved to `0ea7adf0d`, which adds only the breaker's notes.

| Was | Now | Status |
|---|---|---|
| **M1** (IMM 5707 codes, whose row) | `choiceWords` reads both option shapes, a 2 × 2 list included. Tick boxes read Ticked or Not ticked. A relative's row names whose it is. On IMM 5707's plan I see "Marital status: Annulled marriage", "Sample Client A: parent 1: Date of birth: 1956-11-08", "…accompany…: NO", "has children: Ticked". There are engine choice tests (pass and fail) and API "review M1" lines. | **Closed** |
| **M2 (a)** (one live run per case races; the breaker's M2) | `run()` checks `claimRefusal` and claims `going` before any wait, and releases it in `finally`. Two calls with one run id at once give one 201 and one 409. | **Closed** |
| **M2 (b)** (the guards have no failing test) | `liveRefusal`, `claimRefusal` and `madeUpRecord` are pure, each with pass and fail tests. The route calls them, so removing that call fails the API's "Live is off" 409 and the "break M1" steps. | **Closed**, with one gap (q1) |
| **M2 (c)** (invented steps) | Steps no longer tick while running. One `role=status` line is shown, and at the end each step reads done or not from the result. The list is `aria-live`. In my browser walk all 4 steps were done after Saved. | **Closed** |
| **M3** (stale card after a 409) | `onError` refetches the plan. The browser step changes an answer under the open card, and the card reloads (Saved unavailable with the reason; Run disabled). | **Closed** |
| m1 reused run id (the breaker's M1) | Refused from its audit line (`detail.run`). The same id sent again gives 409 even when the first run added nothing. | Closed |
| m2 High/Low tip | `Tip focusable`; by Tab I saw "Low [tip: The two AI rounds did not agree…]". | Closed |
| m3 decision numbers | None on the page (I checked by walking it). | Closed |
| m4 Agent view link · m5 date · m6 focus | The link shows on "Nothing is filled". The Saved row says "recorded on Nov 8, 2026". After Run, focus is on the result. | Closed |

**Also checked:**
- A plan, a Saved run or a findings read no longer writes a sheet file; no new file appeared in `p2/review-sheets` during my runs.
- Look-alike brackets and bars are stripped by the engine and refused by the guard.
- Contact-like values are left out.
- Stop on a Saved run gives 409.

**New or remaining (Should; none blocks):**
- **n1. IMM 5257 choices now carry the form's mark.** The choice words now come from `options` and keep the label's own mark: "* No", "*No", "* Yes", "F Female", "AFG (Afghanistan)". These were "No" and "Yes" at `8346005d7`. The sheet's checksum is the replay key, so **strip the leading "\*" (as `boxWords` does for captions) before the paid run is recorded**; a later change would retire that run (challenge M2).
- **n2. The claim uses the case id string from the URL** (`review-runs.ts` `run()`). The same case in upper-case letters could hold a second live slot. Lower-case the id first (the breaker reports this too).
- **q1. For the tech lead:** no test runs the Live route end to end. That would need `STUDIO_AI_LIVE=approved` plus `STUDIO_FAKE_LAUNCHER`, as other suites do: Stop during round 1 sends no round 2; two Live POSTs at once give 201 and 409. The builder's brief forbids setting the switch. I recommend adding it under a usage line, paired with the fake launcher, before the paid run.
- **n3.** When round 1 succeeds and the checker round fails, steps 2–4 all read "not run". Step 2 could read done.
- The breaker's m1 (an AI finding gone stale shows on Ready to file until the findings are read) behaves as part 1 does for rules findings. I am not raising it again.

**Journey re-score:** 9.5/10. Feedback, recovery and accessibility are now 1 each; plain words stays ½ because of n1.

**Verdict: Approve** (commit `4d5ce4405773566022fa648486fda1e77878e547`). There are no open Blockers or Majors. List n1, n2, n3 and q1 in the PR, and fix n1 before the paid run.

## Diff check on 541dbfb (`git diff 4d5ce4405 541dbfbe7`, 8 Nov IST)
I re-ran on fresh copies (:4436 and :4437, US$0): engine 67/67, API 44/44, browser 37/37. I restored the screenshots the tests overwrite.

- **n1 closed.** `choiceWords` drops a leading "*". The engine test reads "* No" as "No" and "*Yes" as "Yes" and keeps "F Female". The API test finds no IMM 5257 value that starts with "*". This lands before the paid run, so the replay key is final.
- **n2 closed.** `run()` lower-cases the case id and the run id before the claim and before the audit check. The API test sends a used run id in upper case and gets 409; it would have got 201 without the fix.
- **n3 closed.** `RunForm.rounds` (0, 1 or 2) is set before the early exit for a failed round (`review-runs.ts:252`). From it, step 2 shows done after 1 round, step 3 after 2, and step 4 when the rules ran. The API test checks that `rounds` is 2 on a Saved run.
- **q1** (Live tested end to end with the fake launcher) stays with the tech lead as question 6 on the PR. Not blocking.
- The rest of the diff is records and regenerated screenshots.

**Verdict: Approve** (commit `541dbfbe771c6206eb04958ada51503346bfe122`).

## Diff check on a0cc7ef (`git diff 91494b35c a0cc7ef28`, 8 Nov IST)
I re-ran on fresh copies (:4436 and :4437, US$0). Results: `check_qa182_no_box_words` 8/8, engine 67/67, API 44/44, browser 37/37. I restored the screenshots the tests overwrite.

- **A firm's words.**
  - The no-saved text is now "No saved review of this form edition with these values yet."
  - The Live-off text is now "Live is off on this copy. A live review needs approval first, with its cost stated. Use Saved (US$0)."
  - No on-screen string of the Review page names "tech lead" or "founder" now. The words remain only in code comments.
  - The browser step now checks for their absence, and the engine and API tests read the new words.
- **"form field" in place of "box"** (P-63, QA-182). This covers:
  - step 1;
  - the source panel's text and its `aria-label`;
  - the Saved row;
  - the list of fields the AI could not judge;
  - a line with no caption.

  `check_qa182` passes.
- **One note.** The caption-less line's wording is part of the review sheet, so its checksum moves for forms that have such a line. No paid run is recorded yet, so nothing is lost.
- Nothing else in the code changed.

**Verdict: Approve** (commit `a0cc7ef28bd8a6350956e6499aa9fcbf6935437a`).
