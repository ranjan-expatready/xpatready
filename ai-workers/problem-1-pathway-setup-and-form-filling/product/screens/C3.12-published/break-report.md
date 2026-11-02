# Break report: C3.12 K3 (QA-148), Published is IRCC's month

Commit 31bfda94 on `k3-published` (diff `f02ef514..31bfda94`). Isolated copies `brk312` :4445 and `brk312b` :4446, both stopped and their databases dropped afterwards. Live AI off, US$0. Nothing committed, and the working tree is clean.
Method: the sample was loaded, then labels and `canada_updated` were planted in `form_edition` by SQL (the API and page read these columns directly). I read `GET /api/library/forms/list` and walked the page in Playwright at 1440, 1024 and 400 px, with axe WCAG 2.2 AA.
Scope: the list API fields `published`, `published_from` and `file_date`, plus the page lines at the three widths and the drawer. Nothing outside the row is scored.

## Findings

### Major 1: a guide claims an IRCC month in the API
- **Repro:** `update form_edition e set canada_updated='2025-03-14' from gov_form_def d where d.id=e.gov_form_def_id and d.form_key='Guide 5256'`. Then GET the list.
- **Expected:** for a guide, `published: null` (the row brief says "Guides … must claim no IRCC month").
- **Actual:** `Guide 5256 | published 2025-03 | published_from canada_page | published_state date`.
- **Why it happens in real data:** `form-library.ts:133` calls `ircPublished(current)` for every row type. The finder stores a guide with `canadaUpdated` set to the page's "Date modified" (`finder.ts:567`, `:577`). That covers every finder-stored guide whose canada.ca page prints a date.
- **Wrong source label:** the API calls this date "canada.ca page, Last updated" (`published_from: canada_page`), but it is the guide page's "Date modified".
- **Why CI misses it:** the builder's check `check_forms_c312_field_map.ts:131` ("no guide claims one") passes only because the sample guides have `canada_updated = null`.
- **Not on screen:** the page hides this because it gates on `type !== "guide"` (`library-forms.tsx:165`, `:167`, `:360`). The wrong value is in the API contract the row defines.

### Minor 2: a printed month the rule rejects is shown as "No edition date printed on it"
- **Repro:** set edition labels to `IMM 5257 (12-2026)` (future), `IMM 5476 (11-1989)` and `IMM 1294 (00-2026)`, with `canada_updated` null.
- **What the page shows:** at all three widths, `12-2026 · No edition date printed on it or on canada.ca`. The same happens for `11-1989`. Screenshot: `list-1440.png` in the scratchpad.
- **Why it is wrong:** the edition printed directly above is a date. A wording such as "printed date 12-2026 is not a real or past month" would be true.
- **Reachable:**
  - The identity reader accepts any `(\d{2}-\d{4})` (`tools/read_form_identity.py:122`).
  - The current-edition picker trusts future months: `engine/programs.ts:130-133` (`editionMonth` checks 1–12 only). By contrast, `library-index.ts:31` rejects them.
- **Example:** planting `IMM 5488 (02-2027)` makes it the current edition, ahead of `(10-2024)`. The row then says "No edition date printed on it". So two rules read the same label in one row.

### Minor 3: the canada.ca fallback can take another file's page date
- **The code:** `finder.ts:785` writes the page's `lastUpdated` onto the current edition without checking that the page's PDF is that file. The checks at `:600` and `upload-run.ts:165` do check the checksum.
- **When it shows:** when the printed month is rejected (Minor 2), `published` falls back to that page month.
- **Repro:** label `IMM 1295 (13-2024)` with `canada_updated '2023-09'` shows `13-2024 · Published 2023-09`. The drawer says "(canada.ca page, Last updated)".
- **Effect:** a file whose printed date is unusable is credited with whatever month the page shows for whatever file it links today.

### Minor 4: earlier editions in the drawer never say where their month came from
- **Repro:** add approved earlier editions `IMM 5257 SCH1 (06-2018)` and `IMM 5257 SCH1 (13-2019)` (the second with `canada_updated '2023-09'`).
- **Actual:** the drawer shows `Earlier edition (13-2019) · published 2023-09`, the same month as the current edition, with no "(canada.ca page …)" note and no file date.
- **Cause:** `library-forms.tsx:364` drops `published_from` and `file_date`, although the API sends both (`form-library.ts:139`). Screenshot: `drawer-sch1.png` in the scratchpad.

