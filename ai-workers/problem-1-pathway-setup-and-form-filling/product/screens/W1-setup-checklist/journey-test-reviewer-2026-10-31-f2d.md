# Journey test (reviewer): N8 F2 after the merge of main and the Minor 3 change, commit 7bc2dc02, 31 Oct

Reviewer agent, CHECK of 7bc2dc02. This is the one journey score for this check. Isolated copy `rvn8` on :4457 (sample loaded through reset and load, its own empty ledger, web rebuilt at 7bc2dc02), stopped at the end. Chrome headless through Playwright, with axe WCAG 2.2 A/AA. Walk script in `/tmp/rvn8/walk.cjs` (not kept), run twice with the same results. US$0. The earlier reports (`-f2`, `-f2b`, `-f2c`) are kept as they were.

## Journeys
1. **Configuration author, main path:** "I want to see what my setup needs and carry on."
   * Immigration programs through the menu at 1440 px: "Needs you 0", and 4 cards show Resume setup.
   * Resume by keyboard (focus, Enter) lands on `/c/…/forms?focus=pages%3Arecord`. Focus is on a button.
   * The header reads "Next step: Add 1 form from the library", which is doable on that tab.
   * **Held:** no dead end. **Open:** step 1's `?focus=` is not read until slice C.
2. **Immigration expert:** Programs at 1024 px. axe 0, no sideways scroll.
3. **Author on a narrow screen:** Programs at 400 px. axe 0, no sideways scroll.
4. **Author confirms the rules' one match** (API: no screen until slice C).
   * 201 on the author tier.
   * A repeat gives 201 with `again: true` and no new audit line.
   * The checklist then reads step 1 "done · Confirmed by the configuration author · sure".
5. **Wrong roles and the expert hold:**
   * Approver: 403, but with the wrong reason ("this is another page", for the match itself; review issue 2).
   * Case officer and Client A: 403 "works on cases …".
   * The expert chooses another page: 201 on the expert tier. The author then retries the match: 403 "The immigration expert chose … only the immigration expert changes it".
   * 1 row (the expert's) and 2 audit lines.
6. **Bad input:**
   * Bad id: 400 "Choose one of this combination's pages."
   * Extra key: 400 "This confirmation carries a field the server does not know."
   * Unknown combination: 404 "This combination no longer exists."
7. **Shared library (DV-d1-1, DV-d1-2):** on Forms at 1440 px, the "N combinations" count is a button. Enter opens the drawer. axe 0. The library browser suite is 73/73 after the merge.
8. **Screen boundary (retire or delete while a confirm waits, Minor 3):**
   * With psql holding the row lock, retire gives 409 and delete gives 404. In both cases: 0 rows, 0 audit lines, and the confirm waited 1.3 s, then answered.

## Data underneath
* One row per combination. Values are as sent, with who, tier, page and matches. The audit names what was replaced.
* Roles are enforced on the server for the approver, the case officer and the client.
* After a refused confirm (retire or delete during the wait), nothing is written.

## Break-it pass
* **Minor 3 change removed (mutation):** retire or delete during the wait gives 201, a row on a retired combination or an orphan. The suite still passes 42/42, so no check guards the change (review issue 3).
* **Reverse order:** the confirm holds the lock and the approved delete arrives during it (psql playing the confirm). Result: 201 and 1 orphan record (review issue 1). With the record deleted after the combination row: 0 orphans.
* **Wrong role by API:** all refused, but the approver's reason is wrong (issue 2).

## Automated replay
* `check_official_pages` **42/42** (and 42/42 with the mutation, which is the gap).
* `check_setup_checklist` **54/54** on a fresh copy.
* `check_forms_s4_library_browser` **73/73** on a fresh copy.
* My walk: axe clean in every state. No console or page errors.
* Programs took 0.64–0.85 s warm (1.22 s on the first load after a restart).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Confirm, choose and the expert hold work as the item scopes (endpoint). DV-d1 fixes hold after the merge |
| Next step obvious | ½ | Resume lands on Forms with a doable Next step, but step 1's target is not on that tab until slice C |
| Plain words | ½ | Plain and code-free, but the approver is told "this is another page" for the match itself (issue 2) |
| Feedback and state | ½ | Step 1 shows done after the API confirm. No on-screen control until slice C |
| Correct data | 1 | One row. A retire or delete during the wait is honoured. The orphan in the reverse order is invisible (issue 1, Minor) |
| Error recovery | 1 | 400, 403, 404 and 409 in words. A re-confirm is a no-op |
| Accessibility and sizes | 1 | axe clean at 400, 1024 and 1440 px. Keyboard Enter on Resume and on the Used-by count |
| Speed | 1 | Programs under 1 s warm. Confirm under 1 s |
| Visual quality | 1 | Team look unchanged. Slice3 shots re-shot on the merge |
| Trust and sources | 1 | The audit names who, tier, page and what was replaced. "Sure" only for an apply page |

**8.5 / 10, no 0: pass.** What would raise it, most valuable first:
1. Fix the approver's refusal reason (plain words).
2. Slice C's "Before forms" block and the `?focus=` landing (next step, feedback).

## Could not test
* An intended user's unaided walk (D17 and D20 stay with the founder), and a real screen reader.
* The step 1 control itself, which is not built until slice C.
* 200 % zoom on that control.
