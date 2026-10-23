# P1 review handoff, revision 3: targeted recheck of the revision 2 findings

19 October 2026 · maker: Claude Code (the Lead) · for the assigned independent reviewer (Codex, D248). The founder relays it. **Targeted recheck of P1R2-M1 to M4 and m1 to m3 only; no general audit.** The P0 review (`p0-review-handoff-2026-10-19.md`, manifest `99d86c8b…9059`) is still pending and separate; verify P0 in `archive/ai-workers/p0-review-submission-2026-10-19/`.

**Review history (m3 corrected):** revision 1 (`2184671d…c040`) had a targeted contract/route precheck (13:51:56Z, PASS WITH FIXES: M1 submitter, M2 route/inputs, m1 key) and no completed formal review. Revision 2 (`45896146…4035`) had the formal review at 17:33:04Z (PASS WITH FIXES: P1R2-M1 to M4, m1 to m3). Its handoff is kept as `p1-review-handoff-r2-2026-10-19.md` and its manifest as `p1-revision-2-manifest.sha256` (renamed only; SHA-256 unchanged). **No material finding is marked closed until you recheck it.**

## Exact revision

- **Manifest:** `prototype/p1-revision-3-manifest.sha256` (count and SHA-256 in PROGRESS and NEXT). It covers the revision 2 set at current hashes (prototype folder, `official-sources/ircc/`, the surviving P0 set, `inputs/MOVED-ircc-forms.md`, the P0 and B0 archive manifests and README), plus the research note, `delivery-control.md`, `code/README-copies.md` and the revision 2 manifest file. Excluded as before: this handoff, the revision 2 handoff, `p0-review-handoff-2026-10-19.md`, `__pycache__`, `node_modules`.
- **Change record:** `prototype/p1-change-record-2026-10-19.md`, "Revision 3" table (finding → change → files → evidence).
- **Unchanged and frozen:** W1 `d765b95e…3645`; 4.3 `124df0a2…8445`; B0 107/107; P0 archive 97/97; official library 25/25; every Adobe copy and capture; the revision 2 barcode JSON (byte-identical, now in `p1/adobe-test/evidence/superseded/`).

## What to recheck

1. **P1R2-M1 (D254).** `contracts/release-record.v0.schema.json` (author, submitter, approver, optional publisher, each with a role; submitter required), `contracts/rules.ts` `canRelease` (refuses approver or publisher equal to author or submitter; consults no role), `tests/check_contracts.ts`. Your case author A / submitter B / approver B must now be refused; Platform Owner as author or submitter refused; an uninvolved Platform Owner may approve.
2. **P1R2-M2 (runner, before any P2 prompt).** `p2/policy.ts`, `p2/guard.ts`, `p2/ledger.ts`, `p2/runner.ts`, `p2/isolation_probe.ts`, `tests/check_p2_guard.ts`. Check: inputs admitted only by resolved path and manifest hash (official files and their P1 inventories), your family-file plus `not-an-approved-route` fixture refused by `admitRun`; the drafting process runs under Node's permission model (`isolatedNodeArgs`) and cannot read `expected/` or the family files; maker-written prompt text screened against answer-key box paths and family values; every attempt reserves its worst case in the experiment ledger before the call (retries included; US$40 experiment cap, US$5 run cap; SDK retries off; fixed base URL). Route wording reconciled in design §2 and §6, comparison plan, `env/README.md`, `trace.csv` P0-10 and P2-01, `experiments.md` E6, `delivery-control.md`; `p2/check_route.ts` now states it is not a retention or policy qualification.
3. **P1R2-M3 (barcodes).** `p1/barcode_positions.py`, `tests/check_barcode_positions.py`, `p1/adobe-test/evidence/imm1295e-v6-barcode-positions.json`, report §4, `experiments.md` E11. Expected: your 186 slots (61/46/37/13/29), 180 exact plus 6 numeric normalisations, 0 unknown bindings; all 91 written values classed (81 own slot, 5 derived by checked rules, 1 cleared, 2 telephone-format controls, 2 answers absent from every manifest: Question 2 A yes/no and background Question 6); swapped, dropped, shifted or borrowed positions fail.
4. **P1R2-M4 (comparison design).** `comparison-plan-2026-10-19.md` revision 3 and design §6.3: equivalent durable storage (or explicit bundle comparison), replayed identical responses for orchestration, separate repeated live model-quality trials, model selection excluded, all failures kept, no presumed cause.
5. **Minor m1–m3** and the research narrowing: design §6.2 (duplicate prevention planned, not proved), design §6.3 and plan §7 (Agent SDK left out by scope, with official pages cited), the review history above and in the change record, `../../research/ircc-barcode-form-filling-2026-10-19.md`.
6. **Freshness.** `code/ERv2-sanitized@22f1d12-2026-10-19/` and its entry in `code/README-copies.md`: dev had moved past `d446f36` to `22f1d12`; cited files byte-identical to `fb76410`.

