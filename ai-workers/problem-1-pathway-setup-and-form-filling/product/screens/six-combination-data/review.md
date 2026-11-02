# Review: six-combination sample data (P-230), PR #436

## Round 2 (2 Nov): re-review after the merge of main, head fb3dacba

The earlier approved head was 957493ed. The tech lead merged origin/main (4be03da1) into it, which made fb3dacba. The conflict was in `samples/wave1.json` `fs.spouse`.

**Merge resolution: keeps both sides.**
* `git diff 957493ed fb3dacba -- '*/samples/*'` brings in only main's changes. These are C11.12 `filingMode` on the family lines (P-233), the expanded `drop_documents` layout in `programs.json`, and main's `filingMode` on the `fs.spouse` principal (`files_own`) and child (`on_principal`).
* `git diff origin/main fb3dacba` touches 3 files, +16 / −5:
  * the Sponsor line `{role:"sponsor",label:"Sponsor",min:1,max:1}` in `wave1.json fs.spouse` and `programs.json`;
  * IMM 5562 removed from the `fs.spouse` sources (held), with the Researched note citing P-230 Q3 and Q9 in both files;
  * `tests/check_s7_load.ts`, which changes the 45 → 44 count and adds the P-230 pass and fail checks.
* The PR's delta against its main parent was the same before and after the merge. Comparing the +/− lines of `git diff <main parent> 957493ed` and `git diff origin/main fb3dacba` shows one difference only: the `fs.spouse` line now also carries main's `filingMode` values. No PR change was lost, and no change from main was dropped.
* Both JSON files parse. origin/main (4be03da1) is an ancestor of fb3dacba.

**Sponsor without `filingMode`: acceptable for this PR, not a defect.**
* `engine/people.ts` C11.12 rules:
  * BR-3 applies only when a mode is sent.
  * BR-4 makes `co_files` a choice, not a requirement. The concept says: "A never-applicant role with no mode files nothing (so a Spouse sponsorship without `co_files` has one filing, as `C11.12.test.ts:66–72` expects)".
  * `checkPeople` accepts the line as it is, with `applies` worked out to false (Sponsor is never an applicant).
* The acceptance pack's own `fs.spouse` case (`acceptance/C11.12.test.ts` 66–72) saves the Sponsor 1 to 1 with no filing mode and expects one filing. Adding `co_files` here would change that expected result.
* Setting `co_files` before C11.12 PR 2 also has a runtime risk. That PR is the migration that widens `filing_mode_check` to allow `co_filed`, and it is not on main (there is no c1112 migration under `prisma/migrations`). A sample sponsor that co-files could then make a filing the database refuses.
* Open, owned elsewhere: C11.12 concept line 39 plans `filingMode:"co_files"` on this Sponsor line, with `check_s5_slice1.ts` and `check_s7_load.ts` run in the same PR. That belongs to backlog row L-C1112 (PR 2 or PR 3), not to #436. Suggestion for the C11.12 builder: set the mode there.

**Run (isolated copy rv436, port 4448, fresh database, live AI off).** `check_s7_load.ts 4448 xr_studio_rv436` gave **23 passed, 0 failed**. It included:
* "P-230 pass: spouse sponsorship lists the Sponsor (one, exactly), after the sponsored person": roles `principal, sponsor, child, representative`;
* "P-230 fail: IMM 5562 is not attached to spouse sponsorship";
* C11.7 want 41 = files 41, with 3 held;
* "Load sample makes no live AI call: US$0".

After the run, a database query found no `imm5562` attachment on any combination. The copy was stopped and its database dropped.

How the run was done: `tools/isolated.sh` could not reach the cluster through a symlinked `.tools` in the scratch worktree (permission denied). Its steps were run by hand with the same commands, the same database name and the same port. Before the start, the script stopped one process that was already listening on 4448 (pid 17693).

Notes, not findings:
* The C11.7 P-149 replay still lists "IMM 5562 (07-2024)" among the forms waiting for Draft with AI. That list comes from the saved field-map answers, not from an attachment on `fs.spouse`. It is unchanged by this PR, and the P-230 fail check is scoped correctly.
* Journey test: not re-run this round. Nothing on any screen or in any flow changed since the approved head; the change is sample data and one check. The round-1 journey score stands.

Findings: Blocker 0 · Major 0 · Minor 0.

**Verdict: APPROVE** for fb3dacba34d055f5a6ddeea4717dfdae5ff3b6f0.

## Round 3 (2 Nov): re-review of head 39e3d836

