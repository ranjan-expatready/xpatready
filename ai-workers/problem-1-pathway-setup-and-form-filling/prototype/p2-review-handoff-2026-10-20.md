# P2 review handoff: the live AI-drafted configuration of combination 1

20 October 2026 · maker: Claude Code (the Lead) · for the assigned independent reviewer (Codex, D248); the founder relays it. **Scope: P2's live result, the two proposed answer-key corrections and two open questions.** Separate from, and not a substitute for, the pending targeted recheck of P1 revision 4 (`p1-review-handoff-r4-2026-10-20.md`) and the P0 review.

- **Manifest:** `prototype/p2-review-manifest-2026-10-20.sha256` (count and SHA-256 in PROGRESS and NEXT). It covers every file under `prototype/` and `official-sources/` (except `node_modules`, `__pycache__` and handoff files), `ai-workers/decisions.md` and the working-edition files.
- **No live call is needed to review this.** Scores, spreads and checks rerun offline from the stored run records. Do not run `p2/pipeline.ts` or `p2/launch.ts` in place (they add ledger lines and run records).
- **Founder approvals used:** AIW-D260 and AIW-D261 (route, label, budget), AIW-D263 (later steps read earlier guarded drafts), AIW-D264 (11-operator conditions), and the founder's explicit yes in chat on 20 Oct for the live field maps, the full pipeline and five trials within US$40.

## 1. What was run (all through `p2/launch.ts` → `p2/draft.ts`)

| Run | Records | Result |
|---|---|---|
| Field maps, trial 1, six editions | `p2/runs/c1-fieldmap-*-live-20261020t04*.json` (originals) and `*.reconverted.json` | 6/6 first attempts, US$3.09; originals failed the contract (no edition in the inventories; two `*` quotes), re-converted without a model call (`p2/reconvert.ts`; output hash checked) |
| Field maps, trial 2 (inside the full pipeline) | `c1-fieldmap-*-live-20261020t05[12]*.json` | 6/6, contract-valid under `p2/convert.ts` |
| Requirements | `c1-requirements-live-20261020t053007880z.json` (2 rejected attempts, D17), `c1-requirements-live-20261020t053544388z.json` | rejected "compiled grammar too large" twice; after the schema change, completed (US$1.52) |
| Probes | `probe-requirements-*`, `probe-sections-*`, `probe-checks-*` | three small live probes, US$0.24, before the big steps |
| Sections | `c1-sections-live-20261020t054254821z.json` | completed (US$1.05); the next launch then refused it for "New Delhi" (D16, fixed) |
| Checks | `c1-checks-live-20261020t054958915z.json` | completed (US$1.46) |
| Trials 3–5 of IMM 5707 and IMM 1295 | `c1-fieldmap-imm5707-live-20261020t06*`, `c1-fieldmap-imm1295-live-20261020t06*` | 6/6; trial 5 IMM 1295's first attempt terminated after 228 s (counted at worst case), the retry completed |

Spend: 27 paid attempts, **US$16.21 from reported usage; US$24.13 committed** against the US$40 cap (rejected and terminated attempts stay at worst case). At the P1 revision 4 manifest the ledger had 71 lines (`f3a75600…3202`); every later line was appended.

## 2. Results to check

- **Full draft** `p2/config/c1-draft-1-live.json` (contract-valid under `contracts/combination-config.v0`), scored by `node tests/score_p2.ts p2/config/c1-draft-1-live.json`: **20/22 acceptance examples PASS**. FAIL P2-RQ-02 (IMM 1295 drafted for the principal applicant only) and P2-RQ-03 (see D19). Contents: 173 canonical fields (1 'decide'), 9 forms, 33 document lines, 39 rules, 18 sections, 173 placements, 58 AI checks plus 348 rule-made, 93 items unresolved for review. 83 branch keys `conditions`/`condition` renamed to `args`/`arg` in assembly (D18; counted in `structure.condition_keys_renamed`).
- **Five-trial spread** `node tests/spread_p2.ts` → `p2/scores/spread-c1-slice.json`: 0 wrong-person entries and 0 invented values in all five trials; IMM 5707 42/42 on both perspectives in trials 1–2 and 41/42 in trials 3–5 (the "I do not have any children" tick box left unresolved); IMM 1295 marital block 3/6 in all five (D11).
- **Scorer trust:** `tests/check_score_p2.ts` 26/26. The live data found five scorer and assembler defects (D14, D15, D22). Each is fixed with a self-test case. Please try your own wrong drafts against the scorer.
- Discoveries D1–D22 and experiments E13–E17 are in `experiments.md`.

