# G2 Release refused: no passing signed answer-key test (C5.5): independent challenge (2 Nov 2026)

Challenger: fresh context, did not write `concept.md` v1. Read: the concept, P-240, SA-01B v2.1 SA-1B-296 (r1-r8), SA-1B-63 (E7, E8, W7, r1), SA-1B-181 r5, SA-1B-199, SA-1B-38 r3-r5, G4 concept and `api/src/answer-keys.ts`, `engine/answer-keys.ts`, G1 concept v2 (from `origin/claude/funny-curie-mbttn2`), G3 `review.md`, `engine/validate.ts` `isDemoSnapshot`, `api/src/studio.ts`, `api/src/programs.ts`, `engine/setup-checklist.ts`, `web/src/pages/review.tsx`, `web/src/pages/workspace/overview.tsx`, STANDARDS, EXPERIENCE, QUALITY.
Not done: I did not start an app (the isolated runner needs the Mac's `.tools` and database), so no timing is mine; every performance point is **judgment, not measured**. `ai-workers/tools/freshness.sh` could not run here (no `code/` folder), so the SA-01B copy (v2.1, 27 Oct, in `domain/requirements-2026-11-02/`) is cited as written and anything about the team's code is **Unverified**.
Labels: **N** = Needed for the proof · **NB** = Not built (record it, do not build it now). Confidence: H / M / L.

## Verdict: Build after these changes
No Blocker. The design is right in its shape: the judgement is a pure function over stored key states, the evidence goes in the release summary and not the snapshot, nothing in the release path can skip it, and BR-2 holds. Two Majors would ship a visible regression or an unproven test plan. Fix M1 and M2 in the concept, take the Minors that are cheap.

## Objections

### Major

**M1. Tests errors on `draftProblems` make a Live, unchanged row look broken. (N, H)**
- *What breaks:* `programs.ts:216` passes `problems: draftProblems` into the setup checklist. `setup-checklist.ts:148` pushes "Fix n problems" onto step 5 whenever a draft problem maps to `release`, outside the `changes > 0 || !release` test at `:149`, and `:165` makes step 5 "done" only with `open.release` empty. `WHERE_STEP.Tests -> release` therefore turns the Release step of a Live row with no draft changes (With an LMIA, Release 1, no keys: 6 E7 errors) from done to "Fix 6 problems". Until now an unchanged draft has had no problems, because it equals a validated release. G1's `sourceProblems` does the same on the same row. The concept's rule (BR-7 / "never relProblems") protects `status` only. Second place: `overview.tsx:18,40` counts every problem except `Release` in the "Rules and checks" tile ("6 problems to fix" under a rules tile).
- *Fix:* add the Tests problems to the catalogue's `draftProblems` only when `changes > 0 || !rel` (the same test that decides whether Release is offered); exclude `Tests` from the Overview tile filter (or give it its own line). Add a fail test: a Live, unchanged With an LMIA keeps step 5 done. Tell G1 (same fix, same lines).

**M2. The blast-radius plan is not proven, and the count is a guess. (N, M)**
- *What breaks:* `passEveryAnswerKey` needs one family on which every one of With an LMIA's 6 maps *applies*. In `runFieldMap` a form whose condition cannot be settled is a failed line (`engine/answer-keys.ts:305`), and a key that expects values for a person the form does not apply to fails (`:308`), while a key with no person is refused (`:169`). A family built on E1's visitor household (`samples/answer-key-families.json`) will not make a work-permit set apply. So "take the run's values as expected" may produce no valid key for some of the six. Nothing in the concept shows a spike.
- *Count:* by grep, 61 files under `tests/` call submit, approve or `/pack/release`; 18 name "LMIA"; 3 create their own program node (the Sample nodes inherit ILLUSTRATIVE, so they release as Demo and need nothing). The author's "about 25" is not the figure. The true list is the suites that fail.
- *Fix:* (a) before any other work, a spike: one family, With an LMIA, all 6 maps, through the API; record the result in the concept. (b) The build's first step is to run the whole suite with the gate on and no helper, and list what fails. (c) If no single family fits, per-form families in the helper, or move the suites that only need "a release" onto a Sample combination (cheaper, and it does not weaken them). (d) One shared test helper with G1's `sourceEveryNumber` (for example `tests/lib/release-ready.ts`), created by whoever lands first.

### Minor

**m1. Q1 is already answered, and "warning" is not the tech lead's to choose. (N, H)**
- The ⚑ is against the task's wording, not the backlog. BACKLOG G2 reads "maps, scoring tables and rule sets without a passing expert-signed test are refused; a combination without a test only warns (W7)". P-240 says the same twice ("a map or rule set without a passing signed test blocks a real release"; "a combination without a test only warns, W7"). SA-1B-63 E7 is "missing or failed"; SA-1B-296 r4 "a missing test blocks like a failed one"; r8 "relaxing needs proof-of-concept evidence and the product owner's yes". **BR-4 follows P-240 and the card: keep E7 as an error.** Take Q1 out of the questions; write "E7 per P-240" and drop the "if you mean warning" branch (it would need the founder and a DECISIONS line, not a cell edit).
- W7 is a *row-level* warning in the card (a programme row with no test of its own, SA-1B-296 r4). When a combination's maps already produce E7 errors, a W7 line on top is noise. Show W7 only when the combination has no testable item and no key (then it is the only line). **Fix: one condition.**

**m2. BR-2 is right; say why, and say what it costs. (N, H)**
- *Sound:* P-240's "Sample content releases only in the demo workspace as a Demo release" could be read as "a map with no signed test makes the release Demo". That would make the release kind depend on key state, which the snapshot does not carry. G3's own review (M1, m1) required the kind to be derived from the frozen snapshot (`isDemoSnapshot`, `validate.ts:263`). BR-2 keeps that. Keep it.
- *Cost the concept does not state:* With an LMIA (the only SOURCE_BACKED combination, `demo.ts:131`) cannot get a Release 2 in the demo until all of its PDF maps have a signed passing key. The demo's own release path (Visitor visa, steps 9-12) is a Sample combination and still goes through with warnings. Write this sentence into the concept and into the PR; it is the founder's Q2 below.

**m3. Judging at read versus judging at release can disagree on a stale run. (N, M)**
- The Release page holds rows from `r.errors` computed from stored runs (`programs.ts:351`), while `releaseRows` re-runs and then judges (`studio.ts:948`). A "Not run" is a warning on the page and a real result at release, so the page can show a row as releasable and `releaseRows` then refuses with a 409 that stops the whole batch (the loop throws on the first failing row, `studio.ts:942-952`). This is rare after Submit (a signed key that changed returns to Draft, which is already an error), but a draft submitted before G2 ships, or an edited Draft key, hits it.
- **Fix:** once a row has a submission (`gate.ok`), treat "Not run" as held on the Release page with the reason "its answer-key tests have not run on this draft: submit again". Keep it a warning only before Submit.

**m4. `keyStates` mixes a read and a write in one call. (N, M)**
- `keyStates(db, s, combinationId, {run?: actor})` is called from `problems()` (many read paths: overview GET, review, rows) and from the three write paths. One flag away from a GET that writes runs. **Fix:** two functions. `keyStatesFor(db, workspaceId, combinationIds)` (read, one query, `select` without `lines`) and `runKeys(actor, c, snapshot)` (write), called only by `submit`, `approve`, `releaseRows` before `problems()`. `problems()` gets no actor parameter.
- Order of writes: in `submit`, run after the cheap refusals ("Nothing has changed", `studio.ts:854-858`), not before. In `releaseRows`, the BR-14 refusals come after the loop (`:955-966`), so a refused self-approver has already stored runs for every row. Harmless, but state it or move the BR-14 test first.
- Audit: the gate must write one audit line per pass ("tests run: n passed, m failed"), not one per key, or the catalogue cache (`programs.ts:102` keyed on audit counts) shows the old state, and Submit fills the log.

**m5. Scale claims do not match the signature. (N, M)**
- The concept says "one keys query per workspace" but `keyStates(db, s, combinationId)` is one per combination, inside the existing per-row loop (`programs.ts:165`: `structureProblems` is already one per row). The 100-program exercise (`tools/isolated.sh`) and STANDARDS §9 ("no request per row") apply. `fingerprintOf` hashes the whole snapshot for every item (`engine/answer-keys.ts:157`), and `runFieldMap` does it again (`:292`): 6 maps = 12 full-snapshot hashes per judgement, although `buildSnapshots` already returns the same hash (`snapshot.ts:202` = `snapshotHash`). `inventoryOrNull` reads and parses a 150-700 KB JSON file synchronously for each call (`api/src/answer-keys.ts:70-77`; I measured 112 ms cold for IMM 5257 on this machine).
- **Fix (L, judgment):** batch the read; pass the known snapshot hash into `fingerprintOf` as an optional argument; memoise inventories by path and size. Then state a measured figure in the PR, not "≤ 50 ms".

**m6. An untestable map must be a named state, not a throw. (N, M)**
- `inventory()` fails with 422 when a map has no recorded form field list (`api/src/answer-keys.ts:65-69`), and `create()` cannot write a key for it (`:198`). If the gate calls it, one such map would 422 Submit or break the whole catalogue (`rows()`). Such a map can never get a passing key, so in a real release it can never be released.
- **Fix:** a seventh state "cannot be tested: no form field list is recorded" (error on a real release, warning on a Demo release), using `inventoryOrNull`. Add the pass and fail test.

**m7. SA-1B-296 r2: the approver cannot see that a signed key changed. (NB, M)**
- BR-9 freezes the keys a release rests on (right). But the card says a change to a signed key "is approved by the second person with the draft"; the concept answers with "the block is shown" and no marker. A map change that breaks a key, followed by an edited key re-signed, looks the same as an untouched one.
- **Fix (small, no `diff()` lines):** each Answer-key tests row shows "expected values changed since Release n: <reason>" when its `key_version` differs from the one in the previous release's `summary.answer_keys` (the key already keeps `change_reason`).
- Keep the stored runs a release names (`run_id`): the run's `lines` are the only record of the expected values at that time (keys are edited in place). Do not add run pruning.

**m8. A window between judging and the release transaction. (NB, M)**
- `approve` and `releaseRows` judge outside the transaction (`studio.ts:895`, `:948`); the key can be unsigned a moment later and the frozen `summary.answer_keys` is built from the earlier read. Other checks have the same window, so this is not new. **Cheap fix if wanted:** inside the release transaction `SELECT ... FROM answer_key WHERE combination_id = ANY(...) FOR SHARE` and compare `(id, version, state)` with what was judged; mismatch gives 409. G4 already locks keys with `FOR UPDATE` (`updateFamily`), so the two cooperate.

**m9. Smaller points. (mixed)**
- *Forms path (N, M):* `problems()` sets `forms` only for `Forms` (`studio.ts:391`); give a Tests problem `forms: [form]` so a form's own page shows it.
- *Copy (N, H):* `(family "e1")` shows a key to the person; use the family's label. G4's `SAMPLE_WORDS` ends "(P-240)": do not reuse it in the chip (EXPERIENCE §5: no decision numbers on the main path). The "not signed" line should name who acts: "The immigration expert signs it on Tests" (the author cannot sign, `signProblem`), and the approver's line is read-only.
- *Not gated (NB, H):* online maps (`channel ONLINE`, parked), scoring tables (none) and "any other item" (E8). The concept lists scoring and E8; add online maps to 6b so E7 is not read as complete.
- *Lane (N, L):* BACKLOG lists G2 with lane `forms`; the concept says screens builder. It edits `api/src/answer-keys.ts` (forms lane). Confirm the owner so the "named in the PR's first line" rule is met.
- *Demo flag twice (N, M):* `programs.ts:369` derives Demo from a database query; the gate must use `isDemoSnapshot(snapshot)` only, and one test should show the page flag and the gate agree on a Sample check (G3 review M1).

## What is sound
- Rules in a pure engine file with no I/O (P-249); pages read stored runs, writes only at Submit / Approve / release (a run costs ~60 ms per map, per the author; I did not measure).
- BR-3 "every key must pass, at least one signed" fits SA-1B-296 r4 and "a failing test stays listed until it passes or is reverted" (AG16-60). Per-edition (BR-6) is G4's, reused unchanged.
- No new table, no migration; the fingerprint model of G4 (`runState`, key version + item + inputs) already makes a stale Passed impossible, so the gate needs no new freshness logic.
- Evidence in `summary`, not the snapshot: fingerprints, `diff()` and case pinning (`case-prepare.ts:69`) stay as they are; consistent with G1's `snapshot.sources` only-when-present pattern.
- BR-8 (`errors[]`, naming each) shared with G1; BR-10 holds: `publishRow` is reachable only from `approve` and `releaseRows` (`studio.ts:912,972`); the only other release write is the sample loader's Release 1 (`demo.ts:147`), which is scaffolding and already outside any gate.
- Failing key refuses a Demo release too (Q3): sound. There is no delete route for keys, so no incentive to delete a failing key.
- `WHERE_STEP.Tests` is required by `check_setup_checklist.ts:150` (every `where` literal in `engine/` needs a row); the concept names it. `part-problems.tsx:16` and `KIND_WORD` (`review.tsx:16`) fall through harmlessly.
- Helper under P-33: acceptable as test scaffolding **if** it lives in `tests/` only, is named as scaffolding, and never enters `demo.ts`. Two conditions: G2's own gate suite proves pass and fail with hand-written expected values on at least one map (G4's `e1Keys`, `tests/g4_e1_key.ts`) and not only with self-copied ones; and one suite shows a helper-made key is live (change the map, the release is refused).

