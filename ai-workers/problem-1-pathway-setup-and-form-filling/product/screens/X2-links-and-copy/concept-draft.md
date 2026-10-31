# X2b Copy a form or document line across combinations (C1.5): concept v3

Screens builder, 31 Oct 2026. **Status: v3 for the founder's early look, with the answers recorded. Nothing built.** Earlier versions (v1 and v2, which also drafted links between combinations) are in git history. `challenge.md` is the fresh challenge of v1, and `review.md` is the review of this PR.
* Board: `design/draft-x2b-board.html`. Screenshots are in `screenshots/`.
* Everything shown is Sample, from the demo's sample structure.

**Founder's answers (31 Oct, through the tech lead, PR #167):**
1. Links between combinations stay out of configuration (P-106). C1.3 becomes the case-level "relies on employer case …" link in M3. X2 ships X2b only.
2. "Follows", wherever it stays, is only a suggestion of the next application. Answers carry forward through the person's shared answers.
3. The first slice is **form and document lines only** ("Forms and documents first"). Rules and questions come later.

**Order (tech lead, 31 Oct):** built after F8.

## 1. Job and journey
A content publisher:
* copies one form or document line from another combination;
* adds one line to many combinations at once;
* removes one line from many combinations at once.

In each case they see, before anything changes, what will happen in each combination. Every change is a draft change in its own combination, and one Undo takes the whole batch back.

* **Persona:** the content publisher (author). The approver sees each copy as an ordinary draft change on Review and release.
* **Sources:** SA-1B-61 (one change across many; Unverified here, because `sources/` is not in the cloud copy), P-23, Screen 03 BR-13.

## 2. Layers
| Layer | Today | New |
|---|---|---|
| Record | Form lines (`combination_form`) and document lines (`document_requirement`), versioned; `form_line_action` holds a forms Undo step | One batch id on every line change a bulk action makes; a `line_batch` row holding the batch's targets, its outcome per target, and the rows before and after |
| API | `POST /combinations/:id/forms` adds one form from the library | `POST /lines/bulk/preview`, `POST /lines/bulk`, `POST /lines/bulk/:batchId/undo`, `POST /combinations/:id/lines/copy` |
| Rules | Attach refuses retired forms and forms whose retirement is open; a signature must fit the channel; an "only if" must use known fields | BR-C1 to BR-C4 below, reusing those checks per target |
| Screen | Forms and Documents tabs; a line's ⋯ menu | Menu items **Copy to other combinations…** and **Remove from other combinations…**; a **Copy a line from another combination** button on both tabs; one preview dialog |
| Team's code | Not checked: `code/` is not in the cloud copy | The tech lead compares on the Mac |

## 3. Business rules (each has a pass and a fail test)
* **BR-C1 Outcome per target, shown before anything changes.**
  * Adding:
    * **will change**;
    * **already has it** (no change);
    * **has it with a different "only if"** (the target's own line is kept);
    * **cannot**: the way it is filed is not accepted through that combination's IRCC account;
    * **cannot**: the line's person is not in that application;
    * **cannot**: its "only if" uses a fact that combination does not ask;
    * **cannot**: the form is retired, or its retirement is open, in the library;
    * **waits**: that combination is submitted for review, and adding would withdraw the submission. It is left out unless the publisher ticks it on purpose.
  * Removing:
    * **will be removed**;
    * **does not have it**;
    * **removed already in its draft**.
* **BR-C2 What is copied.**
  * Copied: the line's form or document type, who it is for, its "only if", its channel and signature, its minimum age, signer and copies.
  * The channel and signature are copied only when they fit the target's account. Otherwise the outcome is "cannot".
  * Never copied: the source's history, its AI origin, or its finder run. The copy's origin reads "copied from <combination>".
* **BR-C3 One batch.**
  * Every target is written in one transaction under one batch id, with an idempotency key, so a retried request changes nothing twice.
  * Retired combinations are never targets.
* **BR-C4 Undo the batch.**
  * One Undo reverses every target together, while none of them has changed since (the pattern in `fact-sources.ts`).
  * Otherwise it is refused, naming the target that changed, and nothing is undone.
  * A released target is never undone.

## 4. Layout (board `design/draft-x2b-board.html`)
* **Forms tab:** a line's ⋯ menu adds **Copy to other combinations…** and **Remove from other combinations…**. The header adds **Copy a line from another combination**. The Documents tab gets the same menu items and button.
* **Preview dialog:** a modal. It states the line in words, then shows one table row per combination with its full trail, a tick box, and the outcome with its reason. Only "will change" and "waits" rows can be ticked. The button counts the ticked rows ("Add to 2 combinations"). Esc and Cancel close it without changing anything.
* **After:** a toast says "IMM 5476 added to 2 combinations (draft changes in each)" with **Undo**. Each combination's draft bar shows its own change. A refused Undo says which combination changed.
* **States on the board:**
  * line menu;
  * add preview with every outcome;
  * remove preview;
  * copy from another combination;
  * toast;
  * Undo done;
  * Undo refused;
  * approver read-only.

## 5. Copy
* **Preview intro:** "Nothing changes until you choose Add. Every combination gets its own draft change; one Undo takes back the whole copy while none of them has changed since."
* **Waits:** "Submitted for review: adding withdraws that submission. Tick to add it anyway."
* **Undo refused:** "<Combination> was changed after the copy (<what>, by <who> at <time>). Nothing was undone."

## 6. Contract and tests
* **Contract:** zod in `contracts/lines-bulk.ts`.
  * `BulkPreview { line: { combinationId, kind: "form"|"document", key }, op: "add"|"remove", combinationIds[] }` returns `{ targets: { combinationId, trail[], outcome, reason }[] }`.
  * `BulkApply` takes the same fields plus `idempotencyKey` and `include[]`, and returns `{ batchId, changed[] }`.
* **Tests:** one pass and one fail per outcome in BR-C1, plus BR-C2's channel fit, BR-C3's retry, and BR-C4's Undo, both done and refused.
* **Also:** keyboard only, axe, 390 px, and 150 combinations in the preview within the STANDARDS §9 budget.

## 6b. Capability or scaffolding
* **Capability:** the menu items, the button, the preview dialog, the toast with Undo, and the rules BR-C1 to BR-C4.
* **Scaffolding:** none. The demo walk uses the sample's own combinations through these screens.

## 7. Questions
None open: the founder answered all three on 31 Oct (above).

## Definition of Ready
- [ ] X2b board clicked through by the founder (early look)
- [x] challenge done:
  - B1 answered by the founder's Q1 (X2a dropped);
  - M1 and M2 fall away with links;
  - M3 is not needed;
  - M4 and M5 are in BR-C1 to BR-C4.
- [x] founder's questions answered (PR #167)
- [x] the BACKLOG X2 row says X2b, built after F8 (tech lead, 31 Oct)
