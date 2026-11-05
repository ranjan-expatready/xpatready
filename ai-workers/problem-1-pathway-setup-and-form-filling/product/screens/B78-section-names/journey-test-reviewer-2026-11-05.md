# Journey test: B78 section names (reviewer, 5 Nov 2026)

Commit: my load ran on 91a53ae75, on an isolated copy on :4416. The merged head is b17da354b, which adds #1009 and changes no placement code. Live AI off, US$0, no priced button. The copies were stopped on the tech lead's load rule; no second load finished.

**Method limits:** headless Playwright, not a visible browser, at load 21–35. No keyboard-only walk, no replay twice and no break-it pass on this change. The row is a loader and data change, so the journeys are mainly about what the loaded data shows a person.

## Journeys
| # | Persona, goal | Steps | Expected | Result |
|---|---|---|---|---|
| 1 | Author: load the checkpoint, row 7 done | Demo load | Row 7 done, 29 named | **On GitHub, yes**: C10.1's non-done list has no row 7 and `check_qa144_vv_release.ts` passes 33/33. On my copy partial from a host database error, reported honestly |
| 2 | Author: nothing waits for a name | `/review`, `/review/proposals` | No "Unnamed section" | Held. 14 items need the author, none for a section name |
| 3 | Author: see the names | `/library/sections` | 45 sections, the 29's names, real names only | Held on names: 45 of 45, none a placeholder |
| 4 | Author: named section has its questions | Sections table | "Coming into Canada" holds its facts | **Failed.** All 15 new sections: 0 questions, amber "No source recorded", used by none |
| 5 | Client, across the boundary: asked in the right place | `section_question` (no case walked) | Questions under the named section | **Failed.** 26 facts elsewhere: employment history under "Details of intended work in Canada", phone under "National identity document" |
| 6 | Second person: approves, not the author | Database | Decided by user-B, none by the author | Held |
| 7 | Error: a section with no entry | `check_b78_section_names.ts` | Stays waiting and listed | Held, 9/9 lines |
| 8 | Error: bad names file | Same check | Placeholder, empty, unmarked or repeated name refused | Held |
| 9 | Recovery: a failed placement | Same step asked again on my own copy | Placed, nothing refused | Held: `person.uscis_number` went in "US PR card" |

## Data underneath
- 70 section proposals: 41 accepted, 15 edited, 14 rejected, 0 waiting.
- No `logical_section` is titled "Unnamed section".
- Each edited row's reason carries its quote and page, or "Sample, Unconfirmed: expert"; the audit line repeats it.
- The 14 rejected rows keep their placeholder label and no given name.
- Library changes: 213 APPROVED, 211 RELEASED, none waiting.

## Accessibility and sizes
Sections page: axe WCAG 2.2 AA no violations; no sideways scroll at 400, 1024 or 1440 px; no page errors in the walk. Team look unchanged at 1024 px.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Row 7 done on GitHub; names do not reach the questionnaire |
| Next step obvious | ½ | Nothing waits, but 15 sections show 0 questions and no step |
| Plain words | ½ | Row 7's "29 of them", "(Sample)" over 4 unconfirmed names; one fragment name |
| Feedback and state | ½ | Row reports a failure honestly; Sections says "waiting" on approved items (pre-existing) |
| Correct data | ½ | Exact records; 26 facts in another section; 2 wrong pages |
| Error recovery | 1 | No entry stays waiting; a retry places the missing fact |
| Accessibility and screen sizes | ½ | axe and widths clean; keyboard not walked |
| Speed | ½ | Not fairly measurable: Sections took 20–48 s at load 21–35 |
| Visual quality | 1 | Same components and tokens; no new visual |
| Trust and sources | ½ | Reason has quote and page; the row says "No source recorded" and "AI-proposed" |

**Score: 6.5 / 10. Below the pass of 8 (no criterion at 0).**

## Fixes that raise it, most valuable first
1. Placement reads named sections and held twins (review M1): raises task, next step, correct data and trust.
2. Row 7's two counts and two marks (m2), and the two pages (m1).
3. A re-run on a quieter machine with a keyboard pass, for speed and accessibility.

## Could not test
A real screen reader, an intended user's unaided walk (D17 and D20 stay with the founder), a client's own questionnaire screen, 200 % zoom, and break-it cases on the naming box, which B78 does not change.

---

# Round 3: commit 9590c86fa

