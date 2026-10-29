# Lane: runtime — the thin end-to-end slice, then M3 runtime (P-67)

## From the Lead

2026-10-29 (Lead, ninth chat; P-173 parallel build, no scope cut): Stage BUILD, owner Builder, in a **fresh session**. FIX pass 2 (3839ddf4) passed the Lead check; the Documents tab and both FIX passes are in Lead PR #94 (merge on green CI). **QA-93 decided (P-174):** what is asked comes from the forms and rules; section choice sets only order, titles and which empty sections show — as you built it; keep it so. **Your M2 queue, in order:** (2) PQR: mark the combination's PQR questions, AI picks with a reason, part of the one review and release (C4.2, C4.7, C4.8; P-132); (3) who fills a question, changed once in the library with a second person (C4.9); (4) preview by person and by channel (C4.3, C4.6); (5) S7 Reset + Load sample with only the six combinations and their official PDFs (P-148; C10.1, C11.7); (6) validator to complete (C3.8); QA-91 (Who can be › AI as a run card) where it fits. **After the M2 gate (M3 queue, recorded now so it has a home):** P-171 (4) sponsorship two filings in one submission group, (5) the child study question adding a study permit filing, (6) the waivable police line for a non-accompanying adult, the visitor visa family fee cap (C6.12, C6.4), and P-172 Express Entry police and medical lines required and blocking Ready to file (C6.4, C7.6, M3 concept BR-9 block 5). Branch: cut a new branch from main once PR #94 merges (the old one is fully merged). Your files: combination workspace tabs (Forms tab's channel picker excepted: forms), questionnaires, documents, preview, PQR, demo reset and sample. A slice that turns out heavy: tell the Lead before building it. Context above ~70%: write the Handover, tell the Lead.

Command: `/next runtime` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: M2 queue item 3, who fills (C4.9, P-97); item 2 PQR passed the Lead check (c4001d6e + b6cff769), held on this branch
current_slice: who fills built (library change on To review, applied at approval as a draft placement, released with the next release; placeField lock); library.tsx left to screens (Lead)
stage: CHECK
owner: Lead
next_action: Lead: check who fills (CI is the full check) and open the runtime Lead PR with PQR + who fills. Builder next: queue item (4) Preview by person and channel (C4.3, C4.6); C4.7 is wired into S6's queue once S6 slice 1 is on main.
blocked_by: C4.7 queue wiring waits S6 slice 1 (screens) on main
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
- 2026-10-29 · Builder (Mac): PQR Lead check PASS; who fills (C4.9, P-97) built per the agreed plan: api/src/who-fills.ts (propose route, applyFills at approval, releaseFills at release), narrow additions in library-changes.ts, lifecycle.ts, review-queue.ts (screens/forms files), placeField 409 lock, Review line in validate.ts diff, drawer section; library.tsx untouched (screens). check_who_fills 26/26, check_who_fills_browser 19/19; neighbours green (screen02_slice2 52/52, grounding 31/31, forms_qa53 20/20, s4 library browser 69/69, runtime R1 120/120, 63/63, 99/99, w115 1–3, pqr 37/37, engine 38/38); CHECK, owner Lead. AI US$0.
- 2026-10-29 · Builder (Mac): Lead answers applied: QA-93 decided (P-174, kept as built); C4.7 one door (P-149), no runtime pick store. Synced main 54f25ae4; built pqrPicksByRules (contract v2 pqr_pick items, origin rules) and acceptPqrPick (tick through the same draft row; AI_PROPOSAL for AI, CODE_MATCH for rules), unrouted until S6 slice 1; order in plan.md "PQR"; check_pqr 37/37, check_pqr_browser 20/20; CHECK, owner Lead; next (3) who fills. AI US$0.
- 2026-10-29 · Builder (Mac, fresh session): applied Lead note (ninth chat, read from origin/lead/2026-10-29-m3go): PQR plan in plan.md "PQR"; C4.7 question sent to the Lead (where a pending AI pick lives); built C4.2 (Pre-qualification chip on the Questionnaires tab; country PQR view GET /api/combinations/:id/pqr/country, P-132) and proved C4.8; check_pqr 25/25, check_pqr_browser 20/20, slice1 47/47, slice2 35/35, engine 38/38 on 4436; CHECK, owner Lead. AI US$0.
- 2026-10-29 · Builder (Mac): FIX pass 2 handed back at 3839ddf4: QA-92, QA-93 (Remove only where it changes something; finding for the Lead), QA-94, QA-95, race; own checks green (check_qa92_95_browser 23/23 x3, s5_slice3_browser 35/35 x5, w115_slice2_browser 56/56, s5_slice2_browser 61/61, w115_slice2 35/35); full Handover written; session stops (P-173). AI US$0.
- 2026-10-29 · Builder (Mac): FIX pass 2 built: QA-92 the drawer saves a case fact under 'case'; QA-93 confirm and Undo in place, Remove offered only where it changes something (found: placed questions stay asked whatever sections are chosen; question for the Lead); QA-94 no system names; QA-95 'Write at least 5 characters'; race test waits on the row. check_qa92_95_browser 23/23 locally; full suites next. AI US$0.
- 2026-10-29 · Builder (Mac): FIX pass done: QA-84 (schema without numeric limits, counts checked in code), QA-85 (stub plus who_can_be in contracts/drafting-run.v0: the stub run was refused as an unknown kind on Node 24), plain failure words, QA-91 as a plan; release supersedes retired checks; drawer alternatives, 'From the sample setup'; full run-suites 68/68 on ccc7b18d; by-products restored; CHECK, owner Lead. AI US$0.
- 2026-10-29 · Builder (Mac): applied Lead message (slice 3 check PASS; FIX pass): synced main d50d87f9; QA-84 schema limits checked in code, QA-85 stub, plain failure words (QA-88 runtime part), QA-91 written as a plan; release supersedes retired checks; drawer alternatives, 'From the sample setup'; check_who_can_be_qa 9/9, slice3 34/34, browser 35/35 (d824e53f); full suites running. AI US$0.
- 2026-10-29 · Builder (Mac): full run-suites on dfd1a018: 64 pass, check_w1_programs_s2 failed one timing check under load (87/87 twice alone on 4436); graph exit 0; by-products restored; slice 3 EARLY-LOOK, owner Lead; Lead message received: QA-84/85/91 FIX next. AI US$0.
- 2026-10-29 · Builder (Mac): fresh runtime session (Lead's move): open point 3 fixed in engine/snapshot.ts (a draft removal stays out of the published view until a release; fact sources and placements have none), open point 1 said on the Documents tab, (2) information only; check_w115_slice3 31/31, browser 32/32, check_engine 38/38 (dfd1a018, pushed); full suites running. AI US$0.
- 2026-10-29 · Builder (Mac): slice 3 (Documents tab) built at b5c46535 (check_w115_slice3 26/26, browser 31/31) before the Lead's hold; full suites not run on it; handover written for a fresh session; slice 2 at ff4d9cce with the Lead. AI US$0.
