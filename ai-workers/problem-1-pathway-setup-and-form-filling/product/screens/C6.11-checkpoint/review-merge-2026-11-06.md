# C6.11 (#1072): review, Round 3 (diff-only, merge of main and n1)

Independent reviewer, 6 Nov 2026. This is a diff-only review (P-318 (1)) of the three commits added after the round-2 Approve at 4c3cfbdd6:

* **01dbd888**: merge of origin/main (237baacd). Two files had conflicts: `api/src/demo.ts` and `api/src/runtime.ts`.
* **24c28a81**: undo refuses "Uses a representative" while the case has a representative of record (the breaker's round-2 n1).
* **520bdea2**: the n1 test on a case whose representative left, plus the J-A2 browser walk with its screenshots.

Paths are under `prototype/studio/` unless stated. Live AI was off and nothing paid was called. No server was started: the test results below come from reading the code, and the builder's measured 12/14 and 14/14 were not re-run.

## What was checked, and holds

1. **The merge is exactly the union of both sides.**
   * `git diff 237baacd 01dbd888 -- api/src/demo.ts` is one line: `minAge: r.minAge` added to the conditional body (`api/src/demo.ts:739-740`).
   * Main's B79b behaviour is kept unchanged:
     * a conditional line keeps `who`;
     * `continue` runs after a refused line;
     * `r.channel` is set Online.
   * `runtime.ts`: the only difference between the PR's delta before and after the merge is the import line. It carries main's `REPRESENTATIVE` and the PR's `FIRM_RECORD` and `USES_REPRESENTATIVE`.
   * The PR's deltas in the other files were compared before and after the merge (`form-setup.ts`, `questionnaire.tsx`, `check_b52_own_yes_no.ts`, `case-prepare.ts`, `team.ts`, `firms.json`, the tests). They are identical.
2. **`minAge` on a conditional line changes only Visitor visa IMM 5476.**
   * `saveForm` accepts it with ANSWER_CONDITIONAL:
     * `FormLineEdit.minAge` is optional and nullable (`contracts/workspace.ts:139`);
     * an `undefined` value is dropped (`api/src/studio.ts:963`).
   * So a conditional line with no `minAge` is unchanged.
   * Only one conditional rule holds a `minAge`: IMM 5476 in `VV_FORM_RULES` (`api/src/form-setup.ts:32`).
   * Every other conditional line has none:
     * LMIA and Study permit: `form-setup.ts`;
     * Express Entry and Family sponsorship: `samples/form-setup.json`. These include their IMM 5476, IMM 5475 and IMM 5604 lines.
   * `check_qa144_vv_release.ts:137` reads IMM 5476's line by its predicate only, so `|18|` in the line does not break it.
3. **Main's new code does not interact badly with the PR.**
   * Main's `offeredRoles` and `REPRESENTATIVE` filter the person role "representative" out of the roles a person may add. The PR's firm-record answers use that same subject, so they agree.
   * `linkedOf` and the employer link (`api/src/employer-link.ts:108`) copy only `organisation.*` facts. `samples/employer-cases.json` holds no `case.uses_representative`.
   * Main's tests that name the fact (`check_qa144_*_release.ts`) read release lines or preview. None of them types or undoes it on a firm case.
4. **The n1 fix is correct.**
   * Where: `api/src/case-changes.ts:41-44`. The refusal comes after `reach(officer)`, the body parse and the person lookup. It comes before the snapshot reads, the transaction, the case lock, any write and the audit line, so the refusal has no side effect.
   * Condition: the same as `putAnswer` (`api/src/runtime.ts:321`): fact `case.uses_representative`, subject role `case`, and a current `LEAD_REPRESENTATIVE` (`endedAt: null`).
   * Words and status: the same 422 and the same staff words as `putAnswer`.
   * Clients: undo is reached as officer only, so a client never gets this far. The 403 branch for clients is rightly absent.
   * Other writers of `client_canonical_answer`. No other route bypasses the rule:
     * PUT answer: refused (`runtime.ts:321`), and so is the client portal through the same route;
     * confirm section: the stored row is filtered out by `firmGives` (`runtime.ts:433, 443`);
     * undo: refused now;
     * employer link: copies `organisation.*` facts only;
     * `sample-case.ts`: goes through `putAnswer`;
     * group and row routes: write per-row facts, and this fact is a single answer.
5. **The n1 test is sound.**
   * Steps: the case opens with the firm's representative. One SQL write ends that representative, using the real columns `ended_at`, `ended_by` and `end_reason` (`prisma/schema.prisma:1304-1306`). The officer then types Yes, then No (200 each, with no current representative). The firm admin names the representative again, and the officer undoes.
   * Without the fix, undo restores Yes: 200 "Undone", and the row count goes from 2 to 3. Two assertions then fail (the 422 and "no row written"), which matches the builder's 12/14.
   * With the fix, the undo gets the 422 and its words.
   * The "pass" line guards the setup: if naming the representative failed, the run would fail rather than pass vacuously.
   * Commit 24c28a81's first version opened the case with `representative: null`. That still gives the firm's default representative (C6.11-5), so the Yes would have been refused. 520bdea2 corrects this. History is kept, and nothing needs doing.
6. **The J-A2 walk has 18 `ok` lines**, which matches the reported 18/18. Every wait has a timeout, and an exception records a FAIL. The checks for [2.1], [2.2] (dialog and route), VV-R10 (two adults, no child, with `heads.length === 2`), [5.1], the item's representative before and after, the print step, axe and sideways scroll each check what their name says. One exception is the [2.5] history line, Minor m2 below.
7. **Typecheck:** `node product/tools/typecheck.mjs` gives `PASS no new type errors (15 known, 0 fixed)`. Web has 0 errors. `node --check` on the walk passes.

## Findings

### Blocker
None.

### Major
None.

### Minor

**m1. The packs' setup loop does not keep the conditional line's minimum age, so it no longer matches the checkpoint's loop. File: `acceptance/lib/pack2.ts:137`.**
* Main's B79b brought `who` on a conditional line to both loops: `demo.ts` and `pack2.ts`, which is "the checkpoint's own" table, P-319.
* The PR's approved `minAge` reached only `demo.ts`.
* Result: on a release the packs build, Visitor visa IMM 5476 gets `who: principal_partner_adult_children` with no minimum age. The resolver gates children by age only through the line's minimum age (`contracts/resolver.ts:126-128`), so on those releases a dependent child of any age would get IMM 5476. The checkpoint and the demo are correct.
* No pack test asserts IMM 5476 per child today, so nothing goes red. This is a latent split between the two readers of one table, not a regression in the product.
* Fix: add `minAge: r.minAge` to pack2's conditional body, the same one-word change as in `demo.ts`. It can go in this PR or a follow-up row.

**m2. The J-A2 [2.5] history check asserts less than its name says. File: `tests/runtime/check_c611_ja2_browser.cjs:131`.**
* The name says "the history keeps the earlier representative, who changed it and why".
* The test checks only two things:
  * the reason text, which does appear only in History;
  * `/R000002/`.
* `R000002` is the new representative's licence. It shows in the dialog's "Representative of record" paragraph and in the "IMM 5476 fills: membership number" line (`web/src/runtime/team.tsx:102-103`). History rows show only names and "from … by …" (`team.tsx:136`).
* Neither the earlier representative's ended line nor who changed it is asserted.
* Fix: scope to the History list. Assert one row for "Representative (Sample)" with "to … by" (ended), and one row for "Second representative (Sample)" with "· now" and the reason.

### Nit

**n1. The rule is written twice. Files: `api/src/runtime.ts:321`, `api/src/case-changes.ts:43`.**
* "Uses a representative is given by the case team" is the same condition in both files, with the same staff sentence copied.
* One helper would stop them drifting apart, for example in `engine/runtime/team.ts` or on `Runtime`. Its body would be `count(LEAD_REPRESENTATIVE, endedAt null)` with role `case`.
* Both checks also run before the case lock, so a representative named at the same moment could slip one write through. This is the same as the approved PUT path, so no fix is asked for now.

**n2. The n1 test names the same representative again. File: `tests/runtime/check_c611_checkpoint.ts:40-42`.**
* It names user-R again after ending user-R; the breaker's steps named user-T.
* Both are valid paths and the test proves the rule either way. Naming user-T would follow the breaker's steps to the letter.

## Verdict

The merge keeps main's behaviour and the PR's approved behaviour. The n1 fix is correct and complete for every route that writes the fact. The tests are sound. m1 and m2 are small and do not block.

**Approve**