**Why this round.** Round 2 approved fb3dacba with a Sponsor line that had no `filingMode`. The builder's suite run on fb3dacba then failed `tests/check_c1112_modes.ts` (main's C11.12 test) at 38/39, on the step "C11.12 BR-8 pass: every family line of the Demo sample (wave1.json) has a filing mode". Round 2's statement that "Sponsor without `filingMode`: acceptable" was wrong for main as it stands: BR-8 on main requires the mode, and round 2 did not run that suite. Round 2 also named a `co_filed` migration risk; this round tests it against the code.

**Diff.** `git diff fb3dacba 39e3d836` touches 3 files:
* `samples/wave1.json` `fs.spouse` Sponsor gets `"filingMode": "co_files"`;
* `samples/programs.json` `fs.outside` Sponsor gets the same;
* this review file is committed.

Nothing else changed: no code and no check.

**`co_files` on a loaded sample is safe end to end, and the round 2 migration risk is refuted.**
* **Loader.** `api/src/demo.ts:131` and `:201` call `studio.createCombination`, which calls `checkParticipants(…, strict=false)`.
  * `studio.ts:221` sets `applies` to false for `co_files` (BR-5).
  * In `engine/people.ts:39–47`, BR-3 skips `co_files`. BR-4 accepts it because the `sponsor` role is seeded `may_be_applicant=false` (`migrations/20261027160000_s5_person_roles` line 28) and both lines are min 1, max 1, with one co-filer.
  * The line is stored in the `combination.participants` JSON. That column is plain JSON, with no enum or column for a line mode.
* **Read (`workspace.ts:137–141`).** `!!r.mayBeApplicant === (stored !== "co_files")` gives false === false, so the mode is kept and `applies` stays false. `filingWords` shows "Files the sponsorship (sent with the principal's application)", and the plan shows a `co_filed` entry: "Sponsor: the sponsorship (cannot be sent alone)". This is preview text only and is never stored.
* **Case database.**
  * `filing.mode` is a String column. Its CHECK `filing_mode_check` allows only `('files_own','on_principal')` (`migrations/20261102030000_c612_c116_prepare_items` line 46).
  * The only writers are `case-prepare.ts:113–114`. They write `f.mode` from `deriveFilings(…, { modes })`, where `modes = releaseModes(participants)` (`case-prepare.ts:74`; also `case-filings.ts:30`).
  * `releaseModes` (`engine/filing-modes.ts:130–133`) keeps only `RUNTIME_MODES = ["files_own","on_principal"]` with `applies !== false`, so it drops the Sponsor line twice: by its mode and by its `applies`.
  * The modes map passed to the case engine is therefore exactly the same as at fb3dacba. `co_files` and `co_filed` cannot reach the `filing` table, and no migration is needed. The "review M1 fail" step of the C11.12 test asserts this.
* **Release check (`studio.ts:386`, `filingNotSet`).** It only names roles where `mayBeApplicant` is true, so the Sponsor never raises "Filing not set", with or without the mode.
* **Acceptance-pack note.** `acceptance/C11.12.test.ts:66–72` saves its own Sponsor line without a mode and expects one filing. It builds its own lines and does not read the sample, so this change does not affect it.

**Runs (live AI off, never :4400).**
* `tsx --tsconfig api/tsconfig.json tests/check_c1112_modes.ts` (pure): **39/39 passed**. These include "BR-8 pass: every family line of the Demo sample (wave1.json) has a filing mode" and "review M1 fail: Declared only, co_files and a Representative's stored Files own never reach the case's filing mode".
* `tests/check_s7_load.ts 4448 xr_studio_rev436_s7` on a fresh isolated copy at 39e3d836 (new database, port 4448): **23 passed, 0 failed**.
  * `tools/isolated.sh` again could not reach the cluster through the symlinked `.tools` in the scratch worktree (permission denied), so its steps were run by hand: createdb, `prisma migrate deploy`, then `api/src/main.ts` with `STUDIO_PORT=4448`.
  * The Prisma schema is identical to the main checkout's and its generated client.
  * After the load, a query on the database showed:
    * the stored `fs.outside` Sponsor line `{"role":"sponsor","min":1,"max":1,"applies":false,"preview":1,"filingMode":"co_files"}`;
    * zero `filing` rows (the load creates no case).
  * The copy was then stopped and its database dropped.

**Journey test: not re-run.** This round changes sample data only. The Sponsor's Filing column now reads "Files the sponsorship…" instead of "Files nothing", which is the concept's planned wording (C11.12 concept line 39). No flow changed, so the round 1 journey score stands.

**Note, not a finding.** The round 2 advice that the C11.12 builder should set the Sponsor's mode in L-C1112 is now done in this PR. L-C1112 should not set it again.

Findings: Blocker 0 · Major 0 · Minor 0.

**Verdict: APPROVE** for 39e3d836c0c7636259e7e70a75cd006d926c7606.
