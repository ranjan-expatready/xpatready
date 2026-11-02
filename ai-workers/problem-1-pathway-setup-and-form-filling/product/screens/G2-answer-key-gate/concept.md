# G2 Release refused: no passing signed answer-key test (C5.5): concept v1 (2 Nov 2026)

Status: **v1, waiting for the independent challenge, then the tech lead's approval** (P-223 (4); no board: the screen part is lines in the existing "Validation of the draft" list). Screens builder, branch `claude/brave-ritchie-7cev1n`. Built on G4 (#513, #525: families, keys, runs, Tests tab) and beside G1 (#558, source register: concept v2 BR-7, BR-8). **Rec.** = recommendation. ⚑ = a point where the row text and a decision differ.
- Row (task, tech lead): "a release with an unsigned or failing answer-key test on a map, scoring table or rule set is refused naming each item; a missing test only warns; the demo's Visitor visa Demo release still goes through; API and browser checks". BACKLOG G2: "maps, scoring tables and rule sets without a passing expert-signed test are refused; a combination without a test only warns (W7)".

## 1. Job and journey
**Job:** before a real release, every form map and eligibility rule set of the combination has passed an answer-key test whose expected values the immigration expert signed; the author sees on Review and release which items stop it and why, and fixes them on Tests. *"Never let firms use a map no signed test has proved on this draft."*
**Who:** the author fixes (Tests tab, G4); the expert signs keys (G4); the approver releases and sees the test results it releases on. Journey J5, step 5 "Review and release" (Change set). **Sources:** SA-01B v2.1 SA-1B-296 r3 (run at submit and at publish), r4 (the gate; E7, E8, W7 in the check list), r5 (per edition), r8 (no off switch); SA-1B-181 r5, SA-1B-199; P-240 (both gates; Sample = demo only), G3 (`isDemoSnapshot`), G4 concept BR-5, BR-7.

