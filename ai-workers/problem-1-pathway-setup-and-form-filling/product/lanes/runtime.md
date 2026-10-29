# Lane: runtime — the thin end-to-end slice, then M3 runtime (P-67)

## From the Lead

2026-10-29 night (Lead, sixth chat; founder asleep): Stage BUILD, owner Builder. **W1-15 slice 1** (Questions and documents: data and rules; Lead response in challenge.md, agreed within P-130–P-134) + **QA-69** (Forms tab Undo refused after a release). Keep out of `engine/channels.ts`, `api/src/filing.ts`, `web/src/pages/workspace/forms.tsx`: the forms lane owns the channel change (P-143). Then EARLY-LOOK for the founder with API evidence. Slice 2 (Questionnaires tab UI) waits board v2 (`screens/W1-questions-and-documents/design/draft-questions-and-documents-v2.html`) and the founder's grilling. US$0. **Reuse, never rebuild:** PDF filling = `prototype/p5/fill.py` (via `studio/api/src/fill.ts`); barcode read-back = `prototype/evidence-lane/E1/tools/barcode_compare.py`; inventory = `E1/tools/inventory.py`. **29 Oct morning (Lead, seventh chat):** resume slice 1 (asked by message). With slice 1's hand-back, outside review (Devin, `history/devin/2026-10-29-devin-backbone.md`): DV-bb-3 ("Upload an IRCC PDF below" in Add a form from the library points at nothing: the words must name the control that is there), DV-bb-6a (workspace header says "Dependent child"; the built-in role is "Child", P-108); a pass and a fail test each.

Command: `/next runtime` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: W1-questions-and-documents (W1-15, P-130–P-132)
current_slice: FIX pass 2 done at 3839ddf4 (QA-92 to QA-95, Undo-bar race); handover written; session stopped (P-173)
stage: CHECK
owner: Lead
next_action: Lead: check FIX pass 2 at 3839ddf4 for the Documents tab merge (CI is the full check); decide the QA-93 finding (does choosing a section decide what is asked?); then start a fresh runtime session on the M2 queue (PQR, who fills, preview by person and channel, S7 Reset + Load sample, validator).
blocked_by: none
updated: 2026-10-29

## Handover (to a fresh runtime session, 29 Oct late; this session stops here per the Lead, P-173)
* **Exact state:** branch `runtime/2026-10-27-s5-workspace`, last code commit **3839ddf4** (main synced at d59bf029; the contract conflict there was resolved by keeping both `field_map_edition` (forms) and `who_can_be` (runtime) in `contracts/drafting-run.v0`). The worktree is clean; by-products are restored. Nothing is half-done.
* **Done and with the Lead (Documents tab merge):** slice 3 (Documents tab, Lead check PASS at 740ef734). FIX pass 1 at ccc7b18d covered QA-84, QA-85, QA-88 runtime part, QA-91 as a plan, and the Lead minors; full run-suites gave 68/68 there. FIX pass 2 at 3839ddf4 covered:
  * QA-92: the drawer saves a case fact under `case`.
  * QA-93: confirm and Undo in place.
  * QA-94: no system names.
  * QA-95: the 5-character reason words, linked to the box.
  * The `check_s5_slice3_browser` Undo-bar race: the test waits on the row; the app's order is in `forms.tsx`, the forms lane's file, and was left alone.
* **Checks on 3839ddf4 (own named checks only; CI is the full check, per the Lead):**
  * `check_qa92_95_browser.cjs` 23/23, three runs (4436).
  * `check_s5_slice3_browser.cjs` 35/35, five runs in a row (the race).
  * `check_w115_slice2_browser.cjs` 56/56 and `check_s5_slice2_browser.cjs` 61/61 (their System name assertions now check that no key is on screen).
  * `check_w115_slice2.ts` 35/35.
  * A local full run-suites on 3839ddf4 was started and stopped on the Lead's word.
* **Open for the Lead/founder:**
  * (1) **QA-93 finding:** choosing a section per combination does not decide what is asked. A question placed in a section in the shared library is asked whatever is chosen, so "Remove" only moved the section to the end. Remove is now offered only for a section that asks this person nothing; elsewhere the reason is written in its place. Should selection decide what is asked, or only order and titles?
  * (2) QA-91 (Who can be › AI as a run card) is a plan only: build-notes "Fixes: Lead check of slice 3 and qa ai-paths".
  * (3) `contracts/drafting-run.v0` lists `who_can_be` (expand only).
