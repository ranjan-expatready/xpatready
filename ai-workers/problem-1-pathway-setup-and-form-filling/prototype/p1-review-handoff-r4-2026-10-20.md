# P1 revision 4: targeted recheck handoff

20 October 2026 · maker: Claude Code (the Lead) · for the assigned independent reviewer (Codex, D248); the founder relays it. **Targeted recheck of P1R2-M2 (launch path), R3-m1 (barcode normalisation) and R3-m2 (trace CSV) only; no general audit.** The P0 review stays pending and separate (verify P0 in `archive/ai-workers/p0-review-submission-2026-10-19/`).

- **Manifest:** `prototype/p1-revision-4-manifest.sha256`, 782 files, SHA-256 `275225d3d79d1ad08f35a4ba015f534f756fb8de1152412bfd3a4cfbb0fc2789`. It covers the revision 3 set at current hashes (nothing dropped) plus every file now under `prototype/` and `official-sources/`, `ai-workers/decisions.md`, and the working-edition files changed by AIW-D264. Excluded as before: the handoff files, `node_modules`, `__pycache__`. The revision 3 manifest and handoff are kept unchanged.
- **The experiment ledger grows after this manifest (append-only).** At revision 4, `p2/ledger/spend.jsonl` had 71 lines with SHA-256 `f3a756009c39e9e6623ca3386c5ba8e83d62ba1b865fff7a499a1eb251863202`. Live runs started after the handoff append lines, so check the revision-4 state with `head -n 71 prototype/p2/ledger/spend.jsonl | shasum -a 256`; new run records in `p2/runs/` are additions, not changes.
- **Do not run `p2/pipeline.ts` or `p2/launch.ts` in place:** they append to the experiment ledger and write run records (both in the manifest). The launch-path test runs the exact path in a temporary copy.

## What to recheck

1. **P1R2-M2: one trusted launch path, executed with a stub before any paid call.** `p2/launch.ts` (admits route and inputs through `p2/guard.ts`; screens the template and output schema with `screenMakerText`; starts `p2/draft.ts` with `isolatedNodeArgs`; validates output against the contracts; writes the run record; records a stub pass bound to the launch-path code), `p2/draft.ts` (refuses unless `assertIsolated()` holds; refuses template or schema bytes other than the screened ones; fixed builder `p2/prompt.ts`; `new SpendLedger(LEDGER_DIR)` at the fixed cap), `p2/isolation.ts` (asks `process.permission`, not the start-up arguments), `p2/runner.ts` (`sdkCaller()` refuses outside `draft.ts` under the permission model; `runDrafting` refuses a paid caller with any ledger other than `p2/ledger/spend.jsonl` at US$40). Your executed case is test 1 of `tests/check_p2_launch.ts`: a template carrying `e.g. client.a@example.com` is refused by the launcher, no process starts, no ledger line, no record. Design §2's enforcement claim now states only what this test executed.
   - **Found on first execution and fixed:** Node's permission model disables `fsync`; the revision 3 ledger could never have recorded a reservation inside the isolated process. Inside it the ledger now writes without fsync (survives a drafting-process crash, not a power loss); outside it still fsyncs. The first failed stub attempt left one stub reservation counted at worst case (US$0.78) in the append-only ledger; it is left in place.
   - Plain library tests stay reusable (`tests/check_p2_guard.ts`, injected temporary ledgers, stub callers); they cannot spend money because a paid caller cannot exist outside the isolated entry.
2. **R3-m1:** `p1/barcode_positions.py` `same()` allows the leading-zero difference only on `DOBMonth[0]`, `FromMonth[0]`, `ToMonth[0]` (the six slots observed), literal comparison everywhere else. `tests/check_barcode_positions.py` adds your postal-code case (barcode2 slot 30, 110001 → 0110001 now fails), a `004` month case and a box-name case. Regenerated evidence: same 186 slots, 180 exact, 6 month-box normalisations, 0 problems; revision 3's evidence kept as `imm1295e-v6-barcode-positions.r3-2026-10-19.json`.
3. **R3-m2:** `trace.csv` rewritten through Python's `csv` writer (quoted); `tests/check_trace.py` checks every row has the header's nine cells, no `None` key under `DictReader`, unique ids and filled required cells. P1-03 now says 23/23. A new row P1-07 records the launch path.

## Reproduce (from the project root; no network, no key, no AI)

```bash
shasum -a 256 -c ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p1-revision-4-manifest.sha256
export PATH=$PWD/.tools/node-v24.21.0/bin:$PATH
P=ai-workers/problem-1-pathway-setup-and-form-filling/prototype
$P/node_modules/.bin/tsc -p $P/tsconfig.json && $P/node_modules/.bin/tsc -p $P/p2/tsconfig.json
node $P/tests/check_p2_launch.ts        # 21/21, in a temporary copy
node $P/tests/check_p2_guard.ts         # 36/36
node $P/tests/check_contracts.ts        # 23/23
.tools/solution-1-prototype/.venv/bin/python -I $P/tests/check_barcode_positions.py   # 14/14
python3 -I $P/tests/check_trace.py      # 5/5
```

## Context, not part of this recheck

P2 started under existing approvals while the key file is absent: AIW-D263 (a later step may read an earlier guarded draft, verified first) and AIW-D264 (condition language: the team's 11 operators; W1 3.5.r2 corrected, ledger 43 edits, 0 unexplained; working-edition checks 26/26). The whole combination-1 draft runs through the launch path with stub callers (`p2/pipeline.ts`, 9/9 steps, contract-valid draft) and is scored against 22 acceptance examples with exact rule ids (`tests/p2-acceptance.json`, `tests/score_p2.ts`; scorer self-test 21/21; conditions 30/30). Discoveries D1–D10 are in `experiments.md`. **No model output exists yet**; P2 quality gets its own review once live runs exist.

## Prompt for the reviewer

> Recheck P1 revision 4 of the Solution 1 working prototype at the exact revision in `prototype/p1-revision-4-manifest.sha256`. Scope: P1R2-M2 (the trusted launch path, executed with a stub before any paid call), R3-m1 and R3-m2, as listed in `prototype/p1-review-handoff-r4-2026-10-20.md`; no general audit, and keep it separate from the pending P0 review. Verify the manifest, rerun the reproduction commands, try your own bypasses of the launch path (unscreened text, a widened permission set, another ledger, a paid caller outside `draft.ts`), and your barcode and CSV cases. Report each finding as Closed, Partly closed or Open with evidence, any new Material or Minor findings, and a verdict of PASS, PASS WITH FIXES or FAIL. Write only your verdict line to PROGRESS.md; do not edit maker files.
