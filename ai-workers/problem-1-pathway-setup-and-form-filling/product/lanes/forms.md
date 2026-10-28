# Lane: forms — PDF and online forms (P-61–P-63)

## From the Lead

2026-10-29 night (Lead, sixth chat; founder asleep): Stage BUILD, owner Builder. **W1-10 slice 0 only:** the shared AI step runner (draft, blind checker, rules, compareRounds, saved-result key, cost first, caps), no behaviour change, finder moves first; plus the review-queue **item contract proposal** in `contracts/` (no consumers) for the Lead. Then **PLAN** (not build) for slice 1: the channel change P-143 (Online · PDF upload · Paper · Not needed + signature value; accepts per edition and account; migration from SIGNED_PDF_UPLOAD; finder rounds propose the channel with IRCC's quote, B37/P-140; S5 "Filed as" picker in `workspace/forms.tsx`, which this lane owns for the change). Founder: P-138 (drafting on a click), P-139 (US$120 cap). No live AI. US$0. **Reuse, never rebuild:** PDF filling = `prototype/p5/fill.py` (via `studio/api/src/fill.ts`); barcode read-back = `prototype/evidence-lane/E1/tools/barcode_compare.py`; inventory = `E1/tools/inventory.py`. **29 Oct morning (Lead, seventh chat):** slice 0 (619eaac4) and the contract proposal (e3fe8770) seen; Q-L1 yes (runner by forms first, done), Q-L2 yes (the queue item contract lands before slice 2; the Lead answers on the proposal at the Lead check), Q-L3 the order above; founder Q1 = P-139 (US$120), Q2 = P-140 (channel inside the finder's rounds). Next: PLAN for slice 1 as above. Outside review DV-bb-5: the form number in the Forms list uses a different (mono) type from the rest of the row: same family, weight per the visual system.

Command: `/next forms` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: W1-10 slice 0 (done) + queue item contract proposal; slice 1 channels PLAN (P-143) and DV-bb-5
stage: CHECK
owner: Lead
next_action: Lead checks slice 0 (619eaac4), DV-bb-5 (2ff98ebb) and answers the slice 1 plan's §8 questions (plan-slice1-channels.md); no slice 1 code before that
blocked_by: none
updated: 2026-10-29

## Handover (29 Oct, morning; resume from this section alone)
* **Where it stands:** stage CHECK, owner Lead. Branch `claude/forms-r69-fix-4af07a`, pushed, clean tree, synced with main `db5e0208`.
  * **Slice 0 (`619eaac4`):** one step runner, `engine/rounds.ts` (pure) and `api/src/rounds.ts` (`StepRunner`); the finder runs its rounds only through it, no behaviour change; `check_forms_rounds.ts` 27/27.
  * **Contract proposal (`e3fe8770`):** `contracts/proposal-item.ts` (11 kinds, no consumers), `screens/W1-ai-drafting/queue-item-contract.md`; `check_forms_proposal_contract.ts` 4/4. The Lead answers at the Lead check (Q-L2).
  * **DV-bb-5 (`2ff98ebb`):** the Forms list's number is in the row's typeface (Inter), 12 px as before (14 px overflowed the 1024 px table by 9 px), no mono; pass and fail checks; library browser 67/67.
  * **Slice 1 PLAN (`a40adcbb`):** `screens/W1-ai-drafting/plan-slice1-channels.md`: re-check, the one migration (SIGNED_PDF_UPLOAD → PDF_UPLOAD + hand scanned; accepts per edition × account; released snapshots never rewritten), rules C-1..C-8, saved v1 finder runs, S5 Forms tab, tests, 4 Lead questions. No code.
  * **Full run-suites on `a40adcbb`: 58/58 pass** (studio browser skipped: :4400). Graph --check passes (G3 2: two `main.ts` attachment routes, not this lane).
  * Lesson: rebuild `web/dist` after every sync (a stale build failed 8 S5 browser suites in an earlier run), and restore only screenshots and by-products (`git checkout -- product/screens` also reverts plan files).
