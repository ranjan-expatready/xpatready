# Review: Q2 on #325, one rule for whose list a document line goes on (shared engine fix)

Reviewer role, fresh agent, did not build it. 1 Nov 2026.
* **Reviewed commit: 4bdcbf1b** (`git diff d66d9fdf 4bdcbf1b`, commits 95e10f53 and 4bdcbf1b on `holders-local`).
* I read everything through git. No branch was checked out, and nothing was pushed. Mutations ran in a throwaway `git archive` copy under `/tmp`, never in the working tree. US$0.
* Concept: BR-3 in `screens/M3-agent-view/concept-draft.md:35` ("conditions on that person's facts"). Ruling: `screens/M3-B-checklist/review.md` "Preview against runtime" (runtime right, one shared function, STANDARDS §7).
* Journey score: **7/10**, simulated at engine level, no browser (`journey-test-reviewer-2026-11-01.md`).

**Verdict: Block.** The code is correct on every edge case I tried. But three of the new function's stated rules, and the documentFacts change, have no test that fails when the rule is removed (STANDARDS.md:22, D16). This is the Major below. Adding about four checks fixes it.

## Runs
* `tsx … tests/check_line_holders.ts`: **12/12 passed**.
* `count-any.mjs --against origin/main`: **428 = base**, no new `any`.
* In the copy: `check_vv_checklist.ts` passed 60/60 and `check_engine.ts` passed 41/41.
* The full `run-suites --changed` run is the builder's, and they will relay its results. I have not seen them.

## Correctness: probe in the copy (2 children, spouse, a case line)
| Edge case | Preview (render) | Documents tab | Case checklist | OK |
|---|---|---|---|---|
| Principal's line, SPOUSE condition | on A, decided by B's answer; the decider is asked of B | principal | A | yes |
| No spouse | "Not needed" | principal | "Not needed: … there is none on the case." | yes (see m1) |
| Case-level line, PRINCIPAL condition | on "The application", decided by A | case | on A (documented: each caller places it) | yes |
| DEPENDENT condition, non-child holder (A), 2 children | Needed when any child holds | principal | A | yes |
| DEPENDENT condition, child holder | each child decided on its own answers (C1 Not needed, C2 Needed) | child | per child | yes |
| DOCUMENT condition | "Cannot tell yet", no decider | listed | waiting, "depends on a document's contents" | yes (see m1) |
* `conditionFor` (case-checklist.ts:186-190) now gives the same results as before: the runtime never passes `"case"` as holder, and the "nobody" words are kept.
* `documentFacts`: a DOCUMENT-condition line now supplies its facts, including `holder.spouse` facts, to the right person. With no spouse, those facts are dropped. A principal's SPOUSE-condition line now supplies the principal, not the spouse. That is correct under BR-3.

## Knock-on effects (callers)
* Callers checked:
  * Preview's checklist: `render().checklist` → `web/src/pages/preview.tsx:53,106`, `runtime/preview.ts:85,109`, `check_engine`, `check_c3_11_signed_scan`, `check_studio_browser`.
  * Documents tab: `sources.checklist()` → `api/src/person-checklist.ts:49,61,77`.
  * `documentFacts()` → `coverage.ts:37`, `sources.ts:105`, `runtime/preview.ts:71`, `check_w115_slice1`.
* Effect on today's data: in `p3/releases/c1-v3` and `tests/fixtures/screen01-work-permit-release.json`, no line has a `who` that differs from its condition's subject. Only the two `each_applicant / DOCUMENT` lines change:
  * They are "Certified translation …" and "Translator's affidavit".
  * They now appear for each applicant, both in Preview (as "Cannot tell yet") and on the Documents tab.
  * They supply no facts, so coverage gaps and fact sources do not change.
  * Any suite that counts Preview or Documents-tab rows for those releases will move. The builder's run-suites results confirm or refute this.
* Client view (`runtime/preview.ts:85`): a fact is skipped only when its line is "Needed". A DOCUMENT line never is, so its questions are still asked. That is right.
* Moves (`person-checklist.ts:61`): positions are stored per line, so the lines that now appear can be moved without a migration.

