# P0 review handoff: working prototype readiness

19 October 2026 · maker: Claude Code (the Lead) · for the assigned independent reviewer (Codex, D248). The founder relays it. **Bounded review of P0 only; no general audit.**

> **Note added 19 Oct 2026 (after submission):** on the founder's request the official files moved from `inputs/ircc-forms/` to `official-sources/ircc/` and the test material into `prototype/p1/`. Verify this P0 revision in its exact frozen copy: `cd archive/ai-workers/p0-review-submission-2026-10-19/files && shasum -a 256 -c ../p0-revision-manifest.sha256`. The live tree no longer matches the P0 manifest by design.

## Exact revisions

- **Revision manifest:** `prototype/p0-revision-manifest.sha256`. It lists 97 files with full SHA-256; its own SHA-256 is `99d86c8bb166fc417f4f26407c6a46c695ae0c4de66c08d435451c200a8d9059`. Verify from the project root: `shasum -a 256 -c ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p0-revision-manifest.sha256`.
- **Working edition W1 page:** `solution-1-one-pager-working.html`, SHA-256 `d765b95edd9db7cd100d34f083840bf14344965d34ee7ab62a4d04608e013645`. Its source is `tools/s3-working/s3_data.py`, SHA-256 `54aee3aa…32f2`.
- **Frozen references:** accepted draft 4.3 `124df0a2…8445`; B0 manifest `51287c21…`.

## What to check (scope)

1. **Preservation.** `tools/s3/*`, the 4.3 page and B0 are unchanged. Every B0-manifested file matches live except `NEXT.md`, `decisions.md` and `delivery-control.md` (control records). Originals are read-only. The working builder writes only the working page and `checks/working-edition/`.
2. **W1 corrections.** Each of the 42 edits in `tools/s3-working/apply_w1.py` should faithfully express AIW-D251–D254, the D253 history rule and the row 13 term. **Watch for any changed behaviour beyond those decisions**, and for statements the edits now contradict. The ledger proves W1 = B0 + recorded edits exactly; it does not judge meaning.
3. **History rule.** IMM 5257's "Do not leave gaps" instruction, and no enforcing script found (E4), against the official files.
4. **Answer key.** `expected/combination-*.json` against the cited official passages: forms, documents, conditions, scenario settings and open items; the exact label; independence from configuration. Field values are deferred to P1 by design.
5. **Combinations.** The coverage comparison and its choice of A + B (the mother), including the new limitation that the IRCC Portal route uses web forms and is not demonstrable.
6. **Design (D220).** The TypeScript direct-SDK AI core, the PDF library chosen by experiment, language-neutral tests and reuse classes. Also the corrected claim that this Claude Code session (consumer Max plan) does **not** meet D74 correction 2 / D147.
7. **Approvals.** Downloads and the install stayed within AIW-D257. Reusing the already installed `cryptography` through `--system-site-packages` is a deviation for you to judge: no new install, but it is not pinned by our lock.

## How to reproduce (from the project root)

```bash
shasum -a 256 -c ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p0-revision-manifest.sha256
python3 ai-workers/tools/s3-working/working_ledger.py
python3 ai-workers/tools/s3-working/test_working_guard.py
.tools/solution-1-prototype/.venv/bin/python ai-workers/problem-1-pathway-setup-and-form-filling/prototype/tests/check_expected_citations.py
node ai-workers/tools/s3-working/check_w1.cjs /tmp/w1.json
```

Rebuilding W1 from B0 (`apply_w1.py` on fresh B0 copies, then `build_one_pager.py`) gave the same hash twice in the maker's run. The `.cjs` suites write only to `checks/working-edition/` or the path given.

## Maker's evidence

| Check | Result (executed 19 Oct) |
|---|---|
| Unedited working build (E0) | `124df0a2…8445` (identical to 4.3) |
| W1 ledger | 49 changed B0 strings, all covered by 42 recorded edits; exact reconstruction; 0 unexplained; frozen originals unchanged |
| Guard and ledger tests | 17/17, including an unrecorded change caught |
| Suites on W1 | 150/150, 35/35, 41/41 (L7-3 reworded for D251, recorded), 86/86, 37/37, geometry 0 collisions, W1 targeted 26/26 |
| Visual inspection | 8.1, 8.4, 3.8, 9.3, 5.3 panels at 1440 light; 8.4 at 960 dark and 375 light; case band at 960 dark and 375 light (`checks/working-edition/screens/`). Inspection found and fixed one leftover: the 8.1 summary "once per fact" |
| Answer-key citations | 23/23 found in the cited official files; hashes match the manifest |
| Backup hook | 60 working-file saves, 0 from `.tools/`, 0 FAILED |

## Limits

- **Actual:** downloads, hashing, XFA reading, the specification build and the checks above.
- **Not run:** any AI call, PDF writing or read-back, portal, signing, Validate, or product workflow.
- **Simulated:** nothing yet.
- Field-level answers come in P1. No reader trial. Legal: Unconfirmed: no counsel (AIW-D94).

## Prompt for the reviewer

> Review P0 of the Solution 1 working prototype at the exact revisions in `prototype/p0-revision-manifest.sha256` (manifest SHA-256 99d86c8b…9059). Scope: items 1–7 of `prototype/p0-review-handoff-2026-10-19.md` only; no general audit. Verify the manifest, rerun the reproduction commands, and read the W1 panels that the 42 edits touch. Check that each edit expresses only AIW-D251–D254, the D253 history rule and the row 13 term, and that the answer key's citations, label and scenario settings are correct against the official files. Report Material and Minor findings with evidence, and a verdict of PASS, PASS WITH FIXES or FAIL. Write only your verdict line to PROGRESS.md; do not edit maker files.