* **Next:** the Lead's check and the §8 answers; then slice 1 BUILD in the order of the plan's §6.
* **Open for the Lead or founder:** whether guides must also be attached to their combinations; 5 of 7 sample forms are "Not set yet" until a person sets them (C11.18); the shared Button's primary hover contrast (4.4 at 12 px).
* **How to run the checks (Mac, this copy):**
  * S4 checks: `forms_s4`, `forms_s4r`, `forms_s4b`, `forms_s4l` on ports 4455–4458; QA-53: `forms_qa53` on 4459.
  * Other suites alone under `fx_*` names on 4471–4480 (pass the database name too: some suites read it from their 2nd argument). `run-suites.sh` uses names other lanes share: check `ps` for another run first.
  * Rebuild `web/dist` (`vite build web`) before the browser checks, and after every sync of main.
  * After any run, put back only the by-products (other screens' screenshots, `evidence/*.json`, `p2/ledger`, `used-launch-tickets`, `p2/runs/stub-pass`, the canary digest, S4's 390 px shots). Drop this copy's `var/isolated-*` and their databases when nothing is connected.
  * Stop any run if free space falls below 3 GB (34 GB free after the 28 Oct late run).
  * The Bash hook misfires on some compound commands: put them in a scratchpad script. No paid AI (US$0). Lane pushes run no CI (P-85).

## Log (last 10 lines)
- 2026-10-29 · W1-10 slice 0 + DV-bb-5 · BUILD → CHECK (owner Lead) · applied Lead note (29 Oct morning, main db5e0208): DV-bb-5 the form number in the row's typeface (12 px), library browser 67/67; slice 1 channels PLAN with the Lead's answers and reuse notes (4 questions left); full run-suites on a40adcbb 58/58. US$0.
- 2026-10-29 · W1-10 slice 0 · DESIGN → BUILD · applied Lead response (Agreed 29 Oct; overnight: slice 0 only): step runner taken out of the finder (engine/rounds.ts, api/src/rounds.ts), no behaviour change, check_forms_rounds 27/27; queue item contract proposal (contracts/proposal-item.ts, 4/4); slice 1 channels plan written for the Lead. Full run-suites running. US$0.
- 2026-10-29 · W1-10 · DESIGN (owner Lead) · applied Lead message (PR #73 merged; next W1-10, design only): synced main 32961d69; challenge.md (fresh re-check + challenge: 7 Major, 6 Minor, 2 founder and 3 Lead questions) and plan.md (one 9-step run, 11 rules, 7 slices). No code. US$0.
- 2026-10-29 · #73 review 🔴 · FIX → CHECK (owner Lead) · channelsFrom by rule: conditions never count ("even if" included), negated clauses say nothing, PDF needs an affirmative upload clause, Online an affirmative file-online instruction; fail tests: the even-if sentence → nothing, "Do not upload …; if you apply online, fill it in the portal" → Online only. canada 71, finder 138, qa filing 9/9. US$0.
- 2026-10-28 · #73 review · FIX → CHECK (owner Lead) · channelsFrom (QA-61): a negated sentence is read clause by clause (";", ",", " but ", " instead"); a negated clause or a bare condition says nothing, an affirmative clause counts ("Do not mail this form, upload it …" is PDF). Pass and fail tests: canada 68, finder 138, qa filing 9/9. US$0.
- 2026-10-28 · R69 + QA-65..68 · FIX → CHECK (owner Lead) · applied Lead message (take QA-65..68): QA-65 case reads need a known person, POST configuration reads guarded (ConfigRead); QA-66/67 = R69-1/2 proved; QA-68 send again with what changed only (API 400 on a name or meaning). qa53 20, finder 138, library browser 65; full run-suites on 5600ac06 47/47. US$0.
- 2026-10-28 · R69 · FIX · applied Lead note 28 Oct (sixth chat): synced main 38722933; R69-1 returned form change keeps its state and Withdraw, R69-2 person in the list key, R69-3 both-refused greyed (proved), takesEffect for Retire/Restore only; pass and fail tests: finder 137, library browser 61. Full run-suites stopped at 2.1 GB free (rule: 3 GB); old forms test databases dropped. US$0.
- 2026-10-28 · safe stop · BUILD → CHECK (owner Lead) · QA-61..64 (cbfdab22) wait for the Lead check; the run-suites prefix (5c2c4e82) goes to a Lead PR; everything pushed, Handover current. US$0.
- 2026-10-28 · QA-61..64 · BUILD · touched suites alone on fx copies, all pass on cbfdab22: structure 83, structure r3 41, screen02 fix 61, screen02 slice2 56, w1 s1s2 fix 30, structure browser 135, qa53 13; S4: finder 129, runs 90, library browser 58, run browser 22, canada 66. Handed back by message. Next: run-suites per-copy prefix. US$0.
- 2026-10-28 · QA-61..64 · BUILD · QA-61 the filing rule reads each sentence (canada 66, qa's filing check 9/9); QA-62 AI work names a finder run by its place in plain words; QA-63 a waiting finder card leads to the Sources page; QA-64 a library form's retire or restore takes effect at approval (one applyFormLifecycle for approval and an older approved change at release; the approval re-checks; the confirm says When it is approved). finder 129, runs 90, library browser 58, run browser 22. US$0.