## Back-end plan (element → record → API → rule → test)
| Element | Record | API / code | Rule | Test |
|---|---|---|---|---|
| Items | none (draft snapshot) | `engine/answer-key-gate.ts testableItems` | BR-1 (+ "cannot be tested", m6) | engine: 2 maps listed, no gates; no-inventory map |
| Key states (read) | `answer_key`, last `answer_key_run` (no `lines`) | `keyStatesFor(db, ws, ids[])`, one query | BR-3, BR-5 | API: catalogue adds no per-row query |
| Run (write) | `answer_key_run` | `runKeys(actor, c, snapshot)` only in submit / approve / releaseRows | BR-5 | API: GET writes nothing; Submit stores runs; refusal still shows the failed run |
| Judge | none | pure `answerKeyProblems(items, states, {demo})`, `demo = isDemoSnapshot(snapshot)` | BR-2, BR-4 (every cell) | engine: one pass and one fail per cell |
| Refusal | none | `errors[]` shared with G1 (400 / 409 / 409) | BR-8 | API: three routes name each item |
| Page lines | none | `GET /combinations/:id` problems; `GET .../review` gains `answer_keys[]`; `forms: [form]` | BR-9, m9 | browser: Fix on Tests, axe, keyboard, 400 px |
| Catalogue | none | `programs.ts` draftProblems only when `changes>0 \|\| !rel`; Release page "Not run after Submit" held | M1, m3 | API: Live unchanged row keeps step 5 done |
| Evidence | `config_release.summary.answer_keys` (JSON) | `publishRow` summary param from both callers | BR-9, m7, m8 | API: summary names the signed key; changed-since marker |
| `where` | none | `WHERE_STEP.Tests = release`; Overview tile excludes it | M1 | `check_setup_checklist.ts`, overview browser check |
| Scaffolding | sample load unchanged | `tests/lib/release-ready.ts` shared with G1 | P-33 | spike first (M2); full-suite run without helper |

