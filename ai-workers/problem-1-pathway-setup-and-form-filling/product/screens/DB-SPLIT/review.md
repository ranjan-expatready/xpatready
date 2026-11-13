# DB-SPLIT — independent review (PR #1709, commit c4f728b78)

**Verdict: Approve.** No Blocker and no Major. Four Minors and two notes for the tech lead are listed below; none of them stops the merge.
**Scope:** only commit `c4f728b7868eef74ea43453f1869b1dec555af1e`. Base is `origin/main` 4ed81a72f. The branch has moved on since then: `93e8e9f89` changes `tools/isolated.sh` and puts both guard scripts back as they were, and `61ef3c764` adds a break report. Neither commit is covered here; see note N1.
This is a schema-layout change with nothing visible, so I adapted the screen-review skill. There was no UI walk, BIC table or graph run, because the change has no elements, pages or routes. I checked everything below myself and did not rely on the PR text. All work ran in the scratchpad or as read-only commands against the demo Postgres on :54329. Port :4400 was not used.

## The row's done-when, checked
| # | Done when | Result | Evidence |
|---|---|---|---|
| 1 | `migrate diff` from the old single file to the folder is empty | **Met** | The old file is main's `schema.prisma` (2,879 lines). `--script` gives `-- This is an empty migration.`. The summary form says "No difference detected." in both directions, and `--exit-code` returns 0. To show the folder is really read, I added a probe model to a scratch copy and the diff reported `[+] Added tables ZzReviewProbe`. |
| 2 | `validate` and `generate` pass; client types identical or the diff is ordering-only | **Met, ordering-only** | Both pass on prisma 7.8.0. I generated both schemas into scratch outputs. `index.d.ts` is 8,192,495 bytes from the old schema and 8,192,537 from the new; they are not byte-identical. Their sorted diff is 28 lines and all of it is ordering. The `modelProps` union lists the same 104 names (same md5 of the sorted set) in a different order. In `ModelName`, the trailing comma sits on a different last member. The JSDoc example on `PrismaClient` uses the first model (`extensionPairing` instead of `workspace`). Prisma concatenates the files alphabetically, so `access.prisma` now comes first. In `index.js`, `runtimeDataModel` parsed as JSON is equal: 104 models, same contents, different key order. The query-compiler wasm is identical. No code depends on model order: there is no use of `ModelName`, `dmmf` or `runtimeDataModel` in api/, engine/, tests/, tools/ or product/tools. |
| — | `///` comments stay attached | **Met** | I parsed both schemas into blocks: 117 before, 117 after. All 117 have a byte-identical body, the same leading `///` lines and the same leading `//` lines. Sorting all lines of the folder against the old file gives the old lines plus only the 14 rule lines, 14 copies of the shared line 2 and one blank line. Nothing was lost or changed. |
| 3 | Full CI green | Not checked here | CI runs later. Locally, `check_prisma_schema.ts` passes 8 of 8, and c4f728b's `check-select-suites.sh` passes 84 of 84. |
| 4a | No migration added | **Met** | `git diff --name-only origin/main...c4f728b -- '*/migrations/*'` is empty. `prisma migrate status` reads 83 migrations under the config and reports the database up to date. |
| 4b | Generator and datasource in one base file | **Met** | Only `base.prisma` has them, and the F check enforces it. |
| 4c | Every file has a one-line rule | **Met** | All 14 files start with `// <file> — … Owner: … .`, and the F check enforces it. |
| 4d | Every pointer to the old file is updated | **Met (executable)** | I grepped the whole repo, excluding archive/, sources/, code/ and qa/reports, across *.ts, js, mjs, sh, yml, json, py, package.json, Docker, .github, .githooks and .claude. The only hits are frozen audit manifests and analysis evidence (`checks/prototype-grounding-audit-*`, `design/factory-plan-*-evidence/module_span.py`), which are records. package.json has no prisma scripts. start.sh, cloud-setup.sh, new-machine.sh, scout.sh and CI all call `prisma` through `prisma.config.ts`, which now names the folder. `select-suites.mjs` matches `^prisma\//`, so any area file still runs everything. The two comment pointers in `added-forms.ts` and `readiness.ts` now name the right files (`FilingFormAddition` in filings.prisma, `CombinationForm` in pathways.prisma). |
| 4e | Developer guide section | **Met** | `studio/DEVELOPING.md` has the required sentence. I checked it by hand: a new `notes.prisma` with a relation to `Case` is refused until `Case` gets its back-relation line, exactly as the guide says. Its "Shared files" reference exists in WAY-OF-WORKING:40. |

