# Journey test (reviewer): N8 F2 second fix, commit 073b6baa, 31 Oct

Reviewer agent, CHECK on the second fix. This is the one journey score for this check. Isolated copy `rvn8` on :4457, with the sample loaded (reset + load), its own empty ledger, and stopped at the end. Chrome headless through Playwright, with axe WCAG 2.2 A/AA. US$0. The earlier reports (`-f2` on 0810c25e, `-f2b` on 2c3ba2f8) are kept as they were.

## Journeys
1. **Configuration author, main path:** "I want to see what my setup needs and carry on."
   * Immigration programs reached through the menu at 1440 px. "Needs you 0". Visitor visa and Super visa show Resume setup.
   * Resume setup on Visitor visa, by keyboard (Tab, Enter), lands on `/c/…/forms?focus=pages%3Arecord` in about 0.95 s.
   * The header's Next step reads "Add 1 form from the library", and that action is on the tab. Focus is on `<body>`.
   * **Held:** no dead end. **Open:** the `?focus=` step-1 target is not read until slice C (review issue 1).
2. **Immigration expert:** Programs at 1024 px. axe clean, no sideways scroll, no page errors. Resume opens the Overview, which reads "A configuration author does this step".
3. **Author confirms the rules' one match** (API; no screen until slice C).
   * Work permit's "forms and documents page" gives 201, `user-A|author`.
   * The reset inventory then shows "Official pages confirmed = 1".
4. **Author tries a single form's page** (the 2c3ba2f8 Major).
   * Attach IMM 5257's form page to Study permit: 0 matches.
   * The author's confirm returns 403, and nothing is stored (suite C11.10 re-review M1, API). The expert may still choose it.
5. **Author and expert at the same moment** (two tabs, two people).
   * 30 rounds, alternating which fires first: the expert's choice stays 30/30.
   * When the author arrives second, the answer is 403 "The immigration expert chose … only the immigration expert changes it".
6. **Wrong roles and bad input:** the suite's approver, case officer and client 403s, the 401, the retired 409 and the 400s in words all still pass (42/42).
7. **Screen boundary:** an approved delete of a never-released combination removes its record (suite m4). Detaching the confirmed page reopens step 1.

## Data underneath
* One row per combination: after 20 and 40 mixed parallel confirms, 1 row each time, the expert's.
* Audit: one line per real change. Repeats write none (20 parallel gave 7 lines for 10 accepted requests, where 3 were `again`).
* Roles are enforced on the server.

## Break-it pass
* **Burst:** 40 parallel confirms on one combination took 231 ms. No 5xx, no pool or transaction timeout.
* **Lock removed (mutation):** the expert's choice was lost in 2 of 30 rounds, and the suite's race check failed. With the lock: 0 of 30.
* **Form-page rule removed (mutation):** 3 suite checks fail.
* **Confirm against an approved delete:** 4 rounds of 6 confirms raced against the approve. No orphan was seen. By reading the code, the window still exists, because the locked select's result is unused (review issue 3, Minor).
* **Retire while a confirm waits:** the same window, not reproduced (Minor).

## Automated replay
* `check_official_pages` **42/42** (plus the two mutation runs). `check_setup_checklist` **54/54** on a fresh copy.
* My walk scripts (in `/tmp`, not kept): axe clean on Programs for the author at 1440, 1024 and 400 px and the expert at 1024. No sideways scroll, no console or page errors. Programs 0.65–0.9 s to network idle.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Confirm, choose and the expert hold work as the item scopes (endpoint). DV-d1 fixes unchanged |
| Next step obvious | ½ | Resume lands on Forms with a doable Next step, but the card's target (step 1) is not on that tab until slice C |
| Plain words | 1 | Every refusal gives one plain reason and no codes |
| Feedback and state | ½ | Step 1 shows done after the API confirm. No on-screen control until slice C |
| Correct data | 1 | Form pages are never "sure". The race is serialised. One row, audit in the same transaction |
| Error recovery | 1 | 400, 403 and 409 in words. Re-confirm is a no-op. Detaching reopens the step |
| Accessibility and sizes | 1 | axe clean. 400, 1024 and 1440 px with no sideways scroll. Keyboard Enter on Resume |
| Speed | 1 | Programs under 1 s. Confirm under 1 s even in a 40-way burst |
| Visual quality | 1 | No web change. Team look unchanged |
| Trust and sources | 1 | The audit names who, tier, page and what was replaced. "Sure" only for a package or forms-and-documents page |

**9 / 10, no 0: pass.** What would raise it: slice C's "Before forms" block and the `?focus=` landing (next step, feedback).

## Could not test
* An intended user's unaided walk (D17, D20 stay with the founder), and a real screen reader.
* The step 1 control itself, which is not built until slice C.
