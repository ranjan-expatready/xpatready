# Review C3.2 bulk accept of AI suggestions (commit fa5be3faa, base 877acf66a)

Reviewer did not build it. Pack run on port 4452 (US$0, no *_LIVE): 22 passed, 0 failed; planted run file gone after the run; `tsc --noEmit` on web is clean. Not browser-walked (see end).

## Verdict: Approve (no open Blocker or Major)

## 1. Pack amendment vs P-121
- Honest. The bar P-121 sets (High only = rules pass AND both rounds agree; one Undo; each re-checked) is now checked harder, not softer: AT-7 requires 409 with words and no NEW accepted; AT-8 requires the accepted set to equal exactly the High set, a Low reuse item (planted checker disagreement) to stay PENDING and be listed in `left` with why; AT-9 checks batch id, one Undo for all, second Undo 409 "Already undone" with nothing changed.
- Planting a Sample checker run is the same technique as tests/check_gcore_b4_field_map_check.ts, and it is the only way to get High items while no paid checker round exists (P-287 (4)). cost_usd 0, file named `...-c32test.json`, removed on `process.on("exit")` and at the end; I confirmed 0 left behind.
- Minor M1: the file goes in the shared `prototype/p2/runs`, which every isolated copy reads. A SIGKILL or a crash before `exit` leaves a fake "live" IMM 5257 checker round that would make later runs (C11.14, J2) see IMM 5257 as checked. Suggest a one-line stale-file sweep at test start (remove `*-c32test.json`) and a note in the header. Concurrent packs on IMM 5257 during the ~1 minute window could also see it; none of the other packs touching 5257 assert "no checker round" (grep), so no break found.
- Minor M2: AT-8 `low.some(proposedKey === LOW)` ties the test to the saved answer; fine, setup fails loudly (exit 2) if it changes.

## 2. acceptClean via decide()
- Right door: sources.ts acceptClean selects waiting REUSE rows with `bulkWhy === null`, caps at BATCH_MAX, calls `decide(... action accept)`. decide locks rows FOR UPDATE, refuses already decided (409), sets choice ACCEPTED, status accepted, batchId, decidedAt; `decidedKey` comes from acceptOnItsPage (recommendation key, else matchedKey). Test confirms decidedKey === matchedKey for the replay. Different from the old code only if a recommendation key differs from matchedKey; that is the same rule as To review's accept (P-288 (2)), so acceptable.
- Re-check: for a batch of 2 or more decide re-runs bulkWhy (rating re-computed from stored rounds/rules) so a row changed between select and write fails the whole batch with nothing written. For a batch of exactly 1, decide skips that check (proposals.ts:~536 `rows.length > 1`), so a one-item batch relies on acceptClean's own prefilter. Same row, same transaction lock window is small. Minor M3, no action needed.
- Undo window: UNDO_SECONDS 10 returned as `undoSeconds`; UI timer hides the button after it; server enforces 10 s on `decidedAt` (latest row), 403 for another person. Good. `left` is returned and reported ("n left to decide one by one"). Empty High returns accepted 0, batchId null, no write, no audit line.
- No path found where a non-High item is bulk-accepted by this page: NEW refused 409 before any read of rows; checklist 410; applied/not-ready 409; non-reuse and non-High filtered. A role without review duty gets 403 (need).
- NEW inconsistency (asked): To review can bulk-accept a Ready (High) field-map NEW item (P-288 (2)); this page refuses all NEW. P-121 says "High only", not "reuse only", so this page is stricter than the decision, not looser; no bar is lowered and acceptOnItsPage still refuses a NEW next to a near library field. The concept text for C3.2 (bulk "only for clean reuse") matches this page. Not a problem; Minor M4: record it once in DECISIONS/STATE as a deliberate difference so qa does not file it again.

## 3. Second Undo -> 409
- undo() clears batchId on undo and writes audit `action "undone", entity "proposals", entityKey batchId` (proposals.ts ~676); the new check counts that event inside the same transaction when no rows exist. Correct and tested (409 "Already undone: ... Nothing was changed", still PENDING count unchanged). A never-issued id still gives 404. Two simultaneous first Undos: the second finds the rows reset or blocked by the transaction, ends 409 or 404 depending on timing; harmless. Nothing leaks across workspaces (workspaceId in the query).

## 4. UI (web/src/pages/job.tsx)
- Hooks (useState, useEffect, two useAction) are all before the early returns (isLoading/isError) at lines 61-65 vs 66+; order stable. Types: CleanResult and useAction generics match; tsc clean. Timer effect clears on change/unmount.
- Words are plain: "Accept High exact reuse (n)", "Undo the n accepted together", toast "n High exact reuse matches accepted; m left to decide one by one", tooltip explains when none ("None can be accepted together: <reason>"). "Needs a decision" now counts non-High reuse; filter counts consistent with the button count (both derive from bulkWhy).
- Minor M5: the Undo button lives inside the `COMPLETED` block and in component state, so a reload or leaving the page within 10 s loses it (the queue still has Undo by batch). Acceptable inside the 10 s window.
- Minor M6: `batch` is not cleared if the user accepts again before the first window ends (replaced, by design) - fine; the earlier batch then loses its button. Note only.

## Issues ranked
Blocker: none. Major: none.
Minor: M1 sweep stale planted file (acceptance/C3.2.test.ts ~line 65); M3 single-item batch not re-rated (proposals.ts ~536); M4 record NEW difference between pages; M5/M6 Undo button is page-state only (job.tsx:62).

## Journey test (reviewer role), score 7 / 10 (API-level only, no browser)
Walked as API journeys through the pack (reviewer accepts High, Low stays, Undo, second Undo, client 403, NEW refused, apply after, stale Undo 409, spend unchanged). Scores: task completed 1, plain words 1, correct data 1, error recovery 1, trust and sources 1 (rounds/rules re-checked), feedback and state 0.5 (toast and button read from code), next step 0.5, speed 0.5, visual quality 0.5, accessibility and sizes 0 (not run). Total 7. A browser pass (axe, 400/1024/1440 px, keyboard-only) would raise it; it is not a defect of this change. Could not test: those, and a real screen reader (D17/D20 stay with the founder).

**Verdict: Approve**
