# Journey test: C5.5 firm release gates (reviewer, 3 Nov 2026, commit 5bef555d)

**Setup.** The reviewer role, in a fresh context. Isolated copy `rv_j` on :4441, live AI off, no priced button clicked.
- The suites' fixture was loaded while the copy was the demo workspace. The copy was then switched to `firm` (the same database) and restarted with `STUDIO_WORKSPACE_KEY=firm`.
- Next, `setup_visitor_visa.ts` configured the Visitor visa. Its own release step is refused in firm, as intended.
- Playwright (Chromium) was used, reading only what is on screen, plus API and SQL reads underneath.
- Screenshots are in the reviewer's scratchpad, `shots/01–11`. They are not committed: this role writes only the review and this report.

## Journeys
1. **Author, main path (firm):** open the Visitor visa › Review and release and find out why it cannot be released.
   - Expected: each Sample item is named and Submit is blocked.
   - Seen: "Visitor visa is a Sample combination … A real release needs a source-backed combination". Each of the two Sample checks is listed by its words. Submit is disabled with the tooltip "Fix the problems first". The answer-key block says "A real release needs…".
   - **But** "Demo release" sits beside Approve and release (shots 02 and 09). See MJ1.
2. **Author, error (API):** Submit returns 400 with the count sentence "3 items are Sample content, which releases only in the demo workspace…". Every item is in errors[] (firm suite step, re-run 21/21).
3. **Approver, Release page (firm):** the Visitor visa row is held. The reason shows the first error, here the IMM 5257 answer-key line, and no Demo mark (shot 11).
4. **Wrong place, demo control in firm:**
   - Demo › Reset to the six, typing RESET: the dialog shows "This demo control works only in the demo workspace." (shot 06).
   - Rows before and after are equal: 51/6/1/1 in the firm suite.
   - The menu still offers Load sample, Reset to the six and Start With an LMIA (shot 04), and the header says "Prototype · demo workspace" (m4).
5. **Recovery:** can the author make the release real from the screens? **No.**
   - No screen edits a check's source quote or a combination's basis.
   - The new lines have no Fix link.
   - The suite replaces the content through SQL (scaffolding, P-33). See m2: a dead end in firm, which concept §6b makes scaffolding.
6. **Approver, after a release (firm, suite):** History reads "1 real release · 0 demo releases" (shot 08). `/releases` and the combination page say `demo:false`, including a release whose snapshot froze Sample content before this gate existed.
7. **Across the boundary, demo workspace unchanged:** the G2 demo suite passes 74/74, and the G1 suite (demo, then firm, then demo) passes 55/55. Load sample in demo still answers 201.

## Data underneath
- The 409s write nothing (counts compared).
- The firm release is created once, and its snapshot holds no illustrative check (SQL in the suite).
- The refusal's errors[] carry `gate: "sample-content"` and the item key. `label` moves into `message`, and no page reads it.

## Break-it (15 min)
- Removing the guard in `load` or `resetToSix` makes the M1 fail step fail, and removing the `problems()` line makes the M2 steps fail. Both proven by reading the steps; neither mutation was run.
- Removing the `programs.ts:204` line fails nothing (m3).
- Plain `POST /demo/reset` and `POST /demo/forms-story` have no firm guard: read in code, not run (m1).
- Overflow: 0 px sideways scroll at 400 and 1024 px.
- axe (WCAG 2.2 A/AA) on Review in firm: 0 violations.
- Console: one expected 409 resource error from the refused reset.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Refused and named, as the Done-when asks; "once replaced it releases" works only through SQL (journey 5) |
| Next step obvious | ½ | The words say what is needed; no link and no screen to do it (m2) |
| Plain words | ½ | Plain count sentence; "source-backed" jargon (m5); "demo workspace" header in firm (m4) |
| Feedback and state | ½ | Submit disabled with the reason, and the 409 is shown in the dialog; the "Demo release" pill contradicts the refusal (MJ1) |
| Correct data | 1 | Nothing written on 409; real release labelled real; History counts right |
| Error recovery | ½ | The refused reset is harmless; there is no way out of the Sample state on screen |
| Accessibility and screen sizes | 1 | axe 0; 400 and 1024 px without sideways scroll |
| Speed | 1 | Review 0.78 s; no request added per row |
| Visual quality | 1 | Lines sit in the existing Validation list and look like the rest |
| Trust and sources | ½ | Sample marked per item; the pill misstates the kind of release (MJ1) |
| **Total** | **7/10** | Below 8 |

**Fixes that raise it, most valuable first:**
1. MJ1: the pill reads `answer_keys.demo`. This fixes feedback and trust.
2. m4: disable the Demo menu items in firm and say why, and stop the header saying "demo workspace". This fixes plain words.
3. m5: plain words instead of "source-backed".
4. m2: a decision on a source-backed path in firm (tech lead). This fixes task, next step and recovery.

**Not tested:**
- A real screen reader, 200 % zoom, and an intended user's unaided walk (D17 and D20 stay with the founder).
- A keyboard-only path to Approve: the button was disabled in this state.
