# /qa after-merge — main dccd87e (PR #66: Program structure round 3, shared lifecycle pattern, Immigration programs filter bar), 28 Oct

Independent qa lane, own copies (:4471, :4472, :4473, :4476; databases `xr_studio_qa_*`), shared demo :4400 read only. Desktop only (1440 and 1024 px, P-128). AI US$0. Screenshots: `reports/2026-10-28-after-merge-r3/`.

## Verdict
**Ready, with one Major to fix next (QA-60).** Round 3 does what P-128 and the amended P-116 say: the numbered outline, Tree and List, the filter bar on both pages, one Add, Edit and one written action on every row, exact branch delete, own drafts deleted at once with Undo, sample names to the second person, and a Live combination retired and restored from its row. No Blocker or Critical. The one Major is a regression: QA-44 (typing lost while a name saves) is back in the new Add pop-up, and the cut name gets saved.

## What was tested
* **Headed walk** in the browser pane at 1440 px as the configuration author: the outline, the Add pop-up typed by keyboard (this found QA-56), the greyed reasons, the List on the shared demo :4400 (read only).
* **Replayed headless, twice** (`check_qa_am_r3_1028.cjs`): **59/69 both runs**, the same 10 fails, each one an open finding (QA-48, QA-55 to QA-59).
* **Earlier checks moved to round 3:**
  * `check_qa_am_1027.cjs`: Part A is rewritten to build the structure through the one Add pop-up. Part B now retires and restores the Live combination from its Program structure row. Result **51/55**; the fails are QA-60, QA-47, QA-38 and QA-40.
  * `check_qa_am_fix_1027.cjs`: the QA-51/52 name is now marked as another author's, because an own draft now deletes at once. Result **13/14**; the one fail is QA-53.
  * The screens lane's Remove → Delete edits were re-read. They change wording only, and no step was weakened.
* **What the checks covered:**
  * **Outline:** 36 rows = 36 names; numbers 1 / 1.1 / 1.1.1 / 1.2.1.1 with the tooltip "Not an IRCC code".
  * **Rows:** every row shows Edit plus one of Delete / Retire / Restore / Withdraw; every greyed action (12) has its reason as visible text; no rule codes.
  * **Filters:** Pathway chip in the address and kept on reload; Status Live keeps only the LMIA line and its trail; Find "lmia"; Clear all.
  * **List and views:** the List shows 21 lines = 21 combinations, each with the trail "Retail › … › No sub-category"; A to Z sorting. The List view is remembered for user-A, and user-C keeps Tree.
  * **Add:**
    * The pop-up opens prefilled from the Pathway and Program filters, with focus on Category.
    * It recognises "visitor-VISA" as the existing name, and "Visiter visa" asks "Did you mean".
    * It refuses a 300-character name in plain words (400, "under 120 characters").
    * It stores a non-English name exactly as typed.
    * "You are adding" shows the whole line and "2 new names"; only those 2 rows are written, and no setup starts.
  * **Lifecycle:**
    * **Own drafts:** the author's own draft shows its impact list with no reason box and is deleted at once; the page says what was deleted; Undo brings it back; a second Undo is refused (409, plain words).
    * **Sample names:** a name added by Load sample asks for a reason and waits for the second person; the asker gets 403 on their own approval; Withdraw works from the row.
    * **Branch delete:** it lists 2.3.1 and 2.3.2. When a name is added after the proposal, the approval page says "Changed since it was proposed: "Replacement card" was added under it" before the click, and the server refuses with 409 without deleting anything. Proposed again and approved, all 3 names go together.
    * **Live combination:** Retire on With an LMIA says the combination goes with it, on both the panel and the approval page. The name and the combination retire at the release. The retired row is hidden until Show retired, then shows "—" and Restore. Restore with one approval and the release brings both back.
  * **Roles:** the approver cannot Add and sees View; the server refuses the approver's add and delete with 403.
  * **Keyboard:** one Tab stop per row, ↓ and End move between rows, Enter opens Edit.
  * **1024 px:** Edit and the action stay written, with no sideways scroll.
  * **Immigration programs (round 3):**
    * Filter bar instead of cards; axe clean at 1440 and 1024 px.
    * Add combination opens the pop-up in place, prefilled with the Pathway.
    * The new card shows "Just added" and Not started, and the page note says so.
    * A Live filter that would hide the new card is cleared.
    * The approver's Add combination is disabled.

