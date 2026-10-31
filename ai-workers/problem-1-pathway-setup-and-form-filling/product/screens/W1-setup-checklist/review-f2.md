# N8 (forms lane): F2 official-pages record and confirm, DV-d1-1, DV-d1-2: independent re-review (CHECK on the second fix)

Reviewer agent, 31 Oct. Commit **073b6baa** on `claude/forms-n8-devin-06zafk` (PR #122, head 073b6baa), whole change `48c8fbef..073b6baa`, fix `2c3ba2f8..073b6baa`. The earlier CHECKs (0810c25e, 2c3ba2f8) are in git history: this file, `break-report-f2.md`, journeys `-f2` and `-f2b`. Isolated copy `rvn8` on :4457 only, each start with its own empty ledger, stopped at the end. US$0: no AI, no live switch, no priced button pressed. Journey test: `journey-test-reviewer-2026-10-31-f2c.md`, **9 / 10**, the one score for this check.

Verdict: Approve

The form-page Major is fixed, and so are the race, the reset inventory and the m4 check. A check fails when each of the two code fixes is removed. No Blocker or Major is open. Three Minor points remain, none of them a merge condition.

## Checks run
* `check_official_pages.ts` **42/42**. `check_setup_checklist.ts` (fresh copy) **54/54**. `tsc -p api` is clean. `graph.mjs --check`: G1 0 · G2 0 · G3 2 (the old attachment routes, unchanged) · G4–G6 0.
* **Mutation A** (the `for update` line removed, server restarted): the race check **fails** (7 of 8 rounds). My 30-round probe lost the expert's choice in 2 of 30.
* **Mutation B** (`&& !isFormPage(s)` removed): **3 checks fail**, the two unit checks and the API check (201 "sure" on IMM 5257's form page).
* Both files were restored. `git status` shows only the slice3 screenshots and `api-checks.json` you said to ignore.

## Each fix at 073b6baa
| 2c3ba2f8 finding | Holds? | Evidence |
|---|---|---|
| 1 Major: a single form's page counts as the apply page | **Yes** | `engine/official-pages.ts:14,22`. `isFormPage` matches all 10 "… form page" rows of `official-sources/ircc/manifest.json` by edition and by `page-imm*` file. The two apply pages ("Visitor visa application package, India", "Work permit outside: forms and documents page") still match. "Web page" kind only comes from manifest recognition (`api/src/sources.ts:36,116`), so no other upload path reaches the rule. A stored author record on a form page now stops holding by itself (`recordHolds`), so no back-fill is needed. Form pages stay choosable by the expert (`isPage`) |
| 2 Minor: race loses the expert's choice | **Yes** | `api/src/official-pages.ts:65-86`. Read, guard, upsert and audit run in one transaction after `select … for update` on the combination row. Under READ COMMITTED the second request re-reads the record after the wait, so an author arriving second gets the expert-hold 403. 30 alternating author and expert rounds: expert kept 30/30, no 5xx. A burst of 40 mixed confirms took 231 ms: 1 row, the expert's choice, no 5xx, no pool or transaction timeout |
| 4 Minor: reset inventory | **Yes** | `api/src/demo.ts:140`. After one confirm, `/api/demo/status` shows "Official pages confirmed = 1" |
| 5 Minor: m4 had no check | **Yes** | `tests/check_official_pages.ts:121-129`: confirm, propose delete, approve, then 0 combination rows and 0 record rows |
| Audit moved inside the transaction | No change in behaviour | `tx.auditEvent.create` writes the same fields as `Audit.log` (`core.ts:115`), including the 600-character cut. The audit line commits or rolls back with the record |

## Judgement on the two points answered in the PR
* **s1 ("the checklist page" is one official IRCC page; Document checklist PDFs are not step 1's): accepted.**
  * Condition 1 from the last review is met: the PR body at 073b6baa states it under "s1".
  * Condition 2 is met by the M1 fix: only a package or a forms-and-documents page, both of which carry the document checklist, can be confirmed "sure".
* **Resume setup still targets step 1 until slice C: acceptable as a Minor, not a Major.**
  * As the author, Resume setup on Visitor visa and Super visa lands on Forms with `?focus=pages%3Arecord`, which nothing reads. The header's Next step there is "Add 1 form from the library", which the author can do on that tab. It is a mismatch, not a dead end, and Needs you stays 0.
  * The precedent fix (point the step elsewhere, used for the people step) is not available, because no screen anywhere offers step 1 yet.
  * Leaving step 1 out of `next` would make Next step past an open step, which is less honest.
  * Slice C (`plan.md:10`) owns the "Before forms" block and the `?focus=` landing.
  * The Lead still has to answer PR question 1 (issue 1).

## Standards, the lines this fix touches
* [M] Optimistic concurrency (`STANDARDS.md:27`): **met in effect** for this record.
  * The higher tier always wins, and a replacement is audited with what it replaced.
  * A lower tier arriving second gets a 403 that says what changed.
  * Two experts at once: the later one replaces, and the audit names it. The PR body states this choice, and the last review offered it as acceptable.
* [M] Idempotent creates: 10 or 20 identical confirms give 1 row. A repeat returns `again: true` and writes no audit line.
* [M] Server authorisation, deny by default: unchanged. The 403, 401 and 409 checks still pass.

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 5 | F2 record, tiers, refusals and the DV-d1 fixes. s1 recorded. Apply page now means a page that carries the checklist |
| D2 Data integrity | 4 | Locked read-modify-write, one row, audit in the same transaction. The locked select's result is not checked (issue 3) |
| D3 Reuse | 5 | One reader `officialPagesOf`. `recordHolds` and `isApplyPage` are shared by the reader and the writer |
| D4 Rule integrity | 5 | P-176 holds one request at a time and under concurrency. Form pages are never "sure" |
| D5 Stability | 4 | 40-way burst: no 5xx and well under the 5 s transaction limit. The race check depends on timing (issue 2) |
| D6 Freshness and governance | 5 | The audit names what was replaced. The reset inventory counts the table. The approved delete removes the record |
| D7 AI trust | 5 | No AI on this path |
| D8 Orientation | 4 | Unchanged. Programs cards, chips and breadcrumbs are correct |
| D9 Flow | 4 | Resume setup lands on Forms, which has a doable Next step. Its step-1 target is not read until slice C (issue 1) |
| D10 Language | 5 | Refusals in plain words, no codes |
| D11 Feedback | 3 | Step 1 shows done after an API confirm. There is no on-screen control until slice C (Not built in this item) |
| D12 Visual | 4 | No web change since 2c3ba2f8. Programs page as before |
| D13 Accessibility | 4 | axe WCAG 2.2 A/AA clean on Programs (author 1440 and 1024, expert 1024, author 400). Keyboard Enter on Resume works. Focus lands on `<body>` |
| D14 Team look | 4 | Unchanged components |
| D15 Speed | 4 | Programs 0.65–0.9 s to network idle. Resume to Forms about 0.95 s. Confirm well under 1 s |
| D16 Testability | 4 | Each fix has a failing check (mutations A and B). The race check is probabilistic |
| D17 First use | – | Simulated only |
| D18 Provenance | 5 | Who, tier, page, matches and what was replaced. "Sure" is only claimed for a true apply page |
| D19 Capability closure | 3 | Step 1 closes only through the API until slice C. Needs you does not claim otherwise |
| D20 Wow | – | Simulated only |

## Issues, ranked (none open at Blocker or Major)
1. **Should · Minor (Lead): record the Resume setup answer.**
   * PR question 1 is still open. `engine/setup-checklist.ts:113-114,176` makes step 1 the `next` on 5 of 6 sample combinations, and `?focus=` is not read on the web.
   * **Fix:** the Lead accepts it until slice C in the PR or `plan.md`, as was done for the people step (`plan.md:68`). Slice C adds a check that Resume on step 1 lands on the "Before forms" block.
2. **Should · Minor: the race check may pass on broken code.**
   * `tests/check_official_pages.ts:113-120`. Without the lock it failed here (7/8), but the builder saw the old code pass 8/8.
   * **Fix (test only):** make it deterministic. Hold the combination row `for update` from a second session (`psql … begin; select … for update; select pg_sleep(1)`), fire the author's confirm while it is held, then the expert's, and assert the expert's row. Or record in the PR that it is a regression guard, not a proof (the PR already says so).
3. **Should · Minor: the locked select's result is not used.**
   * `api/src/official-pages.ts:57-59,66`. `retiredAt` and existence come from `load()` before the lock, so a retire or an approved delete that commits while a confirm waits lets the confirm write anyway.
   * The effect is a confirmation on a just-retired combination, or an invisible orphan row with no foreign key, which a reset clears. I did not reproduce it: 4 rounds of 6 confirms against the approve all completed before the delete.
   * **Fix:** `select retired_at from combination where id = $1::uuid for update`, then 404 on no row and 409 on retired, inside the transaction.

Watch point, not a finding: the form-page rule rests on the manifest's label wording ("… form page") and the `page-imm` file prefix (`engine/official-pages.ts:14`). It holds for all 12 current rows, but a new web-page row must follow the same wording.

## Could not check
* An intended user's unaided walk (D17, D20) and a real screen reader.
* 200 % zoom on a step 1 control, because there is none until slice C.
* `check_forms_s4_library_browser.cjs` was not re-run: there is no web change in `2c3ba2f8..073b6baa`, and it was 73/73 at 2c3ba2f8.
* `check_screen01_*`: the counts are the builder's.
