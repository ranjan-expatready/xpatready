# B143 · C7.10 Readiness figure: journey test (reviewer, 9 Nov 2026)

The reviewer role (skill journey-test). This is the one score for this check. Commit c504e200271afb6d2d73f25fe62bc194a92bf51d, isolated copy `rev143a` on :4436. It was loaded with the configured checkpoint (97 s) and stopped after. Synthetic people, no model call, US$0.

My probes are in the scratchpad, not committed:
* `probe-api.mts` (API)
* `probe-ui.mts` (Playwright with axe-core, headless)
* screenshots under `…/scratchpad/shots/`

The walk is replayed in a headless browser as a person would see it. I had no visible browser pane.

## Journeys (persona · goal · expected)
1. **Main.** Case officer: "How close is each filing, and which one holds the case back?" Open a family case (4 filings). Expected: the header pill reads the lowest state and figure with the filing's name; each filing shows state · % · "n of m done"; "How this is worked out" lists the items and the rule.
2. **Alternate (pass).** Officer passes a warning with a reason. Expected: the figure rises and "1 passed with a reason" shows (builder's C7.10-s4, re-run 8/8).
3. **CRITICAL finding, then waived (M1, M3).** Officer adds a CRITICAL finding by hand; the representative waives it in Review findings. Expected: the finding is counted Not done; after the waiver it is Done and Passed, and it stays counted.
4. **Submitted (M2).** Record the submission of a 2-filing group, then change a fact after filing. Expected: no figure row on the submitted filings and no header pill; `case_figure` stays null.
5. **Rules finding edited before it is fixed (break-it).** The visit's end date is set after the passport expiry three times with different dates, then fixed. Expected: one check, counted once.
6. **Ready.** Everything done. Expected: Ready at 100 exactly when Ready to file is allowed (C7.10-8, -11, s6, s7).
7. **Wrong role.** A client reads `/prepare`. Expected: 403 and no figures (C7.10-12).
8. **Recovery.** Reload the page. Expected: the same pill returns, with no wrong flash.

## What held
* **J1.** Header: "Readiness: Not ready · 22% (lowest: Visitor visa: Sample Client A)", outside the `<h1>`. The rows read "Not ready 22% 2 of 9 done" and match the server for all 4 filings. Pill and rows appeared in 1.1–1.6 s from `goto`, with no console or page errors.
* **J3.**
  * The CRITICAL finding counted Not done: 2/10 = 20.
  * Waived: Done and Passed, 3/10 = 30, passed 1. The C7.6 entry has no finding left, and its keys are unchanged (no `figure`).
  * A MINOR finding acknowledged with a reason: Done and Passed, 4/11, passed 2.
* **J4.** After recording: both `submitted: true`, `case_figure: null`. After a fact changed, the principal's own figure fell to Not ready 66 while `case_figure` stayed null. On screen: 0 figure rows, 0 header pill, and "Recorded as submitted…" kept.
* **J6–J8.** Pass. C7.10 13/13, C7.10-screen 8/8 and C7.6 27/27 re-run on the checkpoint. The client gets 403. Reload gives the same pill.
* **Widths.** At 1440, 1024, 400 and 720 CSS px at scale 2 (200 % of 1440), there is no sideways scroll and no axe violation in the figure rows or the header pill, before and after opening the disclosure.
* **Keyboard.** The `<summary>` takes focus with a 2 px outline, and Enter opens it.

## Findings
* **Major: resolved history inflates the figure (J5).** Each changed value of a rules finding is a new row (`api/src/findings.ts:68-83`). Every `resolved` row is then counted as a separate done item (`api/src/readiness-inputs.ts:91`, `engine/runtime/readiness-figure.ts:75`).
  * Probe: the same check, still open, gave 0 → 9 → 16 → 25 over three edits. The figure rose with nothing done.
  * End state: 3 "resolved" items for one check, at 3/12.
  * BR-30 counts "each pack library check" once.
* **Minor: the figure's `aria-label` is on a role-less `<span>` (`web/src/runtime/readiness-figure.tsx:32`).** axe marks it `aria-prohibited-attr` (needs review), and the accessibility tree ignores it ("text: Not ready 22% 2 of 9 done"). The visible "22%" still reads, so no information is lost.
* **Minor: the "Not done" marker is drawn red** (`text-text-danger`, `:39`): 22 red circles on one case for a normal state (BIC-19; challenge m8's reasoning).
* **Minor: the shown rule paragraph ends with "(AG-7-27, BR-30)".** Those are requirement ids on the case staff's path (EXPERIENCE §2, "no … decision numbers"). Its first sentence runs to about 45 words.

## Score (0 / ½ / 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J4, J6: each filing's figure and the case's lowest, as the server gives them |
| Next step obvious | 1 | The figure sits above C7.6's lines, and "Not done" items name what to do next; Ready to file is unchanged (s5, s7) |
| Plain words | ½ | Clear row, but the rule paragraph is long and carries requirement ids |
| Feedback and state | 1 | The figure updates after a pass or waiver (s4, J3); the pill is hidden while loading or on error |
| Correct data | ½ | 100 ⇔ Ready holds; resolved-history inflation (J5) |
| Error recovery | 1 | Reload keeps state (J8); the figure never gates (C7.10-10, s5) |
| Accessibility and screen sizes | 1 | 0 axe violations at 4 widths, 200 %, keyboard disclosure; only the ineffective aria-label (Minor) |
| Speed | 1 | 1.1–1.6 s to the pill on a page already loading `/prepare`; one fetch shared |
| Visual quality | 1 | `filing-open-1440.png`, `filing-1024.png`: team pill, tabular figure, calm amber |
| Trust and sources | ½ | Rule and items are shown, and passes are named; a resolved row is listed per edit, not per check |

**Total: 8.5 / 10. Pass, no 0.** To raise it:
1. Count a rules check once (correct data, trust).
2. Shorten the rule words and drop the ids (plain words).

## Not tested
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* The header pill naming two different filings: no data reached that state, so I read the code only.
* Two tabs saving at once (the figure is read-only and stores nothing).
