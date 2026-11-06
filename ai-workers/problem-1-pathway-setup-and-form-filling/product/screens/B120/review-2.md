# B120 — re-review of the delta (runtime lane)

6 Nov 2026. Reviewer: a fresh context that did not build B120. Commit reviewed: **f78d51a2d** on `claude/modest-darwin-1omjpl`. That is 10512e153 (walk shots only) plus one commit that edits only `tests/check_features_registry.ts`. The delta reviewed is `git diff d150946e4 f78d51a2d -- …/prototype/studio`: 13 files, code changes in 6d8b14ac2 and f78d51a2d. The earlier review (`review.md`, d150946e4, Approve) stands for everything outside this delta. Live AI off, US$0, :4400 not touched. No isolated copy was started.

**Verdict: APPROVE.** No Blocker or Major. Two new minors (n1, n2) and one nit (n3). The fixes the builder claims are real.

## What I verified, and how
| Claim | Result | How |
|---|---|---|
| F1: a step written as a class keeps its `run` | **Holds.** `features.ts:62`: `Object.assign(Object.create(step), { file })`. `this` resolves through the prototype. `init` writes land on the kept object, and `run` reads them there. `file` is an own field. | Probe script: a class field read via `this` gives 1; a plain object's `init` then `run` gives 4 and the original is untouched. All call sites are method calls: `demo.ts:392` `s.prepare?.(ctx)`, `demo.ts:406` `s.run(ctx)`, `080-form-setup.ts:29`, `form-part-placements.ts:31`, `features.ts:64` `s.init?.()`. No step uses `this`, and no caller spreads a step or reads its keys. So for today's steps the change has no effect. |
| F2: `.js/.mjs/.cjs/.mts/.cts/.tsx/.jsx` stops the start-up | **Holds, with no false refusal today.** `features.ts:48`. | `git ls-files` of `checkpoint/` and `placement/`: 42 files, all `.ts`. `features/README.md` sits in `features/`, which `registerFeatures` reads, not `featureSteps`. `.md`, `.json`, `.d.ts`, editor backups and `.orig` are still ignored, which is correct because none of them is code. |
| m7: no steps are refused | **Holds, and cannot fire today.** `demo.ts:67` refuses at start-up; `demo.ts:387` refuses before anything is written. | The checkpoint folder has 18 steps. A guard that only throws on an empty list changes nothing else. |
| m6: constants moved to `checkpoint/_constants.ts` | **Holds.** The values are byte-identical (the same text, built from the same `PROTOTYPE`/`STUDIO` from `core.ts`). | `demo.ts`'s export list at d150946e4 and at the head has the same names, now with `export { BY_HAND_REASON, RELEASE, SAMPLES } from`. No file under `features/` imports `demo.ts`; it is imported only by `main.ts` and `demo-reset-to-six.ts`. No test reads the constants from `demo.ts` as text. `_constants.ts` is a helper (`_*`), so it is not a step. |
| m3: date columns compared again | **Sound.** `demo-dump.mjs:99` masks only `timestamp%`. | Rows come from `row_to_json` as strings. A `date` column reads `"2026-11-06"`, which the date-time pattern `ISO` (`:43`) does not match, so the value is compared and not masked by accident. The builder's head dump (scratchpad `kc.dump`) shows `"read_on":"2026-11-06"`, `citation_date`/`captured_on`/`recheck_by` nulls, and no `<t>` on them. The only risk is a dump taken on another day, and that gives a false difference, never a false match. |
| m2: comment pointers | **Fixed.** All four pointers now name the step files. | Read in the diff: `form-part-placements.ts:9`, `demo.ts:277`, `form-setup.ts:143`, `check_c10_1_configured.ts:78`. |
| Byte-equal at 6d8b14ac2 vs main | **Agrees with the builder's dumps.** I did not regenerate them; doing so needs the uncommitted `ai.ts` patch, which I may not apply. | I re-ran `cmp` on the builder's dumps: `kc`/`lc` (configured, 11,022 rows) exit 0, and `k6`/`l6` (six, 1,251 rows) exit 0. The two HTTP results agree on rows, released, finder, drafts, missing and cost US$0 once UUIDs are masked; the 13 checkpoint rows match; the timings keys match; all 43 log lines match in order once seconds are masked. |
| f78d51a2d's order check | **Sound.** `inOrder` requires every old step to be present, with strictly rising indexes, and leaves room for new steps between them. A missing step fails; a swap fails, and the new fail check covers that case. | Reasoned from the code, plus the run below. |
| Tests and typecheck | `check_features_registry.ts` at f78d51a2d: **27 passed, 0 failed, exit 0**. At 10512e153: 26/26. `product/tools/typecheck.mjs`: **PASS, exit 0** (15 known errors, none new). | Run with `tsx --tsconfig api/tsconfig.json`. |

## Findings
* **n1 (minor): the init check became a tautology** (`tests/check_features_registry.ts:67`). The F1 test clears `order` (`:64`). Line 67 then re-runs the steps and adds `"init 20", "init 100"` to the front by hand, so the check named "each step's init runs once at load, in order, before any run" no longer observes init at all.
  * **Mutation:** I copied the test into the scratchpad, removed `for (const s of steps) await s.init?.()` (`features.ts:64`) from a copy of `features.ts`, and ran it. The init check still printed PASS.
  * **Fix:** take a snapshot of `order` before the F1 block, and assert on that snapshot.
  * **Why minor, not Major:** end to end, init is still covered. `080-form-setup`'s `init` loads the combination steps, so without it the configured checkpoint does no form setup, and `check_c10_1_configured.ts` would fail.
* **n2 (minor): F1's fix covers public members only.** A class step that keeps state in a private field (`#svc`) fails at run time with `TypeError: Cannot read private member #n from an object whose class did not declare it`, because the kept object is not the instance. This was reproduced in the probe. No step today is a class, so nothing breaks now. **Fix (either):** keep the instance itself and record `file` beside it, not on it; or say in `features/README.md` that a step is a plain object, or a class without `#private` members.
* **n3 (nit): m7 covers the checkpoint folder only.** An empty `checkpoint/combination/` or `placement/` folder would still be accepted silently: `080-form-setup.ts:23` and `form-part-placements.ts:25` do no length check. Today they hold 14 steps and 2 passes, and the order checks at f78d51a2d would fail on an empty list. No action needed in this PR.

## Still with the tech lead (unchanged)
* **m1:** the M2 hot-file list does not cover `features/checkpoint/` or `features/placement/`.
* **m5 / F3:** two reads have no fixed order, `proposals.ts:185` and `combination/310-checklist-documents.ts:38`.
* **F4:** placing from form parts is not refused during a load.

None of these is in this delta.

## Not checked by me
* The suites and the protected set at this head (re-running separately).
* A fresh regeneration of the byte-equal dumps.
* The two-port merge that f78d51a2d's message cites (27/27 on the merge).
* The walk shots in `shots/`.

**Confidence:** high that the delta does what it claims and changes no behaviour. The runtime changes are a wrapper that today's call sites cannot tell apart from the old copy, two guards that cannot fire, and moved constants with identical values. Medium on data parity: I re-checked it from the builder's dumps but did not regenerate them.
