# P1 review handoff: real form inventory, write test, Adobe test, architecture response

19 October 2026 · maker: Claude Code (the Lead) · for the assigned independent reviewer (Codex, D248). The founder relays it. **Bounded review of P1 only; no general audit.** **Revision 2** replaces revision 1 (`2184671d…c040`, never reviewed). The P0 review (`p0-review-handoff-2026-10-19.md`, manifest `99d86c8b…9059`) is still pending and separate; verify P0 in its frozen copy, `archive/ai-workers/p0-review-submission-2026-10-19/`.

## Exact revisions

- **P1 manifest:** `prototype/p1-revision-manifest.sha256`, 678 files, SHA-256 `458961469bb78b161b610bf3688e55c3f899fbdb71b45ef83178c64d51584035`. It covers the surviving P0 set at current hashes, the whole prototype folder (including all E5 run folders and the Adobe test copies), `official-sources/ircc/`, `inputs/MOVED-ircc-forms.md`, and the P0 archive's manifest and README.
- **Change record:** `prototype/p1-change-record-2026-10-19.md`.
- **Frozen and unchanged:** W1 page `d765b95e…3645`; accepted 4.3 page `124df0a2…8445`; B0 107/107; P0 archive 97/97.

## What to check (scope)

1. **Preservation and the move.** The P0 archive is exact. The 25 official files are byte-identical in `official-sources/ircc/` (manifest `path` per item). Every live reference points to the new paths; earlier records citing `inputs/ircc-forms/` are historical. W1, 4.3, B0 and authoring sources unchanged.
2. **Inventory.** `p1/xfa_inventory.py` and `p1/inventory/*.json` against the templates: binding rules, the widget-type fix (picture clauses), 468/468 boxes in the forms' own data, the people/relationships table and mapping findings (report §1).
3. **E5.** Rerun: full rewrite breaks both signatures; pypdf 6.19.0 append as shipped is unreadable (its `_write_increment`); diagnostic append 587/587 through pypdf and `e5_independent_readback.py`, original bytes kept, signatures verify (OpenSSL, integrity only).
4. **Adobe test (E10–E11, report §4).** Read the evidence in `p1/adobe-test/` and `evidence/`: values and conditions shown, certification kept, the complete IMM 1295 passes Validate, five barcodes decode (`decode_barcodes.py`) and match the written values as stated, signatures verify after Adobe's save. Check that no claim goes beyond one Mac, one Adobe version line and two forms.
5. **Answer key independence.** `expected/slice-1-field-map.json` from official templates only; nothing in drafting inputs could carry it.
6. **Contracts.** Schemas, `contracts/rules.ts`, `tests/check_contracts.ts` (15/15, `tsc` clean).
7. **Architecture (M1–M3).** Design §6–§9 and `comparison-plan-2026-10-19.md`: evidence classes kept apart; direct SDK only a proposed baseline; LangGraph a fair challenger; cited team-repository facts accurate.
8. **Rules, installs, research.** AIW-D258 (with correction) to AIW-D262: installs within approval (Node 24.21.0; npm packages incl. `@types/node`; four Python wheels plus zxing-cpp 3.1.1; Adobe via Homebrew with the founder's password and licence instruction). `../research/ircc-barcode-form-filling-2026-10-19.md`: sources labelled correctly, no overclaim. No API key used, no AI call.

## How to reproduce (from the project root)

```bash
shasum -a 256 -c ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p1-revision-manifest.sha256
(cd archive/ai-workers/p0-review-submission-2026-10-19/files && shasum -a 256 -c ../p0-revision-manifest.sha256)
.tools/solution-1-prototype/.venv/bin/python -I ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p1/xfa_inventory.py
.tools/solution-1-prototype/.venv/bin/python -I ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p1/e5_roundtrip.py
.tools/solution-1-prototype/.venv/bin/python -I ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p1/e5_independent_readback.py
.tools/solution-1-prototype/.venv/bin/python -I ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p1/decode_barcodes.py ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p1/adobe-test/evidence/imm1295e-v6-barcode-[1-5].jpg
.tools/solution-1-prototype/.venv/bin/python -I ai-workers/problem-1-pathway-setup-and-form-filling/prototype/tests/check_expected_citations.py
export PATH=$PWD/.tools/node-v24.21.0/bin:$PATH
ai-workers/problem-1-pathway-setup-and-form-filling/prototype/node_modules/.bin/tsc -p ai-workers/problem-1-pathway-setup-and-form-filling/prototype/tsconfig.json
ai-workers/problem-1-pathway-setup-and-form-filling/prototype/node_modules/.bin/tsx ai-workers/problem-1-pathway-setup-and-form-filling/prototype/tests/check_contracts.ts
```

Rerunning E5 or the inventory rewrites their result files (new run folder, timestamps), so hashes then differ from the manifest; compare results, not bytes. The Adobe test needs Adobe Acrobat (free mode) and a person or desktop control; its evidence files are in the manifest.

## Maker's evidence (executed 19 Oct)

| Check | Result |
|---|---|
| P1 manifest / P0 archive / B0 | 678/678 / 97/97 / 107/107 |
| Official library | 25/25 hashes match `official-sources/ircc/manifest.json` |
| Inventory | 7 forms; 468 data boxes; 468 in the forms' own data |
| E5 (run `e5-20261019T165914Z`) | full rewrite 587/587 but signatures broken; pypdf append as shipped 0 readable; diagnostic 587/587 (pypdf and independent), signatures verify, poppler clean |
| Adobe (Acrobat 26.002.22031, free mode, Mac) | values and conditions shown; certification banner; IMM 1295 complete set "Validation completed successfully"; 5/5 barcodes decoded; 80/91 exact, 7 in form format, 3 dates split, 1 cleared by form rule; signatures verify after Adobe save |
| Contracts / citations | 15/15, `tsc` clean / 26 checks, 0 failures |

## Limits

- **Not run:** any AI call (key file not yet present); the A-versus-C comparison; IRCC portal upload; Windows; the other five forms in Adobe; negative tests (stray spaces, special characters); R2 import; signing.
- **Simulated:** nothing. All family data synthetic.
- Legal: Unconfirmed: no counsel (AIW-D94).

## Prompt for the reviewer

> Review P1 of the Solution 1 working prototype at the exact revision in `prototype/p1-revision-manifest.sha256` (SHA-256 45896146…4035), revision 2. Scope: items 1–8 of `prototype/p1-review-handoff-2026-10-19.md` only; no general audit, and keep it separate from the pending P0 review (verify P0 in its archive copy). Verify the manifests, rerun the reproduction commands, read pypdf 6.19.0's `_write_increment` for item 3, and inspect the Adobe evidence for item 4. Check that every claim stays within its evidence (one Mac, one Adobe version line, two forms in Adobe), that the answer key is independent, that the contracts enforce what they state, and that the architecture section answers M1–M3. Report Material and Minor findings with evidence and a verdict of PASS, PASS WITH FIXES or FAIL. Write only your verdict line to PROGRESS.md; do not edit maker files.
