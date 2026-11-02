# G2 build notes (2 Nov 2026, screens builder, PR #568)

Built to concept v2 as approved (Q1 error, Q2 new or changed plus every item with a key, Q3 yes).

## What was built
- **Engine** `engine/answer-key-gate.ts` (pure): `testableItems`, `answerKeyGate` (BR-2–BR-5 and W7), `evidenceOf` (BR-9).
- **API** `api/src/answer-key-gate.ts`, in two parts:
  - **Read:** `gateOf` and `gatesOf` (one keys query, never a write).
  - **Write:** `runKeys`, and `keysUnchanged` (`FOR SHARE` inside the release transaction).
  - **Wired into `studio.ts`:** `problems()` takes the gate; Submit, Approve and `releaseRows` run the keys first, refuse with `errors[]`, and freeze `summary.answer_keys`.
  - **Wired into `programs.ts`:** `draftProblems` gets the gate's lines only when `changes > 0 || !rel`.
- **Workspace:** `core.ts` reads `STUDIO_WORKSPACE_KEY` (default `demo`); `isDemoWorkspace()` and `demoRelease()` use it.
- **Screen:**
  - the Tests lines in "Validation of the draft", each with **Fix on Tests**;
  - the "Answer-key tests" block (`web/src/components/answer-key-gate.tsx`);
  - an anchor and focus per item on the Tests tab;
  - `WHERE_STEP.Tests`;
  - the Overview tile leaves out Tests lines.
- **Forms-lane files** (additive changes):
  - `engine/answer-keys.ts`: `itemFingerprint`, `inventoryHash`, and optional known hashes for `fingerprintOf`, `runFieldMap` and `runRuleSet`.
  - `api/src/answer-keys.ts`: `fieldListOf`, memoised by file version, and an exported `familyOf`.

## Build discoveries
1. **G4's item fingerprint counted bookkeeping.**
   * The map entries in a snapshot carry `status` and `item_version`, and a release turns Draft into Published.
   * So every map read "changed" against its own release, and every stored run read "Not run" after a release.
   * `itemFingerprint` now reads `content()`, as the snapshot hash already does.
   * Effect on G4: runs stored before this change read "Not run" once.
2. **A shared map changed by one combination is "changed" in every combination that uses it.**
   * The Visitor visa setup edits the shared IMM 5707 map, so With an LMIA's IMM 5707 is refused (E7) until it has a signed, passing key.
   * This is as designed: firms would get the changed map.
   * For the tech lead: a library map change needs a signed key in each real combination that files the form.
3. **`tests/seed_library.cjs` named the workspace `demo`.** It now takes the copy's one workspace, so a `firm` copy can be seeded.
4. **Review and release already scrolled sideways** at 1024 px and below. The causes are not G2:
   * a long data path in the changes table ("Field map IMM 1295 … form1[0].Page2[0]…");
   * the tab row at 400 px.
   G2's block scrolls its own table, and its lines wrap; the browser check measures exactly that. **Rec.:** a screens Minor row.
5. **G3's deferred part.**
   * In a non-demo workspace a Sample combination is not refused for being Sample. G2 treats it as a real release, so it is refused until its maps have signed, passing keys (`check_g2_answer_key_gate_firm.ts`).
   * Once released, G3 still marks it as a Demo release, from the snapshot.
   * "Sample content is refused outside the demo" stays G3's deferred part; it is not built here.
6. **A real combination becomes a Demo release** when a check saved without a quote (Sample) is added. This is G3's rule, taken from the snapshot.
   * G2 then lowers its Sample cases to warnings. A failing key still refuses, and the release never counts as real.
   * That is consistent with P-240; noted so it is a known path, not a surprise.
7. **A refused Submit or Approve still stores its runs.** This is intended: the runs are the evidence of what failed. There is one audit line per pass.

8. **Devin on #568:**
   * Every mapped PDF edition of a form is its own item, and a key counts only for its edition. G4's editor, `checkExpected`, `keyBoxes` and the runner now take the edition.
   * One limit is left: G4's unique key (family, combination, item) means a second edition of the same form needs a second family. Making the edition part of the key's identity is a migration, so it is a question for the tech lead and is not built here.
   * The release transaction refuses any change to the judged key set.
9. **Reviewer m1:** "new or changed" is measured against the latest **real** release. A Demo release never counts as one, so maps first released in a demo stay new until a real release carries them.
10. **Reviewer m2:** Approve and the shared release run the keys only after their cheap refusals.

11. **Breaker M1 (fixed):** the shared release's "Every change is held back" refusal now carries `errors[]`: every blocking item of every held row, each with its combination.
12. **Breaker M2 (not changed; for the tech lead):** adding a check with no quote (Sample) makes a real combination's draft a Demo release.
    * That is G3's rule from the snapshot, and P-240's "only the demo workspace may release Sample content, as a Demo release".
    * The release is marked, never counted as real, and a failing key still refuses it.
    * Outside the demo workspace it cannot happen (`check_g2_answer_key_gate_firm.ts`).
    * Recommendation: a later row that warns the author when a check would turn a real combination's next release into a Demo release.
13. **Breaker Minors:**
    * **Fixed:**
      * a long unbroken value in a refusal line now wraps;
      * a key that tests no value fails in words, not "0 of 0 values";
      * Approve on a draft never submitted no longer runs keys (m2's order).
    * **Listed, not fixed:**
      * families sharing a label read the same;
      * there is no cap on keys per item;
      * a key added after Submit holds the Release page row, while Approve re-runs it;
      * G3's chip shows in a non-demo workspace;
      * the scale was measured outside the server (about 10 ms per changed combination with 6 maps).

## Checks
* `check_g2_answer_key_gate.ts` 59/59
* `check_g2_answer_key_gate_firm.ts` 13/13
* `check_g2_answer_key_gate_browser.cjs` 15/15
* Regression: `check_g4_answer_keys.ts` 93/93, `check_g4_tests_tab_browser.ts` 54/54, `check_setup_checklist.ts` 63/63
* `graph.mjs --check` exit 0; `count-any` 423 (base 423)
