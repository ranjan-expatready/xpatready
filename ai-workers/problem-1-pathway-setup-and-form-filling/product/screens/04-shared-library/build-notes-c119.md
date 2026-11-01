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

**Tests.** `tests/check_c119_library_items.ts` (API, 51 checks, a pass and a fail per rule), `tests/check_c119_library_items_browser.cjs` (22 checks, 1440 px and 1024 px, axe on each state, keyboard return to the row, Escape). Screenshots: `screenshots/c119/`.

**Not in this PR.** Checks: a check lives on its combination (`check.combination_id`), so its retire probably belongs on the combination's Checks tab, not the library list (question to the tech lead). Reorder: only sections have an order that matters (`displayOrder`); scope question to the tech lead. Sections: delete, retire and restore not built yet (same guard, a follow-up).

## Round 2 (builder B5c, 1 Nov): fixes for B5b's review (Block 7.5) and break report
* **B1 / Ma4:** `PATCH /library/fields/:key {retire}` now answers 410 "Use Retire". Retiring goes only through the guard.
* **Retired takes no new use (Ma2, Ma3, M1, M5):** `refuseRetired` (library-items.ts) answers 409 in words for a field edit, a placement, a document line's type, its alternatives, and a new type name that is a retired type. Rename answers 409 "Retired". `libraryTypes` leaves retired fields out, so a new condition cannot read one. The default `GET /library/fields` (the one pickers read) leaves retired fields out; `?retired=all` and `?retired=only` list them.
* **M2 (approve and withdraw at once):** `applyItem` first moves the change APPROVED → RELEASED with a guarded write (only one of the two wins). It then checks the rule again inside the same transaction. If a use was added meanwhile, the change goes back to RETURNED and History says so.
* **M3:** a retired combination that still names the item blocks a delete, never a retire.
* **M4:** a document type named as another line's alternative, or as the document a fact is read from (`fact_source`), counts as used.
* **Ma1:** on Document types the first button is View. It opens where used and history only (`data-item-view`).
* **1024 px:** the row action sits in the Status cell, so the Fields table no longer scrolls sideways.
* **Minors:** a Retired pill (it used to read "Removed in draft"). The Restore tip says "when a second person approves it". Escape closes the panel. A failed Undo says "Not undone: …". A new field still waiting offers Withdraw, never Delete. A delete names the draft question it removes. For a released field, a draft question stops a retire (pack 3).
* **Routes:** `POST /library/{fields,document-types}/:key/delete`, as Screen 04 concept §6 names it, next to `DELETE`.
* **Pack 3 (`acceptance/C11.9.test.ts`):** 15 of 23 pass. It stays in `acceptance/` until the rest is built (README: a test moves when it is green). The 8 that fail: Sections (4, not built), filing order of forms (2, needs a decision), and deleting your own draft at once with `/library/changes/:id/undo` (2). This PR sends every delete to a second person, as structure names do for anyone else's item; the pack expects the author's own draft deleted at once. Question for the tech lead.

## Round 3 (B5c, overnight 1–2 Nov): the row complete (pack 3 23/23)
* **Sections** use the same guard (`ITEM_KINDS` adds `section`). A section is used where a combination selects it; questions placed in it stop a delete but not a retire. The Sections page has row actions and a Retired filter. Pickers, `selectSection`, `placeField` and section rename refuse a retired section.
* **Own draft deleted at once** (P-116 amended, pack 3): when every version is a draft by the person acting, it is never released and nothing uses it, `deleteOwnItem` deletes it under the item's lock and records one RELEASED change. `POST /library/changes/:id/undo` (`undoOwnItem`) puts the same rows back, including its draft questions. A second Undo is 409. Anyone else's draft still goes to a second person. `UsesView.immediate` tells the panel: Delete without a reason, then the toast "Deleted … · Undo".
* **Filing order of forms:** `POST /combinations/:id/forms/reorder {lines}` must list every current form line once (400 otherwise, nothing changed). It is stored in `combination.form_order` (migration `20261101210500_c119_form_order`, a nullable jsonb). The snapshot sorts forms by it; when it is null they sort by line key as before, so existing hashes do not change.
* **Tests:** the pack test moved to `tests/check_c119_acceptance.ts` (23/23; it sets up the Visitor visa itself). The API suite is 61/61, the browser suite 26/26 (adds Sections and own-draft Delete with Undo).
