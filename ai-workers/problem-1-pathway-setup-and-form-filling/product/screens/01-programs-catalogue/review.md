# Screen 01 — review (reviewer agent, 24 Oct, small FIX after the merge)

Earlier rounds are in git: round 2 of the closing pass is at `23cd9bf4^`, and older ones before that.

**Commit reviewed:** `23cd9bf4` on `claude/screens-01-fix-c3010a`. Scope: the Lead note of 24 Oct only (QA-14, QA-17, Lead check L1–L3). **Verdict: Ship.** 0 Must, 3 Should. **Journey score 9/10 (pass)** on the two journeys this pass changes (below). I kept it in this file; there is no separate report.

**How I checked:** I read the build notes ("Small FIX after the merge"), BUGS QA-14/QA-17, lead-check L1–L3 and the diff `1cb174a6..23cd9bf4` (prototype; evidence ignored). I ran isolated copies on :4440/:4441 (`xr_studio_screens_rv`, `_rv2`, fresh starts). Model calls were refused (US$0). Afterwards I stopped both copies, dropped the databases and restored the evidence files the suites rewrote.

## Suites (non-maker run)
| Suite | Result |
|---|---|
| Screen 01 API | **133/133**, including the three QA-14 checks (4 at once → `[201,409,409,409]`; the database refuses "RACE-at once"; another parent is allowed) |
| qa `check_qa14_name_race.ts` | **PASS**: 20 names × 4 at once, one category each |
| **Rule removed** (`DROP INDEX program_def_parent_name_key`) | qa race check **FAILS** ("Category 1 x2, Category 4 x2"). The test proves the rule |
| grounding | **29/29**. With the wrong database (`… 4440 xr_studio_screens_rv2`) it stops at once with the plain reason (L1) |
| channels | **42/42** |
| Screen 01 browser | **135/136 twice**, each run failing a different step. Run 1: "Program filter: only Work permits rows" (read before the list refreshed; Should 3). Run 2: "changing the view under 200 ms" took 205 ms at machine load 32 (load, not code). C2.7 (L2) and QA-17 passed both times |
| Type check | `tsc --noEmit -p api/tsconfig.json` **0 errors**; it covers `tests/*.ts` (9 files listed). `-p web/tsconfig.json` **0** (L3) |

## Items in this pass
| Item | Result | Evidence |
|---|---|---|
| QA-14 one name per parent, enforced in the database | **Fixed for new rows** | Partial unique index on `(workspace_id, COALESCE(parent_node_key,''), name_key)`. Both create routes write `name_key` with `normalizeLabel` (`studio.ts:85`, `programs.ts:60`); no route renames a node. I also raced the screen's own route, `POST /combinations/path` (9 names × 4 at once): one program and one category per name, one combination each, losers refused |
| QA-17 dates in Recent steps | **Fixed** | Combination page: "today 10:19 a.m." … "Oct 21, 10:53 p.m." for the back-dated step (screenshot in my scratchpad). Also applied to Review step 1 and AI work. The region is now labelled. At 200 % (512 px) the page does not scroll sideways; the table scrolls inside its own box |
| L1 grounding "finding 3" 404 | **Fixed (test)** | The cause was the wrong database: the check read ids from the database named on its command line, which could be another copy's. The guard in the grounding, API and channels checks stops with the reason; with the right database, 29/29 |
| L2 C2.7 wait | **Fixed** | `check_screen01_browser.cjs:150` waits for the list; it passed in both runs |
| L3 type errors | **Fixed** | 0 errors with the command now stated (39 before). The build note corrects its earlier "clean" claim |

## Migration `20261024090000` (looked at closely)
* **Backfill and legacy duplicates.** I replayed it on real duplicates: I dropped the index, raced to make 2 twin pairs, applied the written rollback, then ran `migration.sql` with `ON_ERROR_STOP`. It filled 48 rows and set the newer twin of each pair to null (oldest by `created_at, id`), and the index built. Nothing was deleted. The rollback works as written (§5 met: expand only, rows kept, rollback recorded).
* **Partial index.** It excludes null and `''`. `IS NOT DISTINCT FROM` in the backfill matches the `COALESCE` in the index. Pathways (parent null) share `''`, which is correct. The partial index is outside `schema.prisma`, the same pattern as `20261021230000`.
* **SQL vs app normalisation: they differ (Should 1).** The SQL `[:alnum:]` drops combining marks; `normalizeLabel` keeps `\p{M}` (break m2). The two lower-casing steps also differ. Of 19 test labels I compared on this database (en_US.UTF-8, libc), 3 differ: "किसान" → app `किसान` / SQL `कसन`; "कसान" → `कसान` / `कसन`; "İstanbul" → `i̇stanbul` / `istanbul`. This affects only rows that existed before the migration.

