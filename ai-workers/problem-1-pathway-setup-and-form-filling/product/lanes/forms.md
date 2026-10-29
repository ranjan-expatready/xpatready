# Lane: forms — PDF and online forms (P-61–P-63)

## From the Lead

2026-10-29 night (Lead, sixth chat; founder asleep): Stage BUILD, owner Builder. **W1-10 slice 0 only:** the shared AI step runner (draft, blind checker, rules, compareRounds, saved-result key, cost first, caps), no behaviour change, finder moves first; plus the review-queue **item contract proposal** in `contracts/` (no consumers) for the Lead. Then **PLAN** (not build) for slice 1: the channel change P-143 (Online · PDF upload · Paper · Not needed + signature value; accepts per edition and account; migration from SIGNED_PDF_UPLOAD; finder rounds propose the channel with IRCC's quote, B37/P-140; S5 "Filed as" picker in `workspace/forms.tsx`, which this lane owns for the change). Founder: P-138 (drafting on a click), P-139 (US$120 cap). No live AI. US$0. **Reuse, never rebuild:** PDF filling = `prototype/p5/fill.py` (via `studio/api/src/fill.ts`); barcode read-back = `prototype/evidence-lane/E1/tools/barcode_compare.py`; inventory = `E1/tools/inventory.py`. **29 Oct morning (Lead, seventh chat):** slice 0 (619eaac4) and the contract proposal (e3fe8770) seen; Q-L1 yes (runner by forms first, done), Q-L2 yes (the queue item contract lands before slice 2; the Lead answers on the proposal at the Lead check), Q-L3 the order above; founder Q1 = P-139 (US$120), Q2 = P-140 (channel inside the finder's rounds). Next: PLAN for slice 1 as above. Outside review DV-bb-5: the form number in the Forms list uses a different (mono) type from the rest of the row: same family, weight per the visual system.

Command: `/next forms` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: runner package (QA-83, QA-85–89, per-step budget/timeout) + contract v2 + plans, for one Lead PR; next QA-90 plan only
stage: CHECK
owner: Lead
next_action: Lead merges the branch (code 8ff87e5e, run-suites 67/67) by Lead PR; then answers P-156 Q1–Q2, slice 1 §8, W1-16 Q1–Q4 and the QA-90 plan's question
blocked_by: none
updated: 2026-10-29

## Handover (29 Oct, evening; resume from this section alone — the lane moves to a fresh session)
* **Where it stands:** stage CHECK, owner Lead. Branch `claude/forms-r69-fix-4af07a`, pushed, clean tree, synced with main `e3fbe4f4`. **Code commit `8ff87e5e`: full run-suites 67/67 pass** (studio browser skipped: :4400; web/dist rebuilt first); graph --check passes (G3 2: `main.ts` attachment routes, not this lane).
* **Done on this branch, waiting for one Lead PR:**
  * W1-10 slice 0, the shared step runner (`engine/rounds.ts`, `api/src/rounds.ts`; `contextKey` = combination key or `edition:<code>:<edition>`); P-139 cap US$120; DV-bb-5. Lead check PASS on `c1191e58`.
  * Contract v2 (P-149) + P-154 `case_officer` (`contracts/proposal-item.ts`): **approved by the Lead**, stable from now (changes only via the Lead with screens).
  * Demo bug QA-83 (`61264d86`): guide schema without `maxItems` (≤5 in `finder.ts`); who-can-be without `minimum`/`maximum` (0–9 in `people-ai.ts`).
  * AI safety (`c17615ec`): `p2/policy.ts` `MAX_PAID_ATTEMPTS_PER_FORM = 4` (shown before the run), `MAX_REQUEST_BYTES = 800000` refused in `p2/runner.ts` at US$0.
  * **Runner package (`569cc7e3` + test wording `8ff87e5e`), all done:** QA-86 refused (4xx) or busy (429/500/502/503/529) calls settle at US$0, timeouts keep worst case; QA-87 busy retried only after its named `retry-after` (≤ `MAX_RETRY_AFTER_S` 30), round budget sized from the measured input so one retry fits; `AiStep.budget_usd` / `timeout_ms` optional (defaults US$1 sized up, 300 000 ms); QA-88 plain words per outcome in `engine/ai-run.ts explainRun` and `rounds.ts`, request id under Details (`attempts[].request_id`, carried by `p2/launch.ts`); QA-89 no guide checker round after a failed first round; QA-85 `p2/stubs/who_can_be.json`. Guards in run-suites: `check_forms_schema_lint.ts` (qa parts A+B, 24), `check_forms_ai_errors.ts` (qa part C, 17), `check_forms_rounds.ts` (55), `check_p2_guard.ts` (80), finder QA-89 end to end (fake launcher).
  * Plans (no code): `screens/W1-ai-drafting/plan.md` (§5 P-149), `plan-slice1-channels.md` (§8), `plan-p156.md` (Q1–Q2), `plan-qa90.md` (10 lines; Lead said QA-90 is PLAN only), `screens/W1-16-forms-masters/plan.md` (Q1–Q4, §5 slice r).
