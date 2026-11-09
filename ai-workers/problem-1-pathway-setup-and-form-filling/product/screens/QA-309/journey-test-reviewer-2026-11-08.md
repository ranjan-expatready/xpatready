# QA-309 journey test, reviewer role (8 Nov 2026, IST)

Commit `7b3e7b39e` on `claude/magical-hypatia-4sksd7` (PR #1365, draft). An isolated copy `rv_q309` on :4438 (configured
checkpoint, then the finished story), stopped after the test. Live AI off, US$0. Scope: a runtime bug fix (C7.3 portal
answer sheet, C10.2 finished story). It is API-only: C7.3's sheet page (`/cases/:id/sheet/:itemId`, concept r2) is
not built, and no screen shows an Online item's state and reason yet. So the case officer's journeys go through the
API, and the browser walk covers the one screen this diff changes, the finished story dialog.

## Journeys (persona · goal · expected)
1. **Main, case officer:** "I typed everything into the portal and ticked every section; the form should read Done."
   Principal's Online IMM 5257, fillEverything, every section ticked → Done.
2. **Alternate, family:** principal and spouse. The spouse's facts on the principal's IMM 5257 block Done until they are confirmed.
3. **Empty:** before any answer the item names what waits (label and person), never "Every fact it reads is confirmed".
4. **Error, a value with a problem:** after Done, the spouse's family name answered at 200 characters (refused for the
   box). The section goes Out of date. After a re-tick it is To do, and the fact is in the section's `waiting` and named in the reason.
5. **Error, a case fact:** the visit contact name answered at 200 characters. Its "case" box waits and the item names it.
6. **Recovery:** "none apply" taken back on Education → To do, naming the group; given and confirmed again → Done
   again with nothing to re-tick (the version is unchanged).
7. **Relations:** an Online IMM 5645. Before the fill, `<id>/parent_1` and `parent_2` facts and the case's
   `case.application_type` wait. After the fill and the ticks, it reads Done.
8. **Across the boundary, founder (author):** Demo › Load the finished story… (keyboard), RESET, Load. The forms stage
   reports 3 Online IMM 5257 sheets with 27 sections ticked. It no longer carries the "QA-165 (1) … cannot read Done" words.
9. **Wrong role:** covered by C7.3-2 and C7.3-8 (a client gets 403 on the sheet and the tick). This diff does not change roles.

## What held (evidence; scratchpad `/tmp/claude-0/-home-user-xpatready/37584d57-c949-52fc-b2ab-1b4fc455b3e9/scratchpad/rv/`)
* J1, J3, J6: `tests/check_qa309_online_done.ts` 9/9 on my copy (`qa309-run1.txt`).
* J2, J4, J5: my probes `probe1.mts`, `probe2.mts` and `probe3.mts`. Readiness and the sheet agree on the spouse (subject id) and on
  the case (the "case" box maps to the case's subject). GET answer-sheet took 79 ms, with 72 answers on 9 sections.
* J7: `probe4.mts`. Relations wait by their own key. "Section C - brothers and sisters" (never asked, QA-153) shows 0
  answers and 0 waiting, and the item reads Done. That is the stated rule (d). Ready to file still names the empty boxes.
* J8: `walk.mts` with headless Chromium. The story loaded in 208 s. Axe on the result dialog found 0 WCAG 2.2 A/AA violations.
  There is no sideways scroll at 1024 px and no console errors. Screenshots are in `shots/01-confirm-1440.png`, `shots/02-result-1440.png`,
  `shots/03-result-1024.png` and `shots/04-family-case-1440.png`.
* Packs on my copy: C10.2 13/13, `tests/check_c102_finished_story_refusals.ts` 20/0, `tests/check_c73_parts_checkpoint.ts`
  6/6 and `tests/check_vv_answer_sheet.ts` 33/33 (`c102-and-refusals.txt`).

## Data underneath
* A tick still freezes `sectionHash(answers)`. `waits` never enters the fingerprint (unit check), and re-giving "none apply"
  needed no re-tick.
* The item (`build`) and the route (`sheet`, also used by `entered`) both use `formReadinessOf(…, cov).missing.filter(blocksLock)`
  on one coverage, so the two compute the same thing.

## Break-it findings
* **Minor:** a case fact with a problem is counted twice. The reason said "Waiting for 5 facts" for 4 distinct facts. The
  duplicate line is the formCoverage fix line, keyed `case|…`, and is labelled with the principal's name (`probe3.mts`). The root cause is
  `engine/runtime/forms.ts:212-219` and predates this PR, but `sheetWords` now shows it in words.
* **Observation:** in two states the item is To do while no section shows anything under `waiting`: a required fact
  declared but not confirmed (shown as an answer, `to_confirm`), and a fired check. The reason names the fact, so the
  officer can act. C7.3's BR-8 "n still to confirm" is meant to show it on the unbuilt page.

## Score (QUALITY.md "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 and J8: the Online IMM 5257 reads Done after every tick, for all 3 in the story |
| Next step obvious | ½ | The reason names the sections left to tick or the facts that wait. But no screen shows the item or the sheet yet (C7.3 page not built), so an officer finds it only through the API |
| Plain words | ½ | "Every answer is ready to enter in the portal; 1 of 9 sections still to tick …: Signature." is plain. The duplicated case fact and its wrong person are not |
| Feedback and state | 1 | To do → Done → To do (none apply taken back) → Done, each with its reason |
| Correct data | 1 | Ticks freeze the same version. Waiting follows readiness (spouse, case, relations) |
| Error recovery | 1 | J4 to J6: fix or re-give, re-tick, Done again |
| Accessibility and screen sizes | 1 | Story dialog: axe 0 at 1440 px, no sideways scroll at 1024 px, keyboard opens the menu, the dialog and the case link |
| Speed | 1 | GET answer-sheet 79 ms. Prepare reuses the cached coverage and readiness |
| Visual quality | 1 | Story dialog unchanged in look (screenshots) |
| Trust and sources | 1 | Sample marked. No AI call |

**9 / 10, pass** (8 or more, and no 0). The fixes that would raise it: dedupe the readiness lines in the reason (plain
words), and C7.3's sheet page with the item's state beside "Open answer sheet" (next step, already planned there).

Not tested: a real screen reader, an intended user's unaided walk (D17 and D20 stay with the founder), a fired
section check (none fires on this release's sample data), and the Mac's :4400 demo (never used).
