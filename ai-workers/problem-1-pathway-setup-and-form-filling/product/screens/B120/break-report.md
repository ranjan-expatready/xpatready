# B120 break report (schema-adjacent seed data, P-278)

6 Nov 2026, 09:20–10:50 IST. Breaker, runtime lane. **Commit tested: `d150946e4`** (branch `claude/modest-darwin-1omjpl`), against `origin/main` **`ea8e35763`**. The branch head moved to `5ae4165ba` meanwhile, which adds only `review.md` (no code). Live AI off, US$0. The :4400 demo was not touched.
**Setup.** Scratch worktrees `/home/user/b120-break` (d150946e4) and `/home/user/b120bk-main` (ea8e35763), with `.tools` and `studio/node_modules` as symlinks. The local `serial-ai.patch` was applied to both, never to the main clone. Copies: `b120bkm1`, `b120bkm2` (main) and `b120bkb1`–`b3`, `b120bkst` (branch), one at a time on **port 4435 only**, all started with `STUDIO_AI_PARALLEL=1`. Every copy is stopped, no `xr_studio_b120bk*` database is left, and both worktrees are removed.
**Method.** `tools/demo-dump.mjs` dumps, plain and with `DEMO_DUMP_FULL=1`, compared with `cmp`. When `cmp` differs, a second pass compares the dumps with tokens stripped, every JSON list sorted and Reset's own audit row dropped (that row records what the previous state held). Calls are `POST /api/demo/load {"sample":"configured"}`, `/api/demo/reset`, `/api/demo/reset-to-six` and `/api/combinations/:id/place-from-form-parts`, each with `x-actor: user-A`.

## Findings (all reproduced on d150946e4)

**F1 · Minor · a step file of the wrong shape passes start-up, then fails the load after every row is written.** `api/src/features.ts:56-57`.
* Steps: plant `features/checkpoint/175-class-step.ts` with `export default new (class { async run(ctx) { ctx.log.push("…") } })();`, start the copy, then load configured.
* Expected (notes §2: "refuses at start-up … when a file has the wrong shape"): start-up stops and names the file.
* Actual:
  * `isolated.sh … start` exits 0 ("isolated b120bkst on http://localhost:4435"). The check `typeof step.run === "function"` passes, because `run` is on the class's prototype. Then `steps.push({ ...step, file })` copies only the instance's own properties, so `run` is lost.
  * The load answers **500**: "Loading stopped after:   row 17 New edition: IMM 5476 2021 → 11-2025 comparison and impact: done. Reason: an unexpected error on the server …". The server log says `TypeError: s.run is not a function`. Every earlier row's data has been written, and the load is marked failed.
* New with B120: main has no step files.

**F2 · Minor · a step saved as `.js` or `.mts` is skipped without a word.** `api/src/features.ts:46` keeps only `*.ts` files.
* Steps: plant `checkpoint/175-held-again.mts`, then `checkpoint/175-held-again.js`. Each file's `run` throws.
* Expected (notes §2: "Any other file must be a step: a misnamed step must never be skipped quietly"): start-up refuses.
* Actual: start-up exits 0 both times. With `005-js-first.js` planted (its `run` throws "b120bk js step ran"), the load got past row 17, so that step never ran.
* `registerFeatures` (`features.ts:18`) has the same filter, so this matches `features.ts`, but it does not meet the rule stated for steps.

**F3 · Minor (evidence; the cause predates B120 and is on main) · dumps of two runs of the same code differ outside the tool's masks, so `cmp` alone cannot tell a refactor's change from noise.**
* Main against main, the same sequence (Reset to the six → Reset → configured) on two copies, `m1` and `m2`:
  * the sorted comparison differs in exactly one `proposal_item` row: its reason says "Close to person.alt_phone_number, person.alternate_phone_number, …" in one run and "Close to person.alternate_phone_number, person.alt_phone_number, …" in the other;
  * its `identity.near` list is in a different order too.
