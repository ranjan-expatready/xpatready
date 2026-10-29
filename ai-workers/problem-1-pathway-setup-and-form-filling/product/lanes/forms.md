# Lane: forms — PDF and online forms (P-61–P-63)

## From the Lead

2026-10-29 night (Lead, sixth chat; founder asleep): Stage BUILD, owner Builder. **W1-10 slice 0 only:** the shared AI step runner (draft, blind checker, rules, compareRounds, saved-result key, cost first, caps), no behaviour change, finder moves first; plus the review-queue **item contract proposal** in `contracts/` (no consumers) for the Lead. Then **PLAN** (not build) for slice 1: the channel change P-143 (Online · PDF upload · Paper · Not needed + signature value; accepts per edition and account; migration from SIGNED_PDF_UPLOAD; finder rounds propose the channel with IRCC's quote, B37/P-140; S5 "Filed as" picker in `workspace/forms.tsx`, which this lane owns for the change). Founder: P-138 (drafting on a click), P-139 (US$120 cap). No live AI. US$0. **Reuse, never rebuild:** PDF filling = `prototype/p5/fill.py` (via `studio/api/src/fill.ts`); barcode read-back = `prototype/evidence-lane/E1/tools/barcode_compare.py`; inventory = `E1/tools/inventory.py`. **29 Oct morning (Lead, seventh chat):** slice 0 (619eaac4) and the contract proposal (e3fe8770) seen; Q-L1 yes (runner by forms first, done), Q-L2 yes (the queue item contract lands before slice 2; the Lead answers on the proposal at the Lead check), Q-L3 the order above; founder Q1 = P-139 (US$120), Q2 = P-140 (channel inside the finder's rounds). Next: PLAN for slice 1 as above. Outside review DV-bb-5: the form number in the Forms list uses a different (mono) type from the rest of the row: same family, weight per the visual system.

Command: `/next forms` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: slice 0 (synced 3ca624ef, for merge) + contract v2 (9049a49d) + W1-16 forms PLAN (P-150, P-152); slice 1 channels PLAN
stage: CHECK
owner: Lead
next_action: Lead merges the branch (slice 0 synced 3c7255ef + demo-bug fix 61264d86); asks the founder for one ~US$0.20 live guide pick after merge; then contract v2 check, W1-16 Q1–Q4 + slice r, slice 1 §8
blocked_by: none
updated: 2026-10-29

