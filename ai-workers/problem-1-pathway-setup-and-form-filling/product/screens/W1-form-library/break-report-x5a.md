# Break report: X5 slice a, "Fill from IRCC's forms list" (PR #138, commit e5ec8173)

Adversarial check of commit `e5ec8173` (branch `claude/forms-x5a-library-06zafk`), diffed against its merge base `eddb4b94`. Isolated copy `brk5` on :4456 (`isolated.sh`, `P2_LEDGER_DIR` temp), sample loaded, recorded canada.ca copy (FixtureCanada). US$0, no AI. The PR's own `check_forms_x5_library.ts` passes 18/18 on this copy. Copy stopped; fixture files put back (`git status` clean apart from a `review-x5a.md` that was already there and is not mine).

## Blocker
None.

## Major
**M1. Codes with a letter suffix: the fill stores a spelling that no route or the finder can find.** The fill keys rows with `engine/canada.ts:51` `normaliseCode` ("IMM 5373B"). Every `library/forms/:code` route and the finder use `contracts/form-library.ts:13` `normaliseCode` ("IMM 5373 B").
Repro: fill, then search "IMM 5373B" on Forms, then ⋯ Delete, type a reason, then Send for approval. The page says "IMM 5373 B is not in the library." The API answers 404 for `GET …/IMM%205373B/uses`, `DELETE`, `/retire`, `/check-canada` and `POST /combinations/:id/forms {"formKey":"IMM 5373B"}`. The row can be seen but never removed, retired or checked.
The finder looks up the "IMM 5373 B" spelling (`finder.ts:566`) and creates it at `finder.ts:632`, so downloading that form would make a second row next to "IMM 5373B" that differs only by a space. In the recorded index only IMM 5373B is affected; any "IMM nnnnA–D" code behaves the same way.

**M2. The "newer" mark is cleared before the check runs, so a failed check still clears it.** `form-library.ts:171` runs `updateMany(newerOnIndexAt: null)` before `compareWithCanada`.
Repro: mark IMM 5409 (set `index_date_modified='2001-01-01'`, then fill, and `newer` lists it). Point its page at an unrecorded URL, then `POST /library/forms/IMM%205409/check-canada`. The answer is 409 "canada.ca could not be read", yet `newer_on_index_at` is now null. The mark is also cleared when the check answers `outcome:"check"`, the case where canada.ca shows a different date.

**M3. The "newer" mark is never cleared by a new edition.** Only `checkCanada` clears `newerOnIndexAt`, which grep confirms is its only writer apart from the fill. The status rule `form-library.ts:92` (`current && f.newerOnIndexAt`) keeps showing "Newer edition on canada.ca" after a person uploads, replaces, or has the finder download the newer edition. Found by reading the code; I did not run it (it needs a second real edition PDF).

**M4. The Forms page breaks the §9 speed budgets after the fill.** Measured on :4456 with the sample:
- `GET /library/forms/list` took 0.18 s before the fill and 0.50–0.67 s after (237 rows, 162–180 KB).
- Browser at 1440: first view took 1.6 s (budget under 1 s). One search took 718 ms (budget under 200 ms). Search and filters are server round trips (`library-forms.tsx:63`).
- Cause: `formUses()` (about 9 awaited queries) runs once per row (`form-library.ts:104`), so about 2,100 queries per call, and the fill multiplies the row count by about 15.

**M5. The 16 usable forms are buried, and the filters cannot surface them.** After the fill, 221 of 237 rows read "Listed by IRCC · no file yet", and the page opens on CIT 0001…. The Status chips are only Needs your OK, Newer file and Retired. There is no chip for "Ready" or "No file yet", though the API accepts `status=no_file`. Screenshot: `/tmp/brk5/shots/forms-1024.png` (not committed).