## Code
* **`tests/check_prisma_schema.ts`: sound.** It passes 8/8 in 7.5 s and leaves no `var/schema-check-*` folder or `xr_studio_b121_*` database behind.
  * The V, M and broken-relation cases now copy the folder and add one file, which is the right shape for a folder schema. M still sees exactly the 5 known differences, so the migrations-to-schema result is the same as on main.
  * The new F check fails when its rule is removed. I ran two mutants against c4f728b's file. With the rule-line test off, "F fail: an area file without its rule line" FAILs. With the generator/datasource test off, "F fail: a generator outside base.prisma" FAILs.
* **`tools/isolated.sh` (zsh, `set -e`): correct for a folder.** I ran the exact line in zsh with `set -e` against a fake tree:
  * With no client, it generates.
  * With the client newer than every file, it skips.
  * With one area file newer, it generates.
  * In every case the script continues. The `[[ … ]] && …` form is exempt from `errexit`, and `find`'s `-newer` is strict, the same as `-nt` was.
* **Guard edits in c4f728b: right.** `check-isolated-ttl.sh` builds a fake `prisma/schema/` that matches c4f728b's `find prisma/schema`. On extracted trees, c4f728b and main give the same result: 4 passed and 11 failed (the "start the demo database first" and skill checks fail on both; this container is the cause). The run never reaches the generate line, which is why I checked it directly as described above. `check-select-suites.sh` now proves that `base.prisma`, `cases.prisma` and `evidence.prisma` each run everything.
* **Runtime:** with the client regenerated from the folder, a read-only query on 8 models spread over 7 area files plus a `case → combination` relation runs in 213 ms. All counts are 0 because the demo database is unseeded. `tsc -p api/tsconfig.json` has 15 errors, all in 5 test files this PR does not touch. Since the generated types differ only in order, the old client gives the same errors.

## Grouping and rule lines
The grouping is sensible and follows the lanes. The base enums rule holds: each of the 5 enums in base is used by 2 or 3 files, and each of the 6 area enums is used only in its own file. DEVELOPING's table matches the files. Each model belongs in the file its area says, apart from m1 and m2.

