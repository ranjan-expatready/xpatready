# C10.2 phase 1, the finished story: journey test (reviewer, 8 Nov 2026)

**Commit:** 3e595b0b0, PR #1330. **Copy:** a `git archive` extract of exactly 3e595b0b0, run on isolated copies on :4436 (walk) and :4435 (pack). One harness change, in the scratch copy only: `isolated.sh` checked the database with `pg_isready`, because the sandbox refused `pg_ctl` through the scratch path. No product code was changed. Why an extract: the builder works in the same clone, and during the review HEAD moved to 2f024e676, with uncommitted work on `finished-story.ts` (a Paper line, a group split). So this tree was not the reviewed commit.
**Personas:** configuration author (user-A, the founder at the demo), case officer (user-O), client (user-P). Headless Chromium 1243 with Playwright and axe-core. Scripts and screenshots are in the reviewer's scratchpad (`walk/a.cjs`, `b.cjs`, `c.cjs`) and are not committed.

## Journeys
1. **Main (author, empty demo):** Demo, then "Load the finished story…". The tooltip is read and the dialog lists what loads. There is no RESET field (correct: the demo is empty). Load, then the running state shows. The job took 227 s. The data was checked underneath (see below).
2. **Main again (author, demo with content):** reopen and type `reset`. Load stays disabled. Type `RESET` and it is enabled. Load ran in 328 s, and the result dialog showed: move, facts, signed, documents, ready and record Done; forms Partly, with QA-165 (1) and QA-153 named.
3. **Across the boundary:** "Open the family case" by keyboard reaches `/cases/…` in 1.5 s. The case shows SAMPLE-VV-FAMILY-1, Release 6, representative CICC R000000 (Sample) and four people.
4. **Wrong role:** the case officer opens the dialog and clicks Load. The answer is "Case officer (simulated) does not hold the author duty". The API gives the client 403 and no person 401.
5. **Error, missing confirmation:** a POST with `{}` or `{"confirm":"reset"}` on a demo with content gets 400 with the words "The demo has content: loading the finished story empties it first. Type RESET to confirm." Nothing was removed (6 combinations stayed).
6. **Recovery, double start and resets mid-run:** a second start, Reset and Reset to the six while the job runs all get 409 with words. Esc does not close the dialog while it runs, and closes it when idle.
7. **Recovery, reload mid-run:** after a reload, reopening the dialog shows the running state, with Load busy and disabled. **Wrong turn:** once the job ends, a reopened dialog shows "Load the finished story?" with the RESET field, not the result. The result of the last load is visible only in the tab that started it (`demo-finished-story.tsx:30`).
8. **After it:** Reset to the six returned 201 in 24 s (6 combinations, 0 cases, story idle, checkpoint null). The pack's check 11 covers Reset.

## Data underneath (first load, :4436)
* `readiness_pass`: only `missing_document`, 4 rows, passed by user-O with the Sample reason. No finding, signature or fact warning was passed, so the reason given is true.
* `filing_record`: 4 rows, SAMPLE-VV-FAMILY-1-1…4, V300000001…4, prepared and recorded by user-O, reviewed by user-R. `filing_review`: user-R, 4.
* The audit shows each actor in their duty: user-P answered and re-confirmed, user-O answered, confirmed sections and entered items, user-R reviewed. Story writes go only through routes. The one direct write is the load's own audit line ("finished story").
* `GET /demo/status` is 24 KB once a story is done (it includes `rows` and `log`).

## Automated replay
axe (WCAG 2.2 A/AA) found 0 violations on three dialog states: intro, the RESET field, and the result. There is no sideways scroll at 1024 px, at 400 px, or at 720×450 (200 % zoom). The keyboard path works: Tab to Demo, Enter, arrows; the tooltip opens on focus; Enter opens the dialog; Tab reaches "Open the family case". The author's console has 0 errors. The officer's console has 403s from studio reads, which the guard intends. The acceptance pack ran twice (the shared tree at :4435 and the clean extract at :4435): 12/12 with 2 PENDING, exit 0 both times. `check_features_registry.ts` gave 27/27.

## Score (0 / ½ / 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–2: 7 stages, 6 Done, 1 Partly with its hold named |
| Next step obvious | 1 | Continue, and links to the family case and the thin case |
| Plain words | ½ | `case.visit_contact_*`, QA and capability codes, and "Release 1 to Release 6 (release 2)" on the result |
| Feedback and state | ½ | The running state shows. The result is lost after a reload (journey 7). The POST words point to "Demo › status", which does not exist |
| Correct data | 1 | Data underneath, above |
| Error recovery | 1 | Journeys 5, 6, 8 |
| Accessibility and screen sizes | 1 | axe 0, keyboard path, 1024 / 400 / 200 % |
| Speed | ½ | The dialog opens under 1 s, but the job takes 4–5½ min with only a spinner and its start time (no stage progress) |
| Visual quality | 1 | Team dialog, table, pills; reads cleanly at 1440 (builder's 04b and the reviewer's b03) |
| Trust and sources | 1 | Sample on every value, synthetic specimens said, US$0, held items named and never faked |

**8.5 / 10: pass** (8 or more, no 0). Fixes that would raise the scores, most valuable first: show the last result from `status.story` when the dialog is reopened (feedback); name the current stage while the job runs (speed); keep field keys off the result (words).

**Not tested:** a real screen reader; an intended user's unaided walk (D17 and D20 stay with the founder); the Mac path with the validated files (6c runs only there).
