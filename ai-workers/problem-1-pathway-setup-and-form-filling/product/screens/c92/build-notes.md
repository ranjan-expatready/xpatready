# C9.2 — undo a changed fact (runtime lane, M3-F)

Row: C9.2 (`acceptance/M3-CONTRACT.md` row C9.2; design row in #863 `screens/M3-design-2026-11-04/rows.md`).
Contract (fixed): `POST /runtime/cases/:id/changes/undo {subjectId, fact}`; an item gets `state: out_of_date` with a
`reason` naming the fact, the old and new value, and the date.

## Plan
1. `engine/runtime/out-of-date.ts` (new, pure): the facts that changed between what a finished item read and what the
   case says today, each with the old and the new value and the date of the change, in words (concept r5c BR-12, l. 62:
   "… is out of date: date of marriage changed on 29 Oct. Prepare it again or undo the change before filing.").
2. `api/src/case-prepare.ts` (the Prepare view, M3): an item is Out of date, never changed, when
   * a PDF-upload form's validated copy read back no longer matches the case (-3), the copy's bytes unchanged (-4);
   * a form signed by hand and scanned was printed from a copy whose facts changed (-6), or whose representative of
     record changed (-10, BR-20): the signed one is shown Out of date and a new one is asked for (To do);
   * an Online form's section entered in the portal changed since (-9; built by C7.3, now with the same words).
   Only items that read the fact change (-7 scope); nothing generated means nothing out of date (-1).
3. `POST /runtime/cases/:id/changes/undo` (new, case officer only): restores the earlier value of one fact as a new
   answer row, the old rows kept (append-only, -8, -11).
4. Re-sign: a new print of an out-of-date signed form starts its signing steps again (the earlier steps superseded,
   the signed scan kept).
5. The Forms tab shows an out-of-date finished item with its words and "Undo this change".

## Waits
* **C9.2-5** (an out-of-date item stops "Ready to file") waits for C7.6 (#861): readiness is C7.6's. Under P-237 the
  pack's "blocks" wording becomes a CRITICAL warning there, as L-SA3's done-when says.
* **"Submitted" items** ("Filed with an earlier value", BR-12 after filing) wait for C8.2's record (another lane).

## Response to the review of 53686fb5 (`review.md`, Block)
* **M1 fixed:** each change on an out-of-date item carries `restores` (the value Undo really puts back, worked out by the
  route's own rule) and the button names it. Undo also never redoes: a second Undo walks back from the answer the first
  one restored (`undoTarget`, `restoredFrom`), so SAMPLE → A → B undoes to A, then to SAMPLE.
* **M2 fixed:** each change carries `expected_id` (the answer the screen read); the screen sends it, so a second tab
  that read before a change gets 409 and nothing is undone.
* **M3 fixed:** the button's accessible name starts with its visible words; axe runs on every state.
* **M4 fixed:** messages use the question's words (the first placement with words, else the fact's meaning), never a key.
* **S1 fixed:** no Undo for the firm record's facts, list entries or declarations. **S2 fixed:** the button wraps at
  400 px. **S3 fixed:** after Undo the focus goes to the list's heading, or the panel's when the list is gone.
* **S4 done:** -7 also signs the spouse's IMM 5476 and checks it stays Ready (the spouse's IMM 5257 is never finished
  in the pack, and it does read the principal's name, so it could not fail). Asked of the tech lead on the PR.
* **S5 kept:** the words are the question's own (configuration data); a short name per fact does not exist as data.
* **(d):** the server checks the stored validated file against its checksum on every read (`checkedFile`); the test
  compares that checksum and that no second validated copy was written.
* New browser suite `tests/check_c92_out_of_date_browser.ts` (1440 and 400 px, axe, two tabs, keyboard, focus).

## Devin's review of 18c8c52a (two findings, both fixed)
* **Two relatives with the same fact** (`<id>/parent_1`, `<id>/parent_2`) were folded into one comparison key, so a
  change to one could be missed. `factChanges` now keys by the whole `about`; a relative's fact is named "Sample Client
  A's parent 1" and offers no Undo here (it is changed where it is asked). Test: one parent's name changed.
* **Undo → Confirm section → Undo redid the change** (the reviewer's round 2 Minor too): a confirmation now stands on the
  answer it confirmed (`from`), as a restore stands on the answer it put back, so the walk goes on back. Test through
  the API (a restored DECLARED value, confirmed, then Undo again).

## CI on 4642e2f3 (shard 6: `check_runtime_r1c.cjs`, "no page errors": 3 × 404)
* Cause (this PR): a case-level fact is "about" `case` in a copy's facts. The change list sent `case` as the answer's
  subject, and the Undo history query sent it to the database as a uuid (P2023 → the app's generic 404), so
  `GET …/prepare` answered 404 for a case whose finished item read a changed case-level fact.
* Fix: `case` maps to the case's own subject (as `caseView` reads it) for the words, the date, the change list and Undo;
  only ids go to the history query. Reproduced locally first (131/132), then green: r1c 132/132, r1d 96/96, r1a 99/99
  in run-suites' order on one fresh copy. New step (4) in `tests/check_c92_undo_api.ts` (a case-level fact on IMM 5257:
  listed on the case's subject, the view answers, Undo works), 27/27.
