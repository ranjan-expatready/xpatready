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
