# Scores re-measured, 11 Nov 2026 (fresh read-only reader, P-455 (5))

Tree read: `prototype/studio/` on branch head 5e05e892e; `git diff origin/main HEAD -- prototype` is empty, so this is `origin/main` fbfb263c7's code.
Rubric: `05-scores-to-9.md` §2 (this folder). The scripts the reader used (`cycles.mjs`, `read.mjs`) stayed in the analyst's scratch space and are not committed: re-run by writing the same counts. Nothing was run against a database or browser (no `node_modules` in this copy), so every number is a static count. Scripts: `cycles.mjs` and `read.mjs` beside this file.
Size of what was read: api/src 221 files, 32,459 lines; engine 87 files, 13,274; web/src 118 files, 19,819; contracts 36 files, 3,310; tests 574 files; acceptance 85 packs.

## Summary

| Dimension | Before | Today | One-line basis |
|---|---|---|---|
| Design | 4 (5 Nov) | **4** | 3 folder-level cycles, 7 code files over 800 lines, web imports 10 non-contract files |
| Safe to change | 4 (5 Nov) | **5** | types and an `any` ratchet in CI, 574 test files; no lint, no formatter, no coverage per PR |
| Readability | 3 (5 Nov) | **3** | 419 `any`, 5,871 lines over 200 characters, longest function about 248 lines, no formatter |
| Rule logic | 6 (5 Nov) | **6** | 0 of 4 named defects closed, 1 partly; `npm audit` not measured |
| Configurable | 6 (10 Nov) | **6** | 7 of 7 rule tables still files; BK-10 done, BK-11 and BK-12 not |
| Flexible | 5 (10 Nov) | **6** | allow-list 12 entries (the rubric's 6); 1 of 6 combinations ready to file |
| Scalable | 5 (10 Nov) | **5** | QA-278 open, in-memory queue, local disk, no snapshot cache, no load test |

## Design: 4 → 4

| Measured | Number | How measured |
|---|---|---|
| Import cycles between folder groups (13 groups) | **3**: `engine` root ⇄ `engine/runtime` (7 imports one way, 46 back); `api/src` root ⇄ `features/checkpoint` ⇄ `features/placement` (4 one way, 65 back); `web/src` root ⇄ `components` ⇄ `pages` ⇄ `runtime` (`components → pages` 5) | `node cycles.mjs <studio>` (relative and `@/` imports, strongly connected components). The rubric named 2; the web one is new to the count because `@/` imports are parsed |
| File-level cycles | 5 groups, sizes 17 (api), 14 (engine), 10 (web pages + components), 2, 2. Without `import type`: 7 groups, sizes 10, 10, 5, 3, 2, 2, 2 | same script |
| `contracts → engine` | 1 type import (makes a `contracts ⇄ engine` cycle at top level; 0 top-level cycles once type imports are left out) | same script |
| Files over 800 lines | **8**: `schema.prisma` 2,857; `studio.ts` 1,262; `questionnaire.tsx` 1,044; `proposals.ts` 1,035; `sources.ts` 996; `runtime.ts` 967; `finder.ts` 952; `case-prepare.ts` 952 | `wc -l`, sorted |
| Does web import only contracts? | **No**: 126 imports of contracts, 9 of engine (`setup-checklist`, `fact-name`, `filing-modes`, `runtime/open-lines`, `runtime/sign-order`), 1 of api (`web/src/runtime/review.tsx → api/src/review-run-shapes.ts`) | same script, "web->non-contracts" lines |
| Engine reaching the database | 3 engine files name Prisma (`engine/snapshot.ts:92` takes `PrismaClient`) | `grep -rlE "PrismaClient|@prisma/client|generated/prisma" engine` |
| Flat api folder | 221 files, most in one folder; `api → engine` 341 imports | `ls`, script |

**One step up (5):** break the `engine` root ⇄ `engine/runtime` cycle (7 imports to move) and the `components → pages` 5 imports; split the two files over 1,000 lines in api. **8 needs:** 0 cycles, 0 code files over 800 lines.

## Safe to change: 4 → 5

The 5 is my reading of the same kind of evidence; no gate was added since 5 Nov that I could find.

| Measured | Number | How measured |
|---|---|---|
| Test files | 574 under `tests/` (536 named `check_*`, 127 browser), 85 acceptance packs; about 12,800 assertion calls | `find`, `grep -rEc "(ok|eq|check|expect|assert)\("` |
| Acceptance packs per capability | 85 packs name **73 of 112** capabilities (C1 3, C2 3, C3 12, C4 9, C5 3, C6 19, C7 12, C8 3, C9 3, C10 2, C11 14, X1a 2) | `ls acceptance/*.test.ts`; 112 from `product/qa/CAPABILITIES.md` rows |
| Engine files a test imports directly | **81 of 87**; none for `editions`, `fact-name`, `form-type`, `printed-choices`, `runtime/gates`, `runtime/sign-order` (the last is tested through `signing.ts`) | grep of import paths in tests and acceptance |
| Pass and fail test per rule, 3 sampled files | **3 of 3**: `engine/eligibility-gates.ts` (`tests/check_c69_gates.ts`, 89 checks, "BR-2 fail" lines 38-53); `engine/runtime/signing.ts` + `sign-order.ts` (`check_c81_signing.ts:22-28`); `engine/runtime/cross-checks.ts` (`check_c75_cross_checks.ts:19-53`, a pass case per rule) | read |
| Types in CI | **Yes**: job "types", `tsc --noEmit`, `strict: true` for api and web (`ci.yml:386-413`); 16 known errors allowed in `product/tools/typecheck-known.txt` | grep, `wc -l` |
| Lint, formatter | **None**: no eslint, prettier or biome config; no such step in `ci.yml` (18 `eslint-disable` comments remain with no linter to read them) | `find`, grep |
| `any` ratchet in CI | **Yes**: `count-any.mjs --against` (`ci.yml:272`), baseline 433 (`tools/any-baseline.json`) | read |
| Coverage figure | **Not in CI, not per PR.** `c8` is a dev dependency; the last figures are by hand, 28 Oct: api/src 97.21% lines, 82.75% branches; engine 99.38% lines (`product/qa/reports/2026-10-28-after-merge-r3.md:55`). Two weeks old; today's is **not measured** | grep |

**One step up (6):** print coverage per module on every PR (Node's V8 coverage or the `c8` already installed). **8 needs:** also lint and format in CI.

## Readability: 3 → 3

| Measured | Number | How measured |
|---|---|---|
| `any` | **419** (api/src 150, engine 120, web/src 149; contracts 1) | `grep -rEo ": any|as any|<any>"`. The repo's own tool baseline is 433; the tool could not run here. The rubric's "~318" used another pattern |
| Long lines | 5,871 of 65,978 lines over 200 characters (8.9%); 1,589 over 300; longest **1,900** characters (`api/src/review-queue.ts:288`) | `node read.mjs <studio>` |
| Longest functions (rough) | `render()` about 248 lines (`engine/render.ts:82-330`); `items` 235 lines, 30,632 characters (`api/src/review-queue.ts:91`); `execute` 205 (`api/src/finder.ts:326`); `caseView()` about 162 (`engine/runtime/case.ts:347-509`); 41 functions over 50 lines among 684 found | `read.mjs` heuristic, plus export line numbers |
| Formatter | none | as above |
| Short names | 2,852 one- or two-letter locals (`s`, `p`, `f`, `c`, `eff`) | `grep -rEc "(const|let) [a-z]{1,2} ?="` |
| Comments | 18.0% of lines; no README in `engine/`, `engine/runtime/`, `api/` | `read.mjs`, `ls` |
| Three sampled files | `engine/runtime/sign-order.ts`: clear names, each export documented, readable. `engine/validate.ts:262-274`: single lines of 400-600 characters holding a loop, a condition and a message; comments cite decision ids (W1-03, QA-52, B83) more than they explain. `api/src/fill.ts:74-95`: one 22-line method with 6 `any`, lines up to 700 characters | read |

**One step up (4):** apply a formatter once (one PR, no behaviour change). **8 needs:** also `any` ≤ 100.

## Rule logic: 6 → 6

| Defect (P-358) | Today | Where |
|---|---|---|
| Approval not atomic | **Not fixed.** Decide, then apply, in separate steps; a failed apply is undone by a compensating `updateMany`, no transaction | `api/src/screen02.ts:134-141` |
| Implication by substring | **Not fixed.** `canonical(c.tree).includes(own)` decides whether a reading condition implies the question's own condition (the form-reader check on line 272 uses equality) | `engine/validate.ts:274` |
| Preview and case differ on REQUIRE | **Not fixed, by reading.** `render()` handles SHOW, HIDE and OPTIONAL and leaves `required = true`; the case view alone sets `required` from the condition | `engine/render.ts:266-272` (0 matches for `REQUIRE` in `render.ts` and `runtime/preview.ts`) against `engine/runtime/case.ts:414` |
| Fill route with no permission check | **Partly fixed (QA-270).** The route now takes `readerOf`: nobody and an unknown name get 401, case people 403; test `tests/qa/check_qa270_preview_browser.cjs`. Still no duty check: 0 `need(` calls in `fill.ts` and `fill-case.ts` | `api/src/main.ts:128`, `api/src/core.ts:66-70` |
| `npm audit --omit=dev` | **Not measured** (offline; no audit report in the repo, no audit step in CI) | grep of `.github/workflows` |

Count: 0 of 4 closed, 1 partly. Per-rule pass and fail tests held on the 3 files sampled above.
**One step up (7):** close the three open defects, each with a fail test; record an `npm audit` result. **8 needs:** all four and 0 high.

## Configurable: 6 → 6

| Measured | Number | How measured |
|---|---|---|
| Rule tables outside screens | **7 of 7 still files** in `samples/`, each read by code: `fee-table.json` (5 files), `form-field-gates.json` (4), `form-script-requirements.json` (2), `form-roles.json` (2), `own-yes-no.json` (3), `fact-expiry-rules.json` (1), `fill-trials.json` (2) | `grep -rl "<name>.json" api/src engine` |
| Form set-up table | In data now (`samples/form-setup.json`, `api/src/form-setup.ts:36`, BK-10): out of code, but an eighth file, not a screen | read |
| Rubric 7's three conditions | 1 of 3: BK-10 done; fill-trial status still a file (BK-11); 7 sample-case fixture entries still on the allow-list (BK-12) | as above |

**One step up (7):** BK-11 and BK-12.

## Flexible: 5 → 6

| Measured | Number | How measured |
|---|---|---|
| B164 allow-list | **12 entries** (7 fixture, 2 "checklist not derived", 1 `vv.single` key, 1 AI-review stand-in, 1 reader content) | `tests/check_b164_no_engine_keys.ts:32-45` |
| Combinations reaching "ready to file" (Sample) | **1 of 6** (`vv.single`; 4 partial, `lm.high_wage` missing) | `04-can-it-file-a-case.md:27-32` (not re-walked by me) |
| Per-person checklist derived | 3 of the 4 combinations in `fee-table.json` (`fs.spouse` not) | `engine/runtime/case-checklist.ts:23`, the file |

The rubric sets 6 at "allow-list 12 entries"; that is today's count, so 6 by the rubric, not by a change I verified in behaviour.
**One step up (7):** allow-list to 1 entry and Study permit by data only (BK-13).

## Scalable: 5 → 5

| Measured | Number | How measured |
|---|---|---|
| QA-278 (48 case opens at once, 25 × 500) | **Open** in `product/qa/BUGS.md:39`; its check exists (`tests/qa/check_qa278_open_48.ts`); not run here | read |
| PDF fill | one Python process per form, 180-second limit | `api/src/fill.ts:64` |
| Queue | in memory, one job at a time (`fill-case.ts:167-168`, `:357-362`). Queued copies are rows, so they resume after a restart and running ones are marked failed (`:170-176`): half of the rubric's 7 | read |
| Storage | local disk under `STUDIO_VAR` | `api/src/core.ts:27-28` |
| Snapshot | built from the database each time by the engine; 0 matches for "cache" | `engine/snapshot.ts:92`, grep |
| Indexes | 77 `@@index` on 103 models; missing ones not identified by me | grep of `schema.prisma` |
| Load test | none; one `tests/speed_budget.cjs` | `ls`, grep |

**One step up (6):** fix QA-278 so 48 opens at once give 0 errors.

## What I could not back with a number

- Today's test coverage, `npm audit`, QA-278's current result and the "ready to file" grid: not run, read from records.
- Function lengths are from a line heuristic, not a parser.
- The 5 Nov scores had no rubric; "unchanged" means the rubric's conditions for the next step are not met, not that nothing improved.
