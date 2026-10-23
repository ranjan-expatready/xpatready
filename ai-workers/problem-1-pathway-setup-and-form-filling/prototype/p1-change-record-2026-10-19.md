# P1 change record (since the P0 review submission)

19 October 2026 · Claude Code (the Lead). **Revision 3** (`p1-revision-3-manifest.sha256`) answers the formal review of revision 2 (Codex, 2026-10-19T17:33:04Z, PASS WITH FIXES, manifest `45896146…4035`, kept as `p1-revision-2-manifest.sha256`). The revision 2 record follows below unchanged except for the m3 correction in its first line.

## Revision 3: what changed, and why

| Finding | Change | Files | Executed evidence |
|---|---|---|---|
| **P1R2-M1** D254 omitted the submitter | The release record carries author, submitter, approver and optional publisher, each with a role. `canRelease` refuses an approver or publisher who is the author **or** the submitter; no role is consulted, so the Platform Owner cannot bypass it | `contracts/release-record.v0.schema.json`, `contracts/rules.ts`, `tests/check_contracts.ts` | 23/23: the reviewer's author A / submitter B / approver B case is refused; Platform Owner as author or submitter refused; the same person under another role refused; author or submitter publishing refused; an uninvolved third person (Platform Owner or not) may approve; record without a submitter rejected |
| **P1R2-M2** route and inputs were schema shape only | New runner core: `p2/policy.ts` (fixed route, model, prices, caps, the D260 label, forbidden paths); `p2/guard.ts` (`admitInput`: resolved path, no links, manifest-listed and hash-checked official file or its P1 inventory, nothing else; `assertRoute`; `screenMakerText`: prompt text naming an answer-key box or a family value refused; `isolatedNodeArgs`: Node permission model for the drafting process; `loadKey`); `p2/ledger.ts` (experiment ledger: every attempt reserves its worst case before the call, retries included; US$40 experiment cap, US$5 run cap; unsettled or failed attempts stay at worst case; one runner at a time); `p2/runner.ts` (`runDrafting` with SDK retries off and a fixed base URL; `sdkCaller`). `check_route.ts` reuses the guard and states it is a key and model availability check, not a retention or policy qualification. The schema's route became a constant and its descriptions say "shape only". `erasableSyntaxOnly` added so the isolated process can run the TypeScript directly | `p2/*.ts`, `p2/isolation_probe.ts`, `tests/check_p2_guard.ts`, `contracts/drafting-run.v0.schema.json`, `contracts/fixtures/drafting-run.valid.json` (route), `tsconfig.json` | 36/36, no AI call: the reviewer's family-file plus `not-an-approved-route` fixture is refused by the runner; the isolated process reads the official form and inventory, is denied the answer key, family values and other project records, and still loads the runner and SDK; retries counted; the cap stops the next call before it is made |
| **P1R2-M2** route wording | Route text reconciled with D260–D261 without rewriting history | design §2 note and §6, comparison plan, `env/README.md`, `trace.csv` P0-10 and P2-01, `experiments.md` E6, `delivery-control.md` | — |
| **P1R2-M3** barcode accounting | `p1/barcode_positions.py` reads the official form's barcode1–5 manifests, binds every slot through the inventory and compares by position with the Adobe-saved data; written values are classed as encoded at their own slot, feeding a derived slot by a named form rule (checked), cleared by a named rule, a non-encoded control, or an answer not in any manifest; anything else fails. The revision 2 JSON is kept byte-identical in `evidence/superseded/` | `p1/barcode_positions.py`, `tests/check_barcode_positions.py`, `p1/adobe-test/evidence/imm1295e-v6-barcode-positions.json`, report §4, `experiments.md` E11, `p1/adobe-test/README.md`, research §6 | 186 slots (61/46/37/13/29), 0 unknown bindings, 180 exact + 6 months without the leading zero, 0 differences; 91 written = 81 own slot (75 exact, 6 months) + 5 derived + 1 cleared + 2 controls + 2 answers not in any manifest; written data 91/91 before and 90/91 after Adobe's save; tests 10/10 (swap, drop, drop-and-pad, borrowed value, the cleared `lov` credited from `01`, wrong label) |
| **P1R2-M4** comparison design | Plan revision 3: storage held equal (one PostgreSQL database for both arms, or the result is reported as whole bundles); Part 1 measures model quality with repeated live trials of the one shared drafting function; Part 2 compares orchestration on byte-identical replayed responses; model choice excluded; every trial kept; no cause presumed | `comparison-plan-2026-10-19.md`, design §6.3 | Design only; not run |
| **m1** duplicate prevention overstated | Key computation only; store lookup planned (S6/S7) | design §6.2, `contracts/rules.ts`, schema description, contract test label | — |
| **m2** Agent SDK categorically excluded | Excluded by scope (unnecessary breadth for one bounded call), not eligibility; official overview, structured-output and hosting pages cited | design §6.2–§6.3, comparison plan §7 | Pages read 19 Oct |
| **m3** "R1 had no review" | Corrected below: revision 1 had the targeted contract/route precheck (Codex 13:51:56Z, PASS WITH FIXES: M1, M2, m1), carried into revision 2's findings and closed here; no completed formal review of revision 1 | this record, handoff | — |
| Research overclaim | Vendor and IRCC statements narrowed to the sources inspected; the "all of the data entered" bulletin qualified by our IMM 1295 finding; no test-account route claimed | `../research/ircc-barcode-form-filling-2026-10-19.md` | — |
| Freshness | Backend dev had moved to `22f1d12` (past the reviewer's `d446f36`); captured read-only as `code/ERv2-sanitized@22f1d12-2026-10-19/`; 90 changed files, all harness, tooling, onboarding or dependency; every cited file byte-identical; all four repositories MATCH | `../../../code/README-copies.md`, design §6.1, `delivery-control.md` | `ai-workers/tools/freshness.sh` |

**Preserved:** all PDF evidence, the Adobe copies and captures, the frozen originals, W1 `d765b95e…3645`, 4.3 `124df0a2…8445`, B0 107/107, P0 archive 97/97, official library 25/25. Inventory and E5 were not rerun (their code and inputs are unchanged). Citations 26/0; `tsc` strict clean for both projects.

---

## Revision 2 record (unchanged except the m3 correction)

19 October 2026 · Claude Code (the Lead). **Revision 2** (supersedes revision 1, manifest `2184671d…c040`, which had the targeted contract/route precheck at 13:51:56Z but no completed formal review). Base: P0 submission, manifest SHA-256 `99d86c8bb166fc417f4f26407c6a46c695ae0c4de66c08d435451c200a8d9059`, preserved exactly in `archive/ai-workers/p0-review-submission-2026-10-19/` (97/97). P0 review evidence applies to that revision only. This revision: `p1-revision-2-manifest.sha256`.

### Unchanged since P0

The W1 page (`d765b95e…3645`), `tools/s3-working/*`, `checks/working-edition/*`, the official files' **content** (byte-identical; only their folder changed, see below), the P0 answer key's content apart from source paths, the coverage and approval documents, `tools/snapshot.sh`. The accepted 4.3 page (`124df0a2…8445`), B0 (107/107) and the original authoring sources are untouched.

### What changed, and why

| Change | Files | Why |
|---|---|---|
| Official files moved into an organised library | `inputs/ircc-forms/*` → `official-sources/ircc/{forms,checklists,instructions,web-pages}/` + `manifest.json` (adds a `path` per item) + `README.md` index; `inputs/MOVED-ircc-forms.md` points to the new home | Founder instruction (AIW-D262). Hashes re-checked on move (25/25) |
| Test outputs moved into the project | `.tools/solution-1-prototype/p1-runs/` → `prototype/p1/runs/` (README added); Adobe copies → `prototype/p1/adobe-test/` (README, `evidence/`); Node installer → `.tools/installers/` | AIW-D262 |
| References updated to the new paths | `expected/combination-1.json`, `combination-2.json`, `slice-1-field-map.json`, `expected/README.md`, `contracts/fixtures/drafting-run.valid.json`, `tests/check_contracts.ts`, `tests/check_expected_citations.py` (manifest location), `p1/xfa_inventory.py` and `p1/e5_roundtrip.py` (look files up through the manifest), `combination-coverage`, `comparison-plan`, `trace.csv`, `experiments.md`, `p0-review-handoff` (note only) | Follow the move |
| Inventory bug fixed | `p1/xfa_inventory.py`: the widget type is the first `ui` child that is not a picture clause, extras, border or margin. 21 IMM 1295 boxes had been typed "picture" and skipped by E5's generic set. Data boxes now 468 (IMM 1295: 242), all in the form's own data | Found during the Adobe test |
| E5 rerun | `p1/e5-results.json`, `p1/e5-independent-readback.json` (run `e5-20261019T165914Z`): diagnostic append 587/587 via pypdf and the independent decryptor | Inventory fix and folder move |
| Adobe test and barcode decoding | `p1/adobe_complete_1295.py`, `p1/adobe-complete-1295-values.json`, `p1/decode_barcodes.py`, `p1/adobe-test/*` | E10, E11 |
| Report, design, environment, log | `p1/p1-report-2026-10-19.md` (§4 Adobe), `implementation-design-2026-10-19.md` §2, §8, §9, `env/README.md`, `env/requirements.lock` (+ zxing-cpp 3.1.1), `experiments.md` (E10, E11) | Results |
| P2 route check | `p2/check_route.ts`, `p2/tsconfig.json` (Models API lookup only; no prompt) | AIW-D261 |
| Research | `../research/ircc-barcode-form-filling-2026-10-19.md` (outside the prototype folder; not manifested) | Founder request: how others solve it |

Outside the prototype folder: `decisions.md` AIW-D258 (and correction) to AIW-D262; `README.md` rule 12; project `CLAUDE.md` line; the founder's global instructions; `NEXT.md`; `PROGRESS.md`.

### Behaviour changes

None to the specification or the W1 page. The prototype environment gained zxing-cpp (pinned). All affected checks were rerun from the new locations: inventory 468/468, E5 587/587 (and independent), citations 26/0, contracts 15/15, `tsc` clean.