## How to reproduce (from the project root)

```bash
shasum -a 256 -c ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p1-revision-3-manifest.sha256
(cd archive/ai-workers/p0-review-submission-2026-10-19/files && shasum -a 256 -c ../p0-revision-manifest.sha256)
(cd archive/ai-workers/solution-1-v3-draft4.3-prototype-baseline-2026-10-19/files && shasum -a 256 -c ../manifest.sha256)
export PATH=$PWD/.tools/node-v24.21.0/bin:$PATH
ai-workers/problem-1-pathway-setup-and-form-filling/prototype/node_modules/.bin/tsc -p ai-workers/problem-1-pathway-setup-and-form-filling/prototype/tsconfig.json
ai-workers/problem-1-pathway-setup-and-form-filling/prototype/node_modules/.bin/tsc -p ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p2/tsconfig.json
ai-workers/problem-1-pathway-setup-and-form-filling/prototype/node_modules/.bin/tsx ai-workers/problem-1-pathway-setup-and-form-filling/prototype/tests/check_contracts.ts
ai-workers/problem-1-pathway-setup-and-form-filling/prototype/node_modules/.bin/tsx ai-workers/problem-1-pathway-setup-and-form-filling/prototype/tests/check_p2_guard.ts
.tools/solution-1-prototype/.venv/bin/python -I ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p1/barcode_positions.py
.tools/solution-1-prototype/.venv/bin/python -I ai-workers/problem-1-pathway-setup-and-form-filling/prototype/tests/check_barcode_positions.py
.tools/solution-1-prototype/.venv/bin/python -I ai-workers/problem-1-pathway-setup-and-form-filling/prototype/tests/check_expected_citations.py
bash ai-workers/tools/freshness.sh
```

`barcode_positions.py` rewrites its evidence JSON with the same content (compare results, not bytes, if anything differs). The guard test uses temporary ledgers only and makes no AI call.

## Maker's evidence (executed 19 Oct, after the last edit)

| Check | Result |
|---|---|
| P0 archive / B0 / official library | 97/97 / 107/107 / 25/25; W1 and 4.3 hashes unchanged |
| `tsc` strict (prototype and p2 projects) | clean / clean |
| Contracts (incl. D254) | 23/23 |
| P2 runner guard | 36/36 (no AI call) |
| Barcodes by position | 186 slots: 180 exact, 6 numeric, 0 problems; 91/91 written values explained; tests 10/10 |
| Citations | 26 checked, 0 failures |
| Freshness | all four repositories MATCH; backend `22f1d12` captured |

## Limits

- **Not run:** any AI call (the key file is not yet saved); the real SDK call path (typed, loads in the isolated process, unexercised); the comparison; PostgreSQL (to be asked with the challenger packages); Adobe replay, Windows, the other five forms in Adobe, negative tests, portal upload, R2 import, signing.
- Prices in `p2/policy.ts` come from Anthropic's model table as cached 6 Oct 2026; re-check before paid runs.
- The isolation relies on Node 24's permission model in one process; it is not an operating-system sandbox.
- Legal: Unconfirmed: no counsel (AIW-D94).

## Prompt for the reviewer

> Recheck P1 revision 3 of the Solution 1 working prototype at the exact revision in `prototype/p1-revision-3-manifest.sha256`. Scope: your revision 2 findings P1R2-M1 to M4 and m1 to m3, the research narrowing and the backend freshness refresh, as listed in `prototype/p1-review-handoff-2026-10-19.md`; no general audit, and keep it separate from the pending P0 review. Verify the manifests, rerun the reproduction commands, try your own refusal cases against `canRelease` and `p2/guard.ts`, and confirm that the positional barcode check fails on swapped or missing positions. Report each finding as Closed, Partly closed or Open with evidence, any new Material or Minor findings, and a verdict of PASS, PASS WITH FIXES or FAIL. Write only your verdict line to PROGRESS.md; do not edit maker files.
