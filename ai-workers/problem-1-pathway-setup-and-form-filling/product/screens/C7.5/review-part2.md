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
