# G2 Release refused: no passing signed answer-key test (C5.5): concept v2 (2 Nov 2026)

Status: **v2, approved by the tech lead on #568 (2 Nov 17:30 UTC; Q1 error, Q2 new or changed plus every item with a key, Q3 yes), after the independent challenge (`challenge.md`: Build after these changes; 0 Blockers, 2 Majors, 9 Minors: all taken, §8)** (P-223 (4); no board: the screen part is lines in the existing "Validation of the draft" list and one block on Review and release). Screens builder (tech lead's assignment; BACKLOG lists `forms`), branch `claude/brave-ritchie-7cev1n`. Built on G4 (#513, #525) and beside G1 (#558; concept v2 BR-7, BR-8, and the tech lead's condition on its Decision 1). **Rec.** = recommendation. ⚑ = a point where the row text and a decision or the team's card differ.
- Row (task): "a release with an unsigned or failing answer-key test on a map, scoring table or rule set is refused naming each item; a missing test only warns; the demo's Visitor visa Demo release still goes through; API and browser checks". BACKLOG G2: "maps, scoring tables and rule sets without a passing expert-signed test are refused; a combination without a test only warns (W7)".

## 1. Job and journey
**Job:** before a real release, every form map and eligibility rule set the release publishes has passed an answer-key test whose expected values the immigration expert signed; Review and release says which items stop it and why, and **Fix on Tests** opens each. *"Never let firms use a map no signed test has proved on this draft."*
**Who:** the author fixes (Tests tab, G4); the expert signs keys (G4); the approver releases and sees what the release rests on. J5 step 5, Change set pattern. **Sources:** SA-01B v2.1 SA-1B-296 r2–r5, r8; SA-1B-63 E7, E8, W7; SA-1B-181 r5; SA-1B-199; SA-1B-38 r5; P-240; G3 `isDemoSnapshot`; G4 BR-5–BR-7; the tech lead on #558 (Sample passes only in the demo workspace, as a Demo release).

