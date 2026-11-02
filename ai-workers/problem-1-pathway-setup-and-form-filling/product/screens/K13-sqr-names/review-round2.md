# K13 review, round 2: Smart questionnaire names on screen (P-271, P-272)

Reviewer: fresh `screen-reviewer` context; I did not build this row. Commit reviewed: **6a4343f4** (head of local `k13-sqr-names`; fixes are `cedb021e..6a4343f4`, studio files only). Round 1: `review.md` (Block: 3 Majors, 4 Minors). Breaker: `break-report.md` (3 Majors, 7 Minors). Copies: `rev2_k13` on :4443, then `rev2_mut`, `rev2_x1` and `rev2_s5` on :4444. I confirmed `web/dist` matches the head (bundle contains the `div#agent-view`, the wrapping tablist and the new condition text). US$0.

## What I ran
* `check_k13_names_browser.cjs` 4443: **121/121**, exit 0. `check_x1_tabs_focus_browser` **48/48**. `check_s5_slice1_browser` **52/52**. `graph.mjs --check` exit 0. Web `tsc --noEmit` clean.
* **Mutation tests** (each restored with `git checkout --`):
  * Static scan, real sources:
    * `conditions.tsx` back to "from Questionnaires ›": caught.
    * `eligibility.tsx` back to "Answer in the case view": caught. This was the round-1 blind spot.
    * `cases.tsx` back to "This is the client's questionnaire": caught.
    * `review-proposals.ts` back to "Program question pick": caught.
  * Built bundle: I dropped the `pre-qualification` entry from `ITEM_WORD` and put the tablist back to `overflow-x-auto`, then rebuilt. The check went **118/3**: Activity "pre-qualification" failed, the tab cut-off failed at 720 and 400 px. After that I rebuilt the bundle from the head.
* **Own walk** at :4443 (Playwright, `/opt/pw-browsers/chromium`):
  * Tab bar on Super visa (badges) and Visitor visa, on Overview and Review, at 1440, 1024, 720, 512 (200 % of 1024), 400 and 320 px. No tab is cut off at any width. The bar wraps to 2 to 4 rows. The selected tab is always fully visible. Tab order runs left to right across rows. Axe is clean.
  * Bulk bar select is 286 px wide, and its text needs 208 px, so it is no longer cut. At 400 px its right edge is 313 px. Axe clean.
  * Activity shows "Prospect questionnaire (PQR)" and no "pre-qualification". Axe clean.
  * Case as staff: a cold load of `#agent-view` puts the "Agent view" h2 at the top of the window (88 px, scrollY 744). Axe clean.
  * The officer answers `person.other_family_name`. Client A at 400 px then reads: Waits for the officer's "Confirm section" (entered by the case officer). "Agent view" appears nowhere on the client page.
  * Staff on the client page see the notice title "This is the Client questionnaire". A client on the staff page sees "…open your Client questionnaire."
  * Preview: the PQR set reads "…later in the Client questionnaire". The sub-line reads "The questions Principal applicant answers on the case's link".
  * No page errors.
* Stored keys are unchanged: the answer channel is still `agent_view`, and the audit entity is still `pre-qualification` (shown through ITEM_WORD).

## Round-1 findings
1. Major, "Questionnaires" in the condition builder: **fixed** (`conditions.tsx:90`). The check fails if it is reverted (mutation).
2. Major, "pre-qualification" on Activity: **fixed** (`history.tsx:11` ITEM_WORD; stored entity kept). The walk now runs a rules-only PQR draft before Activity. The check fails if the fix is reverted (mutation).
3. Major, check cannot fail: **fixed**.
   * The scan now reads JSX text after `{expr}` (`check_k13_names_browser.cjs` `sourceWords`) and every string literal, not only spaced or capitalised ones.
   * A planted-fixture step proves it can fail.
   * Real-source mutations are caught (above).
