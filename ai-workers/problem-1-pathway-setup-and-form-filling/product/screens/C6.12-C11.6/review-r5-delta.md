# C6.12 + C11.6 (PR #356): round 5, delta review

Reviewer role, 2 Nov 2026. Scope: only `git diff 351aa879 68d52573` (commits 929727b1 and 68d52573). Round 4 approved 641f3713. The commits from there up to 351aa879 were records, a superseding `-s ours` merge and a merge of main. None of them changes the PR's files.

Journey test: no new run. The delta changes two test comment lines and one test default. No screen, API or engine file changes, so the round 4 journey report (`journey-test-reviewer-2026-11-02.md`, **8/10, passes**) still holds for this commit.

## What changed

| File | Change |
|---|---|
| `prototype/studio/tests/check_vv_prepare_store_api.ts` | Usage line now `zsh studio/tools/isolated.sh runtime_vps 4432 start && tsx studio/tests/check_vv_prepare_store_api.ts 4432 xr_studio_runtime_vps`. The default database is now `xr_studio_runtime_vps`. |
| `prototype/studio/tests/check_vv_prepare_store.ts` | Usage line now `tsx studio/tests/check_vv_prepare_store.ts`. |

## Root cause confirmed

`run-suites.sh` reads each suite's usage line with `grep -m1 -E "studio/tests/$f"`. At 351aa879 the store API file's usage line still named `check_vv_prepare_api.ts`, so `grep` found no line for `check_vv_prepare_store_api.ts`; the count was 0. The empty usage line sent the suite to the plain branch. That branch starts no copy and passes no arguments. The suite then fell back to its defaults (4432, `xr_studio_runtime_vp`), and that database did not exist. This matches the CI shard 4 failure.

## Checks

1. **Parsing (run-suites.sh).** I ran run-suites' own regex in bash on the files at 68d52573:
   - `check_vv_prepare_store_api.ts` gives copy `runtime_vps`, port `4432`, args ` 4432 xr_studio_runtime_vps`. The usage line names the database that isolated.sh creates (`xr_studio_<name>`). With a prefix, the `sed` rename gives `xr_studio_<prefix>_runtime_vps` on the shifted port. The prefixed run below confirms this.
   - `check_vv_prepare_store.ts` falls through to the plain branch (no server). That is right for a pure test.
   - `check_vv_prepare_api.ts` gives copy `runtime_prep` on 4432, so it is distinct from `runtime_vps`.
2. **Selection (select-suites.mjs).** For 351aa879..68d52573 the script picks `check_vv_prepare_store.ts` ("changed; names check_vv_prepare_store_api.ts") and `check_vv_prepare_store_api.ts` ("changed"), plus the smoke set. Both suites map to their own paths (`suites.get(n) === f`).
3. **Setup.** The store API test checks whether `vv.single` has a release on its copy. If it has none, the test runs `tests/runtime/setup_visitor_visa.ts <PORT> <DB>` itself and records this as a PASS line. On a fresh copy this happened: the first log line is `PASS setup: the Visitor visa released on this copy by setup_visitor_visa.ts`.
4. **Sharing port 4432.** Seven suites now name 4432: c10_1_browser, c3_11_signed_scan, c41_section_order (two suites on the shared copy `runtime_c41`), s5_slice1_browser, vv_prepare_api and vv_prepare_store_api. Port 4432 is in the runtime range 4430–4439 (`WAY-OF-WORKING.md`).
   - Sharing is safe in run-suites. It runs suites one at a time: `isolated.sh start`, then the suite, then `isolated.sh stop`, and only then the next suite.
   - Each copy name is distinct, so each suite gets its own database and var folder. `runtime_vps` is used nowhere else, and the old name `runtime_vp` is gone from the tree.
   - Shards run on separate machines. Lanes on one Mac get separate ports through a per-prefix slot and lock.
   - The stale-copy-on-a-shared-port fault was fixed in isolated.sh (#382).
5. **Run the way CI runs it.** I used a separate clone at 68d52573 at `/home/user/xpatready-review-r5`. It had its own `npm ci` node_modules, a prefix of `COPY_PREFIX=rvfive` (slot 9, ports +18000, so 4432 became 22432) and its own lock and output folders. Command: `bash product/tools/run-suites.sh --changed 351aa879..68d52573`. Exit code 0, with 8 suites chosen and 8 passed:

   | Suite | Result |
   |---|---|
   | check_engine.ts | PASS 41/41 |
   | check_screen01_api.ts | PASS 135 |
   | check_vv_prepare_store.ts | PASS 11/11 |
   | check_vv_prepare_store_api.ts | PASS 34/34 (0 FAIL; setup ran) |
   | check_w1_start_setup.ts | PASS 26/26 |
   | check_w1_structure.ts | PASS 81/81 |
   | check_dv_backbone_browser.cjs | PASS 8 |
   | check_case_engine.ts | PASS 55/55 |

   The demo (:4400), 4440 and 4441 were not touched. No model was called, so the cost was US$0. I did not run the unprefixed form (bare 4432) on this shared machine. The parse in check 1 shows the unprefixed copy name and arguments are right.

## Findings

- None at Blocker or Major level.
- n1 (Note, no action): the 929727b1 message says `:4465`, but 68d52573 moved it back to 4432 in the runtime range. The final tree is correct; only the history reads oddly.

**Verdict: Approve** for 68d52573.