## Bugs (open after this run: 0 Blocker · 0 Critical · 2 Major · 10 Minor)
* **New QA-60 (Major, screens):** the first letters typed right after "Add and add another" are lost while the add saves. Three runs gave "rist…", "ourist…" and "urist…" for "Tourist visa (to remove)", and Add then saves the cut name. QA-44 is back in the new pop-up.
* **New Minors (screens):**
  * **QA-55:** a released Program's "Can't retire yet" calls 8 unused, never-released names "still in use" and says "Retire those first", but those rows can only be deleted.
  * **QA-56:** Enter on a newly typed name does nothing (focus stays, and the next name gets typed onto it). The "Add “…” New" option cannot be reached with ↓.
  * **QA-57:** the count on the selected type tab is 4.37:1 contrast (needs 4.5:1) on every Program structure state.
  * **QA-58:** after an own-draft delete, Undo exists only in a 10-second toast.
  * **QA-59:** a returned deletion still says "Deletion waiting" on its row, with no note; proposing again answers 409 until the author withdraws it.
* **QA-48:** the main facet is fixed (Retire and Restore from the row). It stays open as a **Minor**: Immigration programs has no Retired status or note.
* **Closed after retest:** QA-51, QA-52, QA-54 (`qa/BUGS-CLOSED.md`).
* **Re-seen and still open:** QA-38 (Major, runtime), QA-40 and QA-47 (runtime), QA-53 (forms, after S4), QA-39 (Screen 04).

## Suites and coverage
* **CI on the Lead PR #66:** `run-suites.sh --demo` passed **42 of 42** (job 122683816307) on refs/pull/66/merge. Its tree equals main dccd87e (empty diff), so this is the exact code.
* **Mac, under coverage:** COVERAGE_LINE
* No app code changed in this lane.

## Graph (P-86)
G1 0 · G2 0 · G3 1 · G4 0 · G5 0 · G6 0. G3 is `GET /attachments/:id/file`, which is unchanged since the last report: no page uses it. `decision-impact.sh`: P-128 maps to C11.3, C11.10 and C11.17; P-116 maps to C11.9. No decision is without a capability row.

## Journey scores (qa, on main)
| Criterion | Program structure (author, 1440/1024) | Immigration programs (author) |
|---|---|---|
| Task completed | 1 | 1 |
| Next step obvious | 1 | 1 |
| Plain words | ½: QA-55, QA-59 | 1 |
| Feedback and state | ½: QA-59, QA-58 | ½: retired combination invisible (QA-48) |
| Correct data | ½: QA-60 saves a cut name | 1 |
| Error recovery | ½: QA-58 (Undo 10 s), a returned delete needs a Withdraw first | 1 |
| Accessibility and sizes | ½: QA-57 contrast, QA-56 keyboard | 1: axe clean 1440/1024, keyboard |
| Speed | ½: not timed against STANDARDS §9 this run (pages drew within the checks' waits) | ½: same |
| Visual quality | 1 (`r3-tree-1440.png`, `r3-list-1440.png`) | 1 (`r3-programs-just-added.png`) |
| Trust and sources | 1: Sample labels, "AI meaning check is off" said | 1 |
| **Score** | **7/10, below 8** | **9/10, pass** |

**To raise Program structure to 8+, in order:**
1. Fix QA-60, which gives correct data.
2. Fix QA-56 and QA-57, which cover accessibility.
3. Word the retire reason (QA-55) and show "Returned" on the row (QA-59).

D17 and D20 stay with the founder.

## Could not test
* A real screen reader.
* Speed timings against §9 (load was shared with the coverage run).
* Corporate tab Add and branch delete in depth: Retail only, and the chips were checked on both pages.
* `check_qa_am_s2_1027.cjs` still drives the round 2 Immigration programs page (Pathway cards). It was not moved in this run because the Lead asked only for `check_qa_am_1027.cjs`; the round 3 page is covered by `check_qa_am_r3_1028.cjs`.

## Questions for the Lead
1. QA-55: should "Can't retire yet" name only the released names (the ones to retire) and count the others as "to delete"? Or should a never-released name under a released parent be retirable?
2. QA-59: is a returned change meant to block a new proposal until it is withdrawn? If yes, the row should say "Returned: <note>" with Withdraw.

## Suggestions
* *Needed for the proof · Capability:* keep Undo for an own-draft delete on the page note until the next action (QA-58).
* *Later · Scaffolding:* move `check_qa_am_s2_1027.cjs` to round 3 (chips in place of cards) at the next after-merge.
* *Later · Scaffolding:* the two pages name the Status parameter differently (`s` on Program structure, `f` on Immigration programs). Shared links would be easier to build if both used one name.