4. Minor, `?view=` vs `?set=`: **fixed**. The walk visits `?set=pqr|sqr|agent`.
5. Minor, "Program question pick": **fixed** (`contracts/review-proposals.ts:19`; the commit names the shared contract). Read in code and the scan only; no pick was waiting to see it on screen.
6. Minor, J4 journey words: **fixed** (`J4-questionnaires-to-release.md:38`).
7. Minor, informal names: **fixed** (`cases.tsx` notice title and dialog, `questionnaire.tsx:811`).

## Breaker findings
* **M1 tab bar clipped: fixed.** The bar wraps (`combination.tsx:106`), and the check measures every tab against the bar at 1440, 1024, 720 and 400 px.
* **M2 and M3:** same as round-1 findings 2 and 1. Fixed.
* **m1 bulk select: fixed** (`w-72 max-w-full`).
* **m2 client reads a staff name: fixed** (`engine/runtime/case.ts:56`).
* **m3: fixed.**
* **m4: fixed** (`preview.tsx:92,99`).
* **m5:** same as round-1 finding 5. Fixed.
* **m6:** the `tests/qa/` walks are left for qa, as agreed in round 1, and the J4 journey is fixed. **Accepted.**
* **m7 Agent view has no target: fixed.** The eligibility link goes to `/cases/<id>#agent-view`. `cases.tsx:148-149` scrolls to the wrapping `div#agent-view` once the case loads. The last commit turned the `section` into a `div`, so R1c's section locator still finds one section. Heading order is unchanged: h1 › People › Eligibility › Prepare application › Agent view.

## Regressions
None found.
* The tab bar's keyboard order and focus are unchanged (x1 48/48).
* `s5_slice1` was updated only for the renamed preview sub-line (`check_s5_slice1_browser.cjs:119-120`).
* The hooks in `CasePage` are called before any early return.

## Remaining findings (none Blocker or Major)
1. **Minor (Should): no test covers the `#agent-view` landing (break m7).** No suite follows "Answer in the Agent view" or loads `#agent-view`; `grep agent-view tests/` finds nothing. I checked it by hand only, on a cold load. The eligibility link itself could not be produced, because the Visitor visa release has no eligibility rules. Fix: add one step to `check_k13_names_browser.cjs` that opens `/cases/<id>#agent-view` and asserts that `#agent-view-h` is near the top of the window.
2. **Minor (optional): two m4 wordings are fixed but not guarded.** I reverted the preview's "full questionnaire" and "What {who.label} is asked". The scan stays silent, because OLD has only the literal "What the client is asked". Fix: add `/\bWhat .{1,40} is asked\b/` and `/\bfull questionnaire\b/` to OLD.
3. **Note, not a finding:**
   * On Super visa at 1024 px, the tab bar now takes two rows.
   * When the selected tab is on a non-last row, its underline sits between rows rather than on the bar's base line. It is still clearly marked (screenshot at 1024, Overview).
   * At 320 px the Review tab's content (not the tab bar) scrolls sideways on both combinations. That is below the 400 px bar and outside K13.

## Journey score (reviewer role, the one score for this check): 9.5/10
These journeys were walked as a script, not by an intended user. I re-walked the fixed paths: author on the tab bar at 6 widths, the bulk bar, Activity after a PQR draft and the preview sets; staff on the case's Agent view; Client A on 400 px Personal details.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | All paths reached |
| Next step obvious | 1 | The Agent view link lands on the section |
| Plain words | 1 | No old name on any walked page; the scan is mutation-proven |
| Feedback and state | 1 | Unchanged |
| Correct data | 1 | Keys `agent_view` and `pre-qualification` kept |
| Error recovery | 1 | Unchanged |
| Accessibility and screen sizes | 1 | Axe clean on 5 states; no tab cut off from 1440 to 320 px |
| Speed | 1 | Pages settle under 1.5 s |
| Visual quality | ½ | Underline between rows on a wrapped bar (note 3) |
| Trust and sources | 1 | Sample and AI labels untouched |

## Could not check
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* "Prospect questionnaire (PQR) pick" on To review with a waiting pick: the C4.7 picks need the fake launcher, and I read it in code only.
* The eligibility "Answer in the Agent view" click: there are no rules in the sample release.

**Verdict: Approve**. There is no open Blocker or Major. Minors 1 and 2 can be follow-ups in the PR.
