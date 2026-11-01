# Review: X2b slices (c) and (d), menu items, preview dialog, toast with Undo, copy a line from another combination (C1.5), commit 66f8d6f5

Reviewer (fresh context, did not build it), 1 Nov 2026. Branch `claude/vigilant-brown-877btk`, diff `origin/claude/screens-x2b-apply..66f8d6f5`. Copy :4470, db `xr_studio_screens_rev`; `web/dist` as served (built 12:40, before a398362a).
Judged against concept v3 §3–§6, the board `design/draft-x2b-board.html`, `review-x2b-b.md` and the tech lead's #273 answer. A later commit, a398362a (copy-from starts with nothing ticked; no doubled full stop), was **not** reviewed.

**Verdict: Block.** One Major: keyboard users lose focus when the preview closes, and the one batch Undo is gone after 12 s with no way back to it (M1). The rest holds well.

## 1. Findings (ranked)
**M1 Major: the batch Undo has no keyboard path, and it is lost after 12 s** (EXPERIENCE §2.12 [M] "keyboard path for every task", §2.8 [M] "undo where possible"; WCAG 2.4.3, 2.2.1; BR-C4).
* Repro, at 1024 px with the keyboard only: on With an LMIA › Forms, focus "Actions for IMM 5476", then Enter, the arrow keys, and Enter on "Copy to other combinations…". Tab to "Add to 4 combinations" and press Enter. Focus lands on `BODY`, and the toast's Undo is **79 Tab stops** away. Esc or Cancel also leaves focus on `BODY`, not on the ⋯ button.
* Then wait 13 s: the toast closes (`web/src/components/bulk-lines.tsx:36`, 12 s, no pause on hover or focus), and no Undo for the batch is left anywhere. Each target keeps only its own Forms-tab Undo, one combination at a time.
* The shared `useUndoToast` (`components/lifecycle/index.tsx:119-140`) already solved this after QA-58: its Undo outlives the toast through `link`. The bulk toast does not use it.
* Fix:
  * when the dialog closes, return focus to the row's ⋯ button, or move it to the toast's Undo;
  * pause the timer while the toast has hover or focus;
  * keep the batch Undo on the tab after the toast hides (as `useUndoToast().link` does) until another action replaces it.
  * Add a keyboard step to `check_x2b_dialog_browser.cjs`: Add, then reach Undo, then Undo.

**m1 Minor: the Forms tab scrolls sideways at 1024 px and 200 % zoom** (EXPERIENCE §2.12 [M]). `forms.tsx:122` puts the header's `<span className="flex items-center gap-3">` (Add a form, the new **Copy a line from another combination**, Open the Form library) in one row with no wrap. At a 512 px CSS width the page is 540 px wide. The Documents tab fits (512). Fix: `flex-wrap`. The browser check measures only the dialog at 390 px, not the page.

**m2 Minor: the copy-from Undo toast lists every line, unbounded.**
* `api/src/lines-bulk.ts:400` (`undoMany` message) joins every line's short name. The undo-refused hint (`bulk-lines.tsx:44`, `undoRefusedHint(op, shorts)`) does the same.
* With 32 lines the toast is a 19-line block of text over the page (my screenshot `10-copyfrom-undone`).
* Fix: count when the list is long ("Undone: 32 lines taken back from Visitor visa"), and name them only when there are a few.
* a398362a makes this rarer (nothing ticked at first), but it does not remove it.

**m3 Minor: copy-from preview is N+1 on the server** (STANDARDS §4 [M] "no N+1").
* `copyRows` (`lines-bulk.ts:465-478`) calls `evaluate` once per source line. Each call reads the structure, the accepts map, the library and the file blocks again.
* With 33 lines the preview took 861 ms and the apply 892 ms. That is inside the 1 s budget, but it grows with every line.
* Fix: read the shared inputs once, and evaluate the lines against them.

**m4 Minor: one slice (d) test can pass vacuously.** `tests/check_x2b_bulk_apply.ts:283` returns `true` when IMM 5409 is not in the rows. If the sample changes, the "cannot here" fail case stops testing anything. Assert the row exists.

**n (nits, not blocking).**
* **Route name.** The concept §2 says `POST /combinations/:id/lines/copy`; it was built as `POST /lines/copy` with `targetId` in the body.
  * Behaviour, authorisation and the contract are the same, so it does not matter for users.
  * Record the change in the concept or the build notes so that the two agree. A nested route would read more like a resource (AIP), but this is not a defect.
* **Counts wording.** The preview's counts read "1 waits" (`bulk-lines.tsx:100`); "1 waits for review" would read better.
* **Doubled full stop.** At 66f8d6f5 the preview intro has "representative.. Nothing changes" (fixed in a398362a).

## 2. What holds
* **BR-C1 in the dialog.**
  * Each target has one row with its full trail, a pill and a reason. "Will be added" rows are ticked; "Waits" is unticked and can be ticked on purpose ("Add to 5 combinations"); "Cannot" rows are disabled with their reason.
  * The new `CANNOT_NO_FILE` and `CANNOT_WAITING_PERSON` outcomes are shown per target before Add, as the tech lead asked on #273 (preview tests 240–248). Apply uses the same `fileBlock` again.