## Handover (29 Oct, afternoon; resume from this section alone)
* **Where it stands:** stage CHECK, owner Lead. Branch `claude/forms-r69-fix-4af07a`, pushed, clean, synced with main `170659bc` at `3c7255ef`.
  * **For merge:** W1-10 slice 0, the shared AI step runner (`engine/rounds.ts`, `api/src/rounds.ts`; `contextKey` = a combination's key or `edition:<code>:<edition>`); P-139 cap US$120; DV-bb-5. Lead check PASS on `c1191e58`; named checks green on `3c7255ef`.
  * **Demo bug fix `61264d86`:** guide-pick schema without `maxItems` (≤5 in `finder.ts`); who-can-be without `minimum`/`maximum` (0–9 in `people-ai.ts`); `p2/runner.ts` settles a 4xx refused before processing at US$0; plain refusal words in `rounds.ts`; `check_forms_schema_lint.ts`. p2 launch needs Node 24 (`.tools`), as run-suites.
  * **Contract** `contracts/proposal-item.ts`: v1 approved; v2 (P-149) and P-154 (`case_officer`) wait for the Lead's quick check (`screens/W1-ai-drafting/queue-item-contract.md`; check 20/20).
  * **Plans, no code:** W1-10 `plan.md` (§5 P-149 addendum); slice 1 channels `plan-slice1-channels.md` (§8: 4 Lead questions); W1-16 `screens/W1-16-forms-masters/plan.md` (Q1–Q4; §5 slice r, the P-153 rules file, with the guarded-route question).
  * Lessons: rebuild `web/dist` after every sync; the restore script touches only by-products (never `product/screens/*.md` or `p2` code).
* **Next:** merge, the founder's OK for one ~US$0.20 live guide pick, then the Lead's answers; slice 1 BUILD per its §6.
* **Open for the Lead or founder:** whether guides must also be attached to their combinations; 5 of 7 sample forms are "Not set yet" until a person sets them (C11.18); the shared Button's primary hover contrast (4.4 at 12 px).
* **How to run the checks (Mac, this copy):**
  * S4 checks: `forms_s4`, `forms_s4r`, `forms_s4b`, `forms_s4l` on ports 4455–4458; QA-53: `forms_qa53` on 4459.
  * Other suites alone under `fx_*` names on 4471–4480 (pass the database name too: some suites read it from their 2nd argument). `run-suites.sh` uses names other lanes share: check `ps` for another run first.
  * Rebuild `web/dist` (`vite build web`) before the browser checks, and after every sync of main.
  * After any run, put back only the by-products (other screens' screenshots, `evidence/*.json`, `p2/ledger`, `used-launch-tickets`, `p2/runs/stub-pass`, the canary digest, S4's 390 px shots). Drop this copy's `var/isolated-*` and their databases when nothing is connected.
  * Stop any run if free space falls below 3 GB.
  * The Bash hook misfires on some compound commands: put them in a scratchpad script. No paid AI (US$0). Lane pushes run no CI (P-85).

## Log (last 10 lines)
- 2026-10-29 · demo bug (guide pick) · FIX → CHECK (owner Lead) · maxItems dropped from the guide schema (5 kept in code), who-can-be min/max likewise, 4xx refusals settle at US$0, plain refusal words; schema lint check in run-suites; touched checks green. No live call (founder approval needed). US$0.
- 2026-10-29 · slice 0 sync (2) · CHECK (owner Lead) · applied Lead message (main 170659bc): clean merge at 3c7255ef; named checks green (rounds 38, contract 20, finder 138, run browser 22, library browser 69, start setup 26 + browser 39) plus W1-15 slice 1 47; typecheck, graph. US$0.
- 2026-10-29 · P-154 · DESIGN (owner Lead) · applied Lead message (P-154 words): contract comes_from case_officer (agent refused), pass and fail tests (20/20); plans reworded; rules file plan carries the words; no "agent" in forms' user-facing files. US$0.
- 2026-10-29 · P-153 · DESIGN (owner Lead) · applied Lead message (P-153): shared rules file and its injection planned as W1-16 slice r (plan §5), with pass and fail tests and one Lead question. No code. US$0.
- 2026-10-29 · W1-16 · DESIGN (owner Lead) · applied Lead message (P-150, P-152; order slice 0 sync → contract v2 → W1-16 plan, the first two already done): W1-16 forms plan with re-check, rules, slices a–h and 4 questions. No code. US$0.
- 2026-10-29 · slice 0 sync · CHECK (owner Lead) · applied Lead message (slice 0 PASS; merge conflict with S3): merged main f7cb40d9 at 3ca624ef; finder rounds on the runner, S3's plain words moved into rounds.ts (fail tests added); rounds 38, finder 138, run browser 22, library browser 69, start setup 26 + browser 39, typecheck, graph. US$0.
- 2026-10-29 · contract v2 (P-149) · CHECK (owner Lead) · applied Lead message: contract v2 from screens plan-p149 §C plus the Lead's identity calls, a pass and a fail per piece (18/18), no consumers; P-149 addendum gains the checklist-line placements and proves. Handed back on its own. US$0.
- 2026-10-29 · P-149 · CHECK (owner Lead) · applied Lead message (P-149 authoring model): W1-10 plan §5 addendum (what lands in which slice); contract origin AI · Rules · Person with pass and fail tests (6/6); `examples` field proposed for slice 3. Slice 0 merge (c1191e58) untouched. US$0.
- 2026-10-29 · W1-10 slice 0 for merge · CHECK (owner Lead) · Lead asks: runner contextKey takes a form edition (edition:<code>:<edition>, screens N1) and P-139 cap US$120, each with pass and fail tests (check_forms_rounds 37/37); contract approval recorded; full run-suites on c1191e58 58/58. US$0.
- 2026-10-29 · W1-10 slice 0 + DV-bb-5 · BUILD → CHECK (owner Lead) · applied Lead note (29 Oct morning, main db5e0208): DV-bb-5 the form number in the row's typeface (12 px), library browser 67/67; slice 1 channels PLAN with the Lead's answers and reuse notes (4 questions left); full run-suites on a40adcbb 58/58. US$0.
