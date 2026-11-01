# C11.9 build notes — delete, retire and restore on Fields and Document types (screens lane, J5, 1 Nov)

**What a person can do.** On Shared library › Fields and › Document types every row has Edit (Fields: opens the field; Document types: where used and history) and one written action from its state: Delete (never released), Retire (released), Restore (retired), Withdraw (its request waits). Opening the action reads every use first (`GET /library/{fields,document-types}/:key/uses`):
* refused: the reason in words ("Can't retire yet: "…" still uses it: remove it there first. …") and the Where used panel, each use linked (a combination's setup, or its Documents tab for a document type); releases and open cases listed as kept;
* allowed: the confirm in the right panel (ImpactPanel) with a reason, then the Undo toast (Undo withdraws the request).
A different person approves on To review (BR-8, 403 for the maker); the approval re-check runs before the click and at the click. As for library forms (QA-64, P-116 amended 28 Oct) it takes effect at approval: retire turns the published version to Retired, restore turns it back, delete removes the never-released draft rows (L1). Retired items are listed only under "Retired" and leave the field picker (`useLibraryFields`) and the document-type picker on the Documents tab (BR-10).

**Rules (one guard, `api/src/library-items.ts` via `api/src/lifecycle.ts`).**
* Delete: never released (every version a draft) and used nowhere, including a library form's field that reads it.
* Retire: released; no draft version in flight; no current (not retired) combination reads it. A library form's field that reads it does not stop a retire. Releases and open cases keep it.
* Restore: retired. Any open change to the item (an ADD, a delete, retire or restore) stops a new one.
* A field's ADD keeps its own path (`library-changes.ts`); only DELETE, RETIRE and RESTORE of fields and document types go through the shared guard (`isItemLifecycle`).

**Shared files (named in the PR's first line).** `contracts/structure.ts` (Use kind `form_field`, additive), `contracts/lifecycle.ts` (WHY.usedBy, usedByDelete, draftVersion), `api/src/studio.ts` (list rows carry `retired`, `released`, `row_action`, `change`; additive), `api/src/library-sources.ts` (`usedInIds`, the same read by combination id; `usedIn` maps it to labels as before).

**Tests.** `tests/check_c119_library_items.ts` (API, 32 checks, a pass and a fail per rule), `tests/check_c119_library_items_browser.cjs` (19 checks, 1440 px, axe on each state, keyboard return to the row). Screenshots: `screenshots/c119/`.

**Not in this PR.** Checks: a check lives on its combination (`check.combination_id`), so its retire probably belongs on the combination's Checks tab, not the library list (question to the tech lead). Reorder: only sections have an order that matters (`displayOrder`); scope question to the tech lead. Sections: delete, retire and restore not built yet (same guard, a follow-up).