* **Stale preview.** I added IMM 5476 to Visitor visa by a single Add while the dialog was open, then pressed Add. The answer was 409, naming Visitor visa and its reason, with nothing written. "Preview again" then showed 3 will change and 1 no change.
* **Copy from (d).**
  * Lines the combination already has are hidden and counted. A line with a different "only if" is shown but cannot be ticked.
  * There is one batch per line under `<key>#n`, all in one transaction. One Undo takes back all 32 (853 ms), and a refused one undoes none (apply tests 302–316).
  * Two copies at once with different keys: one 200, and one 409 naming the line. The same key twice at once: one batch, the second answer `replayed`. The same combination as the source is refused with 400 in words.
* **Busy is narrowed** (`api/src/busy.ts`) to 40P01, 55P03, P2034 and P2002 on the two line tables. Pass and fail unit tests: apply 262–264.
* **`applyIn` and `undoIn`** are pure moves of the #273 code into the caller's transaction. Undo's pre-checks now read through `tx`. `undoMany` checks the author and "not undone" for every batch before the transaction, then checks again under row locks.
* **Roles.** The approver gets 403 on combinations, copy preview, copy and undo-many (checked with curl).
  * The approver's Forms tab shows no controls, plus the board's read-only words. On Documents the items are greyed, with their reason.
* **Double-click on Add** made one batch. Each target's own Forms tab shows the draft line and its own Undo.
* **Builder suites, rerun by me on :4470 at 66f8d6f5:** preview **65/65**, apply **78/78**, browser **36/36**. Axe is clean on 10 states. 150 combinations previewed in 116 ms.
* **Graph:** G1 and G2 are 0. Every new route is named by a test (G3's one gap, `/attachments/:id/file`, is not this diff's).

## 3. Standards and dimensions
* [M] met:
  * zod contract shared by API and web;
  * RFC 9457 with field errors;
  * authorisation on the server, deny by default;
  * idempotent create (copy key and replay);
  * no request per row from the web;
  * axe on every state;
  * strict TS in the new files;
  * Problem words without codes.
* [M] not met: keyboard path for Undo, and focus after the dialog (M1); 1024 px at 200 % (m1); no N+1 (m3, server only).
* D1 1 · D2 1 (races refused, all or nothing) · D5 ½ (M1: Undo lost after 12 s) · D8 1 (full trails) · D9 1 (counted buttons) · D10 ½ (m2) · D11 1 · D12 ½ (m2 toast) · D13 ½ (M1, m1) · D14 1 (team Dialog, Pill, Button) · D15 1 · D16 ½ (m4) · D18 1 ("Copied from <trail>") · D17, D20 simulated only (the founder's walk) · D3, D4, D6, D7 and D19 are not touched by this slice.

## 4. Journey test (reviewer role; the one score for this check)
Persona: the content publisher (`user-A`), with the approver (`user-B`) for the wrong-role journey. I walked them in Playwright Chromium at 1440 px, at 1024 px, and at 512 px CSS width (1024 px at 200 %), reading psql underneath each.
| # | Journey | Result |
|---|---|---|
| 1 | Main, keyboard only: ⋯ → Copy to other combinations… → tick the waiting one → Add → Undo | Copy holds (6 rows, 1 batch). **Undo not reachable: focus lost, 79 Tabs, gone at 12 s** (M1) |
| 2 | Remove from other combinations, on a document line | Holds (builder walk rerun) |
| 3 | Copy 32 lines here from With an LMIA (Documents tab) → Undo | Holds in 0.9 s each way; the toast is a wall of text (m2) |
| 4 | Error: a target changed behind the open preview | Holds: named, nothing written, Preview again |
| 5 | Recovery: double-click Add; the same key twice at once; two copies at once | Holds: one batch; a 409 in words |
| 6 | Undo after a target changed | Holds: refused, naming what, who and when |
| 7 | Wrong role: approver on screen and by URL | Holds: no controls, 403 ×4 |
| 8 | 1024 px at 200 % | Dialog fits; **the Forms page scrolls 28 px sideways** (m1) |
| 9 | Across to Review and release | Each target shows its own draft change; not walked further |

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–8 complete with the mouse |
| Next step obvious | 1 | The button counts the ticked rows; "Preview again"; the hint on a refused Undo |
| Plain words | ½ | m2, and "1 waits" |
| Feedback and state | 1 | Toast, counts, each target's draft bar |
| Correct data | 1 | Exact rows and batches in psql; whole or nothing holds |
| Error recovery | ½ | M1: the batch Undo is gone after 12 s |
| Accessibility and screen sizes | ½ | M1 focus, m1 overflow; axe is clean |
| Speed | 1 | 150 targets in 116 ms; copy-from 0.86 s |
| Visual quality | ½ | m2 toast covers the page |
| Trust and sources | 1 | "Copied from <trail>"; Sample labels kept |
| **Total** | **8 / 10** | Passes the score bar, but the review blocks on M1. Fix M1, then m1 and m2 |

## 5. Not checked
* A real screen reader, and an intended user's own walk (D17/D20).
* The team's code (`code/` is not in this copy).
* a398362a.
* Mutation of the rules (the working tree is shared with suites that are running).

Approve on 66f8d6f5: **no. Block**: fix M1 (focus back after the dialog, a reachable Undo, an Undo that outlives the toast), with a keyboard test.
