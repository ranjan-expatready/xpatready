# B120 review: one file per feature for the hot files (runtime lane)

6 Nov 2026, ~10:30 IST. Reviewer (fresh session, did not build it). **Commit reviewed: `d150946e4`** (branch `claude/modest-darwin-1omjpl`; split commit `400e16e2f`, dump-tool commit `d150946e4`), against `origin/main` `ea8e35763` (includes #1123). Live AI off, US$0. Port 4434 only (copies `b120rv_br`, `b120rv_mn`, `b120rv_walk`), all stopped; the review worktrees are removed. The journey test is in this file (§5), not in a separate report, because the brief asked for this file only.

**Verdict: Approve.** No open Blocker or Major. Seven Minors below: fix them or list them in the PR. m1 needs the tech lead, not the builder.

## 1. Behaviour equivalence (verified, high confidence)
* **Configured checkpoint, step by step.** I read old `Demo.loadConfigured` (main `demo.ts` 553–958) and its helpers (105–110, 197–297, 532–551) next to `features/checkpoint/*.ts` and `combination/*.ts`. Service calls, DB writes and log lines run in the same order. The same errors are caught: only the `.catch`/`try` that were there before. The runner (`demo.ts:389–412`) adds no `try` and no `timed`. The `if (setup)` guards hold: steps 100–150 and 330 return on `!cc.setup`; 300/310/320 check `cc.setup?.<field>`; 200, 210, 220 and 400 run unguarded, as before.
  Shared state moved into the files that make it, with the same meaning: `irmWhy`→`irm0002`, `applied`→`fieldMapReview`, the sections/`maritalList`→`sections`, the totals→`formSetup`, `released`/`visitor`→`releaseOne`, `fam`→`familyCase`, `row17`. `keepChosenEveryones` still mutates the same `p` before 220 reads it.
  Both #1123 edits are carried: the `question` spread in `combination/140-own-yes-no.ts:17` and row 12's `allRead`/`validated` in `150-filled-copies.ts:9–16`.
* **String literals compared mechanically.** I compared every literal of the old code with every literal of the new files: the same set. The only differences are literals that moved to the runner or `_context.ts`, the two `factsOf`/`factsHeld` copies merged into `_facts-asked.ts`, and `keyOf.get(c.id)`→`cc.key` (the same value). Timing keys, row titles and row texts are unchanged.
* **Result key order.** The runner returns `{...six, sample, seconds, checkpoint, ...ctx.result, timings, log}`. `ctx.result` holds only `released` (set in `110-release-one.ts:20`), so the order is the old one. Measured: the top-level key order and the `timings` key order are identical on branch and main.
* **Services.** `ctx.get(X)` is `ModuleRef.get(X, {strict:false})` (`demo.ts:391`). There is one `AppModule`, and all 13 services the steps ask for are its providers (`main.ts:215`), so each call returns the singleton the constructor used to inject. Nothing else constructs `Demo`. Typecheck PASS confirms that no removed injection is still used.
* **Placement.** `placement/10-form-boxes.ts`, `20-condition-facts.ts` and `_chosen-sections.ts` match old `form-part-placements.ts` 26–151 under `diff`, apart from `c.workspaceId`→`workspaceId` and `out` being declared earlier. The route (153–181) is byte-identical.
* **Re-run independently (my own worktrees of `d150946e4` and `ea8e35763`, the builder's `serial-ai.patch` applied to both, never to the reviewed checkout):**
  * Configured checkpoint: `cmp` **exit 0**, 11,022 rows in 88 tables, 130 files, 43 encrypted PDFs. The dump is also identical to the builder's `fd.v5.dump`.
  * Reset to the six: `cmp` **exit 0**, 1,251 rows, 59 files.
  * **HTTP result** (not covered by the dump): the 13 rows are identical (row, title, status, shows, why); the 43 log lines are equal except one (m5); `released` is equal. `combinations` and `lines_by_hand` differ only by ids. Reset differs only in the code fingerprint and the new workspace id.

## 2. features.ts, start-up, module cycles
* `featureSteps` (`features.ts:44–61`) refuses at start-up, naming the files, for: a tie (by number value, so `010`/`10` count as one), a missing `run`, a missing default export, or a name that is neither `NNN-x.ts` nor `_x.ts`. `init` is awaited in order. `tests/check_features_registry.ts`: **22/22** (re-run). Combination steps load through `080`'s `init`, at start-up.
* Top-level await in `form-part-placements.ts:24`: only `features/form-part-placements.ts` and step files import it at runtime (the other hits are comments), and the placement passes do not import it back, so there is no TLA cycle. Three steps import constants from `demo.ts` (m6); that is safe today because `demo.ts` loads steps only by dynamic import from `onModuleInit`.
* Nothing is skipped silently, with two documented exceptions: a `_*.ts` file is never run, and non-`.ts` files are ignored. `steps` defaults to `[]` (`demo.ts:71`) with no non-empty check (m7).

## 3. Guard scans (tests/lib/ts-files.ts)
* All five scans now read `api/src` recursively. Each planted subfolder file uses the same function as the real scan. `check_s6_p149` also asserts that it sees `features/checkpoint/combination/`. The allowlist (`ALLOW`/`OWED`) has no entry for a moved file.
* Mutation, re-run: with a flat `readdirSync` in `ts-files.ts`, `check_irm_editions.ts` fails 2 of 13 (exit 1); restored, it passes 13/13. The other four need a live copy, so I read them only (the same pattern).
* `api/tsconfig.json`: `src/features/**/*.ts` now type-checks the step files. Typecheck PASS (15 known); count-any 418 = 418; graph `--check` G3 12 · G6 5, unchanged.

## 4. tools/demo-dump.mjs masks
Each mask is named in the header with its reason. None can hide a change in which rows exist or what they hold, apart from the limits in m3: ids become structural tokens; times, run ids, the copy and studio paths, hashes over ids, encrypted PDF bytes (their `request.json` is compared in full), Reset's code fingerprint, and the three lists that main itself builds in no fixed order. By construction the dump ignores write order (rows are sorted, times masked), so the order of steps rests on the code reading in §1. That reading found no reordering.

## 5. Journey test (reviewer, the one score for this check), on `d150946e4`, headless Chrome (no display here), port 4434
Journeys (configuration author unless named):
* J1 main: Demo › Load the configured checkpoint, keyboard only.
* J2 break: a second load while loading.
* J3 recovery: reload, then load again without a reset.
* J4: the approver (wrong role).
* J5 bad input: `sample:"nonsense"`.
* J6 alternate: Reset to the six through its dialog.
* J7 widths: 1024, 400, 200% zoom.

What held:
* J1: menu item reached in 2 key presses, confirm in 4 Tabs; result after 176 s. Rows on screen: 1, 3–12 and 17 Done, 2 Parked. They equal the API rows of both my branch and main runs.
* J2: 409 "The sample inputs are already loading…".
* J3: the menu reads "(reset first)"; the API gives 409 "…Reset the demo first…".
* J4: 403 "…does not hold the author duty".
* J5: 400 in words.
* J6: done in 33 s.
* axe: 0 violations on the confirm dialog, the result dialog and the Reset dialog.
* No sideways scroll at 1024, 400 or 200% zoom. No page or console errors.

Screenshots: `/tmp/claude-0/-home-user-xpatready/bc66f79d-5c92-584f-90f1-d44e57af0142/scratchpad/rv/walk/`.

| task | next step | words | feedback | data | recovery | a11y/sizes | speed | visual | trust | **total** |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | 1 | ½ (a 3-minute spinner, no progress; unchanged from main) | 1 (byte-equal) | 1 | 1 | ½ (176 s; the dialog says "a few minutes"; same as main) | 1 | 1 (US$0, Sample shown) | **9/10, pass** |

To raise the two halves (both pre-existing, outside B120): show progress during the checkpoint load, and make it faster. Not tested: a real screen reader; an intended user's own walk (D17/D20 stay with the founder).

## 6. D1–D20 (a refactor: unchanged from main unless stated)
* D1, D2, D4, D16: met. Data is byte-equal, and the rules' tests are kept and extended.
* D5: met (J2, J3).
* D11, D15: ½, as in the journey table.
* D13: met (J7, axe).
* D3, D6–D10, D12, D14, D18, D19: no change.
* D17, D20: simulated only.
* Graph: no new page or route.

## 7. Minors (fix or list in the PR)
* **m1 (tech lead, §6 Q4): the M3 guard stops covering the checkpoint.** `product/tools/m2-hot-files.txt:14` lists `studio/api/src/demo.ts` and nothing under `features/`. After the merge, an M3-only PR could edit `features/checkpoint/*` or `features/placement/*` without being refused. Fix: add `studio/api/src/features/checkpoint/` and `studio/api/src/features/placement/` in the same merge window, or retire the list.
* **m2: stale pointers in comments.**
  * `form-part-placements.ts:9` says the checkpoint calls it from `api/src/demo.ts`; it is now `combination/200-place-from-parts.ts` and `130-release-two.ts`.
  * `demo.ts:281` "(ROW17)" now lives in `features/checkpoint/170-new-edition.ts`.
  * `form-setup.ts:143` "(api/src/demo.ts)" now means `060-sections-from-forms.ts`.
  * `tests/check_c10_1_configured.ts:78` "demo.ts ROW17".
* **m3: what the dump does not cover.**
  * It does not compare the load's HTTP result (rows, log, timings keys, key order). I compared them separately (§1). Save the response in the PR evidence, or add it to the tool.
  * It masks every `date` column (`demo-dump.mjs:97`), including content dates such as `citation_date` and `accepted_until`, while the header's reason ("differ by design") covers only the `now()` dates. Narrow the mask, or name these columns.
* **m4: notes out of date.**
  * Notes §5 and §7 give the draft's numbers against `c8c65785e` (10,391 rows, 136 files, 45 PDFs). At this head it is 11,022 rows, 130 files and 43 PDFs: put the head's numbers in the PR.
  * Notes §4 says the scans skip `.d.ts`, but `tsFiles` (`ts-files.ts:11`) includes them. That is harmless (broader), but say so.
* **m5: a finding for the tech lead, pre-existing, not B120's to fix.** The B82 reject loop in `combination/310-checklist-documents.ts:38` (old `demo.ts` ~290) queries with no `orderBy`. Its rejections, and the order of the IMM 5484 log line, vary from run to run on main too. Measured: main vs main and branch vs main both differ in that one line, with the same set of 17 entries. Add it to §6 Q5.
* **m6: steps import constants from their runner.** `RELEASE`, `SAMPLES` and `BY_HAND_REASON` come from `demo.ts` (`130-release-two.ts:6`, `combination/300-…:11`, `combination/400-…:5`), which makes a `demo.ts` ⇄ steps import loop. It works only because the steps are loaded dynamically. Moving the three constants to a helper would make the steps independent of `demo.ts`, as the README intends.
* **m7: an empty step list fails silently.** `loadConfigured` would run with no steps and no rows if `onModuleInit` had not run (`demo.ts:71, 408`). Add a one-line refusal when `this.steps` is empty.

**Not checked by me:** the full suite run and the protected set (CI); the two parallel-port dry runs (notes §5.3); the four guard scans that need a live copy, beyond reading them.
