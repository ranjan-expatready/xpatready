# P2 response revision: focused recheck handoff

20 October 2026 · maker: Claude Code (the Lead) · for the assigned independent reviewer, the **Cowork reviewer session** (AIW-D266); the founder relays it. This answers Codex's P2 verdict (08:23:05Z, PASS WITH FIXES).

**Scope.** P2-M1, P2-M2, P2-M3/D20, the accepted D11 and D19 key corrections, D12 as metadata, P2-m1, the offline reassembly and rescore, and the results brief.

**Not in scope.** R4-M1 has its own handoff and revision (`r4-m1-fix-handoff-2026-10-20.md`, manifest `0eaa8cf7…f079`); its files are unchanged here. P3 and P4 are regenerated afterwards and reviewed together (paired rhythm). P0 stays separate.

**No model call was made for this revision.** Every number comes from preserved raw outputs.

## Exact revision

- **Manifest:** `prototype/p2-response-manifest-2026-10-20.sha256`, 877 files, SHA-256 `53e985aaa2600b3e69ac7ece86396df9b51578dabc24a33c6015b6578379dfb5`.
  - It holds every file of the P2 review manifest (`96e8f37d…1a67`, 823 files, kept unchanged) at its current hash, none missing: 792 unchanged, 31 changed.
  - Plus 54 new files: everything under `p2/`, `tests/`, `expected/`, `contracts/`, the prototype's top-level documents and `ai-workers/decisions.md`.
- **Frozen copy of the 85 changed and new files:** `archive/ai-workers/p2-response-submission-2026-10-20/`, read-only, with `DELTA-FILES.txt` and the manifest (85/85 OK at freeze). The 792 unchanged files are byte-identical to the P2 review revision, which your earlier frozen copy also holds.
- **Experiment ledger:** 215 lines, SHA-256 `e7430baf…011d`, the same as the R4-M1 revision. No ledger line was added for this revision.
- **Prompts and jobs are unchanged** (`p2/prompts/*.md`, `*.schema.json`, `p2/jobs/`), so the launch-path stub passes are those of the R4-M1 revision.

## What changed, finding by finding

