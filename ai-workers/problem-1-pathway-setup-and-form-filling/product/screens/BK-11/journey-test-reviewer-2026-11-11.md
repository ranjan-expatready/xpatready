# BK-11 journey test: reviewer, 11 Nov 2026

Commit `48081d1d5`. Isolated copy forms_rev on :4458 (stopped afterwards), suites' fixture. Live AI off. Headless Chromium plus axe-core. Screenshots: `/tmp/claude-0/-home-user-xpatready/8a9b23c8-ee6a-5e28-ae4d-532ccde19f91/scratchpad/walk/` (released-1024-open.png, released-400-open.png, released-zoom200.png) and the builder's `screenshots/01-review-released-versions-fill-trials-1440.png`.

## Journeys
1. **Main.** The configuration author (or approver) wants to know which forms in the current release are proven to fill. Steps: open the combination's Review and release tab, go to Released versions, open "3 of 6 forms with a passed fill trial". Expected: every form a case fills, each marked Passed (with edition, date and evidence) or Not yet (with why). **Held:** 6 forms are listed, 3 Passed with date and evidence record, 3 Not yet with a reason in words.
2. **Release made by a second person.** Submit, sign the expert items, then approve as the approver. The new version carries its own list. **Held:** the API check passed this (approve gave 201, `summary.fill_trials` = `releaseFillTrials(snapshot)`).
3. **Release made before BK-11.** Expected "Not recorded …", never "Not yet". **Held:** v1 with the key removed reads "Not recorded in this release: it was released before fill-trial status was carried".
4. **Keyboard only, 1024 px.** **Held:** Tab reaches the summary, Enter opens it, focus ring visible.
5. **Small screen and zoom.** 400 px: no page scroll; the table scrolls in its own container (as before this PR). 720 px at DPR 2: no page scroll.
6. **Across the screen boundary (release → case / BK-13).** The release's list should match what a case fills. **Did not hold, in one case:** a filed form stored as a legacy `document` row titled "… form" is filled by the case but missing from the list, and a "Not needed" line is listed (review M1; reproduced on synthetic lines against `isFormLine` / `pdfForms`).
7. **Break it.** Release fingerprint after the change: unchanged (the API check). Reload with the fold-out open: it closes, and the data is the same. Two releases of one combination: each keeps its own frozen list. Wrong role: no new action, since display is read-only and the approve route's server checks are unchanged.

## Data underneath
`config_release.summary.fill_trials`: one entry per form line, in the release's order, with a status code, edition, `recorded_on` and evidence for Passed, and a reason code plus words for Not yet. The snapshot is untouched. The approve and bulk release paths share `publishRow`, and the demo import writes the field too. No other `configRelease.create` exists in app code.

## Score (0 / ½ / 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journey 1, screenshot 1440 |
| Next step obvious | ½ | "Not yet" says why, but not where a trial gets recorded |
| Plain words | ½ | Repository path shown (`release-fill-trials.tsx:17`); "as at release" not said |
| Feedback and state | 1 | Passed / Not yet / Not recorded are distinct pills and words |
| Correct data | ½ | M1: a filed `document`-kind form is left out; a Not needed line is counted |
| Error recovery | 1 | Reload is safe; a release made before BK-11 is said honestly |
| Accessibility and screen sizes | 1 | axe 0 (closed and open), keyboard, focus ring, 400 / 1024 / 1440, 200 % |
| Speed | 1 | No added request; computed once at release (page load 1.2–2.3 s in dev, as it was before this PR) |
| Visual quality | 1 | Team Pill and FoldOut, aligned column |
| Trust and sources | ½ | Evidence and date are shown; the list is not marked as frozen at release |

**Score: 8/10. Passes (8 or more, no criterion at 0).** Fixes that would raise it, most valuable first: (1) use `isFormLine` for the list (correct data); (2) "at release" in the summary words (trust, plain words); (3) "evidence record" in words, with the path in the title (plain words); (4) for a form with no PDF, point to where a trial is recorded or show a neutral pill (next step).

## Could not test
A real screen reader. An intended user's unaided walk (D17 and D20 stay with the founder). M1 in the running app: the seeded IMM 5802 has no file, so attaching it is refused with "No file yet".
