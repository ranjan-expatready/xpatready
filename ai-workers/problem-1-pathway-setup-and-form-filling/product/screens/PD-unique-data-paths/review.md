# Review: backlog row PD, unique data paths for unnamed XFA subforms (forms lane)

Commit reviewed: face08a2 (branch claude/wizardly-davinci-ns2xky). Code, data and tests only; no screen, no journey score. US$0, no model call, own port 4458 (stopped), scratch ledger.

## Verdict basis
Row PD asks for: every box a unique path (pass and fail test); a check that each replayed draft applies (201); other inventories unchanged or listed.

## Is the numbering what XFA normal binding does? Yes
- The fix: `seen_data` is now `scope_seen[data]`, a counter per data scope, so an unnamed subform (transparent) shares its parent's indices. Named subforms still open their own scope.
- Independent check against the form's shipped data skeleton (pypdf, `.venv -I`): IMM_5532.page1 holds 78 children. I walked the template myself (unnamed subforms transparent, `bind match=none` skipped) and got the same 78 names in the same order (list equal). The skeleton interleaves Table1, yesNo, Table2, lastLive in page1 exactly as the template's document order says, so the continued count (yesNo[0..20], Table2[0..1]) is how the form's own data lays out.
- Result: 314 boxes, 314 unique paths, 314 in the shipped data.
- Old reader on a two-unnamed-subform template gives yesNo[0] twice; new gives yesNo[0], yesNo[1] (run side by side).

## Other forms and consumers
- All 19 committed XFA inventories re-derived from the official PDFs: 18 are byte-identical; only IMM 5532 changes (the suite asserts this).
- `imm5532e.formats.json` regenerated with `xfa_formats.read()` on the new inventory: identical to the committed file; every key is in the new inventory.
- `fill.ts` builds a Map by data_path: with unique paths it no longer loses boxes. `p5/fill.py` does not use inventory paths.
- Stub pass: `pathCodeSha` excludes the job's `inputs`, so the changed input sha256 does not stale `stub-pass/studio-fieldmap-imm5532e.json`. The job's sha equals the new file's sha (suite checks it).
- Saved run of IMM 5532: already removed from the tree (6eaf04ff, still in git history), so nothing replays stale; `check_queue_tx` SAVED list is 13 forms and matches what loads. IMM 5532's re-run (about US$1.55, on the Go) is the open follow-up, correctly recorded in STATE.

## Tests
- `check_forms_pd_unique_paths.ts`: 10/10 PASS. Its synthetic pass cases fail on the old reader (shown above), and the "committed inventory equals today's reader" check fails on it too. Fail cases (named subforms not renumbered, `none`, shared dataRef) guard against over-renumbering.
- `check_forms_pd_apply_replayed.ts` on isolated copy rev_pd: 8/8 PASS. All 13 replayed drafts apply with 201 (rows = boxes: 298, 245, 233, 57, 50, 32, 27, 53, 27, 19, 136, 50, 242). The unique key is still enforced (duplicate insert refused), and a second Apply gives 409 "Already applied". Ledger unchanged.

## Blockers
None.

## Majors
None.

## Minors
1. IMM 5532 is not among the 13 replayed drafts, since its saved run is out until the re-run. So the 201 check does not exercise the form that caused the 409. The cause is covered by the unique-paths suite (314/314 unique). The apply suite reads the committed (new) inventory, so on the old reader it would still pass. It picks 5532 up with no edit once the re-run lands; verify it then.
2. `check_queue_tx.ts` lines 8 and 32 still say IMM 5532 "waits for row PD, its inventory repeats data paths". Now stale: it waits for its paid re-run. Comment only.
3. Both suites need the Mac setup (`.tools` venv and the official PDFs, `/opt/homebrew` psql). The unique-paths suite exits 2 with a STOP line if the venv is missing, so it is not CI-portable. Same as the other lanes' suites.

Verdict: Approve (commit face08a2)
