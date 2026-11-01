# Break report: X2b slices (c) and (d), copy or remove across combinations, copy from another, one Undo

Commit 66f8d6f5 (branch claude/vigilant-brown-877btk), diff `origin/claude/screens-x2b-apply..66f8d6f5`. Isolated copy `screens_brk` on :4471 (xr_studio_screens_brk), sample reset and loaded. 500 extra combinations were cloned from Visitor visa by SQL ("Bulk 1" to "Bulk 500"; Bulk 1 has a long French/Chinese/Arabic name, every 50th a ~250-character name). Rules only, US$0. File:line refers to the commit (`git show 66f8d6f5:<path>`): L = `api/src/lines-bulk.ts`, W = `web/src/components/bulk-lines.tsx`. The working tree had uncommitted edits while I tested (review-x2b-c M1: toast, focus, short Undo words). The API ran the commit's code apart from the Undo message, and the web build is the commit's.

Totals: 0 Blocker, 2 Major, 6 Minor.

## Findings

### M1 (Major): "Copy a line from another combination" can show one source's lines and copy from another
* **Steps (no network throttling, 3 of 3 runs):**
  1. Seed Bulk 61 with all 34 lines of With an LMIA (`POST /lines/copy`).
  2. Set Bulk 61's IMM 5476 to "always, copies 5" in SQL.
  3. On Study permit › Documents, open **Copy a line from another combination**.
  4. Choose "… › Bulk 61" in the select, then within about 80 ms press ArrowDown, which moves to "Bulk 62" (0 lines).
* **Expected:** the table shows Bulk 62's lines ("It has no line this combination does not already have").
* **Actual:**
  * The select reads Bulk 62, but the table shows Bulk 61's 34 lines and "Add 34 lines".
  * With a 3 s delay on the first preview (Playwright route), choosing With an LMIA then Bulk 61 shows With an LMIA's lines and words ("IMM 5476 … for the principal applicant · only if Needed when the applicant uses an authorized representative …") under the label "Bulk 61".
  * Add (33 lines, one unticked) wrote **Bulk 61's** lines to Bulk 63: IMM 5476 `COMBINATION_MANDATORY copies=5 (always)`, and `line_batch.source_combination_id` = Bulk 61.
  * When the shown source has lines the chosen one lacks, Add fails with 404 "That line is not on "Bulk 61" any more. Reload the page.", which is confusing but safe.
* **Cause:** W:147-155 `choose()` has no "latest request wins" guard (PreviewDialog has `live`, W:76-85). A late reply overwrites `pv` and `ticked` after the select has moved on. Keyboard users trigger this naturally, because every ArrowDown on a native select fires `change` and therefore a preview. The uncommitted working-tree diff does not touch `choose()`.
* **Severity:** this breaks BR-C1: what was previewed is not what is written. A different line is saved silently.

### M2 (Major): the toast is the only way to Undo the whole change, and keyboard users cannot reach it in time
* **Steps:**
  1. Keyboard or mouse: With an LMIA › Forms › ⋯ IMM 5409 › Copy to other combinations… › Add to 487 combinations.
  2. After Add, focus is on `BODY` (the opener is gone). It took **79 Tab presses** to reach the toast's Undo.
  3. Wait 12.5 s.
* **Actual:** after 12.5 s the toast is gone. `[data-bulk-undo]` count is 0, and the batch is still live (`undone_at` null). Reloading during or after Add loses it the same way. Nothing in the UI can undo that batch any more.
* **Expected:** BR-C4 says one Undo for the whole change. WCAG 2.2.1 (time limit) and 2.4.3 (focus order) apply. The house `useUndoToast` keeps a persistent `link`.
* **Cause:** W:33 `setTimeout(() => setToast(null), 12_000)`, and W:95/162 `onClose()` without moving focus.
* **Note:** this matches review-x2b-c M1. The uncommitted tree adds a lasting note, holds the toast on hover or focus, and moves focus. That fix is not in 66f8d6f5 and I did not re-test it. After the fix, a reload still loses the Undo, because the note is React state only.

### m1 (Minor): a stale preview copies the source line as it is now, without a word
1. `POST /lines/copy/preview` With an LMIA → Bulk 40 shows "Job offer letter · from the principal applicant · only if Only when the job requires an LMIA".
2. `PATCH /combinations/<With an LMIA>/requirements/job_offer_letter:principal_applicant` with `appliesToRoles: each_applicant, attachMode: COMBINATION_MANDATORY`.
3. `POST /lines/copy` with that line.

**Result:** 200. Bulk 40 gets `job_offer_letter:each_applicant`, always. That is not what was previewed. `applyIn` (L211) re-checks only the target's outcome, never that the source line is unchanged since the preview. The slice (b) apply is the same. Expected: 409 "Changed since the preview".