## Issues
**Major 1 (Must): rules without a failing test (STANDARDS.md:22, D16; the brief's "passing and failing test per rule").** I removed each rule in the copy. These removals pass both `check_line_holders` and `check_vv_checklist`:
* (a) DEPENDENT "the holder when a child" (`render.ts:63`, holder-role test → `false`).
  * Check `:33` asserts `C` for a child holder, but the fixture has one child. "Every child" is then also `C`, so the check proves nothing.
  * Fix: use two children and assert `C1 → [C1]`.
* (h) "any subject true → true" (`render.ts:74`, `some` → `every`). No check has more than one subject.
  * Fix: a principal's line with a DEPENDENT condition and two children, one holding (pass) and none holding (fail).
* (i) A case-level holder decided on the principal's answers (`render.ts:63`, `holder === "case" ? principal`). The fixture has no `who: "case"` line, which was the brief's own edge case.
  * Fix: add a case line with a PRINCIPAL condition. Assert that Preview lists it under "case", decided by the principal, and that the case checklist puts it on A.
* (g) `documentFacts` back to the old holders (`sources.ts:51`). Nothing in the new suite reads `documentFacts`.
  * Fix: assert that a principal's SPOUSE-condition line supplies the principal's fact and not the spouse's (pass and fail), and that a DOCUMENT-condition line still supplies its facts.
* Check `:34` is named "… and says who is missing", but it asserts only `applies === false`. Changing the `nobody` words (`render.ts:72`), or dropping them in `case-checklist.ts:190`, passes every suite.
  * Fix: assert `.nobody === "spouse or partner"`, or the runtime reason.
* Score: 7 of the 13 rule removals are caught (b, c, d, e, f, j, m). These 6 are not: a, h, i, g, k, l.

**Minor 1 (Should): Preview's words for the new states (D10).**
* The stat "N depend on an answer" (`web/src/pages/preview.tsx:53`) now counts DOCUMENT-condition lines, which depend on a document, not an answer.
* The row (`render.ts:236-238`) shows "Cannot tell yet" with only `condition_plain`. `lineCondition` returns `document` and `nobody`, but render drops them. The case checklist says "depends on a document's contents …" and "there is none on the case".
* Fix: put those two reasons on the render row (`why`), so the engine has one wording.

**Minor 2 (Should): the comment does not match the code.**
* `conditionSubjects`' comment says "EACH_APPLICANT, EACH_PERSON or none → the holder". For holder `"case"`, the code returns the principal (`render.ts:63`).
* Preview changes because of this: a case line with no subject kind used to read only case facts, and now reads the principal's as well. This matches the runtime, so the code is right.
* Fix: say so in the comment.

**Note (not in this item's scope, no change asked):** forms (`render.ts:187-188`) and rules (`render.ts:265`) still use the old pattern, for example a form's SPOUSE condition read on the holder. It is worth recording next to C6.4 review item 1 for a later item.

## D1–D20 (engine-only item; no screen element changed)
D1 5: BR-3 met on every edge case above · D2 5: pure, nothing stored · D3 5: the duplicate `conditionFor` logic was removed, leaving one shared function (§7) · D4 4: every line resolves to a state; DOCUMENT lines are no longer dropped · D5 n/a · D6 n/a · D7 5: origin and quote kept on rows · D8 n/a · D9 4: see m1 · D10 3: m1 · D11 4: m1 · D12 n/a · D13 n/a · D14 n/a · D15 5: no I/O, no per-row requests · **D16 2: Major 1** · D17 simulated only · D18 4: the reason for a document line is missing in Preview · D19 4: Preview, the Documents tab and the case checklist agree (check `:54`) · D20 simulated only.

## Could not check
* No browser walk at 1024 px or 200 % zoom, and no keyboard walk. I had no copy of my own: the working tree was in use and my brief limited me to the unit suite. The visible effect is only extra or moved rows in existing tables.
* The full run-suites results, which the builder is relaying.
* `node tools/graph.mjs`: these engine functions have no page or route in `GRAPH.md`, so there is no graph finding.

**Verdict: Block** (commit 4bdcbf1b). To fix:
1. Major 1: add failing tests for (a) a DEPENDENT condition on a child holder with two children, (h) "any subject is enough", (i) a case-level line with a PRINCIPAL condition, (g) `documentFacts` holders, and the `nobody` words.
2. Minor 1 and Minor 2 can ride along or be fixed later.
