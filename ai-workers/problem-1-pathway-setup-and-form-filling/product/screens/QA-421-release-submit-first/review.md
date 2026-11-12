# QA-421 review: Review and release, the author's Submit comes first

**Reviewer:** an independent reviewer session that did not build this row. **PR:** #1644 (draft), **commit `cfd11fb87`** on `claude/youthful-carson-0xcrp3`. **Date:** 12 Nov 2026.
**Row:** QA-421 (A25 UX friction sweep Major, P-498; style P-473). Report: `qa/reports/2026-11-12-ux-friction-sweep.md` §1, §3 (on PR #1637's branch, `24f00c207`).
**Diff:** `web/src/pages/release.tsx` (+21/-5), new `tests/check_qa421_release_submit_first_browser.cjs`, `tests/check_bk4b_handoffs_browser.cjs` (its opening step and the "nothing ready" loop), and 4 screenshots. Nothing outside the release page and its checks.
**How I checked:** my own isolated copy `screens_qa421rv` on **:4476**, started and stopped in the same command each time (3 runs, fresh database each). I never used :4400 or :4473. Live AI was off: US$0, and I pressed no priced button. I wrote two walk scripts of my own in the session scratchpad (Playwright and axe, 1440, 1024, 512 (1024 at 200 %), and 375 px, as `user-A`, `user-C` and `user-B`).

## Verdict: Approve (no open Blocker or Major). Journey score 9 / 10 (pass).

## What the row asks, and what I saw
* **Bug fixed.** On the configured checkpoint with one unsubmitted change on the Visitor visa, the author (`user-A`) now sees "Next: submit **Visitor visa** for review. Until it is submitted and its review is done, a release leaves it out." and a filled **"Submit Visitor visa for review →"** link to `/c/<id>/review`. There is no "Hand to the Approver" (shot `1-author-not-submitted-1440.png`). Pressing Enter on the link opens that combination's Review and release tab, and its "Submit for review" works. Back on /release, the Submit step is gone and the hand-off to the Approver (`data-handoff-to="user-B"`) is back (shot 3).
* **Edge cases I walked:**
  - **Two unsubmitted (Visitor visa, Outside Canada):** the step names the first and adds "(and 1 more not submitted)". After the first is submitted through the step, the step moves to "Submit Outside Canada for review →". The hand-off stays hidden until both are submitted.
  - **Returned to the author** (the Content reviewer returned it through the UI with a note): why = "Returned to the author: …submit it again…". The Submit step shows, and the tab's "Submit for review" is enabled.
  - **Changed after it was submitted:** the Submit step shows again (the builder's step 4, 375 px).
  - **Author with nothing pending** (as loaded, and after both were submitted): no step; the hand-off shows.
  - **Content reviewer (`user-C`, no author duty):** no Submit step; the hand-off names the Approver.
  - **Approver (`user-B`):** no step, no hand-off. "Release 73 library changes as Release 7" is the one filled button, at 1440 and at 375 px.
  - **Nothing ready to release:** BK-4b's loop now asserts the author's Submit step and the reviewer's absence of it (45/45).
  - **Row held back for a draft problem** (fixture in my own copy's database, as `check_b1_release_unmapped.ts` does: IMM 5475's field map removed, then the form added): why = "No form fields mapped yet…". **No Submit step, which is correct:** the server refuses Submit while the draft has errors (`studio.ts:1056-1057`), and the gate's words are not on that row. See m3 for the hand-off shown in that state.
* **One filled button (P-473), measured:** exactly one enabled `bg-primary` control in every state above (the Submit link for the author, Release for the Approver, none for the Content reviewer). For a person without the approve duty, the disabled Release button is now `secondary`.
* **axe (WCAG 2.2 A/AA) on `main`:** 0 violations in all 11 states. **No sideways scroll** at 375, 512 (1024 at 200 %), 1024 or 1440 px. The keyboard reaches the Submit link after the shell's 19 stops (it is the first stop in `main`); it shows `:focus-visible`, and Enter follows it. **No page or console error.** /release fully loaded in about 1.0 s, including the network going idle.
* **Builder's results reproduced:** `check_qa421` passed 16/16, twice. `check_bk4b_handoffs_browser` passed 45/45. I did not re-run the check on main: step 1 needs `[data-next-step="submit"]`, which main does not render, so it must fail there, as the builder reports. **Removing a rule fails a check:**
  - dropping `!toSubmit.length` from the hand-off condition fails step 1 "no hand-off";
  - dropping `canSubmit` fails step 5;
  - dropping the step fails steps 1 and 4.
* **Graph (P-86):** `graph.mjs --check` reports G1 0 and G2 0. `/release` is visited by `check_qa421` (C5.1, C10.1). No new route and no new module. The G3 and G6 items it lists are unrelated to this page.

## The design choice: matching the gate's words instead of a typed field
**Acceptable for this row, with one guard added (m1).** The words are the server's single source: three sentences of `gateOf` (`api/src/studio.ts:96-97`), passed through unchanged by `draft()` (`programs.ts:438`). No other hold reason contains "on its Review and release tab" (grep of `api/src`), so there is no false positive today. The UI cannot offer something the server would refuse: the server checks `need(actor,"author")` at Submit, and `canSubmit` mirrors it. Staying out of `api/` follows the lane rule.

The risk is silent: if someone rewords a gate sentence, the step disappears for that state. Today only two of the three sentences are pinned by a check: "Not submitted…" (setup regex) and "changed after it was submitted" (step 4). The "Returned to the author" sentence is pinned by no test. **The durable fix belongs to whoever next edits `draft()`:** a typed reason on each row, for example `needs: "submit"`, which the page reads instead of the words. That is a follow-up row, not a change for this PR.

## Issues (none Blocker or Major)
| # | Sev. | Where | Finding | Fix |
|---|---|---|---|---|
| m1 | Minor · Should | `tests/check_qa421_release_submit_first_browser.cjs` | The returned-to-author path works (I walked it), but no check covers it. Its sentence is the one `gateOf` sentence the regex at `release.tsx:23` depends on that no test pins. | Add a step: return the submission as `user-C` (UI or `/signoff` with `action:"returned"`), then assert the Submit step and no hand-off. |
| m2 | Minor · Should | `release.tsx:63-64` | The step names a combination by its leaf label only: "Submit **Outside Canada** for review →". More than one combination ends in "Outside Canada", so the button text is ambiguous (D10, non-ambiguity). Also, "(and N more not submitted)" counts returned and changed-after-submit rows as "not submitted". | Use the last two path parts when the leaf is not unique, for example "Study permit › Outside Canada". Say "(and N more waiting for your Submit)". |
| m3 | Minor · follow-up (outside the row's Expected) | `release.tsx:100` | The author is still offered "Hand to the Approver →" in two states: own change held for a draft problem (shot `p1`), or own change submitted but waiting for the Content reviewer's SME sign-off (state E4). In both, the Approver could release the 73 library changes without the author's change, which is the harm QA-421 describes. The row's Expected limits the fix to a needed Submit, and the builder's step 3 asserts the hand-off returns after Submit. So this is not a finding against this PR. | The tech lead decides whether to add a follow-up row, for example "Next: fix <problem> on <combination>" and "Next: the Content reviewer signs" ahead of the Approver hand-off. |
| m4 | Note | working tree | The checks write their screenshots into tracked folders. While I worked, another process on this checkout (a suite run; I saw an isolated copy on :15438) rewrote 127 tracked evidence files in other screens' folders. I reverted nothing, because that run is still active. | The builder commits only its own screenshots. |

## D1–D20 (1–5; this row only)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 5 | The row's Expected is met in each state named in it (above). |
| D2 Data integrity | 5 | The page writes nothing new. Submit stays the tab's server call (`need author`). |
| D3–D4, D6, D7, D18 | N/A | No content, rules, freshness, AI or sources are touched. |
| D5 Stability and recovery | 5 | Reload, Back and the return cycle all redraw from `/draft`. Changed-after-submit brings the step back. |
| D8 Orientation | 4 | The page path is unchanged. The step's name is ambiguous for a leaf like "Outside Canada" (m2). |
| D9 Flow | 5 | One next step per person. The hand-off waits until the Submit is done. |
| D10 Language | 4 | Plain words. See m2 for the leaf label and the "not submitted" count. |
| D11 Feedback and state | 5 | Each row still says why it is held back. The step goes away once the change is submitted. |
| D12 Visual quality | 5 | Same panel as HandOff (`rounded-xl border bg-surface-raised`). One filled button. |
| D13 Accessibility | 5 | axe 0. Fits 375 to 1440 px and 200 % zoom. It is a real link, reached by keyboard, Enter works, focus is visible. |
| D14 Team look | 5 | Shared `Button` and `Link`. No new tokens. |
| D15 Speed | 5 | About 1.0 s to idle. Uses the existing `/draft`; no per-row request. |
| D16 Testability | 4 | The new check fails without the rule. The returned path is not checked (m1). |
| D17, D20 | simulated only | No intended user walked it. |
| D19 Closure | 5 | Release page → Submit → review tab → back to the hand-off, all in the UI. |

**BIC-01–BIC-20 (EXPERIENCE §6): N/A.** This is a Studio configuration page. §6 covers case-side screens, and no concept for this page opts in.

**[M] lines touched:** EXPERIENCE §1 "one primary action per area" **met**. §2.5 "one next action" **met** for the row's state (m3 is outside it). §2.12 accessible **met**. §4 states (empty, nothing ready, normal, long) **met**. §5 copy **met** (no IDs or decision numbers on the page). STANDARDS §9 "no request per row" **met**.

## Journey test (reviewer, the one score for this check)
**Journeys:**
- J1 (main path) the author releases their own change → Submit first;
- J2 two unsubmitted;
- J3 returned → submit again;
- J4 changed after submit;
- J5 wrong role (Content reviewer: no Submit);
- J6 Approver (one filled Release);
- J7 a row held for a problem;
- J8 the step across the screen boundary (step → review tab → Submit → back to /release).

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2, J3 and J8 were completed through the UI only. |
| Next step obvious | ½ | Obvious in every Submit state. In J7 and E4 the author still gets "Hand to the Approver" (m3). |
| Plain words | ½ | "Submit Outside Canada for review" is ambiguous. Returned rows are counted as "not submitted" (m2). |
| Feedback and state | 1 | Per-row reasons. The step appears and disappears with the state. |
| Correct data | 1 | `/draft` reasons before and after each Submit and Return were exactly as expected. No extra writes. |
| Error recovery | 1 | After Return, and after a change following Submit, the step comes back. Reload is safe. |
| Accessibility and screen sizes | 1 | axe 0. No sideways scroll at 375, 512, 1024 or 1440 px. Keyboard path works. |
| Speed | 1 | About 1.0 s to idle. |
| Visual quality | 1 | One filled button in every state. Matches the hand-off panel. |
| Trust and sources | 1 | "Demo release" and "Simulated" labels are intact. No AI on this page. |
| **Total** | **9 / 10** | Pass (8 or more, no criterion at 0). To raise it: m2 (plain words), then a follow-up row for m3 (next step obvious). |

**Not checked:** a real screen reader; an intended user's unaided walk (D17, D20 stay with the founder); two tabs submitting at once (the Submit is the existing tab's, unchanged here); the check run on main (inferred from the code, as above). At the caller's instruction, the journey test is in this file rather than a separate `journey-test-*.md`.

Verdict: Approve. Blockers: none. Majors: none. Minors: m1 (add a returned-to-author step to `check_qa421`), m2 (an unambiguous combination name in the step; "waiting for your Submit"), m3 (a follow-up row for the tech lead, outside this row), m4 (note only).

## Re-review at 7549aa6 (diff `cfd11fb..7549aa6`, PNGs excluded; my own copy on :4476, started and stopped in the same command)
* **m1 closed.** New step 4b: the Content reviewer returns the Visitor visa (via `/signoff`, `action:"returned"`). Its setup line pins the sentence `/^Returned to the author/`, so all three `gateOf` sentences the regex depends on are now pinned. Then, at 1440 px, the author sees "Submit Visitor visa for review →" and no hand-off. `check_qa421` passed **18/18, twice**.
* **m2 closed.** I walked it at 1440, 512 and 375 px with two unsubmitted combinations. The sentence now reads "Next: submit **Visitors › Visitor visa** for review (and 1 more to submit)". axe found 0 violations, nothing scrolls sideways, there were no page errors, and the Submit link is still the only filled button. The button keeps the short name ("Submit Visitor visa for review →", as the row asks). The full path sits beside it in the same panel, so the link's purpose is clear in context (WCAG 2.4.4).
* m3 now sits with the tech lead as a follow-up row. m4 is resolved: the extra files were the builder's own suite run, and the builder reverted them. My runs left the working tree clean.

Verdict: Approve (at 7549aa6). Blockers: none. Majors: none. Minors: none open (m3 is a follow-up row for the tech lead).