## Issues
**Should 1: rows that existed before the migration hold a key from a different rule, so BR-6 can refuse a name it allows** (`prisma/migrations/20261024090000_program_name_unique/migration.sql:6`, `api/src/studio.ts:87`).
* Reproduced on :4440. I created "किसान" and "İstanbul", then rolled the migration back and replayed it. After that, the valid names "कसन" and "Istanbul" are refused 409 with `"किसान" already exists …` / `"İstanbul" already exists …`, although `normalizeLabel` says they differ and the pre-check let them through.
* The same mismatch flags "किसान" and "कसान" (different under BR-6) as legacy duplicates, so the newer one loses its key.
* It is also two copies of one rule (STANDARDS §7 "no duplicated logic").
* **Fix:** fill `name_key` once from the app with `normalizeLabel` (for example at start-up: re-key rows whose key differs, and null the newer twin by the same rule), or have the migration only add the column and leave the fill to the app. In the 409 path, find the twin by comparing `normalizeLabel(label)` of the siblings, not the stored key.
* **Test:** an old row "किसान" (key filled by the migration), then "कसन" → 201.

**Should 2: a person who loses the race gets a different answer from one who arrives a moment later** (`api/src/studio.ts:88`).
* On `/combinations/path`, the loser gets 409 with `detail` only. A later duplicate gets 400 with `errors[{field:"program"}]`. On `/program-nodes`, a later duplicate gets 409 with `errors` and `existing`.
* `new-combination.tsx:63-66` shows the loser's message in the page notice rather than on the Program/Category field, so it is not silent. It does not meet §6 "field-level messages".
* **Fix:** throw the same Problem Details as the pre-check (field `label`, or the level, plus `existing`).

**Should 3: one more browser step reads the list before it refreshes** (`tests/check_screen01_browser.cjs:142-143`, "Program filter: only Work permits rows"). It failed 1 of 2 runs under load, the same pattern as L2. **Fix:** wait for `prog=` in the URL and for every row to start with `individual.work_permits` before asserting.

## [M] standards touched
**Met:**
* §5 uniqueness scoped to the parent, held in the database, and the migration keeps rows with a recorded rollback.
* §7 strict TypeScript with 0 errors, tests included.
* Tests fail when the rule is removed.
* §3 concurrency: duplicates under a race are refused.

**Not met:**
* §6 field-level message on the race-loser path (Should 2).
* §7 one rule in two places, with different results (Should 1).

**P-33:** nothing new. The browser check back-dates a step by SQL to show an older day; that is test set-up, not a product step.

## D scores (dimensions this pass touches; the rest are as in the Lead check of 24 Oct)
| D | Score and evidence |
|---|---|
| D2 Data integrity | 4: twins cannot get in, even at the same moment, on both create routes. Old non-Latin rows carry a key from another rule (Should 1) |
| D4 Rule integrity | 4: BR-6 is held in the database; for old rows the stored key can disagree with BR-6 |
| D5 Stability and recovery | 5: four at once → one 201 and plain 409s; a wrong-database run stops with the reason |
| D11 Feedback and state | 4: steps say "today" or the date; the race loser's message sits in the notice, not on the field |
| D13 Accessibility | 4: "Recent steps" is a labelled region; no sideways page scroll at 1024 px or 200 % (the table scrolls inside its box); no real screen reader |
| D16 Testability | 4: race and database-refusal checks, proven by removing the rule; type check 0 errors; one flaky browser step remains (Should 3) |
| D17 / D20 | Simulated only |

## Journey score: 9/10 (scoped to this pass)
Journeys:
* **J1** Two authors create the same new program and category at the same moment on "New combination" (API race on the screen's route, 4 at once).
* **J2** An author opens a combination whose last reading ran three days ago and reads when each step ran (headless Chrome at 1024 px and 512 px).

Scores:
* Task completed 1 · next step obvious 1 ("choose it instead") · plain words 1 · correct data 1 (one row per name; Should 1 affects only old rows) · error recovery 1 · accessibility and sizes 1 · speed 1 · visual quality 1 · trust and sources 1.
* Feedback and state ½: the race loser's message is not on the field.

I walked headless, not in a visible browser.

## What I could not check
* Whether :4400's database has legacy duplicates. The migration lists them only through the SQL comment `SELECT label, program_node_key FROM program_def WHERE name_key IS NULL;`, which the Lead should run after merging.
* A real screen reader.
* The rules, forms, engine, AI drafting and scale suites (this pass did not touch them).
* AI steps (QA-8).