* **Left:** nothing of the runner package. Next, when the Lead says: QA-90 build per `plan-qa90.md`; P-156 slices a–f; slice 1 channels; W1-16.
* **Notes for the next session:** the p2 checks need Node 24 (`/Users/ranjansingh/Desktop/Xpatready/.tools/node-v24.21.0/bin` first on PATH, as run-suites sets); regenerate the Prisma client after each sync that brings a migration (`npx prisma generate`); rebuild `web/dist` after each sync; after a run restore only by-products (screenshots, `studio/evidence`, `p2/ledger`, `p2/runs/stub-pass`, `p2/screening`, used tickets) — never `git checkout` `product/screens` or `p2` wholesale (it reverts plans and code). The Bash hook refuses commands containing "merge"/compound pipelines: put them in a scratchpad script.
* **Open for the Lead or founder:** whether guides must also be attached to their combinations; 5 of 7 sample forms are "Not set yet" until a person sets them (C11.18); the shared Button's primary hover contrast (4.4 at 12 px).
* **How to run the checks (Mac, this copy):**
  * S4 checks: `forms_s4`, `forms_s4r`, `forms_s4b`, `forms_s4l` on ports 4455–4458; QA-53: `forms_qa53` on 4459.
  * Other suites alone under `fx_*` names on 4471–4480 (pass the database name too: some suites read it from their 2nd argument). `run-suites.sh` uses names other lanes share: check `ps` for another run first.
  * Rebuild `web/dist` (`vite build web`) before the browser checks, and after every sync of main.
  * After any run, put back only the by-products (other screens' screenshots, `evidence/*.json`, `p2/ledger`, `used-launch-tickets`, `p2/runs/stub-pass`, the canary digest, S4's 390 px shots). Drop this copy's `var/isolated-*` and their databases when nothing is connected.
  * Stop any run if free space falls below 3 GB.
  * The Bash hook misfires on some compound commands: put them in a scratchpad script. No paid AI (US$0). Lane pushes run no CI (P-85).

## Log (last 10 lines)
- 2026-10-29 · runner package · FIX → CHECK (owner Lead) · QA-83, QA-85–89 and per-step budget/timeout done; P-156 and QA-90 plans written; full run-suites on 8ff87e5e 67/67. Lane handed to a fresh session (Lead). US$0.
- 2026-10-29 · AI safety follow-ups · CHECK (owner Lead) · lint per the official docs (pattern, $ref, enum), one paid-attempt budget per form (4) in policy and the cost shown, request size cap 800 KB refused at US$0; full run-suites on c17615ec 64/64. US$0.
- 2026-10-29 · demo bug (guide pick) · FIX → CHECK (owner Lead) · maxItems dropped from the guide schema (5 kept in code), who-can-be min/max likewise, 4xx refusals settle at US$0, plain refusal words; schema lint check in run-suites; touched checks green. No live call (founder approval needed). US$0.
- 2026-10-29 · slice 0 sync (2) · CHECK (owner Lead) · applied Lead message (main 170659bc): clean merge at 3c7255ef; named checks green (rounds 38, contract 20, finder 138, run browser 22, library browser 69, start setup 26 + browser 39) plus W1-15 slice 1 47; typecheck, graph. US$0.
- 2026-10-29 · P-154 · DESIGN (owner Lead) · applied Lead message (P-154 words): contract comes_from case_officer (agent refused), pass and fail tests (20/20); plans reworded; rules file plan carries the words; no "agent" in forms' user-facing files. US$0.
- 2026-10-29 · P-153 · DESIGN (owner Lead) · applied Lead message (P-153): shared rules file and its injection planned as W1-16 slice r (plan §5), with pass and fail tests and one Lead question. No code. US$0.
- 2026-10-29 · W1-16 · DESIGN (owner Lead) · applied Lead message (P-150, P-152; order slice 0 sync → contract v2 → W1-16 plan, the first two already done): W1-16 forms plan with re-check, rules, slices a–h and 4 questions. No code. US$0.
- 2026-10-29 · slice 0 sync · CHECK (owner Lead) · applied Lead message (slice 0 PASS; merge conflict with S3): merged main f7cb40d9 at 3ca624ef; finder rounds on the runner, S3's plain words moved into rounds.ts (fail tests added); rounds 38, finder 138, run browser 22, library browser 69, start setup 26 + browser 39, typecheck, graph. US$0.
- 2026-10-29 · contract v2 (P-149) · CHECK (owner Lead) · applied Lead message: contract v2 from screens plan-p149 §C plus the Lead's identity calls, a pass and a fail per piece (18/18), no consumers; P-149 addendum gains the checklist-line placements and proves. Handed back on its own. US$0.
- 2026-10-29 · P-149 · CHECK (owner Lead) · applied Lead message (P-149 authoring model): W1-10 plan §5 addendum (what lands in which slice); contract origin AI · Rules · Person with pass and fail tests (6/6); `examples` field proposed for slice 3. Slice 0 merge (c1191e58) untouched. US$0.
