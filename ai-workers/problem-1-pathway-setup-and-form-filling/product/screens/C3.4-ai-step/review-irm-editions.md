# Review: printed editions may start with IRM as well as IMM (PR #820), commit bff5fa380

Reviewer: a fresh agent that did not build it. Diff `origin/main...bff5fa380` (11 files, +88/-11). Copy-free only (Lead 3's copy cap): no isolated copy, no server, no browser, no model call, US$0. This is a runtime row with nothing on screen, so the screen checks that apply are correctness, the money path, the contracts and the tests. The journey score is in `journey-test-reviewer-2026-11-04-irm-editions.md` (8/10, pass).

## Done-when (tech lead), with evidence
| Criterion | Result |
|---|---|
| A check fails on main ("IRM 0002 (03-2021)" refused) and passes on the branch | `check_irm_editions.ts`: **9/9, exit 0** on the branch. With the 9 non-test files restored from the merge base: **1/9, exit 1**, and IRM 0002 is refused by both contracts, `knownOk`, the studio rule and `impactContext` (the context key falls back to `edition:IRM 0002 (03-2021)`). This matches the PR body. |
| Every other edition gives the same verdict; a bad prefix ("XYZ 1") is still refused | Scratch equivalence check: 1,232 built strings (14 prefixes incl. `IMR`, `IRMM`, `irm`, `eIMM`, `(IRM)`, `IMM\|IRM`, a leading space, a trailing LF × 11 middles × 8 tails). For every string, the guard regex (read from guard.ts), `knownOk`, `PRINTED_EDITION` and the ajv-compiled entry contract give exactly `old(s) OR (s starts with IRM AND old(s with IMM in place of IRM))`. **0 mismatches.** |
| IMM keys unchanged (`editionContextKey`, replay patterns) | Same run: for every IMM string the old regex accepts, the new `PRINTED_EDITION` gives the same groups 1 and 2, so `editionContextKey` does not change (0 differences). `(?:IMM\|IRM)` does not capture, so the group numbers stay the same. `replayPattern` and `savedRunKey` do not read the edition regex or the path code. |
| tsc clean | CI `types` job (typecheck.mjs, api and web) **passed** on bff5fa380. A local `tsc -p api` shows only older errors in test files this PR does not touch. |
| `check_p2_guard.ts` / `check_p2_launch.ts` | **88/88 exit 0** / **60/60 exit 0** (launch runs in a temporary copy). git status was clean afterwards. |
| Opus review plus breaker pass | This file. The breaker pass is in `break-report-irm-editions.md` (no Blocker, no Major). |

## What held
- **Alternation scope and anchors.** Every pattern is `^(IMM|IRM) …$` or `^((?:IMM|IRM) …+?) …$` with no flags, so there is no `m` (a trailing LF is refused) and no `g` (no `lastIndex` state on the shared `PRINTED_EDITION`). The lazy `+?` changes only how the text is split into groups, not which strings are accepted: the character class has no brackets, so the match cannot cross ` (`.
- **Missed IMM-only edition checks.** I searched api, engine, web/src, contracts (JSON and zod), p2, p3, p5, studio/tools and product/tools. Only these places check a *printed edition*: both contracts, `launch.ts`, `guard.ts` and the four API files, and all of them are changed. Other readers already accept IRM or any prefix (`field-map-check.ts:31`, `impact.ts:42`, `intake.ts:61`, `form-library.ts:11`, `canada.ts:52,146`, `read_form_identity.py:33`). `finder.ts:445` handles guide numbers and is rightly left alone. `combination-config.v0` has no pattern. `released-configuration.v0` matches its derivation from `field-map-entry.v0` (the form_edition hunk is identical to what `p4/make_release_contract.py` builds).
- **Path-code fingerprint.** On main, 5 of the 40 committed stub passes that have a job matched the current path code (imm5532, the two C9.1 impact jobs, the two pqr-picks 83a49fd2 jobs). On the branch, 0 match. No test asserts that a committed stub pass is current: `check_qa_p227` checks only machine paths, `check_c91_impact_ai` and `pa_track_a_jobs` make their own stub pass and restore bytes, and `check_p2_launch:72` runs in its temporary copy. The live gate (`launch.ts:82`, `draft.ts:55`) refuses until a fresh stub pass exists, and the studio's live route always makes one first. Saved runs still replay, because their keys do not include the path code. Nothing breaks beyond the fresh stub pass the PR states.
- **Knock-on in the studio.** `sources.ts ensureJobFile` now writes `known.form_edition` for an IRM edition. No IRM job or inventory is committed (`p2/jobs`, `p1/inventory`), so QA-145's clean-clone check is unaffected. `sampleEditions()` adds IRM 0002 only after its inventory exists. `check_s6_field_drafts` checks that its forms are included (`every`), not an exact count, so it stays green. The recording pass will then plan one more edition, under `--max-usd`.
- **The two new p80 steps** (`check_forms_p80_guard.ts:132-136`) prove an IRM pass and an XYZ refusal through `admitInput` with the real refusal text. I could not run them (server suite). CI shards were pending at review time.

## D1-D20 (runtime row: the screen dimensions have nothing to change)
D1 fit 9: IRM 0002 accepted as the row asks, every other edition unchanged. D2 integrity 8: IMM keys identical; the guard still has no code-to-edition tie (Minor 1). D3 reuse 9: one studio rule replaces four copies. D4 rules 9: same accepted set apart from IRM. D5 recovery 9: the stale stub pass is refused, replays still work. D6 governance n/a. D7 AI trust 9: the money guard rules are otherwise unchanged. D8-D15 n/a (no screen); D15 speed 10 (no backtracking). D16 testability 7: main-fail and branch-pass proven; the drift check is narrow and the guard has no pure test (Minors 2-3). D17 and D20: simulated only. D18 provenance 9: the edition comes from the official manifest. D19 n/a.

## Blockers
None.

## Major
None.

## Minor
1. **The new guard pass case admits a record whose edition does not belong to its form** (`check_forms_p80_guard.ts:132-133`, `guard.ts:102`). The approval stays `code: "IMM 1344"` and only its edition is relabelled `IRM 0002 (03-2021)`, and the step counts "admitted" as the pass. The guard has never tied `rec.code` to the edition (an old gap, breaker m1). This test now locks that mismatch in. Fix: set `code: "IRM 0002"` in the IRM case, or add the code-and-edition tie and a refusal case for a mismatched code.
2. **The drift check is textual and narrow** (`check_irm_editions.ts:57-59`). It reads only top-level `api/src/*.ts` and only the spellings `/^IMM [0-9A-Z ]` and `/^(IMM [0-9A-Z ]`. A copy in `api/src/features/`, `engine/`, `tools/`, as `new RegExp(…)` or as `/^IMM\s…` would pass it. Behaviour is tested for `impactContext` only, not for `sampleEditions`, `ensureJobFile` or `FormMasters.target`. Fix: widen the file glob to `api/src/**`, `engine/` and `tools/`, and add one pure call of `sampleEditions`' parser or `ensureJobFile`'s `known` for an IRM edition.
3. **The guard's IRM rule has no pure (copy-free) test.** Only the server suite p80 exercises it. `p2/guard.ts` is the money guard, so one `admitInput` IRM pass and fail case in `prototype/tests/check_p2_guard.ts`, or a regex parity case in `check_irm_editions.ts`, would let a guard revert fail without a database.
4. **Latent IMM-only readers outside editions** (breaker m5, no effect today): `engine/import.ts:112` keeps a release rule that names `form IRM …` even when its form is dropped, and `p2/assemble.ts:82` never collects `IRM…_MM-YYYY` internal template ids, so it would print "none found". No committed release holds IRM.
5. `knownOk` uses `String(known.form_edition)`, so an array holding the edition passes (breaker m2). The line existed before this PR, but the PR edits it. Add `typeof === "string"` as `combination_trail` does.

Out of scope, recorded: `make_release_contract.py --check` already **fails on main** (a `description` on the fact field, not form_edition), so `check_p4_views` is red before and after this PR. The stub-pass fingerprint does not cover the contracts (breaker m4).

## What I could not check
- The server suites (`check_forms_p80_guard` incl. the 2 new steps, `pa_track_a_jobs`, `qa99`, `c1113`, `d3_saved_edition`, `c34_masters`, `c34_ai`): they need an isolated copy. CI shards were pending.
- A browser walk: nothing visible changes, and no copy was allowed.
- **Working tree moved during the review.** After my checks, another session left uncommitted edits in this worktree to `p2/guard.ts`, `p2/launch.ts`, `p2/assemble.ts`, `engine/import.ts` and both tests. They look like fixes for the breaker findings, and they change the money guard (`rec.code` must equal the printed code). I did not touch them. This verdict covers **bff5fa380 only**: a new head needs at least a check of what changed since, with `check_p2_guard`, `check_p2_launch` and p80 rerun.

**Verdict: Approve** (bff5fa380). No open Blocker or Major. Minors 1-3 are worth folding into the follow-up commit already in progress.