## Questions for the founder (at most three, recommendation first)
1. **Does the gate cover every PDF map of a combination at every release, or only maps new or changed since the last release?** Rec.: **every map** (P-240 and SA-1B-296 r1 as written: "no answer key, no publish"). Cost: With an LMIA, Live from the sample load with no tests, gets no Release 2 in the demo until its maps have signed keys; the demo's release path stays on the Sample Visitor visa. The alternative (new or changed maps only, failing keys always block) keeps With an LMIA releasable but weakens "never let firms use a map no signed test has proved".
2. **Should a Sample-looking release that is not a Sample combination (a real combination with unsigned tests) be allowed as a Demo release in the demo workspace?** Rec.: **no**. The Demo mark stays derived from the combination and its checks (G3), so a real row is refused until its tests are signed; the Visitor visa shows the Demo path.
3. **A failing test refuses a Demo release too.** Rec.: **yes** (a known wrong map is never released, not even as a demo). The concept's Q3, unchanged.
(The concept's Q1, error or warning, is answered by P-240 and the card; Q2, approver sees keys with the draft, is answered by m7 above, as written plus the "changed since" marker.)

## Lead response
Tech lead on #568 (2 Nov, 17:30 UTC): concept v2 approved (P-223 (4)); build it. (1) Error (E7) for a gated map, scoring table or rule set with no passing signed key on a real release; W7 stays the combination-level warning (P-240, SA-1B-296 r4/r8). (2) Scope: items new or changed since the last release, plus every item that already has a key (SA-1B-296 r4's revert path) — the builder's recommendation, not the challenger's "every map". (3) A failing key also refuses a Demo release: yes. Shared pieces with G1 (`errors[]` refusal, `STUDIO_WORKSPACE_KEY`, `draftProblems` only when `changes > 0 || !rel`): whichever lands first builds them; passed to G1 on #569.

## Agreement
All Majors and Minors taken in concept v2 §8; founder question 1 answered by the tech lead as "new or changed" (BR-2).

## Build discoveries
_(left empty)_
