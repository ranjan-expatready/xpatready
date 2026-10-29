# S6 Shared library: build notes (screens lane)

## Queue item (2a), 29 Oct: no free add, sources, where used, rename (P-158 items 1 and 6; C3.6, C3.13, C3.15)
Built on main's tables, before forms PR #90 (the one door, item 5 and the rule source wait for slice 1).

**What changed**
* `POST /library/fields`, `/library/sections`, `/library/answer-lists` answer **410** "Not added by hand", saying where the item comes from instead (`api/src/library-sources.ts` `noFreeAdd`). `Studio.createField` and `createSection` are removed. `Forms.createAnswerList` (forms lane's file) is left unreachable: the forms lane may drop it or reuse its checks for note b's source door.
* `GET /library/:kind/:key/sources` (kinds fields, sections, document-types, answer-lists): each source line and where the item is used.
  * Field: every form box that reads it (`From: IMM 1295 (09-2023) form field "Family name"`), then the release or AI run it came with (`source_ref`; the AI run ids as small print).
  * Section: the forms its questions read, and its release (sections are proposed from the forms' parts only in slice 2).
  * Document type: each checklist line, quoted (`From: checklist IMM 5488`, `Guide 5487`, or the file's name in words).
  * Answer list: the form boxes whose fields take it.
  * No line → `unsourced: true`, shown as "No source recorded" (P-162 fail case), never blank.
* The list endpoints carry the same, shortened per row (`source`, `more_sources`, `unsourced`, `used_in`), read in one query per table.
* Rename, direct and versioned, no second person (C3.15):
  * `PATCH /library/fields/:key/name {name}` sets the field's name (label, `labelChecked`). A name or alias another field in the group has is 409 (the database's name index backs it).
  * `PATCH /library/sections/:key {name}` renames a section; another section's title is 409.
  * Both need the author duty and log "renamed".
* Pages (`web/src/pages/library.tsx`):
  * the Add field dialog and the Sections add bar are gone;
  * one "Where these come from" line on Fields, Sections and Document types;
  * the row's source under its meaning (or name);
  * where used: combinations by name on Sections and Document types, a count on Fields;
  * the field page has a Name box with Rename, and "Where it comes from" with "Used in combinations";
  * Sections has a Rename dialog.
  * A field's list name is its confirmed name, else the name from its key (back-filled labels like "Uci" are not shown).

**Tests**
* `check_s6_library_sources.ts` 24/24 (API) and `check_s6_library_pages_browser.cjs` 33/33 (1440 and 1024, axe, screenshots in `screenshots/2a/`).
* `tests/seed_library.cjs`: the setup helper for checks that need an extra item. It writes the item as a source would, into the check's own copy: a draft naming its source, a waiting ADD and an activity line.
* Checks changed because they used the free adds:
  * screens: `check_screen02_fix.ts` (M3 is now "410, nothing written"), `check_studio_browser.cjs` B6 (no Add on Sections; the new section is seeded; `STUDIO_DB` names the copy's database);
  * other lanes' files, needed for the 410 and listed for their owners: `check_forms_channels.ts` (forms: the three answer-list create checks become one 410 check; the lists and fields are seeded), `check_ai_orchestration.ts` (the "added by someone else" field is seeded), `tests/runtime/setup_visitor_visa.ts` (runtime: answer lists from IMM 5257's own choices and the two new sections are seeded).

**Full suites (5b00ae99):** 67 PASS 4 FAIL, all four from (2a), all fixed and rerun green.
* P-63: no page says "box", so the sources say "form field".
* QA-65: the 410 routes name their person first.
* A1: `check_ai_drafting` counts the one typed-key check left.
* QA-71: `check_screens_qa_1029_browser` reads the Category column itself.

**Open, for the Lead**
* **Sections from scratch.** Until slice 2 proposes sections from the forms' parts, a workspace started without the sample has no way to get a section. So a from-scratch combination cannot place a question, and BR-11 holds its release. The checks seed sections. The demo path (sample inputs) is not affected.
* P-162's format part ("Format: not read yet") and the completeness function (item 7) are not in (2a).
* A document type's name is not renamed here. Document types come only from checklist lines.
