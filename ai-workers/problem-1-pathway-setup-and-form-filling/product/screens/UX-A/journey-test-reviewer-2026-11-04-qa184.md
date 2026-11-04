# Journey test: QA-184, a Live combination reads as one state (reviewer, 4 Nov 2026)

Commit d58d9cc9d (branch claude/screens-live-state). Isolated copies on :4632 (main at debbf3fc8) and :4633 (head) from clean
worktrees; web rebuilt for each; US$0, no model call, no live switch. Browser: Playwright Chromium (headless, driven by menus
and links as a person; screenshots read by eye). Persona: configuration author (user-A) unless said.

## Journeys
1. **Main path (done-when).** Demo › Reset to the six (type RESET) › Demo › Start With an LMIA › lands on Review and release; then
   Overview, Immigration programs (Cards, List), GET /catalogue.
2. **Alternate: a draft change.** Same, then IMM 1295 removed in the draft (2 changes, 17 numbers without a source).
3. **Next step across the boundary.** From Overview follow "Fix 3 problems" and "Fix 14 problems", then Review and release.
4. **Not Live stays plain.** Visitor visa (In progress) on card and List.
5. **Keyboard and screen reader name.** Tab from the top of Immigration programs to the Live card.
6. **Widths.** 400, 1024, 1440 px on Programs and Overview.
7. **To review agrees.** To review row for With an LMIA after journey 2.
8. **Data underneath.** /catalogue `progress` for every row against its checklist (`setup.bar`, `next`, `current`).

## What held (head)
* J1: header "Live" and "Next step for the next release · Official pages"; strip "Live · Release 1 · Next release: 3 of 5 steps
  to do"; card "✓ Live · Next release: 3 of 5 steps to do" (Open, Needs you); List "Live · next release 3 to do"; /catalogue
  `{step 1, of 5, done [F,F,F,T,T], live, "✓ Live · Next release: 3 of 5 steps to do"}`. One count (3) and one five-step list
  everywhere. Main: strip "setup steps for the next release: 2 of 5 done", card "✓ Live" only, /catalogue "Step 2 of 4: Draft".
* J2: tabs Forms 97 to do · SQR 14 to do · Documents 3 to do · Review and release 17 to fix; Overview row 5 "2 changes since
  Release 1 · 17 problems block release"; Review page "2 draft changes; 17 problems to fix", "Numbers without a source (17)";
  strip and card "Next release: 5 of 5 steps to do"; /catalogue the same words, step 1, of 5.
* J4: "0 of 5 steps", no "Next release" (card, List, aria).
* J5: 45 Tabs reach the card; its name "…With an LMIA – inside Canada, ✓ Live · Next release: 3 of 5 steps to do, needs you".
* J6: no sideways scroll at 400 / 1024 / 1440 (scrollWidth = width); axe WCAG 2.2 A/AA clean on Overview and Programs.
* J7: To review "17 problems to fix before release of its next version", the same as the tab and the row.
* J8: every row's `progress.label` equals the card words; `of` 5 everywhere; step is the next item's step.
* No page or console errors. Start With an LMIA 0.5–1.7 s; Reset to the six 16–51 s (demo control, out of this row).

## Findings
* **Minor, visual (J6, 1440 px):** the List row's progress cell wraps "Live · next release 3 to do" onto four lines
  (`web/src/pages/programs.tsx:499`, narrow column); the row grows to about 90 px tall where the others are one line.
* **Minor, words:** List "next release 3 to do" names no unit ("3 steps to do"), against EXPERIENCE "numbers name their unit".
* **Minor, pre-existing (J3):** "Fix 3 problems" lands on Documents, whose notice says "Add the official source…" but the Add
  source button is only on Review and release. That tab now carries the 17, so a person can still find it.
* **Note (QA-129):** on journey 1 (0 draft changes) the Live card now says "Next release: 3 of 5 steps to do", from steps 1–3
  that are open while nothing is changed. That is the founder's open QA-129 question, now visible on Programs as well (it was on
  the strip and header since UX-A part 3). One function (`nextReleaseWords`) carries the answer when it comes.

## Score (QUALITY.md journey score)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1/J2: one state on header, strip, card, List, tabs, To review, /catalogue |
| Next step obvious | ½ | header and strip name Official pages; Fix-3 lands away from Add source (pre-existing) |
| Plain words | ½ | "Next release: 3 of 5 steps to do" clear; List "3 to do" has no unit |
| Feedback and state | 1 | Live first everywhere; 17 named on tab, row, page, To review |
| Correct data | 1 | /catalogue equals checklist for all rows; main reproduced 5/15 |
| Error recovery | ½ | reload and Back keep the derived state; no error path in this change, short break pass |
| Accessibility and sizes | 1 | axe clean; aria names carry the words; 400/1024/1440 no sideways scroll |
| Speed | 1 | pages under 1 s after load; Start 0.5–1.7 s |
| Visual quality | ½ | List row wraps to four lines at 1440 px |
| Trust and sources | 1 | Sample marks kept; source gate visible and counted |
| **Total** | **8 / 10** | **Pass** (8 or more, no 0) |

Raise it: give the List progress cell room or a shorter line with its unit; land "Fix N problems" for no-source items on
Review and release (or put Add source in the Documents/SQR notice).

Not tested: a real screen reader, an intended user's unaided walk (D17/D20 stay with the founder), 200 % zoom, two tabs at once,
the Retired and Not ready states in the browser (covered in code reading and by check_w1_s1s2_fix only).