## 3. Proposed answer-key corrections (not applied; `expected/README.md` rule 3 needs your check)

| # | Key now | Proposed | Official evidence |
|---|---|---|---|
| **D11** | `slice-1-field-map.json`, IMM 1295: `MarriageDate.FromYr/FromMM/FromDD` mapped to `relationship.start_date` (Client A) | Map the visible `form1[0].Page1[0].MaritalStatus[0].SectionA[0].DateOfMarriage[0]` (date, YYYY-MM-DD) to the relationship start date; mark the three hidden boxes as filled by the form's own script (not a fact). Open: whose fact (draft: the partner; key: Client A; it belongs to the couple) | `official-sources/ircc/forms/imm1295e.pdf` (`57fc256e…`), XFA template: DateOfMarriage's validate script `validateDateWithHiddenFields(this, "<=", utilDates.getToday(), MarriageDate.FromYr, MarriageDate.FromMM, MarriageDate.FromDD)`; P1 inventory: the three hidden boxes are `invisible` with no caption, DateOfMarriage is the visible date field; P1 E11: after Adobe's save the hidden boxes held the split date written only to DateOfMarriage |
| **D19** | `combination-1.json`, IMM 5707 `condition: "age 18 or older"` | `aged 18 or older, or a minor travelling alone to Canada`; and a scenario setting that the child travels with the family (not alone) | The key's own cited passage: `checklists/imm5488e.pdf` (`0c8fa194…`): "Family Information (IMM 5707) Note : Must be completed by those aged 18 years or older or a minor travelling alone to Canada." The live draft encodes exactly this |

If you accept them, the maker applies them with the citation and reruns the scores. If you reject them, the current key stands and the results above are final.

## 4. Questions for you

- **D12:** inside IMM 1295 the form calls itself 06-2018 (the model read it, and the barcode labels say `IMM1295_06-2018`), while the official manifest records the edition as 09-2023 (canada.ca). Which edition should records and release notes carry?
- **D20:** the draft lists IMM 1295 for the principal applicant only; the key has each applicant, because the partner also applies (a scenario setting). Is that a draft error, or should the scenario's 'partner also applies' be an explicit input to the configuration?

## Reproduce (offline; no network, no key, no AI)

```bash
shasum -a 256 -c ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p2-review-manifest-2026-10-20.sha256
export PATH=$PWD/.tools/node-v24.21.0/bin:$PATH
cd ai-workers/problem-1-pathway-setup-and-form-filling/prototype
node_modules/.bin/tsc -p tsconfig.json && node_modules/.bin/tsc -p p2/tsconfig.json
node tests/score_p2.ts p2/config/c1-draft-1-live.json   # 20/22 (writes p2/scores/)
node tests/spread_p2.ts                                  # five trials
node tests/check_score_p2.ts && node tests/check_conditions.ts && node tests/check_p2_guard.ts && node tests/check_p2_launch.ts
python3 -I tests/p2_acceptance.py --check && python3 -I tests/check_trace.py
```

Re-assembly of the full draft from its nine run records: `xargs node p2/assemble_runs.ts live` with the nine files listed in PROGRESS (20 Oct, "P2 live core result complete").

## Prompt for the reviewer

> Review P2 of the Solution 1 working prototype at the exact revision in `prototype/p2-review-manifest-2026-10-20.sha256`, as listed in `prototype/p2-review-handoff-2026-10-20.md`. Scope: the live AI-drafted configuration of combination 1, its scoring against the 22 acceptance examples, the five-trial spread, the discoveries D11–D22, the two proposed answer-key corrections (D11, D19) and the questions D12 and D20; separate from the P1 revision 4 recheck and the P0 review. Verify the manifest, rerun the offline commands, test the scorer with your own wrong drafts, and check the cited official passages. For D11 and D19 say Accept or Reject with evidence. Report findings as Material or Minor, and a verdict of PASS, PASS WITH FIXES or FAIL. Write only your verdict line to PROGRESS.md; do not edit maker files.
