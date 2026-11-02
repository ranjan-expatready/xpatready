# UX-A part 1 (counts) — review r5, diff-only (merge of main into 2c4fc753)

Scope: conflict resolution in `api/src/programs.ts` (G2 #568 merged into this PR, P-270). Journey score unchanged from r4 (not re-walked; diff-only).

**Reading of the three hunks**
- Imports: `attachedNotSetUp, removedLines` (counts) and `gatesOf, realBaseline, type Gate` (G2) both present; each used (lines 148-149, 203).
- Promise.all: 11 names (`nodes, combos, releases, jobs, items, lib, editions, heldItems, byKind, subs, lineRows`) match the 11 queries in order (programDef, combination, configRelease, draftingJob, proposalItem by run, canonicalField, formEdition, intakeItem, proposalItem by kind, reviewSubmission, combinationForm). Positions unchanged from either parent.
- `attachments orderBy createdAt asc` (this PR) and `configRelease … sha256` (G2) are both selected; G2 reads `r.sha256` from `releases`/`latest`/`relsOf` (has it); no one reads a dropped field.
- `subs` selects `submittedBy, status, draftSha256`: `submittedBy` map (line 132) and G2's `lastSub` -> `sub.status`, `sub.draftSha256` (line 149) all covered. `lineRows` selects `combinationId, lineageKey, status, updatedAt`; its one read (line 203, `removedLines(lineRows.filter(combinationId === c.id))`) uses only those. `counts` (line 228) feeds the leaf (line 255).
- Both-sides auto-merge also kept G2's `firstError` label change in `rows.push`. Nothing else in programs.ts reads a field either side dropped.

**Own runs** (copy rev_554s, port 4447, then stopped; US$0, no live flag, no :4400)
- check_uxa1_counts_browser: 47 passed, 0 failed (psql path changed in a scratch copy, removed after).
- check_g2_answer_key_gate_browser: 15 passed, 0 failed on a fresh database. First attempt, run right after the counts test on the same database, failed at step 3 (it needs the pristine LMIA; the counts test edits LMIA and the form was added as "source", not "form_line"). Fresh database passes: test-order state only, not the merge. Minor note for the builder: the G2 test assumes a fresh database.

**Verdict: Approve** (for 2c4fc753; no open Blocker or Major)