## Issues (ranked)
* **m1 (Minor, Should): `access.prisma` names the wrong owner, or its inherited header is now wrong.** Line 1 says "Owner: the runtime lane". Line 4, the moved header, says "F2 browser extension (forms lane, P-90)". The fix is for the lead to confirm who owns the extension tables. Then either correct the owner (in the rule line and in DEVELOPING.md's table) or note that ownership changed.
* **m2 (Minor, Should): two placements sit with a lane that did not build them.** `OfficialPagesRecord` ("F2 (forms …)") is in `pathways.prisma`, owned by screens. `PersonPreference` (C11.10 view choices) is in `cases.prisma`, owned by runtime. Both placements can be defended, since the record is per combination and the preference is per person. The fix is to have the lead confirm them, or to move these two blocks; a move is a pure move and the diff stays empty.
* **m3 (Minor, Should): `isolated.sh` misses one case.** If an area file is deleted, or arrives with an older mtime (`mv`, `cp -p`), the client is not regenerated. I reproduced this in zsh. The fix is to also test the folder's own mtime, for example `find prisma/schema \( -name '*.prisma' -o -type d \) -newer …`. start.sh always regenerates, so only isolated copies are affected.
* **m4 (Minor, note for the lead, not the builder): the live rules still name the old file as the baton.** `RULES.md:51` and `SECOND-MAC.md:81` say "One builder at a time on `prisma/schema.prisma`". That file no longer exists after this PR. The lead should restate the baton as the migration baton or per area file. The row's list of places to update did not include rule files, so this is not counted against the PR.
* **Note:** `prisma format --check` reports unformatted files. It did the same on main's single file, so this is not a regression. Running `prisma format` now rewrites every area file, which cuts across the "never edit another area's file" rule. DEVELOPING.md could say not to run it repo-wide.
* **N1 (process): this Approve covers c4f728b only.** The head has since moved to 61ef3c764. 93e8e9f89 changes `isolated.sh` to `find prisma -name '*.prisma' 2>/dev/null` and sets the guard scripts back to `prisma/schema.prisma`. Once reverted, `check-select-suites.sh` tests a path that no longer exists. It still passes, because the matcher is `^prisma\//`, but it no longer proves that an area file runs everything. The label guard (`RULES.md:54`) needs the exact head SHA, so the new head needs its own review of that change.

## Journey score (reviewer, adapted: a builder adding or changing schema; there are no screen users)
Journeys: (1) apply the split to a clean copy and get the same database; (2) a builder adds a new module file with a relation to another area; (3) an isolated copy picks up a schema change; (4) break it: rule line missing, second generator, unknown relation, missing back-relation, deleted file.
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Empty diff, same client, the new-module walk works |
| Next step obvious | 1 | DEVELOPING.md, the rule lines, and Prisma's "missing an opposite relation field" error |
| Plain words | 1 | The rule lines and the guide are short and plain |
| Feedback and state | 1 | The F check names the file and the fault |
| Correct data | 1 | The data model is equal; the read-only queries run |
| Error recovery | ½ | m3: a deleted file does not regenerate the client |
| Accessibility and screen sizes | 1 | N/A: nothing visible changes |
| Speed | 1 | Check 7.5 s; generate 1.1 s |
| Visual quality | 1 | N/A: nothing visible changes |
| Trust and sources | ½ | m1/m2: ownership labels clash with the inherited headers |
**9/10. Pass** (8 or more, no 0). To raise it: fix m3, then settle m1/m2.

## Could not check
Full CI. The parts of `check-isolated-ttl.sh` that need the demo database, in this container. A real UI walk; D17 and D20 stay with the founder and were not walked. The commits after c4f728b.

**Verdict: Approve**. Blockers: none. Majors: none. Minors: m1, m2, m3, m4 (m4 is for the lead).

## Re-review: c4f728b78..9f510b29b (PR head), diff only
I checked everything below myself on `9f510b29b4fd6b394a1aa23f39912eacb05a951d`, from extracted trees and in zsh.
* **Schema moves (m1, m2): fixed, and still pure moves.**
  * `access.prisma` is split in two. `extension.prisma` holds ExtensionPairing, ExtensionCodeTry, ExtensionSession and RecaptureTask, owned by forms, and carries the moved "F2 browser extension (forms lane)" header. `links.prisma` holds PersonLink, PersonLinkTry, PersonLinkSession and DemoMessage, owned by runtime. `OfficialPagesRecord` is now in `forms.prisma`. Each new rule line matches its file's contents.
  * `migrate diff` from main's old file to the folder gives "-- This is an empty migration.", and `--exit-code` gives 0 in reverse.
  * All 117 blocks are byte-identical to the old file, together with their leading `//` and `///` comments. Sorting all lines adds only the 15 rule lines, 15 copies of line 2 and one blank line.
  * `index.d.ts` is still ordering-only: the sorted diff is 28 lines of diff output, 14 changed lines. The 104 model names are the same set. The first model is now `enteredSection`, because `answers.prisma` now sorts first. `runtimeDataModel` is equal.
  * The base-enum rule still holds for all 11 enums. DEVELOPING.md's table matches the 15 files, and nothing names `access.prisma` any more.
  * `check_prisma_schema.ts` passes 8 of 8, with F at 15 files.
  * Leaving PersonPreference in cases and asking the lead is acceptable; m2 is closed as far as the PR goes.
* **`isolated.sh` (m3): fixed.** I ran the exact line in zsh with `set -e`.
  * A fresh tree skips. A missing client, an edited file, a deleted file and an old-dated file moved in all regenerate, and the script continues every time.
  * A new migration folder also triggers a generate. That costs about 1 s and is harmless.
  * The ttl guard's stand-in `prisma/schema.prisma` (older than the client) correctly skips.
* **Guard scripts reverted to main (93e8e9f89): right under the ownership rule.** `git diff origin/main 9f510b29b -- product/tools` is empty.
  * The ttl guard on 9f510b29b gives exactly the same PASS/FAIL list as main in this container.
  * At the head, `check-select-suites.sh` passes 83 of 83. It now probes the old path, so it no longer proves that an area file runs everything; my earlier N1 still stands as a note for the tech lead (the PR proposes the edit to them). I checked the behaviour directly instead: `select-suites.mjs` returns `ALL … shared` for `extension.prisma`, `links.prisma` and `base.prisma`.
* **61ef3c764:** the break report only, a record.
* **Fact:** `review.md` is already committed in 9f510b29b. It matches my first section byte for byte. This section is the uncommitted addition.
* **Still open:** m4 (the stale baton line in `RULES.md:51` and `SECOND-MAC.md:81`) and N1 (the select-suites probe), both for the tech lead and not the builder. The journey score rises to 10/10: m3 is fixed (error recovery 1) and m1/m2 are settled (trust 1).

**Verdict: Approve** for `9f510b29b4fd6b394a1aa23f39912eacb05a951d`. Blockers: none. Majors: none. Minors: none open on the builder; m4 and N1 are for the tech lead.
