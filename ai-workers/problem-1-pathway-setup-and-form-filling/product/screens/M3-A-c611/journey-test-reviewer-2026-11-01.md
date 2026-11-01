# Journey test, reviewer: C6.11 Firm, users and case team, 1 Nov 2026

**Round 2 at f3a04f73.** Round 1 at a9b54597 scored 7.5/10 (fail); that report is in git history.

Setup:
* Isolated copy `rev_c611` on :4435 (Visitor visa release 1).
* Chrome via Playwright, run headless because there is no display here. Steps used only what a person sees, apart from "Data underneath".
* Scratch, not committed: `/tmp/rev_c611/walk.cjs`, `last.cjs`, `focus.cjs` and `shots/`.
* US$0.

## Journeys (from concept §11 BR-20, §6 and board frames 1 and 2)
1. **Main.** Firm admin user-R opens a Visitor visa case. Expected: representative and case officer prefilled; the case opens; the header chip shows both with Stand-in.
2. **Main, continued.** user-R changes the representative to user-T. Expected: a reason is asked for; "A new IMM 5476 is needed"; R000002 filled; the earlier representative stays in the history with the reason and "by …".
3. **Alternate.** user-R takes off the only case officer. Expected: a reason is asked for, with a warning that this is the last officer.
4. **Error.** Reason "abc", and an empty take-off reason. Expected: refused on the field.
5. **Wrong role.** Case officer user-O opens "Case team". Expected: read-only, with an explanation.
6. **Isolation.** Solo user-S: the Sample firm's case URL, the case list, and the activity feed. Expected: "No such case", not listed, and no lines from that case.
7. **Solo, keyboard only.** user-S opens a case. Expected: one person prefilled in both fields, with the note; Enter submits; Tab reaches "Case team"; focus comes back after Escape.
8. **Recovery.** Reload after the change; two simultaneous presses; a stale tab (`check_c611_team.ts`).
9. **Across the boundary.** The client opens the case and sees no team.

## What happened (34 of 35 walk checks held)
| # | Result | Note |
|---|---|---|
| 1 | Held | Prefilled with user-R and user-O; the case opened in 230 ms; chip and SI-9 shown |
| 2 | Held | Notice reads "changed (Nov 1, 2026, 01:16 p.m.):" (the double full stop is gone); history shows "by Representative (Sample)" |
| 3 | Held | "This is the case's last case officer: the case has none until you assign another." Shot `20-last-officer-1024` |
| 4 | Held | "at least 5 characters", shown under Reason |
| 5 | Held | No controls, with "Only the firm admin changes the case team" |
| 6 | Held | The page says "No such case", the case is not listed, and user-S's activity has **0** lines from the Sample firm's case (round 1: 3) |
| 7 | Mostly | Prefill, note, Enter and Tab all worked. **Focus still falls to `<body>` after Escape or Close.** This is the shared Dialog's behaviour; the PR lists it as not fixed |
| 8 | Held | Reload keeps the team. The API suite covers races and stale views (409) |
| 9 | Held | No chip for the client |

## Automated checks
* My walk: axe WCAG 2.2 A/AA found 0 violations in 6 states. No sideways scroll at 400, 1024 or 512 px (1024 at 200 %). Console shows only the expected refusals.
* The builder's `check_c611_team_browser.cjs` passed 22/22 on two runs (axe on 5 states, 1440 and 1024 px).
* `check_c611_team.ts` passed 57/57.
* Neither suite runs in CI at this commit (the runner change was undone; Lead action in `review.md`).

## Data underneath
* After a case was opened and the representative changed, there was one current LEAD_REPRESENTATIVE row. The ended row keeps its reason and `ended_by`.
* Audit summaries name people, not ids.
* A reference reused by another firm gives 201, while the same firm reusing it gives 409.
* The same idempotency key in two firms gives two separate cases.
* Every audit entity written by case work is covered by the activity filter (`CASE_ENTITIES`).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–3 and 7 were done in the product's own screens |
| Next step obvious | 1 | One "Case team" action, prefilled choices, a notice that names what IMM 5476 must show, and the last-officer warning |
| Plain words | 1 | Names instead of ids in history and activity; copy slip fixed |
| Feedback and state | 1 | Toasts, the notice, errors under their own fields |
| Correct data | 1 | Rows as entered; isolation holds on the case, the list, activity, references and keys |
| Error recovery | 1 | Short or blank reasons, races, stale views and legacy cases all get plain refusals |
| Accessibility and screen sizes | ½ | axe clean, widths and zoom fine, keyboard path works. Focus is not returned on close |
| Speed | 1 | 230 ms to open a case; one request per view |
| Visual quality | 1 | Matches frames 1 and 2 |
| Trust and sources | 1 | SI-9 Stand-in chips and Sample licence values; no cross-firm leak left |

**Total 9.5 / 10: pass.** Next fix: focus return in the shared Dialog.

## Not tested
* A real screen reader.
* A walk in a visible browser.
* An unaided walk by an intended user (D17 and D20 stay with the founder).