* Fresh copies (sha256 shown is the tool's):

  | Copies compared | Result |
  |---|---|
  | `m1`, `m2` (main), `b2`, `b3` (branch) | all equal, `cmp` exit 0 (`7eb0db7d1c8a7ed0`) |
  | `b1` (branch) against `m1` (main) | `cmp` exit 1 (`247a7771a3597b5f`), 22,176 differing lines |

  The only content difference behind `b1`'s 22,176 lines is the order of `identity.near` on the IMM 1344 proposal `person.previous_marriage_or_common_law`. One unmasked order changes every token, so the raw diff cannot be read.
* Cause: `api/src/proposals.ts:185` reads the library fields with `canonicalField.findMany`, which has no `orderBy`. B120 does not change that file.
* Also order-dependent, but outside the dump: the load log line "vv.single: 4 document lines from IMM 5484's saved reading … 15 rejected …" lists the rejected items in a varying order (`combination/310-checklist-documents.ts:38`, `findMany` with no `orderBy`; main has the same line). Over 12 loads (5 on main, 7 on the branch) the order was never fixed: 6 distinct lines on main and branch alike. The line also goes into a failed load's audit detail.
* Effect on B120's evidence: "byte-equal after Reset" cannot hold even main against main, and the fresh check can fail by chance. The notes' claim that two runs of main are byte-equal held only for fresh copies here.

**F4 · Minor (predates B120; same on main) · "Ask them in their form's sections" is not refused during a load.**
* Steps: while a configured load runs, call `POST /api/combinations/:id/place-from-form-parts` every 2 s on each live combination.
* Expected, per the brief: 409.
* Actual, on both main and the branch: every call answers **200**: 257 calls on the branch, 197 on main. 37 "ran placement step" audit lines were written during the branch's load. The load still answers 201 with every row done, and the query for two live placements of one fact returns no rows.
* The route checks only its own per-combination `running` set (`form-part-placements.ts`, unchanged), never `Demo.loading`. So questions a person asks land in the middle of the checkpoint's own data. Not caused by B120.

## What held

* **Fresh configured checkpoint.**
  * Branch against main, fresh copies: `b2` and `b3` against `m1`/`m2` give `cmp` exit 0, plain and `DEMO_DUMP_FULL=1` (`79a598e522add87d`): 11,022 rows, 88 tables, 130 files, 43 PDFs by size.
  * The response matches main: same keys, same `timings` keys in the same order, same `checkpoint` rows and `released`. Its 43 log lines match too, except the F3 line.
* **No state leaks between runs.**

  | Sequence (same on main and branch) | Result |
  |---|---|
  | configured → Reset → configured | equal to a fresh run once sorted, except F3's order |
  | a failed load (F-path 3) → Reset → configured | `cmp` exit 0 main vs branch, plain `053453343d1ccd9a` and full `b1eef848ad7fe07d` |
  | configured ×2 → Reset to the six | `cmp` exit 0 on `m1`, `m2` and `b1` (`84e060e0b46bb8cb`, full `6e99373883a6a065`; 1,251 rows, 59 files) |
  | … → Reset to the six → Reset → configured | equal to main once sorted, except F3's order; full-content file lines: 0 differences |

  Per-run state (`stateOf`, keyed by the run's context) left nothing behind.
* **Concurrency.** These calls, made 1 s into a load, all answer 409 with main's exact words:

  | Call | Words |
  |---|---|
  | a second load | "The sample inputs are already loading: wait for them to finish." |
  | Reset | "A sample load or Reset to the six is running: wait for it to finish, then reset." |
  | Reset to the six | "Reset to the six or a sample load is already running: wait for it to finish." |
  | release-with-sources | "A sample load or a reset is running: wait for it to finish." |

  The first load then answers 201 with every row done. No 500, no half-load.
* **Failure paths.** Database refusals were planted with triggers on the copy's own database; the code is the same on both sides. For each, main and the branch give identical response bodies once ids and seconds are masked, and the same audit line, "Loading the sample inputs stopped: …", with its log (the F3 line apart):

  | Trigger refuses | Response on both |
  |---|---|
  | the IRM 0002 attachment | 201; row 3 partial ("IRM 0002 was not attached to the Visitor visa: This file could not be added just now …"); rows 9, 11, 12 waiting; row 10 partial |
  | the IRM 0002 AI batch | 500 "Loading stopped after:   row 2 Online forms captured with the browser extension: out. Reason: an unexpected error on the server (the details are in the server log). Reset the demo, then load again." (27 log lines) |
  | the final "configured checkpoint" audit line | 500 "Loading stopped after:   row 17 New edition: … done. Reason: …" (43 log lines) |

* **Start-up refusals.** Each case stopped start-up ("did not start", exit 1), naming the file:

  | File planted | Message |
  |---|---|
  | `checkpoint/090-dup.ts` | "…090-dup.ts and …090-row-seven.ts: two steps with one number" |
  | `90-row-seven-again.ts` (same number as `090`) | the same tie message |
  | `175-no-run.ts` | "…: export default { run(ctx) … }" |
  | `175_held.ts`, `175-Held.ts` | "…: not a step; name a step NNN-<feature>.ts" |
  | `combination/200-place-again.ts` | the tie message, through 080's `init` |
  | `placement/30-extra.ts` with no `run` | the run message |
  | a step whose `init` throws | stops; the stack names the file |
