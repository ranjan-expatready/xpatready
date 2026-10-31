# Journey test (reviewer): N8 F2 fix, commit 2c3ba2f8, 31 Oct

Reviewer agent, CHECK on the fix. This is the one journey score for this check. Isolated copies on :4457, each with the sample loaded (reset + load) and its own empty ledger. Chrome headless through Playwright, with axe WCAG 2.2 A/AA. US$0. The earlier test (`journey-test-reviewer-2026-10-31-f2.md`, on 0810c25e) is kept as it was.

## Journeys
1. **Configuration author, main path:** "I want to see what my setup needs and carry on."
   * Programs page as user-A at 1440 px. "Needs you 0". No card mark for step 1.
   * Resume setup on Visitor visa, by keyboard (focus, Enter), lands on `/c/…/forms?focus=pages%3Arecord`. The Forms tab shows forms work. There is nothing for step 1, and focus is on `<body>`.
   * **Held:** no dead Needs you. **Open:** Resume still targets step 1 (review issue 3).
2. **Immigration expert, main path:** same walk as user-C at 1024 px.
   * "Needs you 0", axe clean, no sideways scroll, no page errors.
   * The expert's button is Open everywhere (by design, P-180 Q1).
3. **Author confirms the rules' one match** (API: no screen until slice C).
   * 201, stored as `user-A|author|1|page`, and the audit line is correct.
   * Confirming again gives `again: true` and no second audit line.
4. **Expert overrides, author tries to undo** (error and wrong role).
   * The expert chooses the guide page. The audit says "It replaces … confirmed by user-A (author tier)".
   * The author then confirms the match: 403 "The immigration expert chose this combination's official page, so only the immigration expert changes it." The row stays `user-C|expert`.
5. **Wrong roles:**
   * Approver and case officer: 403 in plain words.
   * Client: 403 "Not for case people".
   * Nobody: 401.
   * Approver on a retired combination: 409 "Retired".
6. **Bad input:**
   * `[]` gives 400 "Send the page to confirm as { attachmentId }."
   * An unknown field, a foreign page or a PDF instructions file each give 400 in words.
7. **Recovery and the screen boundary:**
   * A second apply page attached reopens the author's "sure" record as the expert's choice (suite).
   * Detaching the page reopens step 1.
   * An approved delete of a combination removes its record (verified by hand: combination 0 rows, record 0 rows).

## Data underneath
* One row per combination, both in parallel and in sequence.
* Audit: one line per real change, and it names what it replaced.
* Roles are enforced on the server (403/401 above, nothing stored).

## Break-it pass
* **Major: a form page becomes the "sure" checklist page.**
  * Upload the official manifest's `web-pages/page-imm5257.html` to Study permit.
  * GET answers 1 match, "IMM5257 form page". The author's confirm returns 201 on the author tier, with the audit "the rules found exactly this page; … sure". Step 1 is done.
  * 10 of the 12 manifest `web-pages/` files are single-form pages (`engine/official-pages.ts:10`).
* **Minor: a race overwrites the expert's choice.**
  * Author confirm and expert choose in parallel, from no record, 12 rounds: both 201 in 11 rounds, and the author's write was last in 5. The expert's choice was lost silently (`api/src/official-pages.ts:62,75`).
* **Minor: the reset inventory under-counts.** It does not count `combination_official_pages` (`api/src/demo.ts:129`).
* **Held:**
  * 10 parallel identical first confirms gave 1 row and 1 audit line.
  * An old id after reset gives 404.
  * A long label is shown in the 409 text in quotes, with no layout effect (API only).

## Automated replay
* `check_official_pages` **37/37**, run twice (the second run on the mutation copy after restoring the code).
* `check_setup_checklist` **54/54**.
* `check_forms_s4_library_browser` **73/73**: axe and widths for the DV-d1 fixes.
* My walk script (`/tmp`, not kept): axe clean on Programs at 1440 and 1024, no sideways scroll, no page errors.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Confirm, choose and overwrite rules work as the item scopes (endpoint). DV-d1-1 and DV-d1-2 work on screen |
| Next step obvious | ½ | Resume setup lands on Forms for a step 1 that no screen offers. The header's Next step names something else |
| Plain words | 1 | Every refusal is one plain reason, with no decision codes |
| Feedback and state | ½ | Step 1 shows done after the API confirm. There is no on-screen feedback until slice C |
| Correct data | ½ | A form page is stored as the "sure" checklist page. A race loses the expert's choice |
| Error recovery | 1 | 400, 403 and 409 in words. Detaching reopens the step. Re-confirming is a no-op |
| Accessibility and sizes | 1 | axe clean. 1024 and 1440 px with no sideways scroll. Keyboard Enter on Resume |
| Speed | 1 | Programs about 0.65–1.0 s. Confirm under 1 s |
| Visual quality | 1 | Used-by count link style, team look unchanged |
| Trust and sources | ½ | The audit names who, tier and what was replaced. "Sure" is claimed for a page that is not an apply page |

**8 / 10, no 0: pass.** The fixes that would raise the score, most valuable first:
1. Count only package and forms-and-documents pages as apply pages (correct data, trust).
2. Make the write conditional on the held record (correct data).
3. Keep held-back items out of `next`, or have the Lead accept the gap until slice C (next step).

## Could not test
* An intended user's unaided walk (D17, D20 stay with the founder), and a real screen reader.
* The step 1 control itself, which is not built until slice C.
