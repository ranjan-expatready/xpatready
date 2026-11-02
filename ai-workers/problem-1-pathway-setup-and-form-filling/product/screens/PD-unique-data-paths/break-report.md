# Break report: row PD (unique data paths), commit face08a2

Attacker run, US$0: isolated copy `brk_pd` on :4459 (stopped), P2_LEDGER_DIR in the scratchpad, no *_LIVE variable, no launch. No repository file edited except this report. (`canary-digest.json` and `check_forms_channels.json` show as modified in the tree: not mine, the other suite run.)

## Findings

### M1 (Minor). The Apply suite never touches IMM 5532, the form the row exists for
- Did: ran `check_forms_pd_apply_replayed.ts 4459 xr_studio_brk_pd` after Load sample "six".
- Expected: the 409 case (5532) exercised end to end.
- Actual: 8/8 pass on 13 replayed forms (0008, 1294, 1344, 5257_1, 5406, 5409, 5475, 5476, 5562, 5604, 5646, 5707, 5710). IMM 5532 is not among them: its saved run was removed in 6eaf04ff, so after Load sample it is READ with no job. The suite would pass with the old reader. The fix is covered only by `check_forms_pd_unique_paths.ts` (inventory shape), never by an Apply of a 5532 draft. The header says the re-run "is covered without editing this file": true only once the run lands.
- Evidence: check_forms_pd_apply_replayed.ts:31-36 (the list is only REPLAY jobs).

### m2 (Minor). Apply never checks that the run was drafted on the current inventory
- Read sources.ts:781-860: Apply writes `dataPath: e.data_path` straight from the run record and uses the current inventory only for caption/heading. The run's `inputs.official_files[0].sha256` is not compared.
- Stale protection exists only at selection time (`savedRuns` sameInput, sources.ts:207-219, and `sameDraftInputs`). A draft job already COMPLETED in a persisted workspace from an old 5532 run (old paths, 44 duplicates) still answers 409 on Apply, with no plain reason. I could not plant such a run without editing p2/runs, so this is from code only.

### m3 (Minor). Persisted approved-form inventories keep the old numbering
- read_form.py:90-93 never overwrites an existing inventory; a differing one gives `ok:false`, and sources.ts:187 turns that into READ_FAILED ("existing inventory DIFFERS"). Any uploaded-and-approved form whose `<checksum>.inventory.json` was written by the old reader (same-named boxes in unnamed subforms) cannot be re-read and keeps duplicate paths, so Apply still gives 409. Only official-library inventories were regenerated. No such file exists in this checkout (none under studio/var), so impact depends on the Mac demo data.

### m4 (Minor, theoretical for the 19 official forms). Counting assumptions not exercised
Probed with synthetic templates through the test's own harness:
- Unnamed repeating subform (`occur max=5`) holding a box: takes one index, later siblings of that name are numbered as if it had one instance (a[3], then a[4]). At runtime n instances shift them. The old reader was also approximate, but the new shared counter now propagates the error to siblings.
- Named `subformSet` opens a data level in the code (S[0].a[0]); I believe XFA does not bind subformSets (Unconfirmed: spec not re-read). No official form here has a named subformSet (scanned all 19).
- `bind match="global"` on a box is counted like normal binding (consumes an index). Only 5532's two `formNum` boxes use it, inside pageSet (skipped), so no effect today.
- A second same-named sibling after a repeating named subform (`Row` occur -1, then `Row`) gets Row[1], which a runtime instance would also take. Pre-existing.

## Held
- Nested unnamed subforms (3 deep), unnamed subformSet, area, exclGroup, field and subform of one name, match=none container and box, dataRef container into an existing scope: all give distinct, document-ordered paths; dataRef/none behave as the tests state.
- IMM 5532 against its shipped data: for every (parent, name) the maximum index in the new inventory equals the shipped skeleton's node count (yesNo 21, Table1 9, Table2 2): no off-by-N.
- Fill: `p5/fill.py` with all 314 new paths: written 314, read back equal 314, other leaves changed 0, intact true; an independent walk of the output datasets found 0 of 314 mismatches.
- `check_forms_pd_unique_paths.ts`: 10/10; it re-derives all 19 inventories (only 5532 differs from before); the E1 inventories (0008, 5257) have identical fields/groups to p1's. `imm5532e.formats.json` regenerated gives identical keys and content, so it is not stale.
- Paid-run path: the stub pass hashes the job without its inputs (pathcode.ts:34), so the changed input sha does not invalidate it and needs no new pass; the old sha (48b051b8...) appears nowhere in code; no saved 5532 run is replayable (`draft-options` saved_runs = []; REPLAY plan: "No saved AI answer"; LIVE plan: draft in 8 parts, worst US$8.10, 314 of 314 fields).
- Load sample does not rewrite job files or inventories (git status clean after it). read_form.py, Studio "Read form" and E1 inventory.py all call the same `inventory()`, with the counter local to each call.
- Unique key not loosened; second Apply refused (409 "Already applied.").