### m2 (Minor): copy from a retired combination is accepted
1. Run `update combination set retired_at=now()` on With an LMIA.
2. Call `POST /lines/copy/preview` and `POST /lines/copy {sourceId: <retired>, targetId: Super visa, lines:[IMM 5905]}`.

**Result:** both return 200, and the line is copied. `ends()` (L456-462) checks only `tgt.retiredAt`. The UI list excludes retired sources, so this is reachable through the API or an open dialog when the source is retired meanwhile.

### m3 (Minor): the copy's request key is matched with LIKE and by prefix, so a fresh key is refused as "Key used"
L507 uses `startsWith: \`${key}#\``. Prisma does not escape `_` or `%`, and `#` is allowed inside a key.
* Copy with key `abcdefgh`, then a fresh copy with key `________` (8 underscores): 409 "Key used".
* `%%%%%%%%` collides with any earlier copy.
* Key `pfxtest1#1` first, then a fresh `pfxtest1`: 409 "Key used".

Nothing is written twice, and UI keys are UUIDs, but the API contract allows these keys (`min(8).max(90)`, any characters).

### m4 (Minor): a retry after the target was retired is answered "Retired", not as a replay
1. A copy with key `retired-src-1` succeeds.
2. Retire the target.
3. Re-send the same request.

**Result:** 409 "Super visa is retired …". `ends()` (L501) runs before the replay check. A lost-response retry tells the person the copy failed when it was done. The bulk apply checks the key first.

### m5 (Minor): the same batch id in two spellings gives "undone a moment ago" while nothing was undone
* **Steps:** `POST /lines/bulk/undo {batchIds:[B, B, B.toUpperCase()]}`.
* **Result:** 409 "That change was undone a moment ago." The transaction rolled back, and B is still live (undone right after with `[B]`).
* **Cause:** L391 de-duplicates case-sensitively. The second `undoIn` sees its own uncommitted `undoneAt`.

### m6 (Minor): over 500 combinations, the dialog is a dead end, and other copy defects
* **More than 500 combinations:** with 505 other live combinations, Copy to other combinations… shows "Nothing was changed: At most 500 combinations in one change." "Preview again" repeats it. W:82 sends every combination, and the contract caps it at 500 (contracts/lines-bulk.ts:60).
  * With exactly 500 it renders in 120 ms. Beyond the sample; noted for the team's scale work.
* **Copy defects:**
  * The intro reads "…accompany them to Canada.. Nothing changes" (W:103 appends "." to words that already end in one; IMM 5409).
  * At 390 px the toast shrinks to 195 px wide and wraps "33 lines copied here from …" over 13 lines.
  * At the commit, the Undo message lists all 33 line names (L398). The working tree already shortens it.

## Held
* **Roles:** user-B, user-C and user-O get 403 on `GET /lines/bulk/combinations`, `POST /lines/copy/preview`, `/lines/copy` and `/lines/bulk/undo`. A missing actor gets 401. As approver, both tabs hide the header button, show the approver words, and show the two menu items disabled with "Read only". The approver makes no `/lines/*` requests.
* **Contract:**
  * Same source and target: 400.
  * Retired target: 409.
  * Unknown key, wrong kind, case-changed key (`imm 5409`), or a RETIRED source line: 404, nothing written.
  * Undo with 0 ids, 101 ids, a string, or an array body: 400.
* **Duplicates:** the same line 3× (one with spaces) gives one batch, one line.
* **Replays:**
  * The same key sent 4× at once gives one 200 and three replays with the same batch ids. Lines are not doubled.
  * The same key with fewer or reordered lines: 409 "Key used".
* **Races:**
  * Four copies of the same lines with different keys at once: one 200, three 409 naming the line.
  * Copy of 34 lines vs a single `POST /combinations/:id/forms` (14 runs, 0.05-0.8 s offsets): either the copy refuses ("already has it") or the single add waits and refuses ("already one of this combination's forms"). Never a duplicate, never a 500.
  * Double-click on Add lines: one POST.
* **Undo, all or nothing:**
  * Mixing another person's batch: 403, nothing undone.
  * A copied line edited since: 409 naming "Bulk 31 … Job offer letter changed …", and the form line stays.
  * After a single-batch Undo of one of the group: 409 "Already undone".
  * 34-line copy and its Undo: 0.92 s and 0.33 s, and the target is back to 0 lines.
* **File checks:** CANNOT_WAITING_PERSON shows per line, not tickable; forcing it at copy gives 409 naming the line, nothing written. (CANNOT_NO_FILE could not be staged: a DB check forbids an ONLINE edition with a file.)
* **Volume:** combinations list (506) 15 ms. Bulk preview of 500 targets 30-50 ms. Copy preview of 34 lines 0.45-0.6 s. Apply to 487 targets 5.4 s.
* **Layout:** at 1440, 1024 and 720 px (200 % zoom) the dialog has no horizontal overflow, long and non-English trails wrap, and the footer stays visible. At 390 px the copy-from dialog fits (scrollWidth 390).