| Finding | Change | Evidence |
|---|---|---|
| **P2-M1** scorer | `tests/score_p2.ts` v2. Facts are aligned through `expected/fact-aliases-c1.json`: 77 entries decided from each draft definition's own words, never from boxes, and built by `tests/make_fact_aliases.py` from run records and original configurations only. Exact transform checks come from key v2 `expect`: date format, every code, inversion, compound select-then-date. FM-08 now has a bar, and the D11 relationship date is a named dependency. The original scorer is frozen as `tests/score_p2.v1.ts` | `tests/check_score_p2.ts` **44/44**. Your negatives on the **real live draft**: the 26-entry global family/given swap drops each IMM 5707 perspective by 10 and IMM 1295 by 2; the 13 birth-date mappings as YYYY-DD-MM fail the exact date check on every one inside the slice. Further negatives: unreviewed alias, history-meaning alias, one code changed, codes without labels, yes/no reversed, uninverted no-children, a D11 helper mapped, D19 age-only, D20 principal-only |
| Scorer defects found on stored output | A code pair followed by a note was not read. A derived field referenced to the date of birth overwrote a missing date of birth (v1 had this too, masked). A selection step before a date was refused | a self-test case each |
| **P2-M2** canonical reuse | `p2/assemble.ts` v2 (original frozen as `p2/assemble.v1.ts`). It lists one id defined differently by two runs, and two ids of one type with near-identical definitions, for a person to decide. It applies `p2/field-review.c1.json`: 11 merges and 2 splits that rewrite every reference (32 rewritten), plus 4 flags. Uncertain or differently placed matches stay distinct. v1 labels are refused, so the originals cannot be overwritten | `tests/check_assemble_p2.ts` **21/21**: your country-of-birth case is detected; IMM 1295 `PlaceBirthCountry` and IMM 5707 `COB` read one `person.country_of_birth` with their own transforms; it is placed once; one test value fills both forms. The `person.occupation` split (history rows vs present occupation) moves the assembly defect found by the new scorer. Distinct meanings are kept, uncertain ones flagged |
| **P2-M3 / D20** | The scenario names who applies (`expected/combination-1.v2.json`, `scenario.applications`: Client A and the partner). The configuration gets listed repair R-D20 (`p2/repairs.c1.json`: IMM 1295 `who` principal_applicant → each_applicant, with both official citations). Model output is unchanged and RQ-02 still fails on it | layers B and C fail RQ-02; layer D passes with the repair listed. Lesson D26: the requirements job lacked the IMM 1295 form page |
| **D11** | `expected/slice-1-field-map.v2.json`. The visible `DateOfMarriage` (YYYY-MM-DD) is keyed; the three `MarriageDate.From*` helpers are form-calculated with expected outcome not_a_fact, kept for coverage. The date is one relationship fact (`owner: relationship`). The draft's single-person attribution is reported as a named dependency, not declared correct | `tests/make_keys_v2.py --check`: the raw XFA template quotes (picture, exit script, invisible helpers) are found in the hash-verified PDF |
| **D19** | `combination-1.v2.json`: IMM 5707 is "18 or older, or a minor travelling alone". It adds an explicit travel setting and eight cases (adult, 18 on the day, one day short, minor alone, minor accompanied, minor with no answer, adult with no answer, no date of birth) | RQ-03 PASS on the live draft's tree, all eight cases |
| **D12** | Metadata, not a key change. Each field map carries `edition_metadata`: package edition (manifest), internal template identifiers (IMM 1295: `IMM1295_06-2018`), model-read edition and artifact SHA-256, side by side and none rewritten | `check_assemble_p2.ts` D12 cases |
| **P2-m1** | `p2/prompts/history/`: the exact earlier template and schema bytes used by 5 live runs (3 combination-1, 2 probes), recovered from the project's backup snapshots, hash-verified and read-only. `INDEX.json` maps all 25 live runs to their exact prompt bytes; every run's prompt hash is re-verified | `INDEX.json` (`prompt_sha256_verified: true` on all 25) |
| Reassembly and rescore | `tests/rescore_p2.ts`, in four separate layers: A original (reproduced byte for byte, configuration `5075783c…96a7` and score); B evaluation corrections only; C assembler v2 detection only; D reviewed repairs. Plus the five trials (`tests/spread_p2.ts` v2; the original spread reproduced by `tests/spread_p2.v1.ts`) | `p2/scores/v2/rescore-summary.json` |
| Results brief | `p2-results-brief-2026-10-20.md`: raw versus repaired versus corrected, by capability; costs; selection; limits; "fully correct" withdrawn | — |
| Records | `experiments.md` E18, E19, D23–D28; `trace.csv` P2-08 to P2-10 (33 rows); `expected/README.md` v2 section; design note on R4-M1 | `tests/check_trace.py` 5/5 |

## Results (offline, from preserved outputs)

| Layer | Acceptance | IMM 5707 (each perspective) | IMM 1295 |
|---|---|---|---|
| A original (v1) | 20/22; RQ-02, RQ-03 fail | 42/42 | 3/6 |
| B evaluation corrections only | 20/22; FM-08, RQ-02 fail | 37/42: 5 present-occupation boxes point at a history-period definition (an assembly defect; run-local 42/42) | 6/7 (+1 dependency) |
| C assembler v2, detection only | 20/22 | 37/42; 28 items listed for review | 6/7 |
| D reviewed repairs | 22/22 (**not model success**) | 42/42 | 6/7 (+1 dependency) |
| Trials 1–5 (v2, no repairs) | — | 42, 42, 41, 41, 41 | 6, 6, 6, 5, 6 of 7 |

There were 0 wrong-person and 0 invented entries in every layer and trial. The slice is 91 key entries over 49 of the 461 boxes.

## Limits