## 2. Ten layers
- **Masters:** none new; **no migration**. Reads `answer_key`, `answer_key_run`, `test_family` (G4); the gate writes runs as G4's Run does; `config_release.summary.answer_keys` (JSON) holds the evidence.
- **Engine:** new pure `engine/answer-key-gate.ts`: `testableItems(s, released?)` (G4's items: each PDF map with entries, the eligibility gates; each marked new or changed against the released snapshot by its item fingerprint) and `answerKeyProblems(items, states, {demo})` → `Problem[]`, `where: "Tests"`, `forms: [form]`. Reuses `runFieldMap`, `runRuleSet`, `runState`; `fingerprintOf` gets an optional known snapshot hash (one hash per judgement, not one per item). No I/O (P-249).
- **API:** new `api/src/answer-key-gate.ts`, two functions (challenge m4): `keyStatesFor(db, workspaceId, combinationIds[])` (read, one query, no `lines`) for every page; `runKeys(actor, c, snapshot)` (write) only in Submit, Approve and `releaseRows`, after their cheap refusals, one audit line per pass ("tests run: n passed, m failed"). Inventories through `inventoryOrNull`, memoised by path (m5, m6); that reader becomes one exported function of `api/src/answer-keys.ts` (forms-lane file, named in the PR's first line).
- **Wiring:** `studio.problems()` and programs.ts `draftProblems` (additive; G1 adds beside them); **never `relProblems`**; in the catalogue only when `changes > 0 || !rel` (M1).
- **Workspace:** `WORKSPACE_KEY` reads `STUDIO_WORKSPACE_KEY` (default `demo`) and `isDemoWorkspace()` says which; an isolated copy started with another key is a non-demo workspace for the refusal test. `core.ts`, shared with G1's condition: whichever lands first builds it.
- **Screen:** Tests lines in "Validation of the draft" with **Fix on Tests**; "Answer-key tests" block; Release page held reason; `WHERE_STEP.Tests → release`; the Overview "Rules and checks" tile leaves Tests out. **AI:** none; US$0.

## 3. Business rules
- **BR-1 What is tested.** PDF field maps with entries (form + edition) and the eligibility rule set when it has gates. Not gated: online maps (parked), scoring tables (none exist; `NO_SCORING`), E8 "other items" (none have tests): §6b.
- **BR-2 Which items a release must prove (⚑ Q2).** Rec.: items **new or changed since the last release** (item fingerprint differs from the released snapshot's; a new edition is a new item, SA-1B-296 r5; a first release has only new items), **plus every item whose key exists** (its key runs and must not fail: "every item that reads it", r3). An unchanged, untested item gets one warning "released before the answer-key gate; untested" (the launch count, SA-01B ch 4 r4, counts these). Grounds: r4 "the author fixes the item, adds the test, or **reverts the item to its published version, and the rest of the draft can publish**"; r3 runs tests "for every item changed in the draft and every item that reads it". The challenger recommends every map at every release (r1); cost then: With an LMIA gets no Release 2 in the demo until all 6 of its maps have signed keys.
- **BR-3 The kind of release is decided first; G2 never changes it.** Demo = the demo workspace **and** `isDemoSnapshot(draft)` (G3: a Sample combination or a Sample check), the same derivation as the page's flag (m9). Otherwise real (every release in a non-demo workspace is real). An untested or unsigned map never turns a real release into a Demo release (no silent downgrade; challenge m2: sound).
- **BR-4 An item passes** when at least one of its keys is Signed and every key for it passed on this draft (`runState` PASSED: same key version, item and inputs fingerprints). A key for another edition fails (G4 BR-6).
- **BR-5 Levels (gated items only, BR-2).**
  | Item state | Real release | Demo release |
  |---|---|---|
  | a key failed on this draft | **error** | **error** (Q3) |
  | cannot be tested (no form field list recorded, m6) | **error** | warning |
  | keys pass, none Signed | **error** | warning "Sample: not signed" |
  | no key (E7) | **error** (⚑ Q1) | warning |
  | not run on this draft | warning "runs at Submit" before Submit; **held** on the Release page once submitted (m3) | same |
  W7 (row level): one warning "This combination has no answer-key test" only when it has no key and no item line already says so (m1).
- **BR-6 Tests run at Submit and again at release** (r3). Submit, Approve, `releaseRows` run every key of the combination on the exact draft, store the runs, then judge; pages read stored runs (~60 ms per IMM 5257 run, measured). Inside the release transaction the judged keys are re-read `FOR SHARE` and compared on `(id, version, state)`; a change is a 409 (m8).
- **BR-7 Signed means now.** A key returned to Draft after Submit refuses Approve (re-read at release).
- **BR-8 Refused, naming each** (shared with G1 BR-8): Submit 400, Approve 409, `releaseRows` 409 carry every blocking problem in `errors[]` (`{where, item, forms, message}`); `detail` names the count and the first three (today Approve and release name one: `studio.ts:896`, `:949`).
- **BR-9 The approver sees what the release rests on.** "Answer-key tests" block: per item and key, family label, Signed by/at or Draft, last result n of m, and "expected values changed since Release n: <reason>" when the key version differs from the previous release's summary (m7). `summary.answer_keys` freezes `[{item_kind, item_ref, edition, family, key_id, key_version, state, signed_by, result, passed, failed, run_id}]`; the runs it names are kept. Not in the snapshot: fingerprints, `diff()` and case pinning stay as they are.
- **BR-10 No off switch** (r8): no setting, header or actor skips it; tests pass it through the product.

## 4. Layout (EXPERIENCE §3, Change set)
- **Validation of the draft:** "Tests · IMM 5257 field map: …" with **Fix on Tests** (`/c/:id/tests`); errors first; Submit greyed "Fix the problems first" as now. A form's own page shows its lines (`forms`).
- **Answer-key tests** block: Item · Family · Expert · Last run · Result chip (Passed · Failed n of m · Not run · No test · Cannot be tested · Sample: not signed). Empty: "Nothing here is tested by an answer key." Demo release line: "Demo release: tests not signed by the expert are allowed; failing tests are not." Approver: read-only.
- **Release page:** held row, e.g. "Held back: IMM 1295 field map has no answer-key test". States: loading, empty, all passing, refused list, read-only, 400 px, keyboard reaches Fix on Tests.

## 5. Copy (family by its label; no decision numbers on the main path, m9)
- E7: "IMM 1295 field map: no answer-key test. Write a test family's expected values on Tests; the immigration expert signs them."
- Not signed: "IMM 5257 field map: the answer-key test for the family "E1 household: the mother visits, her husband stays home (Sample)" is not signed. The immigration expert signs it on Tests; a real release needs a signed, passing test."
- Failed: "IMM 5257 field map: the answer-key test for "E1 household: the mother visits, her husband stays home (Sample)" failed: 2 of 66 values. Family name (principal): expected "SAMPLE", got "OTHER"."
- Not run: "… has not run on this draft; it runs at Submit." · Cannot be tested: "IMM 1295 field map cannot be tested: its form field list is not recorded."
- Demo: "… is Sample (not signed by the expert): allowed only in a Demo release." · Unchanged: "IMM 1295 field map: released before the answer-key gate; untested."
- W7: "This combination has no answer-key test." · 409: "Release refused: 3 items have no passing signed answer-key test. Each is listed on Review and release."

## 6. Contract and tests
- Routes unchanged; problems gain Tests lines; `GET …/review` gains `answer_keys[]`; refusals gain `errors[]`.
- **Engine `check_g2_answer_key_gate.ts`:** one pass and one fail per BR and per BR-5 cell, with G4's hand-written E1 key (`tests/g4_e1_key.ts`), never only self-copied values; BR-2 new/changed/unchanged and a new edition; BR-3 Sample check → Demo, unsigned key → still real, non-demo workspace → real.
- **API `check_g2_answer_key_gate_api.ts`** (isolated copy): GET writes nothing; Submit stores runs; With an LMIA, a changed IMM 5707 map with an unsigned passing key → Submit 400 naming it, `errors[]` each; signed → passes; a map change after Submit → Approve 409 naming the failing value; unsign after Submit → 409; Release page holds the row; `summary.answer_keys` names the key; a Live unchanged With an LMIA keeps step 5 done (M1); Visitor visa (Sample) with no key and with the unsigned E1 key → Demo release goes through; a failing key on it → refused; the same Visitor visa content on a copy with `STUDIO_WORKSPACE_KEY=firm` → refused, each item named.
- **Browser `check_g2_answer_key_gate_browser.cjs`**, axe + keyboard at 1440, 1024, 400 px: the Tests lines, Fix on Tests opens the item, the expert signs, back on Review the line is gone, release.
- **Blast radius (M2):** build step 1 is a spike: run the suites that submit or release with the gate on and no helper, and list what fails (BR-2 Rec. limits it to suites that change a map of a real combination). Then one shared helper `tests/lib/release-ready.ts` (with G1's `sourceEveryNumber`), API only, tests only, labelled scaffolding: per form a family on which the form applies, the run's values taken as the expected values, signed, run. One suite proves a helper-made key is live (change the map → refused). Where a suite only needs "a release", it moves to a Sample combination instead.
- Scale: one keys query per page, one snapshot hash per judgement; measured time in the PR.

## 6b. Capability or scaffolding · Needed or Not built
Capability, Needed: BR-1–BR-10, Tests lines with Fix, the block, the summary with its "changed since" marker, the Release page reason, the refusal list, the workspace key. Not built: scoring-table items, E8, online maps, approver sample families (SA-1B-38 r3), auto-fill of expected values in the product. Scaffolding, Needed: `release-ready.ts`, the non-demo isolated copy.

## 7. Questions (for the tech lead; recommendation first)
1. ⚑ **A gated map with no test on a real release: error.** P-240, BACKLOG G2, SA-1B-296 r4 and r8 (relaxing needs the product owner's yes) all say error; the task's "a missing test only warns" reads as W7, the combination-level warning. **Rec.: error (E7)**, warning on a Demo release. Say so if you meant otherwise.
2. ⚑ **Scope: maps new or changed since the last release (plus any key that exists), or every map at every release?** **Rec.: new or changed** (BR-2: r4's "reverts the item to its published version, and the rest can publish", r3, the separate launch count). The challenger recommends every map; then With an LMIA cannot release again in the demo until its 6 maps have signed keys, and the helper touches more suites.
3. **A failing key refuses a Demo release too.** **Rec.: yes**: P-240 lets the demo release Sample content, not content a test has shown wrong (the challenger agrees).

## 8. Challenge taken
M1 → §2 wiring, BR-5, the tile, a test (G1 told on its PR). M2 → §6 spike first, shared helper, helper-key-is-live test. m1 → BR-5 W7, Q1 framed as answered. m2 → BR-3, Q2's cost. m3 → BR-5 held after Submit. m4 → §2 two functions, order, one audit line. m5 → §2 one hash, memoised inventories, one query. m6 → BR-5 "cannot be tested". m7 → BR-9 marker, runs kept. m8 → BR-6 `FOR SHARE`. m9 → `forms`, family label, online maps in 6b, owner named, demo flag from the snapshot. Founder questions 1–3 of the challenge → Q2, BR-3, Q3.

## Definition of ready
Acceptance tests named (`check_g2_answer_key_gate.ts`, `_api.ts`, `_browser.cjs`) · row text as above · Q1–Q2 answered (Q3 carries a recommendation) · the tech lead's OK (P-223 (4)). Order with G1's wiring: both only add lines to `problems()` and `draftProblems`; the second to land reuses the first's `errors[]` refusal and workspace key.