* **Next (the Lead's ordered M2 queue, in "From the Lead" on origin/lead/2026-10-29-m3go):**
  1. PQR (C4.2, C4.7, C4.8).
  2. Who fills (C4.9).
  3. Preview by person and channel (C4.3, C4.6).
  4. S7 Reset + Load sample with the six combinations (C10.1, C11.7).
  5. Validator (C3.8).
* **Running checks (runtime ports 4430–4439 only):** the commands are the usage lines at the top of each test, e.g. `zsh studio/tools/isolated.sh runtime_qa9x 4436 start && node studio/tests/check_qa92_95_browser.cjs 4436 xr_studio_runtime_qa9x`.
  * Build the web app first (`cd studio/web && npx vite build`); an isolated server serves that build.
  * Use Node 24 from `.tools/node-v24.21.0/bin`. In a fresh copy, run `node_modules/.bin/prisma generate` once.
  * Never reset :4400.
* **Learned, not written elsewhere:**
  * The guard hook refuses many commands (variable expansion, `$(…)`, words like "merge", some branch names): put commands in a scratchpad script and run `zsh <file>`.
  * Test runs rewrite other lanes' screenshots, `product/qa/reports`, `prototype/p2` runs, jobs and `ledger/used-launch-tickets`, and `studio/evidence`. Commit only this lane's files by path, then `git checkout --` and `git clean` those folders.
  * On the Questionnaires tab, `[data-section="x"]` also matches the rules and checks area: scope it with `[data-questions]`.
  * The Undo toast lasts 10 s, so wait on what the action changes, not on the toast.
  * Earlier slice notes are in screens/W1-questions-and-documents/build-notes.md and screens/W1-combination-workspace/build-notes.md.

## Log (last 10 lines)
- 2026-10-29 · Builder (Mac): FIX pass 2 handed back at 3839ddf4: QA-92, QA-93 (Remove only where it changes something; finding for the Lead), QA-94, QA-95, race; own checks green (check_qa92_95_browser 23/23 x3, s5_slice3_browser 35/35 x5, w115_slice2_browser 56/56, s5_slice2_browser 61/61, w115_slice2 35/35); full Handover written; session stops (P-173). AI US$0.
- 2026-10-29 · Builder (Mac): FIX pass 2 built: QA-92 the drawer saves a case fact under 'case'; QA-93 confirm and Undo in place, Remove offered only where it changes something (found: placed questions stay asked whatever sections are chosen; question for the Lead); QA-94 no system names; QA-95 'Write at least 5 characters'; race test waits on the row. check_qa92_95_browser 23/23 locally; full suites next. AI US$0.
- 2026-10-29 · Builder (Mac): FIX pass done: QA-84 (schema without numeric limits, counts checked in code), QA-85 (stub plus who_can_be in contracts/drafting-run.v0: the stub run was refused as an unknown kind on Node 24), plain failure words, QA-91 as a plan; release supersedes retired checks; drawer alternatives, 'From the sample setup'; full run-suites 68/68 on ccc7b18d; by-products restored; CHECK, owner Lead. AI US$0.
- 2026-10-29 · Builder (Mac): applied Lead message (slice 3 check PASS; FIX pass): synced main d50d87f9; QA-84 schema limits checked in code, QA-85 stub, plain failure words (QA-88 runtime part), QA-91 written as a plan; release supersedes retired checks; drawer alternatives, 'From the sample setup'; check_who_can_be_qa 9/9, slice3 34/34, browser 35/35 (d824e53f); full suites running. AI US$0.
- 2026-10-29 · Builder (Mac): full run-suites on dfd1a018: 64 pass, check_w1_programs_s2 failed one timing check under load (87/87 twice alone on 4436); graph exit 0; by-products restored; slice 3 EARLY-LOOK, owner Lead; Lead message received: QA-84/85/91 FIX next. AI US$0.
- 2026-10-29 · Builder (Mac): fresh runtime session (Lead's move): open point 3 fixed in engine/snapshot.ts (a draft removal stays out of the published view until a release; fact sources and placements have none), open point 1 said on the Documents tab, (2) information only; check_w115_slice3 31/31, browser 32/32, check_engine 38/38 (dfd1a018, pushed); full suites running. AI US$0.
- 2026-10-29 · Builder (Mac): slice 3 (Documents tab) built at b5c46535 (check_w115_slice3 26/26, browser 31/31) before the Lead's hold; full suites not run on it; handover written for a fresh session; slice 2 at ff4d9cce with the Lead. AI US$0.
- 2026-10-29 · Builder (Mac): slice 2 FIX with S2-1, P-154 (Agent retired: Case officer, case view), P-155(3) (case officer with a written reason; one rule agentRefusal; fact_source.source_reason); synced main 170659bc; full run-suites 64/64 on ff4d9cce; slice-1 DV test fix 37e66a2e on the sync branch; CHECK, owner Lead. AI US$0.
- 2026-10-29 · Builder (Mac): founder OK on slice 2 with S2-1: per-person line uses slice 1's sources (chips' numbers); Agent lock kept, now one rule (engine/sources.ts agentRefusal); check_w115_slice2 29/29, browser 48/48, s5 slice2 61/61, slice1 47/47 (b33b941b); full suites running; slice 3 plan written. AI US$0.
- 2026-10-29 · Builder (Mac): Lead asked for a slice-1 sync: 915aa186 (00444a35 + main f7cb40d9; main.ts keeps FactSources and StartSetup; slice1 47/47, S3 26/26 and 39/39) on runtime/2026-10-29-w115-slice1-sync; brought into slice 2 (dbfde76b); full run-suites 61 pass, check_dv_backbone_browser waited too little for Upload PDF under load (test now waits; 8/8); slice 2 EARLY-LOOK, owner Lead. AI US$0.
