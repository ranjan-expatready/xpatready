# Journey test: QA-355 (C7.8), reviewer role, 9 Nov 2026

Copy: isolated `rev_q355` on :4462 with the configured checkpoint loaded, code at 3708f4f83; stopped and dropped afterwards. Setup was qa's `walk_c78_setup.mts`, which uses the API (not under test): one Visitor visa filing for Sample Client W at Ready · 100%. Walk: my own Playwright script (scratchpad `walk_rev.mjs`), run twice at 1440 px with checks at 1024, 400 and 512 px (200 % of 1024). Data was read underneath through `GET /runtime/cases/:id/forms`. US$0, no AI.

## Journeys (case officer unless named)
1. **Main path.** "I add the PR form this client also needs, and nothing else on the filing changes." Steps: Prepare application → "+ Add a form" (keyboard: Enter) → type "IMM" → choose the "Fills from the case" pick (IMM 0008) by typing it and pressing Enter → Tab to "Add to … filing" → Enter. Expected: IMM 0008 is listed and tagged, the release forms' lines stay the same, and Ready to file names only IMM 0008's own lines.
2. **Alternate.** "Undo it": Remove from this filing with a reason. Expected: the lines are back as they were.
3. **Recovery.** Reload after the add. Expected: the addition is still there.
4. **Error.** An added form whose own list rejects a shared answer. Not reachable on the checkpoint: the only forms addable as "fills" are IMM 0008 and IMM 5707, and neither has such a list. Covered by unit steps only.
5. **Wrong role and duplicates.** Covered by the C7.8 pack, which I re-ran (20/20): C7.8-12 gives 403/403/404 and C7.8-5 gives 409.
6. **Boundary.** Ready to file after the add. The next step (validate, sign) is the C7.6 and C8.1 hand-off.

## What held (both runs)
* The add worked by keyboard. Enter picked the form (`picked by Enter: true`) and the add took 0.84 s and 0.35 s. The toast "IMM 0008 added to Sample Client W's filing." appeared and there were no page errors.
* **Data underneath.** Before: IMM 5257 written 111 / to fix 0, IMM 5257 SCH1 11/0, IMM 5476 23/0, IMM 5645 25/0, all ready. After the add, the four lines were identical (`release lines unchanged by add: yes`). IMM 0008 (added) was written 46 / to fix 0. After removing it, the lines matched the before state exactly (`restored: yes`).
* **Ready to file after the add** (r1-ready-after-add-1440, r1-w1024): one block (IMM 0008 has no validated copy read back) and CRITICAL lines for IMM 0008's 76 mandatory fields, its signature, and the review being asked again. No fact line falls on a release form. qa's run before the fix showed 4 + 3 CRITICAL fact lines here. The approval was withdrawn on the add and was back after the remove.
* The IMM 0008 row reads "Every fact it reads is confirmed".
* Reload kept the addition.
* axe (WCAG 2.0/2.1/2.2 A/AA) found 0 violations before the add, in the panel and after the add.
* No sideways scroll: 1024/1024, 400/400 and 512/512.

## Break it (about 15 minutes)
* Added and removed twice on the same case: identical results each time.
* Added every form that fills (IMM 0008 and IMM 5707) and removed them (C7.8-19): release unchanged.
* Mutations (reported in review.md): removing the copy's `form` (forms.ts:62), or removing (b) from `shapeIn`, leaves the unit suite green. Minor test gaps m1 and m2. No Blocker or Major.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Add and remove by screens; release lines unchanged (API before/after/back) |
| Next step obvious | 1 | Ready to file names the 3 owners and their lines (r1-ready-after-add-1440) |
| Plain words | 1 | No "Choose one of: codes as listed in the inventory" anywhere |
| Feedback and state | 1 | Toast, "Approval withdrawn", Not ready 80 %, back to Approved on remove |
| Correct data | 1 | Identical release lines; IMM 0008 to fix 0 |
| Error recovery | ½ | Remove and reload recover. The added copy's own-list error path cannot be reached on screens and is not tested at copy level (m1) |
| Accessibility and screen sizes | 1 | axe 0 on 3 states, keyboard add, 1024/400/512 px with no sideways scroll |
| Speed | 1 | Page 1.4 s with the case's data; add under 1 s |
| Visual quality | 1 | Team look, one primary button per panel (screenshots at 1440 and 1024) |
| Trust and sources | ½ | "Added by the case officer" tag and Sample reasons. IRM 0002's sex-identifier note, which names F/M/X, now accepts free text (m3) |

**9/10, pass, no 0.** What would raise the two half scores: m1 (a copy-level unit step for an added form's own list), then m3 (record (b)'s release-side changes).

## Could not test
A real screen reader. An intended user's unaided walk (D17 and D20 stay with the founder). An added form with a real list that rejects a release answer, by screens (none can be added on the checkpoint). Screenshots are in the reviewer's scratchpad only (not committed); the builder's committed walk/01–08 show the same states.