- The alias table, field review, repairs and v2 keys are maker-made. Each is listed and cited, and needs your check (`expected/README.md` rule 3).
- The detector's word-overlap rule is a screening aid, not proof of sameness: every hit goes to a person.
- Two contract gaps stay open. Relationship-owned facts have no relationship scope (D11 dependency). Placements cannot differ by person (D27; e-mail and telephone kept distinct and flagged).
- D21 (16 checks citing a draft) is still open.
- Adding the IMM 1295 form page to the requirements job, and any prompt fix, would be a new paid run. That waits for the R4-M1 recheck.

## Reproduce (from the project root; no network, no key, no AI)

```bash
shasum -a 256 -c ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p2-response-manifest-2026-10-20.sha256
export PATH=$PWD/.tools/node-v24.21.0/bin:$PATH
cd ai-workers/problem-1-pathway-setup-and-form-filling/prototype
node_modules/.bin/tsc -p tsconfig.json && node_modules/.bin/tsc -p p2/tsconfig.json
node tests/check_score_p2.ts        # 44/44
node tests/check_assemble_p2.ts     # 21/21 (writes c1-draft-1-live-r2*.json; re-assembles live with v1, byte-identical)
node tests/rescore_p2.ts            # four layers; original reproduced
node tests/spread_p2.v1.ts && node tests/spread_p2.ts
../../../.tools/solution-1-prototype/.venv/bin/python -I tests/make_keys_v2.py --check
python3 -I tests/make_fact_aliases.py --check && python3 -I tests/p2_acceptance.py --check && python3 -I tests/check_trace.py
../../../.tools/solution-1-prototype/.venv/bin/python -I tests/check_expected_citations.py   # 42 / 0
```

The assembly and score scripts rewrite their own outputs. They are deterministic: rerun them in a copy if you want to diff against the manifest.

## Prompt for the Cowork reviewer

> You are the independent formal checker for Expat Ready Workstream 2 (AIW-D266), folder /Users/ranjansingh/Desktop/Xpatready. Read AGENTS.md, ai-workers/README.md §0–1, ai-workers/NEXT.md, Codex's 08:23:05Z verdict in ai-workers/PROGRESS.md, and `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p2-response-handoff-2026-10-20.md`. Confirm your session identity and that you did not author this revision. **Scope:** P2-M1, P2-M2, P2-M3/D20, D11, D19, D12 metadata, P2-m1, the offline reassembly and rescore, and the results brief, at the exact revision in `prototype/p2-response-manifest-2026-10-20.sha256` (SHA-256 `53e985aaa2600b3e69ac7ece86396df9b51578dabc24a33c6015b6578379dfb5`; delta frozen in `archive/ai-workers/p2-response-submission-2026-10-20/`). R4-M1 is a separate recheck; P3/P4 and P0 are out of scope. Verify the manifest in a copy and rerun the reproduction commands there. Then check:
> 1. Your own negatives, including Codex's name-swap and date-order cases on the real draft, fail under scorer v2.
> 2. The alias table is decided from definitions, not boxes.
> 3. The field-review merges, splits and flags are justified, and every reference is rewritten.
> 4. One birth-country value fills IMM 1295 and IMM 5707 and is asked once.
> 5. The v2 key changes (D11, D19, D20) match the cited official files.
> 6. D12 metadata is kept apart.
> 7. The historical prompt bytes match the run records.
> 8. The four layers keep model output, repairs and evaluation corrections separate, and the brief claims no more than the evidence.
>
> Make no network or model call; read no key. Report each finding as Closed, Partly closed or Open with evidence; list new Material or Minor findings with file and line; give PASS, PASS WITH FIXES or FAIL. Distinguish inspected, executed and unverified evidence. Append one verdict line to ai-workers/PROGRESS.md with the UTC time from `date -u`, "Formal checker (Cowork reviewer)", your tool/model if available, session identity, revision hash, scope and evidence. Write no other project file; do not change founder decisions or claim founder acceptance.
