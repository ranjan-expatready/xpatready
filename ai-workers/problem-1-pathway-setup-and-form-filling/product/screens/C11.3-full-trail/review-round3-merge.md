# Review round 3 (merge re-check): C11.3 QA-150, full five-part trail, after main's SH2 (#504)

Reviewer agent, 2 Nov 2026. Exact commit **dbffdf94**, branch `claude/vibrant-hopper-a48qgk`. This is a merge of 0054d6e5, which rounds 1 and 2 approved, with origin/main 76a5b0b1. Isolated copies on :4443 and :4444 only, never :4400. Live AI off, US$0. Nothing committed. The one mutation was put back with `git checkout --`, and the working tree was clean at the end.

**Verdict (skill wording): Ship.** Journey score **9/10**, pass (`journey-test-reviewer-2026-11-02-round3-merge.md`).

## 1. The resolution keeps both sides' behaviour: yes
* **form-uses.ts:** the merge takes main's version exactly: `import { combinationTrails, formLines, formReleases } from "./where-used.ts"` and `export { combinationTrails }`. Only the comment changed. The row's own copy of the function, and its `engine/structure.ts` import, are gone. So there is still one copy, as P-258 requires.
* **where-used.ts:** main's file is kept unchanged except in `combinationTrails`. In that function:
  * the `fullTrail, trailWords` import from `engine/structure.ts` is added;
  * `clientType` is added to the `programDef` select;
  * the body is the row's 0054d6e5 body, line for line: the chain from the Pathway down, then `trailWords(fullTrail(chain))`, falling back to `c.label`.
  * Main's signature stays (`db: Client`, so a transaction client also works).
  * Nothing else in the file changed: `mappedBoxes`, `itemCombinations`, `formLines`, `formCombinations`, `formReleases`, `itemReleases` and `openCases` are main's text.
* **Nothing else of the row was lost.** `git diff 76a5b0b1 dbffdf94` on studio shows only the row's own files: finder.ts, runs.ts, engine/structure.ts, library-forms.tsx and the three tests. Their content is identical to the row's diff from the merge base to 0054d6e5. The only difference is that `combinationTrails` moved from form-uses.ts to where-used.ts.
* **Nothing of SH2 was lost.** `git diff 0054d6e5 dbffdf94` on api, engine and web is exactly main's SH2 change set: where-used.ts (api and engine), library-sources.ts, library-items.ts, impact.ts, form-uses.ts and runtime/case.ts.
* **No layering problem.** api/where-used.ts now imports `engine/structure.ts`, a pure file whose only imports are contracts. SH2's purity rule (P-249) applies to `engine/where-used.ts`, which is unchanged.

## 2. No caller of `combinationTrails` was missed: confirmed
I searched `combinationTrails` in api, engine and web at all four commits: the merge base 50df70dc, 0054d6e5, 76a5b0b1 and dbffdf94.
* **library-items.ts:68** imports it from `./where-used.ts` (main's change). It now gets five parts. API on :4443 and :4444: the `uses` of `family_members`, `person.uci` and the fee document type read "Retail › Temporary residence › Work permits › Employer-specific work permit › With an LMIA", plus "… · release 1".
* **form-library.ts:101** imports it from `./form-uses.ts`. The re-export resolves to the where-used copy. The Used by cells, the Used by filter and the `can.*` messages get five parts (checked in the browser).
* **form-uses.ts:25** calls the imported copy. "See where it is used" gets five parts (browser and c113).
* **impact.ts** and **library-sources.ts** never called it, on either side. impact uses `formCombinations` (the combination's label) and library-sources `usedIn` uses labels. Both are unchanged from main, so they are not callers that were missed (see the note below).
* No other copy of the old rule (`nodeKind !== "PATHWAY"` plus join) is left in where-used.ts, form-uses.ts or library-items.ts.

## 3. `tests/check_sh2_where_used.ts` still holds: 24/24
It is pure and needs no server. Its static checks pass: the four callers read from `./where-used.ts`, none of them queries lines, releases or cases itself, and `engine/where-used.ts` is pure.

## Suites I re-ran on dbffdf94 (each on a fresh isolated copy)
| Suite | Result |
|---|---|
| `check_sh2_where_used.ts` | 24/24 |
| `check_c113_full_trail.ts` (:4443) | 12/12 |
| `check_c119_library_items.ts` (:4444) | 70/70 |
| `check_screen02_slice2.ts` (:4443) | 53/53 |
| `check_qa99_who_can_be_trail.ts` (:4444) | 3/3 |
| `tsc -p api` | No error in any touched file. Pre-existing errors exist only in 4 unrelated test files: c18, c69, vv_checklist, x2b. |
| `graph.mjs --check` | exit 0 |

**Mutation (the resolution is guarded).** I put main's old body back into where-used.ts `combinationTrails` (Pathway left out, plain join). `check_c113_full_trail.ts` then gave 9 passed and 3 failed: Used by, the Used by filter and See where it is used. Restored with `git checkout --`.

I did not re-run the finder (145) or the library browser (112) suites. The merge changed none of their files, and I trust the builder's results on dbffdf94 for them.

## D1–D20
No change from round 2. The merge changes no screen and no words, and the two lists served by `combinationTrails` read exactly as they did at 0054d6e5. D17 and D20 are simulated only.

## Findings (none Blocker or Major)
1. **Minor (carried over, unchanged): N1 from round 2.** `api/src/programs.ts:147` still builds the trail itself.
2. **Note (outside QA-150, not caused by the merge).** A shared field's page says "Used in combinations: Super visa, With an LMIA". That comes from `LibrarySources.usedIn`, which uses combination labels, and impact's combination list also uses labels. Both were the same on both parents, and QA-150 names only Forms Used by and the finder plan. This is recorded so that C11.3's "full trail on every list" capability is not marked done because of this row.

## Could not check
A real screen reader. An intended user's unaided walk (D17, D20). Live AI. The finder and library browser suites as written (builder's results trusted, see above).

**Verdict: Approve.** No open Blocker or Major for dbffdf94. The resolution keeps SH2's single where-used service and the row's five-part trail rule. All three callers get the five parts, and SH2's own check holds.
