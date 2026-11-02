# C11.12 filing modes, PR 1 of 3: review (independent reviewer, 2 Nov)

**Commit reviewed:** `e4cc6008` on `claude/fervent-fermat-mvm1kg` (branch head). It differs from `a6d0af44` only by reverting test-run screenshots and evidence JSON; `git diff a6d0af44 e4cc6008` touches no api, engine, contracts, web, samples or test file.
**Against:** concept r2 §3, §6, §6b (PR 1 scope), `challenge.md` (B1, m2, m4, m6, m8), P-233 (all read from `origin/lead/2026-11-02-c1112-board`); STANDARDS, EXPERIENCE, QUALITY.
**Run:** my own copies on :4441 and :4442 (never :4400). US$0, live AI off. `check_c1112_modes.ts` 32/32. `C11.12.test.ts` 18/19; the one fail is line 90, principal labels in `wave1.json`, the same on main. `tsc` is clean for web and api. A probe script that releases and opens a case. A browser journey with 22/22 checks (`journey-test-reviewer-2026-11-02.md`).

## Verdict: Block (Ship after fixes)
The rules, the editor fix and the `setup_vv_m3` fix are sound, and each is tested pass and fail. One Major: PR 1 lets a configuration be released that crashes the case's Prepare view. A second Major: the preview disagrees with the case for lines that have no mode. Both are small to fix.

## Issues
**M1 (Major, Must): a release with a Declared only line gives a 500 on every case's Prepare.** PR 1 adds `declared_only` and `co_files` to the contract and lets them be saved and released (the save only warns, and the release check has no line for them). But the runtime still feeds the release's mode straight into the filing: `case-prepare.ts:74` and `case-filings.ts:30` cast it to `CaseFiling["mode"]`. The DB check `filing_mode_check` allows only `files_own` and `on_principal`. Reproduced on :4441 with these steps:
1. Run release 1 and pack 4's release 2.
2. `PATCH /combinations/:vv/people` with child `declared_only`, `applies:false` → 200 with the Guide 5256 warning.
3. Submit, sign off, approve → release 3 (201).
4. `openCase(vv, FAMILY)`, then `GET /runtime/cases/:id/prepare` → **500**. `api.log`: `new row for relation "filing" violates check constraint "filing_mode_check"`.

`GET …/filings` on the same case returns filings with `mode:"declared_only"` and applicants `"applying"`, which breaks the `CaseFiling` contract. A Sponsor `co_files` line can reach the same path on any combination the runtime derives.

Fix (keep it switched off until PR 2): add a release-check **error** for any line with `declared_only` or `co_files` on a combination the runtime derives ("Cases cannot use this filing yet"; removed in PR 2). Alternatively, map modes through `filingOf()` in both runtime readers so only modes the engine knows reach it. Add a fail test (release check, or the probe above).

**M2 (Major, Must): the "What a case gets" preview disagrees with the case for a line with no mode.** `previewFilings` uses `modeOf → null → "files nothing"` (`engine/filing-modes.ts:302`, `filingPlan` line 288). The case instead falls back to the combination's table (`filings.ts` `rules.modes`; for `vv.single` the child files their own). This state is reachable from the screen today: untick Applicant on Child, save, tick it again, save. The API view then says `gets: "2 filings in one submission"` and the child shows `filingWords: "Filing not set"`, while a case of that release gives the child a filing. Lines saved before C11.12 (demo database drafts) are in the same state.

This breaks §6b ("preview from the same plan the case will use") and challenge m4, and the preview's sentence is wrong rather than labelled. Fix: in the preview, use the same fallback the case uses for a line without a mode. Or name the line ("Child: filing not set, not counted") and keep it out of `gets`. Add a pass and a fail test.

**m1 (Minor, Should): alias conflict.** `modeSent` prefers `filingMode` over `filing` silently (`filing-modes.ts:204`). Probe: `{filingMode:"files_own", filing:"declared_only"}` → 200, stored as `files_own`. The view also returns both names (`workspace.ts:140`), so one thing has two names (challenge m2). Question (1) is accepted only as a stopgap that keeps the agreed test untouched. Refuse a body whose two values disagree, and record that `filing` is removed when `C11.12.test.ts` moves to `filingMode` (PACK-2.md).

**m2 (Minor, Should): warnings that point to a control that does not exist yet.** The release warning "Filing for Child … choose how … (Forms › Who can be in this application)" (`filing-modes.ts:242`) appears after an on-screen untick or Add person, and nothing on the screen can set a mode until PR 3; Undo is the only way back. Similarly, ticking Applicant on a `declared_only` line gives the strict 400 "choose another filing or untick applicant" (`people.ts:359`), with no filing choice to make. Either add "(coming with the Filing column)" or accept and list both in the PR as known until PR 3.