**Method limits:** no walk by me. Judged from the builder's 1440 px images in `walk/` and GitHub run 41976726207, on the tech lead's load rule. No break-it pass.

| # | Journey | Result |
|---|---|---|
| 1 | Author: load the checkpoint, row 7 done | **Held** on GitHub: nightly 41976732979's non-done list has no row 7 |
| 2 | Author: name a section what the library holds | **Held:** walk images 5 and 6, browser check 14/14 on GitHub |
| 4 | Author: a named section has its questions | **Held:** image 1 (Contact information 10, Employment 13), image 3 (Coming into Canada, 6 questions). 7 named sections still hold none, with no next step |
| 5 | Across the boundary: asked in the right place | **Held for the four pinned facts:** `check_qa144_vv_release.ts` 34/34. Image 4 shows a Worker a study heading (review, finding b) |
| 10 | Case officer: open a case on the Study permit | **Failed:** `check_b52_own_yes_no.ts:152`, review M3 |

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Names reach the questionnaire; no case opens on the Study permit (M3) |
| Next step obvious | ½ | 7 named sections show 0 questions and no step |
| Plain words | ½ | Round 1's wording fixed; a raw key in one toast, a fragment name, a study heading for a Worker |
| Feedback and state | ½ | A join is now told; "waiting" stays on approved items (pre-existing), the Notice stays generic (m11) |
| Correct data | 1 | Pages fixed; pinned facts in their sections on GitHub |
| Error recovery | 1 | No entry stays waiting; Undo of a join tested |
| Accessibility and screen sizes | ½ | axe on the panel; keyboard, 200 % and other widths not proved this round |
| Speed | ½ | Not measured this round |
| Visual quality | 1 | Same components in every image |
| Trust and sources | ½ | Source on each decision; the row still says "No source recorded" and "AI-proposed" |

**Score: 6.5 / 10. Below the pass of 8 (no criterion at 0).** It reads 7 once M3 is fixed. Next most valuable after that: say why a named section holds no question, then the row's source and origin words, then a keyboard and speed walk.

**Could not test:** a real screen reader, an intended user's unaided walk (D17, D20), a client's own questionnaire screen, and the Study permit in a browser.

---

# Round 4: commit af40bed8a

**Method limits:** no walk by me. Judged from `walk/` and GitHub runs 41987692692 and 41987757985. Images 7 and 9 came from a reverted rule, so they do not count here. No break-it pass.

| # | Journey | Result |
|---|---|---|
| 1 | Author: load the checkpoint, row 7 done | **Held** on GitHub: nightly's non-done list has no row 7 |
| 2 | Author: name a section what the library holds, by keyboard in the panel | **Held:** browser check 15/15 on GitHub; the panel is opened by a click |
| 10 | Case officer: open a case on the Study permit | **Failed:** `check_b52_own_yes_no.ts:152`, review M3 |

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Names reach the questionnaire; no case opens on the Study permit (M3) |
| Next step obvious | ½ | 7 named sections show 0 questions and no step |
| Plain words | ½ | The join's words are right; a raw key in one toast, a fragment name, a study heading for a Worker |
| Feedback and state | ½ | A join is told; "waiting" stays on approved items (pre-existing); the step does not say it chose a section (m12) |
| Correct data | 1 | Pinned facts in their sections on GitHub |
| Error recovery | 1 | No entry stays waiting; Undo of a join tested |
| Accessibility and screen sizes | ½ | Keyboard inside the panel; 200 % on Sections only |
| Speed | ½ | Not measured this round |
| Visual quality | 1 | Same components in every image |
| Trust and sources | ½ | Source on each decision; the row still says "No source recorded" and "AI-proposed" |

**Score: 6.5 / 10. Below the pass of 8 (no criterion at 0).** It reads 7 once M3 is fixed.

**Could not test:** a real screen reader, an intended user's unaided walk (D17, D20), a client's own questionnaire screen at this commit, and the Study permit in a browser.

---

# Round 4, finished: commit 77af3c360

Same method and limits as the af40bed8a section. Journey 10 (case officer opens a case on the Study permit) still **fails**, now in words: 409, "No questions yet for Student" (`check_b52_own_yes_no.ts`, run 41991481778). Journeys 1 and 2 held. The criteria table is unchanged.

**Score: 6.5 / 10. Below the pass of 8 (no criterion at 0).** It reads 7 once M3 is fixed.