### Minor 5: "published" still means the file's date in the intake results
- **Where:** `web/src/components/forms.tsx:67` renders `published ${r.published}` from the intake API (`intake.ts:284`, `:372`: `id.published`, the PDF ModDate). This is the combination's form picker. Uploading IMM 5257 there says "published 2026-06-04", while Shared library › Forms says "Published 2023-09".
- **Scope note:** this is outside the Forms list page. It is listed because the row brief asks about intake, and K3 retired that meaning of the word.

### Minor 6: precedence differs from pack AT-3's wording, and the difference is not recorded
- **Pack wording:** the pack (`acceptance/C3.12.test.ts:5-7`, `:75`, `:78`) says the canada.ca "Last updated" month first, else the printed edition.
- **Build:** printed first, else the page (`engine/published-date.ts:27-31`, via `fileMonth`).
- **Where they disagree:** the builder's own check `check_forms_c312_field_map.ts:68` asserts printed `05-2021` wins over a `2025-09` page, the exact case where the pack's wording wants `2025-09`.
- **Why AT-3 still passes:** every recorded sample page month equals its printed month.
- **Missing record:** QA-148 asked "Which one is published?". I found no DECISIONS.md entry, `challenge.md` or commit-message note that settles it.

## What held
- **Suites:** pack `acceptance/C3.12.test.ts`: 17/17 on :4445. Builder `tests/check_forms_c312_field_map.ts`: 57/57 on a fresh :4446 (run from a temporary copy with a local psql path; the copy was deleted).
- **Impossible and old printed months** (13-2024, 00-2026, 11-1989): never shown as a month. They fall back to the page or to "none", and the source is named correctly ("canada_page" or null).
- **Bad `canada_updated` values:** `May 2026`, `2021-1-5` and `2099-01` all give `none`.
  - `2026-06 garbage` is read as 2026-06 (prefix match, `library-index.ts:32`). This is unreachable today because `parseFormPage` writes YYYY-MM (`engine/canada.ts:126`).
- **Odd label shapes** (`( 05-2021 )`, `(01-2023) E`, `(5-2026)`) are not matched. The reader never writes them (it always builds `${code} (${MM-YYYY})`).
- **File date kept apart:** IMM 5707 shows Published 2023-01 with `file_date` 2025-04-11. The drawer reads "Not IRCC's date: file saved …", and "not read yet" and "could not be read" are kept as separate wordings.
- **Rows without a printed edition:** a form with no file (IMM 5802) shows `published null`, state `none`, and "no usable edition yet". A checklist whose page has no Last updated (IMM 5488) shows its printed 2024-10.
- **Older edition:** its own printed month (06-2018 → 2018-06, printed), not its file's date 2019-01-10.
- **Held file:** IMM 5710 (needs_ok, held upload) keeps its current edition's printed month.
- **Roles:** no actor gets 401. user-P (client) and user-O (case officer) get 403 in words. user-B and user-C get 200 (read-only list).
- **Other readers of the old day-precision meaning:** no other code in web, api, acceptance or qa reads the list's `published` or `published_state` (grep).
  - `engine/programs.ts:135` reads the database column `FormEdition.published`, the file date, whose meaning is unchanged.
- **Widths:**
  - 1440: Published sits under the edition.
  - 1024 and 400: Published is on the line under the title.
  - At all three: scrollWidth equals the viewport (no sideways scroll), and axe finds 0 violations.
  - The drawer also has 0 axe violations for four rows.
- **200% zoom** (1024 → 512 CSS px): no sideways scroll, and the date stays on one line (`data-published-date` has 1 client rect).
- **Keyboard:** Tab reaches the IMM 1295 code button, Enter opens the drawer, and Esc returns focus to the row's button.
- **Speed:** the list API answers in about 100 ms on the sample (19 rows). The change is pure per-row work with no new query.

## Not run (and why)
- **100 programs / 400 combinations:** not seeded. The change adds no query, only a regex per edition.
- **Hostile PDF with planted instructions:** this commit does not touch intake. The identity reader is rules-only (no AI). Rejected printed months were planted by SQL instead.
- **Reload and back mid-action:** the change adds no state.
- **`tests/check_forms_s4_library_browser.cjs`:** it rewrites tracked screenshots and launches the `chrome` channel. My own Playwright walk with `/opt/pw-browsers/chromium` covered its K3 steps.

Scratch evidence: `/tmp/claude-0/-home-user-xpatready/12cd23a1-e5cf-5cbe-9208-eb5654594dca/scratchpad/` (`list-1440.png`, `list-1024.png`, `list-400.png`, `drawer-sch1.png`, `zoom200-1024.png`, `walk.cjs`, `plant.sql`, `older.sql`, `appr.sql`).