**m3 (Minor, Should): the editor fix has no automated test in this PR.** `toLines`, "Use these lines", Add person and untick-clears-mode (`questionnaires.tsx:50, 73–74, 139, 152`) are untested here; `check_c1112_modes.ts` BR-8 covers only `checkPeople`. My journey shows they work (save, Undo, Use these lines, Add Sponsor and untick all keep or clear modes as designed). Add one browser check like it, or state in the PR that PR 3 adds it.

**m4 (Minor, record): no Sponsor line in the samples.** Concept §6 puts `{role:"sponsor",…,filingMode:"co_files"}` in **both** `wave1.json fs.spouse` and `programs.json fs.outside`. Question (3) defers `wave1.json` to its owner; `programs.json` is not covered by that reason. Accepted only if the PR names the row that adds both (and runs `check_s5_slice1`/`check_s7_load` then).

## The PR's questions
1. **The `filing` alias:** acceptable as temporary, given the Lead's rule to touch only line 57. Fix m1.
2. **`FILING_NOT_SET_BLOCKS = false` until PR 3:** agree ("unfinished work merges switched off"). Otherwise drafts would be unreleasable with no control to fix them. It must flip in PR 3 with its test (`check_c1112_modes.ts` already checks both states).
3. **No Sponsor in samples:** acceptable for `wave1.json`, with m4 tracked. Unticking Applicant to clear an applicant mode is right: otherwise BR-5 would silently tick it again on save.

## Concept fit (PR 1 scope, §6b)
Contract enum, nullable: met. BR-1, BR-2, BR-3 (strict refuses; non-strict and read drop, B1), BR-4, BR-5 (with m6, stored tick kept) and BR-8 (save keeps mode): met, each with a pass and a fail in `check_c1112_modes.ts`. Removing any rule turns its exact-message assertion red. BR-7 warn (Visitor visa, On the principal's and Declared only, m5): met; acceptance line 57 is the only test edit. Release check: met, as a warning. Preview from one plan: met for lines with modes, not for lines without (M2). `setup_vv_m3`: met (Representative gets no mode; pack 4 counts unchanged per builder, setup line S5 PASS on my copy). Samples: family modes met; Sponsor not done (m4). Fees: never CAD 0 (Sample words, "not worked out yet" for co-filed and non-`vv.single`).

## Code
Server authorisation: a reviewer's PATCH gets 403. Concurrency: two saves at one version give 200 and a 409 naming who saved. Field errors carry `participants[i].filingMode`. No per-row requests. No migration in this PR. Other `PeopleView` readers: `before-forms.tsx` only; it typechecks. Read path `workspace.ts:137–139`: precedence is correct; a stored applicant mode on the Representative is dropped.

## D1–D20 (1–5)
D1 Requirement fit 3, M1 and M2 · D2 Data integrity 3, releasable crash state (M1) · D3 Reuse 4, one `LINE_MODES` list, one `filingOf` helper · D4 Rule integrity 4 · D5 Stability 4, Undo and 409 hold · D6 Governance 4, audit row per save unchanged · D7 AI trust 4, "Use these lines" keeps modes and AI proposes none · D8 Orientation 4, unchanged screen · D9 Flow 3, the warning points to a control not yet built (m2) · D10 Language 4 · D11 Feedback 4, the save toast · D12 Visual 4, unchanged · D13 Accessibility 4, axe clean at 400, 1024 and 1440 px with no sideways scroll; keyboard only partly walked · D14 Team look 4 · D15 Speed 4 · D16 Testability 3, editor paths untested (m3) and the M1 path untested · D17 simulated only · D18 Provenance 4, Sample and guide quote in warnings · D19 Capability closure 3, M1 breaks Setup → case · D20 simulated only.

## Journey score: 7.5 / 10 (below the pass of 8; no criterion at 0)
Details are in `journey-test-reviewer-2026-11-02.md`. Fixing M1 and M2 raises "correct data" and "error recovery" to pass.

## Not checked
- The graph tool: `graph.mjs` rewrites the tracked `qa/GRAPH.md`, so I did not run it. The existing GRAPH.md names C11.12 in 12 tests.
- A real screen reader, and 200 % zoom (only 400 px as a proxy).
- The full keyboard-only main path.
- Pack 4 and the three suites the builder was re-running.
- The Filing column, the preview panel and the engine (PRs 2 and 3, out of scope).

**Verdict: Block.** Fix M1 and M2, each with a fail test. Fix or list m1–m4 in the PR.
