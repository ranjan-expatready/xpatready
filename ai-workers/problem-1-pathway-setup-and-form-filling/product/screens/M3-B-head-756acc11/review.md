# Review: head of #325 at 756acc11 (branch claude/serene-euler-vp7ar1)

Reviewer role, fresh agent; I built none of it. 1 Nov 2026, 18:23 to 18:45 UTC. I read through git (`git show`, `git diff`): no checkout, no push, US$0. Ports: 4473 only.

## Verdict per part
| Part | Range | Verdict |
|---|---|---|
| 1. C6.12 /filings (#283) + C6.4 checklist | approved at 9cf262bd | **Approve, carried.** Since 9cf262bd only Q2 (part 3) and one wording change (`filings.ts:62` "Not travelling (not applying on this case)", m4) touch these files. `check_vv_checklist` 60/60, `check_vv_filings` 37/37, `check_vv_checklist_api` 27/27 |
| 2. C6.12 /prepare + filing items (migration) | 761a5ef8..d66d9fdf | **Approve.** R2-M1 is fixed. B2–B5 are still open Minors (listed below) |
| 3. Shared holders fix (Q2) | d66d9fdf..92412a87 | **Block.** Round-1 Major 1 is fixed for a, h, g and the nobody words. It is still open for (i) |
| 4. Tech lead's main merge | 756acc11 | **Approve.** The `main.ts` module list is the exact union |

**Overall verdict for 756acc11: Block** (one Major is open: part 3, rule (i)).

## Runs (all at 756acc11)
* `check_line_holders.ts` 18/18 · `check_vv_prepare.ts` 15/15 · `check_vv_checklist.ts` 60/60.
* `count-any.mjs --against origin/main`: 428, the same as the base. No new `any`.
* **API checks: they could not run on the working tree, because the environment is stale (not a code defect).**
  * The shared tree's generated Prisma client (`studio/node_modules/.prisma/client`, generated 16:42) predates the C3.12 migration from main (`FormEdition.published`).
  * So `isolated.sh revhead 4473 start` served 756acc11 code against an old client. `setup_visitor_visa` failed at 4.2, and api.log shows `Unknown argument 'published'` at `api/src/intake.ts:357`.
  * The concurrent run-suites uses the same client and may fail the same way. Run `prisma generate` in the shared tree before trusting its API results.
* **API checks in a throwaway copy instead.**
  * The copy: `git archive 756acc11` under `/tmp/revhead756`, with its own `prisma generate` and the same DB name and port (`xr_studio_revhead`, :4473).
  * `check_vv_prepare_api` **34/34**, `check_vv_checklist_api` **27/27**.
  * I stopped the copy afterwards (`isolated.sh revhead 4473 stop`, and the /tmp server's listener).
* `tsc --noEmit -p api/tsconfig.json` in the copy: `api/src` and `engine` are clean. The tests have errors: 6× TS2783 in `tests/check_vv_checklist.ts:109` (new in this PR; see m1), plus `check_c18_age_case`, a baseline also on main.

## Part 2: /prepare (R2-M1)
* **No `this.db` or `this.r` call inside `$transaction`** (`api/src/case-prepare.ts:35-38`).
  * The callback uses only `tx.$executeRaw` (the advisory lock) and `this.rows(tx, ctx, true)`.
  * `rows` (`:58-108`) reads and writes only through its `q` parameter, typed `Tx = Pick<Db, "submissionGroup"|"filing"|"filingApplicant"|"filingItem">` (`:111`). `prepareView` is pure.
  * `reach`, `combination.findUnique`, `snapshotHash`, `state` and `acceptsOf(this.db)` all run before the transaction, in `context` (`:30,42-55`).
* **The fix holds under load, in my own probe beyond the suite.**
  * 30 new cases, two first reads each, all 60 sent at once: **60×200 in 2.9 s, exactly one group per case.** Before the fix, 10 such reads gave 500s.
  * The suite's own R2-M1 checks pass: 24 reads at once on one case, and 12 cases at once in 699 ms.
* **Under the lock the stored rows are read again (`rows(tx, …, true)`).** The people, answers and release come from `context`, read just before the lock. Round 1 m2 asked for the case to be reached again under the lock, and d66d9fdf deliberately undid that to fix R2-M1. The remaining window is small, and a racing PATCH is corrected on the next read (breaker round 2: 420 racing requests consistent). I accept it as a trade-off; it is not a finding.
* **The migration keeps data.** It only adds four tables and changes no existing table. It has unique keys and CHECKs, and states its rollback.
  * Its folder `20261102010000_c612_prepare_filings` sorts after main's newest (`20261101150000_c312_edition_published`).
  * `migrate deploy` ran clean on a fresh database.
* **Authorisation:** officer 200; client and author 403; no actor 401.
* **HEAD:** 405 `application/problem+json`.
* **Steady read:** 54 ms.
* **Still open: the breaker's round-2 Minors.** None of them blocks.
  * B2: `snapshotHash` on every read (`:45`).
  * B3: a snapshot with no `forms` gives 500 at `engine/snapshot.ts:65` instead of 409.
  * B4: `config_release` has no frozen trigger.
  * B5: the 405 has no `Allow: GET` header (checked with `curl -I`).

## Part 3: Q2, round-1 Major 1 re-checked by removing each rule (a mutation copy, `/tmp/mut756`)
| Rule removed | Mutation | Caught by |
|---|---|---|
| (a) DEPENDENT: the holder when a child | `render.ts:63` holder-role test → `false` | **FAIL** "Q2 (a)" |
| (h) any one subject is enough | `render.ts:74` `some` → `every` | **FAIL** "Q2 (h)" |
| (i) a case holder is decided on the principal's answers | `render.ts:63` `holder === "case" ? principal : holder` → `holder` | **nothing.** 18/18 still pass, as do `check_vv_checklist` 60/60 and `check_engine` 41/41 |
| (g) documentFacts holders | `sources.ts:51` back to the old condition-based holders | **FAIL** both "Q2 (g)" checks |
| nobody words, engine | `render.ts:72` "spouse or partner" → "spouse" | **FAIL** "Q2 nobody words" |
| nobody words, runtime | `case-checklist.ts:190` → `return c` | **FAIL** "Q2 nobody words" |

**M1 · Major · Must: rule (i) still has no check that fails when the rule is removed** (STANDARDS.md:22, D16; Q2 review Major 1).
* The new check (`check_line_holders.ts:62`) uses a **PRINCIPAL** condition. For holder `"case"` that never reaches the `holder === "case"` branch: the role test fails, so `find(people, "principal")` returns A either way.
* The branch only matters when the subject kind is EACH_APPLICANT, EACH_PERSON or none.
* With the mutation, `conditionSubjects(ps, "case", "EACH_APPLICANT")` and `conditionSubjects(ps, "case", undefined)` return `["case"]`. Without it, they return `["A"]`; I verified both by probe. The probe gives the same result with or without the mutation for PRINCIPAL (`["A"]`).
* The round-1 report suggested the PRINCIPAL fixture, so the builder followed the letter of that fix. It still does not test the rule.
* **Fix (one check):** take a case holder with an EACH_APPLICANT condition, or one with no subject kind, on `person.employed`. Assert that `conditionSubjects(two, "case", "EACH_APPLICANT")` is `["A"]`. Assert that `lineCondition` is true with `A|person.employed: true` and false with false (pass and fail). Then re-run the mutation above.

**m1 · Minor · Should:** `tests/check_vv_checklist.ts:109` has six TS2783 errors (a key named twice and then overwritten by a spread). tsx runs the file, but the duplicated keys hide what the fixture really is. Remove the keys that are overwritten.

The round-1 Minors 1 and 2 (Preview words for DOCUMENT and nobody, and the `conditionSubjects` comment) are unchanged. They may ride along.

## Part 4: merge 756acc11
* `main.ts`: I parsed the `@Module` controllers and providers on both parents and on the merge. The merge is **exactly the sorted union** (71 entries, no duplicates).
* main's `RuleFacts`/`RuleFactsController` and the branch's `CaseChecklists`, `CaseFilings` and `CasePrepare` (with their controllers) are all imported and registered.
* main also changed `engine/runtime/case.ts`. It auto-merged cleanly: the branch's 5-year application-date bound sits next to main's code, and the checklist tests pass.

## D1–D20 (API and engine only; no screen in this slice)
D1 5: BR-1, BR-16, BR-18 and BR-3 met · D2 5: expand-only migration, keys and CHECKs · D3 4: one shared holders rule; Tx type · D4 4: B3 500 · D5 5: no pool starvation (60 at once) · D6 n/a · D7 5: fee source cited, Sample marked · D8 n/a · D9 4: 405 without Allow · D10 4: Q2 m1 words · D11 4 · D12 n/a · D13 5: officer only, server-side · D14 n/a · D15 4: B2 re-hash per read · **D16 3: M1, rule (i)** · D17 simulated only · D18 4 · D19 5: Preview, the Documents tab and the case checklist agree · D20 simulated only.

## Journey score (reviewer; simulated at API and engine level, no browser: no screen exists)
Journeys:
* J1: the officer opens /prepare on a new 3-person case.
* J2: the officer reads it again, and the ids stay stable.
* J3: a person stops applying, and their filing is kept inactive.
* J4: wrong role or no actor.
* J5: 30 officers open new cases at once.
* J6: HEAD, an edited release, and a case-level document line seen across Preview, the Documents tab and the checklist.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J3 in `check_vv_prepare_api` 34/34 |
| Next step obvious | ½ | Item `state` and reasons; no next action yet (later slices) |
| Plain words | 1 | "Not travelling (not applying on this case)"; plain 409 texts |
| Feedback and state | 1 | `derived`, `not_filing`, `not_built`, `version` |
| Correct data | 1 | J5: one group per case under a 60-request race; nothing written on a steady read (xmin check) |
| Error recovery | ½ | B3: 500 on a snapshot with no forms |
| Accessibility and screen sizes | n/a | No screen |
| Speed | ½ | 54 ms steady, but the whole snapshot is re-hashed on every read (B2) |
| Visual quality | n/a | No screen |
| Trust and sources | 1 | Fee source cited; fingerprint checked before storing |

**6.5 of 8 applicable = 8.1, reported as 8/10. Pass** (no criterion at 0). The most valuable fixes are B3, then B2. I wrote no separate journey-test file, because my brief allowed only this file.

## Could not check
* A browser walk, keyboard, 1024 px and 200 % zoom: there is no screen.
* The full run-suites result: it is the caller's run, and see the stale-client warning above.
* The PR text for B5 and B7, and the graph (`graph.mjs`): I did not run them in this window.

**Verdict: Block** (756acc11). To fix:
1. **M1 (part 3):** add one check that a case holder with an EACH_APPLICANT condition, or one with no subject kind, is decided on the principal's answers, with a pass and a fail. Confirm it fails with the `render.ts:63` mutation.
2. Optional: m1 (the TS2783 errors in `check_vv_checklist.ts:109`), the Q2 round-1 Minors, and /prepare B2–B5.
3. Environment, before trusting the API suites on the shared tree: run `prisma generate` there.

## Round 2 (7911f488)
1 Nov 2026, reviewer role. `git diff 756acc11 7911f488` has two changes: one new check in `tests/check_line_holders.ts:63-64`, and this report. Nothing else changed. No push, no servers, US$0.
* **The new check:** holder `"case"` with an EACH_APPLICANT condition on `person.employed`. It asserts `conditionSubjects(two, "case", "EACH_APPLICANT")` is `["A"]`. It passes with `A|person.employed: true`. It fails with `A: false`, even when the case row says `true`, so it also catches a read of the case row.
* **The removal, repeated in a throwaway copy** (`git archive 7911f488` of `prototype/` under `/tmp/mut7911`, with the shared tree's node_modules linked and read-only):
  * As built: `check_line_holders` **19/19**.
  * With `render.ts:63` `holder === "case" ? principal : holder` → `holder`: **18/19, FAIL** "Q2 (i) review round 2: a case-level holder's own-person condition is decided on the principal's answers, never on the case row".
  * With the file restored: **19/19** again.
* **M1 is closed.** D16 goes from 3 to 5.

| Part | Range | Verdict |
|---|---|---|
| 3. Shared holders fix (Q2) | d66d9fdf..7911f488 | **Approve.** Round-1 Major 1 is fixed for a, h, i, g and the nobody words. Each rule now has a check that fails when the rule is removed |

Parts 1, 2 and 4 are unchanged from above (Approve). m1, the Q2 round-1 Minors and /prepare B2–B5 are still open Minors. None of them blocks.

**Verdict: Approve** (7911f488). No Blocker or Major is open.
