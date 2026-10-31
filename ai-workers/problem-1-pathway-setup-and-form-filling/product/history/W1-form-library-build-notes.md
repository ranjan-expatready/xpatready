# W1 form library build notes: older sections moved word for word (AGENTS.md rule 8)

From `screens/W1-form-library/build-notes.md`, 30 Oct.

## S5 and S6 asks built into slice 1 (Lead, 27 Oct)
* **(1)** `GET /api/combinations/:id/forms/find/latest`: one read, every proposed form with {code, title, quote, conditionPlain, who, state, lineId, lineVersion, runId}. States: ATTACHED · DOWNLOADED_ATTACHED · NOT_FOUND · UPLOAD_WAITING_SECOND_PERSON · NEWER_FILE_SAME_EDITION · REMOVED_BY_PERSON, plus **TO_DECIDE** (the two rounds disagreed, P-121) and **NOT_FOR_THIS_APPLICATION** (the page names it as a separate application). S5 should draw those two as well.
* **(2)** Find again / Redo never attach a removed line again (`removed_by_person`, "Add back" is a hand attach).
* **(3)** `POST /api/intake` takes optional `forCombination` + `forCode`. The file is attached at once when it is usable (library, approved, or equal to canada.ca's file), or when a second person approves it (`IntakeItem.forCombinationId/forCode`). A file for another form is added to the library but never attached in its place.
* **(4)** `DELETE …/forms/:code` and `POST …/forms/:code/replace` take `{version}` (409 when stale). `POST …/forms/undo` takes `{changeId}` (409 when it is no longer the last change). There is one Undo per combination: `studio.saveForm`, which is S5's line-settings route, records an `edit` change through `form-uses.ts recordAction`. **S5: keep that call when you change saveForm.** Replace on a line compares the form with canada.ca: a newer edition goes to edition review, and a new file of the same edition is marked for a person. Lines point at the form, so a line always files the library's current edition.
* **(5)** `GET /api/library/forms/list?for=picker` leaves out retired forms and forms with no usable edition. The library page itself lists them, marked Retired or Needs your OK.
* **(6)** **Redo is per line**: `POST …/forms/find` with `only: [code]` (find again). Read again and match again are today's field-map drafting batch. No per-step run redo in slice 1.
* **(7)** AI-attached lines carry `origin AI_FOUND`, `sourceQuote` and `conditionPlain`, with no predicate.
* **S6 reuse:** `DraftingJob.combinationId` is nullable. The P-121 agreement rule is the pure `engine/agreement.ts compareRounds` (rules on both rounds, agree → High, else Decide). The cost line comes from the run plan: worst case per round as the ledger reserves it, expected from the newest saved run. **Wave cap:** slice 2's counter uses **US$60** (P-110 annotation).

