# N8 (forms lane): F2 official-pages record and confirm, DV-d1-1, DV-d1-2: independent CHECK of the merge and Minor 3

Reviewer agent, 31 Oct. Commit **7bc2dc02** on `claude/forms-n8-devin-06zafk` (PR #122). Whole change `origin/main (73030d56)..7bc2dc02`; since the last review `073b6baa..7bc2dc02` (a merge of main with PR #112, and the confirm re-reading the locked row). The earlier CHECKs (0810c25e, 2c3ba2f8, 073b6baa) are in git history. Isolated copy `rvn8` on :4457 only, each start with its own empty ledger, stopped at the end. US$0: no AI, no live switch. Journey test: `journey-test-reviewer-2026-10-31-f2d.md`, **8.5 / 10**, the one score for this check.

Verdict: Approve

The merge broke nothing in N8, the F2 migration applies after main's, and the Minor 3 change does what it says. No Blocker or Major is open. Three Minor points (one new edge of the same race, one wrong refusal reason, one missing check) are not merge conditions.

Head note: the PR head is now `c71fd2e3`, a later merge of main that touches only lead and process files (`.claude/`, `.github/workflows/`, `product/*.md`, `tools/decision-impact.sh`) and no studio code. This Approve is for 7bc2dc02.

## Checks run (at 7bc2dc02)
* **Migrations:** fresh database, `prisma migrate deploy`. 36 migrations, with `20261031120000_f2_official_pages` applied last, after `20261030090000_w110_channels` and `20261030140000_w110_channel_guards`. `migrate status`: up to date.
* **Drift:** `migrate diff --from-config-datasource --to-schema` names nothing of N8's. `combination_official_pages` matches `OfficialPagesRecord` exactly. Its remaining output (an id default on `fact_source`, `form_edition_accept`, `person_role`, `validated_copy`, and `canonical_field_name`) comes from main, not this PR: N8's Prisma diff against main is only the new table and model.
* **Merge of shared files:** every N8 hunk is intact against main. That covers `demo.ts` (reset and inventory), `lifecycle.ts:457`, `main.ts` (controller and provider), `programs.ts` (reader), `engine/setup-checklist.ts` (REVIEWS) and `library-forms.tsx` (DV-d1-1 button, DV-d1-2 role).
* **Suites:**
  * `check_official_pages.ts` **42/42**.
  * `check_setup_checklist.ts` (fresh copy) **54/54**.
  * `check_forms_s4_library_browser.cjs` (fresh copy, web rebuilt at 7bc2dc02, re-run because main changed `library-forms.tsx`) **73/73**, which includes the DV-d1-1 and DV-d1-2 checks.
  * `tsc -p api` clean. `graph.mjs --check`: G1 0 · G2 0 · G3 2 (the old attachment routes, unchanged) · G4–G6 0.
* Files the suites rewrote (slice3 screenshots) and both files I mutated were put back with `git restore`. `git status` is clean apart from this review and the journey report.

## Minor 3 at 7bc2dc02
`api/src/official-pages.ts:67-69` now reads `retired_at` with `for update` inside the transaction, giving 404 on no row and 409 on retired. I tested it deterministically: psql holds the combination row lock, a confirm is sent, and psql retires or deletes the row before committing.

| Probe (psql holds the lock about 2 s) | 7bc2dc02 | Lock line only (073b6baa's code, mutated in) |
|---|---|---|
| Nothing changes | 201, waited 1.3 s, 1 row, 1 audit line | – |
| Retire lands while the confirm waits | **409** "… is retired …", 0 rows, 0 audit | 201, 1 row on a retired combination |
| Delete lands while the confirm waits | **404** "This combination no longer exists.", 0 rows, 0 audit | 201, 1 orphan row |

**The change is right** for the case it targets, and the throw inside `$transaction` rolls back cleanly. However, the suite still passes **42/42 with the change removed** (issue 3), and the reverse order is still open (issue 1).

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 5 | F2 record, tiers, refusals, DV-d1 fixes; unchanged by the merge |
| D2 Data integrity | 4 | Retire or delete during a confirm's wait is now honoured; the reverse order leaves an invisible orphan (issue 1) |
| D3 Reuse | 5 | One reader `officialPagesOf`, used by `programs.ts` after the merge |
| D4 Rule integrity | 5 | P-176 tiers hold; form pages never "sure"; expert hold intact (walk J5) |
| D5 Stability | 4 | No 5xx in any probe; race check still timing-based |
| D6 Freshness and governance | 5 | Reset inventory counts and clears the table; approved delete removes the record (normal order) |
| D7 AI trust | 5 | No AI on this path |
| D8 Orientation | 4 | Programs and Library unchanged after the merge |
| D9 Flow | 4 | Resume lands on Forms with a doable Next step; `?focus=pages:record` not read until slice C (PR question 1) |
| D10 Language | 4 | Refusals plain, but the approver is told the wrong reason (issue 2) |
| D11 Feedback | 3 | Step 1 done after an API confirm; no on-screen control until slice C (Not built here) |
| D12 Visual | 4 | No N8 web change since 0810c25e besides DV-d1; slice3 shots re-shot on the merge |
| D13 Accessibility | 4 | axe WCAG 2.2 A/AA clean: Programs author 1440 and 400, expert 1024; Library 1440; Used-by count opens the drawer by keyboard |
| D14 Team look | 4 | Unchanged components |
| D15 Speed | 4 | Programs 0.64–0.85 s warm; confirm under 1 s |
| D16 Testability | 3 | The Minor 3 change has no failing check when removed (issue 3); the race check is probabilistic |
| D17 First use | – | Simulated only |
| D18 Provenance | 5 | Who, tier, page, matches and what was replaced in the audit |
| D19 Capability closure | 3 | Step 1 closes only through the API until slice C |
| D20 Wow | – | Simulated only |

## Issues, ranked (none open at Blocker or Major)
1. **Should · Minor: when the confirm holds the lock first, an approved delete still leaves an orphan record.**
   * `api/src/lifecycle.ts:457-458` deletes the record *before* `combination.delete`.
   * If a confirm holds the row lock, the approve's `deleteMany` finds nothing, then waits on the row. The confirm commits its record, and the combination is deleted after it.
   * Reproduced: psql stood in for the confirm and inserted the record after the approve started. The approve answered 201, the combination count was 0 and 1 orphan record was left. The window is the confirm's few milliseconds. Nothing reads the row, and a reset clears it.
   * **Fix:** in `lifecycle.ts`, delete the record *after* `combination.delete` (under READ COMMITTED the later statement sees the committed row). I tried it: 0 orphans in the same probe. Then restore the file.
2. **Should · Minor: a wrong-role refusal names the wrong reason.**
   * `api/src/official-pages.ts:76`: the `item.matches === 1` branch runs for any refusal with one match, even when the page *is* the match.
   * The approver confirming the rules' own match on Work permit (family) is told "… this is another page: choosing a different page is the immigration expert's call." The page is the match, and the approver is not the author either.
   * The suite checks only the 403 status (`tests/check_official_pages.ts:58-61`).
   * **Fix:** take that branch only when `item.tier === "expert"`. A `confirm_pages` refusal then falls through to "The configuration author or the immigration expert confirms the official page." Assert the wording in the approver check.
3. **Should · Minor: no check fails when the Minor 3 change is removed.**
   * With lines 67-69 reverted to the bare lock, `check_official_pages` stays 42/42.
   * **Fix (test only):** add the deterministic probe used above. Hold `select … for update` on the combination from `psql` with `pg_sleep`, send the confirm, retire or delete in the held transaction, and assert 409 or 404 with 0 rows. The same harness covers issue 1, and can make the race check deterministic too (last review's issue 2).

Still open from the last review, unchanged and not merge conditions: the Lead's answer on Resume setup until slice C (PR question 1), and the timing-based race check (PR body line 41 now calls it a regression guard).

Watch point, not a finding: `sources` is still read before the lock (`official-pages.ts:57`). If a page is detached during the wait, the record is stored on that page, but `recordHolds` then counts it as none, so step 1 reads open (correct).

## Could not check
* An intended user's unaided walk (D17, D20) and a real screen reader.
* 200 % zoom on a step 1 control, because there is none until slice C.
* The real-confirm interleaving for issue 1 (psql stood in for the confirm's transaction).
* `check_screen01_*`: the counts are the builder's.
* CI on the PR.
* Commit `c71fd2e3`: the head moved after 7bc2dc02, with no studio code changed.