## Minor
- **m1. Concurrent fills each claim every creation.** Three simultaneous `POST …/fill-from-index` calls each return `created:221` and write three audit lines "221 new forms listed". Only 221 rows were created in total, because `skipDuplicates` hides that the others created nothing (`form-library.ts:160-166`). No duplicate rows resulted.
- **m2. A date that goes back in time is called "newer".** The rule is `r.dateModified !== f.indexDateModified` (`library-index.ts:27`). Repro: set IMM 1295 `index_date_modified='2099-12-31'`, then fill; `newer` contains "IMM 1295" although the index says 2023-09.
- **m3. One person's fill reverses a two-person delete.** Repro: Delete "IMM 0008 DEP", user-B approves (the row is gone), then fill brings it back with "1 new form listed". The PR asks about this as Q2; it is logged here so the decision is explicit.
- **m4. A fill racing approved deletes fails as a whole with misleading words.** Repro: propose 8 deletes, then fire a fill and the 8 approvals at once (`bash race.sh`, 4 rounds). Rounds 3 and 4 answered 404 "Not found (it may have been removed by a reset)." The `update` at `form-library.ts:161` hits a row deleted after the read, so the whole fill rolls back. Pressing again works.
- **m5. Wrong words when a listed form is added by hand.** `POST /combinations/:id/forms {"formKey":"IMM 0008 SCH2"}` returns 409 "its file waits for a second person on To review". There is no file at all (`form-library.ts:213`). The picker hides these rows, so this is API only.
- **m6. A number listed twice keeps the first row's title, kind and date.** Feeding `planIndexFill` a checklist row and then a form row for IMM 5409 creates IMM 5409 as `checklist`, and the later row's date is ignored (`library-index.ts:22`). The code comment assumes the duplicate is harmless. The recorded index has no duplicates (230 unique).
- **m7. Unreadable numbers and dates vanish silently.**
  - Rows like "IMM 5257E" or "PPTC 153" (the engine's normaliser returns null) are neither listed nor counted in `no_page`.
  - A date not written as `YYYY-MM[-DD]` (e.g. "May 1, 2024") becomes null. The stored date then never updates, so P156-2 switches off for every form with no word, and the fill still says it succeeded (`canada.ts:69-77`).
- **m8. Missing recorded `index.json` gives a 500 with no words.** Repro: move `official-sources/ircc/canada/index.json`, restart the copy, then fill. The answer is 500 "Something went wrong on the server" because FixtureCanada's `readFileSync` (`api/src/canada.ts:114`) throws outside CanadaError. This existed before; the fill now exposes it.
- **m9. Any edition counts as "has a file".** `hasFile` is `editions.take(1)`, any edition, including one still waiting for a second person or an online-only one (`form-library.ts:156`). Such a form can be marked "newer" and show it once the upload is approved. Found by reading the code.
- **m10. The chip and the row use different words.** The chip reads "Newer file on canada.ca" while the row reads "Newer edition on canada.ca", and the chip counts both kinds.

## What held
- **Roles:** user-B, user-C and user-O get 403. A missing, unknown, wrong-case ("USER-A") or doubled `x-actor` gets 401. GET gets 404. A body (planted `rows`) is ignored.
- **Double press, UI:** three fast clicks send one request (busy button). **Concurrent fills, API:** 237 rows and 237 distinct keys; no P2002.
- **Repeat fill:** adds 0. Forms with a file keep it and their page. No ledger line, no edition, no download.
- **Retired forms** stay retired. An open delete or retire change is untouched by the fill. Released snapshots are not written.
- **Pickers:** "Add from library" (`for=picker`, 15 rows) and `/library/forms` (sources) leave out the no-file rows. Catalogue, review queue, library changes and the combination review are not slowed (under 45 ms).
- **Recorded copy changed or missing:** 409 "IRCC's forms list could not be read… Nothing was added to the library." Off-site, `http:` and `javascript:` links go to `no_page`. Long and Unicode titles are stored. The ⋯ menu shows no fill button for the approver.
- **Keyboard:** the fill button is reached by Tab (16th stop) and Enter fills. **Layout:** at 1024 px and at 720×450 (200 % zoom) there is no horizontal scroll and the button stays visible.

Not tested: the finder end to end (it needs AI rounds) and a real second-edition upload for M3.