## 2. Ten layers
- **Masters:** none new. `answer_key`, `answer_key_run`, `test_family` (G4, forms lane) are read; runs are written by the gate as G4's Run does. **No migration.**
- **Engine:** new pure `engine/answer-key-gate.ts`: `testableItems(s)` (the same items as G4's Tests list: each PDF map with entries, the eligibility gates) and `answerKeyProblems(items, keys, {demo})` → `Problem[]` with `where: "Tests"`. It reuses `runFieldMap`, `runRuleSet`, `runState` unchanged. No I/O (P-249).
- **API:** new `api/src/answer-key-gate.ts`: `keyStates(db, s, combinationId, {run?: actor})` reads every key of the combination with its last run (one query); with `run` it runs each key on the draft first and stores the run (`ranBy` = the actor). Called from `studio.problems()` (additive) and from programs.ts `draftProblems`, **never `relProblems`** (G1 BR-7: a released row keeps its catalogue status). The inventory reader moves from `AnswerKeys` to one exported function both use (forms-lane file, named in the PR's first line).
- **Contract:** no new route. Problems keep their shape; refusals add `errors[]` (BR-8).
- **Screen:** the existing "Validation of the draft" list on Review and release gets "Tests" lines with **Fix on Tests**; a new "Answer-key tests" block lists what the release runs on (BR-9). The Release page's held reason. `WHERE_STEP.Tests → release`.
- **AI:** none (SA-1B-296 r4: "expected results are never written by AI"). US$0. **Governance:** the release's summary records the keys it passed on (BR-9); audit "test run (passed / failed)" as G4.

## 3. Business rules
- **BR-1 What is tested.** Items = each PDF field map with entries in the draft (form + edition) and the eligibility rule set when it has gates; per combination (G4 Q2). Scoring tables: none exist (G4 Q1, `NO_SCORING`), so none are listed; the rule names them so the first table joins. E8 ("any other item's test fails"): no other item has tests, **Not built**.
- **BR-2 The kind of release is decided first and never changed by G2.** Demo = `isDemoSnapshot(draft)` (a Sample combination or a Sample check, G3). Otherwise real. An untested or unsigned map never turns a real release into a Demo release (no silent downgrade).
- **BR-3 An item passes** when at least one key for it is Signed and every key for it passed on the draft as it is now (`runState` = PASSED: same key version, item and inputs fingerprints). Per edition: a key written for another edition fails (G4 BR-6, SA-1B-296 r5).
- **BR-4 The levels (⚑ Decision 1).**
  | Item state | Real release | Demo release |
  |---|---|---|
  | a key failed on this draft | **error** | **error** (a known wrong map is never released, not even as a demo) |
  | keys pass but none is signed | **error** | warning "Sample: not signed" |
  | no key at all | **error (E7) — Rec.** · warning if the row text stands | warning |
  | not run on this draft | warning "runs at Submit" (page only; BR-5) | warning |
  W7: a combination with no key at all also gets one warning "This combination has no answer-key test" (both kinds).
- **BR-5 Tests run at Submit and again at release** (SA-1B-296 r3). Submit, Approve and `releaseRows` run every key on the exact draft before judging, store each run, then judge; the page views (Review, catalogue, Release page) read stored runs only (a run is ~60 ms for IMM 5257, measured; too slow for every page load). A stale run is therefore a warning on the page, never an error that would grey Submit before Submit could run it.
- **BR-6 Signed means now.** A key unsigned between Submit and Approve (a change returns it to Draft, G4 BR-7) refuses the Approve: the gate re-reads keys at release.
- **BR-7 Fit with G1.** Both gates add problems to the same `studio.problems()` list and the same `draftProblems`, so Review shows one list and one count; neither calls the other. G1 refuses in every workspace; G2 lowers only the Sample cases (BR-4) on a Demo release.
- **BR-8 Refused, naming each.** Submit (400), Approve (409), `releaseRows` (409): the Problem Details carry every blocking problem in `errors[]` (each `{where, item, message}`), and `detail` names the count and the first three; today's Approve and release name only the first (`studio.ts:896`, `:949`). Shared with G1 BR-8: whichever lands first builds it, the other reuses it.
- **BR-9 The approver sees what the release rests on.** Review shows "Answer-key tests" (per item: family, Signed by/at or Draft, last result n of m, run time). The release's `summary.answer_keys` freezes `[{item_kind, item_ref, family, key_version, state, signed_by, result, passed, failed, run_id}]`: **not** the snapshot, so fingerprints and `diff()` are unchanged and key changes alone never make a release (SA-1B-296 r2's "approved by the second person with the draft" = approving the release shown with its keys; Q2).
- **BR-10 No off switch** (SA-1B-296 r8): no setting, header or actor skips the gate; tests and scaffolding pass it through the product.

## 4. Layout (EXPERIENCE §3, Change set)
- **Validation of the draft** (existing list): each Tests line reads "Tests · IMM 5257 field map: …" with **Fix on Tests** (`/c/:id/tests`, the item opened). Error lines first, as now; Submit greyed "Fix the problems first" as now.
- **Answer-key tests** block under it: one row per item: Item · Family · Expert · Last run · Result chip (Passed / Failed n of m / Not run / No test / Sample: not signed). Empty: "Nothing here is tested by an answer key." Demo release: a line "Demo release: tests not signed by the expert are allowed; failing tests are not."
- **Release page:** a held row reads its first reason, e.g. "Held back: IMM 1295 field map has no answer-key test".
- States: loading, empty, all passing, refused (409 list), read-only (approver sees, cannot fix), 400 px full width, keyboard reaches Fix on Tests.

## 5. Copy
- Missing (E7): "IMM 1295 field map: no answer-key test. Write a test family's expected values on Tests; the immigration expert signs them."
- Not signed: "IMM 5257 field map: the answer-key test (family "e1") is not signed by the immigration expert. A real release needs a signed, passing test."
- Failed: "IMM 5257 field map: the answer-key test (family "e1") failed: 2 of 66 values. Family name (principal): expected "SAMPLE", got "OTHER"." (SA-1B-296 test: "1 test failed: IMM 1295, box Family name.", with P-63's "form field")
- Not run: "IMM 5257 field map: the answer-key test (family "e1") has not run on this draft; it runs at Submit."
- Demo, not signed: "IMM 5257 field map: the answer-key test is Sample (not signed by the expert): allowed only in a Demo release."
- W7: "This combination has no answer-key test." · 409: "Release refused: 3 items have no passing signed answer-key test. Each is listed on Review and release."

## 6. Contract and tests
- Routes unchanged; `GET /combinations/:id` and `/review` problems gain Tests lines; `review` gains `answer_keys[]`; refusals gain `errors[]`.
- **Engine `check_g2_answer_key_gate.ts`** (pass + fail per BR): items listed (2 maps, no gates, Visitor visa); BR-3 signed + passed passes, unsigned does not; BR-4 each cell of the table; BR-2 a Sample check makes Demo, an unsigned key does not.
- **API `check_g2_answer_key_gate_api.ts`** on an isolated copy: With an LMIA with an unsigned passing key → Submit 400 naming the item, with `errors[]` listing each; signed → passes; a map change after Submit → Approve runs, fails, 409 naming the family's failing value; unsign between Submit and Approve → 409; the Release page holds the row with the reason; the release's `summary.answer_keys` names the signed key; Visitor visa (Sample) with no key and with the E1 unsigned key → Demo release goes through; a failing key on the Visitor visa → refused; no actor or header skips it (BR-10).
- **Browser `check_g2_answer_key_gate_browser.cjs`**, axe + keyboard at 1440, 1024, 400 px: Review shows the Tests lines and Fix on Tests opens the item; sign on Tests → back to Review, the line is gone; release.
- **Blast radius (scaffolding, P-33):** under Decision 1 Rec., every suite that releases With an LMIA (about 25 by a grep; G1 touches the same suites with `sourceEveryNumber`) calls one helper `passEveryAnswerKey(api, id)` that writes a family, takes the run's values as the expected values, has the expert sign and runs, **through the API**. It is scaffolding only (the product never fills expected values from a run: G4 §4). Suites on Sample combinations need nothing.
- Scale: `draftProblems` over the catalogue adds one keys query per workspace and fingerprints only for items that have keys; ≤ 50 ms on the demo.

## 6b. Capability or scaffolding · Needed or Not built
Capability, Needed: BR-1–BR-10, the Tests lines with Fix, the Answer-key tests block, the release summary, the Release page reason, the refusal list. Not built: scoring-table items (no tables), E8 for other items, auto-run "for every item that reads it" beyond the combination's own items (SA-1B-296 r3; every key of the combination runs, which covers it), approver sample families (SA-1B-38 r3), refusal in a second workspace (none exists; G3). Scaffolding, Needed: `passEveryAnswerKey`.

## 7. Questions (for the tech lead)
1. ⚑ **A map with no test on a real release: error or warning?** The row text says "a missing test only warns"; P-240 ("publishes only after a passing answer-key test signed by the immigration expert; a combination without a test only warns, W7") and SA-1B-296 r4 ("a missing test blocks publishing just as a failed one does"; relaxing it needs the product owner's yes, r8) make it an error, with W7 for the combination as a whole. **Rec.: error (E7)** on a real release, warning on a Demo release; cost: the helper over about 25 suites, in the same pass as G1's. If you mean warning, it is one cell of BR-4 and the helper is not needed; the founder's P-240 wording then needs a line in DECISIONS.
2. **The approver approves key changes "with the draft"** by releasing with the Answer-key tests block shown and frozen in the summary (BR-9), not by a sign-off line per key in `diff()`. **Rec.: as written** (a key change alone never needs a release; it changes nothing firms use).
3. **A failing key refuses a Demo release too** (BR-4). **Rec.: yes**: P-240 lets the demo release Sample content, not content a test has shown wrong.

## Definition of ready
Acceptance tests named (`check_g2_answer_key_gate.ts`, `_api.ts`, `_browser.cjs`) · row text as above · Q1 answered (Q2, Q3 carry recommendations) · the challenge in `challenge.md` with every Blocker and Major fixed · the tech lead's OK (P-223 (4)). Build after G1's PR 2a lands or before it: both only add lines to `problems()`; the second merges the first's `errors[]` refusal.
