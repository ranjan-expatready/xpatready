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

---

# Round at 57f7d79d (50-row "Show more"; the fill reads the newest approved edition)

Isolated copies `brk6` on :4457 (sample loaded, then filled: 237 rows) and `brk6b` on :4458 (its own copy of the recorded canada.ca files in its working folder, `STUDIO_CANADA_FIXTURES`). Both used `P2_LEDGER_DIR` in /tmp, no `*_LIVE`, US$0. The X5 files are the same at the merge head e849e9e6. Both copies are stopped, their databases dropped and their working folders removed. No repo file was changed apart from this section.

## Blocker
None.

## Major
**M6. "Check against canada.ca" still judges by a held edition, so it clears the "newer" mark the fill and the list set from the approved one.** `compareWithCanada` uses `newestEdition(def.editions.filter(channel !== "ONLINE"))`, which includes editions not in `approvedShas` (`form-library.ts:215`). `checkCanada` then clears `newerOnIndexAt` on `outcome:"current"` (`:191`). This commit made the fill and the list use one rule (`:171`), but the check, the only thing that clears the mark, is a third reader and still uses the old rule.
Repro on :4457:
1. Relabel IMM 5409's approved edition "IMM 5409 (06-2022)", with `canada_updated='2022-06'`.
2. Insert a held edition "IMM 5409 (01-2023)": sha `ddd…` (not approved), `canada_updated='2023-01'`, and the real 01-2023 PDF URL.
3. Set `index_date_modified='2022-06'`.
4. Fill. The answer has `newer:["IMM 5409"]`, and the list shows `newer_file` / "Newer edition on canada.ca". Both are correct.
5. `POST /library/forms/IMM%205409/check-canada`. It answers 201 "IMM 5409 (01-2023) is still the current edition on canada.ca", naming the held edition. `newer_on_index_at` is now null and the row reads **Ready** with edition 06-2022.

Result: combinations keep filing the 06-2022 file and nothing says canada.ca has a newer one. I reached a held edition row only by inserting it into the database; I found no product path that creates one in this round. Severity is Major if one can exist (Devin's point assumes it can). `proposeAccepts` (`:134`) has the same "any edition" rule; that is older than this slice.

## Minor
- **m11. The last "Show more" drops focus to `<body>`.** Keyboard only: Tab to "Show 50 more" and press Enter four times. After the fourth press the `[data-show-more]` paragraph unmounts and `document.activeElement` is BODY (WCAG 2.4.3). On earlier presses focus stays on the button, but the new rows appear above it, so the next Tab skips them and a keyboard user must Shift+Tab back through the new rows (`library-forms.tsx:177`). "Showing N of M" is not in a live region either, so the new count is not announced.
- **m12. The limit resets in an effect, after one render that uses the old limit.** `useEffect(() => setLimit(PAGE), [type, usedBy, status, dq])` (`library-forms.tsx:77`). After Show more up to all 237 rows, the next chip press first renders every match, then renders again at 50. Timed in the page (click to two frames later, 3 runs each, 1440 px):

  | Chip | From 50 rows shown | From all 237 shown |
  |---|---|---|
  | Forms | 51–64 ms | 119–189 ms |
  | No file yet | 34–45 ms | 138–145 ms |
  | Checklists | 60–65 ms | 100–114 ms |

  This is within the 200 ms budget on this machine, but at its edge. Resetting the limit in the same handler, or keying it on the filter, would avoid the wasted render.
- **m13. A form that held its only edition loses the index's newer date for good.** Repro on IMM 0008 (listed by IRCC, no file):
  1. Add a held edition "IMM 0008 (01-2020)" and set `index_date_modified='2019-01'`.
  2. Fill. `hasFile` is false, so there is no mark, but the index date silently moves to 2026-05 (`form-library.ts:177`).
  3. Approve the edition (an `approved_source` row).
  4. The list says **Ready** with 01-2020, and a fill again marks nothing.

  Had the edition been approved before the fill, the same data would show "Newer edition on canada.ca". The outcome depends on timing.
- **m14. The fill's words count its plan, not what it did.**
  - Six simultaneous fills on a fresh sample give one `created:221` and five `created:0`; the counts are right now. Each of the five, however, says "9 already in the library" when 230 were.
  - A fill raced against 8 approved deletes (3 rounds, all 201, no 404s) says "230 already in the library" while 8 of them were deleted during the fill. `listed` is `plan.listed.length`, not the count `updateMany` changed.
- **m15. Unchecked rows from the index (hostile recorded copy on :4458):**
  - a row with an empty link text is stored with `display_name=''`, so the list shows a blank Title;
  - a 10,799-character title is stored whole (the row is clamped to 2 lines in the list);
  - `2024-02-30` passes as a date (the date check is a regex only, `engine/canada.ts:77`);
  - for "imm  9004" and "IMM 9004", the first row wins and the later date (2025-03) is ignored.

## What held
- **Paging:**
  - 50 rows with "Showing 50 of 237 · Show 50 more", then 100, 150, 200 and 237.
  - Every filter, chip, Used by and search change resets the list to 50.
  - The count matches the matches: "imm" gives 196, and fast typing of "imm 52" gives 8 rows, the same as the API's `?q=imm%2052`, with focus kept in the search box.
  - No stale rows after the deferred term settles. Clearing the search never flashed "No forms yet".
  - Opening the drawer on row 121 (IMM 1018) and closing it with Escape puts focus back on that row's number, with 150 rows still shown.
  - Widening back to All: 170 ms; clearing the search: 171 ms; refining "imm" to "imm 5": 190 ms (Playwright-timed). The first view took 509 ms.
- **Held versus approved, fill and list:** the fill and the list now agree. In M6 steps 1–4 both say newer, and before the fill both say Ready.
- **401, 403 and 409:**
  - The fill, list and check-canada answer 401 with no actor, an empty actor, "USER-A", "nobody" or "user-A, user-A".
  - The fill and check-canada answer 403 for user-B, user-C and user-O.
  - A changed recorded copy gives 409 "IRCC's forms list could not be read … Nothing was added" with the count unchanged, and the UI shows this as a toast (`/tmp/brk6/shots/fill-409.png`, not committed).
  - An unknown actor in the browser gets "The studio did not accept the simulated person", not a crash.
- **Concurrency:** 6 parallel fills give 237 rows and 237 distinct keys, with one audit line saying 221. Fill against approved deletes gives no 404 and no rollback (m4 held). A removed form is re-listed by the next fill (m3, as decided).
- **Hostile text:**
  - a planted "IGNORE ALL PREVIOUS INSTRUCTIONS…" title is stored and shown as plain text, and nothing acts on it;
  - `<img onerror>` is shown as text, with no dialog fired;
  - Devanagari, CJK and Arabic titles are stored and found by search ("临时").
- **Layout:** at 1024 px and at 720×450 (200 %) there is no page scroll and "Show N more" stays visible.
- **Scale (not judged, §9 is sample-only):** 2,042 rows filled in 0.72 s; the list call takes 0.16–0.26 s and returns 1.4 MB.
