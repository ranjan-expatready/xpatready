# K3, C3.12 "Published" is IRCC's month (QA-148): independent review, 2 Nov 2026

**Reviewer:** I did not build this.
**Commit:** **31bfda94** on the local `k3-published`; diff `f02ef514..31bfda94`.
**Row:** BACKLOG K3. Done when: each form shows its published date (a column at 1440, a line under the title at 1024 and 400), no sideways scroll, axe clean.
**Definition:** pack `acceptance/C3.12.test.ts` AT-3.
**Bar:** STANDARDS, EXPERIENCE, QUALITY, PRODUCT §3–§4, AGENTS rule 4.
**Journey score:** **9/10, pass.** Report: `journey-test-reviewer-2026-11-02-31bfda94.md`.

**Verdict: Ship (Approve).** No open Blocker or Major from this review. Findings 1–2 are recommended before merge; 3–6 can be fixed or listed in the PR.

## How I checked
* **Copies.** :4443 and :4444, each with a fresh database, live AI off, US$0. Both are stopped and dropped. The web bundle in `web/dist` carries the new words ("No edition date printed on it or on canada.ca").
* **Suites (exit 0).** `check_forms_c312_field_map.ts` 57/0 · `acceptance/C3.12.test.ts` **17/0** (AT-3 failed on main) · `check_forms_s4_library_browser.cjs` 113/0, through a chromium launch preload; the 30 screenshots it rewrote were restored.
* **My own walk.** Playwright at 1440, 1024, 400, 720@2x and 512@2x. I also opened the drawer by keyboard, walked as user-B and user-C, planted file-date states, walked the canada.ca fallback, an earlier edition and an upload.
* **Graph.** `graph.mjs`: G3 7, G6 3, none from this diff. `/library/forms/list` is reached by tests.
* **Evidence for the source order.** For each of the 30 recorded official PDFs (`official-sources/ircc/forms`, `checklists`), I read the printed edition with `tools/read_form_identity.py`. I also read every recorded canada.ca page's "Last updated" (`official-sources/ircc/canada/pages`). **All 24 forms with both values agree** (for example 5475: 05-2021 and May 2021; 5476: 11-2025 and November 2025).

## The questions asked
* **Reversing #313's meaning.** Acceptable.
  * "Published" now follows AGENTS rule 4 (an official source), and the file's date is kept, not deleted. The column `form_edition.published` is untouched, and it is still filled once and kept.
  * The file's date moves to `file_date` / `file_date_state` and to the drawer's "file saved" line.
  * `compareEditions` (`engine/programs.ts:135`) still reads the column as a tie-break, with an unchanged meaning.
  * The one cost is a name trap: the database column `published` now means "file saved". The header of `engine/published-date.ts` says so; no rename is needed (expand-only).
* **Source order.** I agree with printed first, but it must be recorded (finding 2). The reasons:
  * It is the one rule the library already uses (`fileMonth`).
  * A later page edit can never re-date an old edition.
  * On all 24 recorded IRCC pages it gives the same month as the pack's page-first wording, so AT-3 holds without bending.
* **Words.** The list says "Published 2025-11"; the drawer adds "(printed on the form)" or "(canada.ca page, Last updated)", or says "No edition date printed on it or on canada.ca". These are clear. The file-date line "Not IRCC's date: …" is weak (finding 3).
* **Three widths.** Met. The date is one line box at every width, with no sideways scroll at 1440, 1024, 400 or 200 % zoom; axe found 0 issues on the list and the drawer at 5 sizes. At 1440 it is a self-labelled line in the Edition column (as #313 was accepted), not a separately headed column: met in substance.
* **Other readers of the list's `published` / `published_state`.** None. A repo grep (web, api, acceptance, product/qa, tests) finds only `library-forms.tsx`, the two changed suites and the pack. The pack reads `published` (now YYYY-MM) with `startsWith`, so it is compatible. `published_state` lost "unread"/"unreadable"; only the page read them, and they now live in `file_date_state`.

## Findings (ranked)
1. **Should (Minor; the breaker rates it Major). A dated guide gets an IRCC "published" month in the API, labelled with the wrong source.**
   * Where: `form-library.ts:133` calls `ircPublished(current)` for every row type. `finder.ts:566-577` stores a finder-read guide as `Guide NNNN (YYYY-MM-DD)` with `canadaUpdated` set to the page's "Date modified". The guide then gets `published: "YYYY-MM"`, `published_from: "canada_page"`.
   * Why the suite misses it: `check_forms_c312_field_map.ts:131` "no guide claims one" passes only because the sample guides have `canada_updated` null. The rule is asserted but not implemented: removing nothing would fail it.
   * Why I rate it Minor: the page hides it (`type !== "guide"` at `library-forms.tsx:165,167,360`) and nothing else reads the field.
   * Fix: return `published: null, published_from: null, published_state: "none"` for guides at `form-library.ts:133`, and add a fail test with a dated guide.
2. **Should (Minor). The order differs from the pack's written AT-3 and QA-148's recommendation, and the difference is not yet recorded.**
   * Pack: `acceptance/C3.12.test.ts:5-7,75` says page first, else printed. Build: `engine/published-date.ts:27-31` via `fileMonth` is printed first. `check_forms_c312_field_map.ts:68` asserts the case where the two differ.
   * QA-148 is a "Conflict" put to the tech lead.
   * Fix: state the deviation in the PR body under "Questions", with the 24/24 evidence above and the recommendation "printed first". Ask the tech lead to align the pack's comment and QA-148. Never deviate silently.
3. **Should (Minor). The file-date line reads oddly and is not quite true.**
   * `library-forms.tsx:55,360` gives "Not IRCC's date: file saved 2025-12-15" and "Not IRCC's date: the file names no date".
   * The PDF is IRCC's own file: the date is IRCC's save, not its publication.
   * Fix, for example: "File saved 2025-12-15: the PDF's own date, not when IRCC published it" / "The PDF names no date of its own".
4. **Should (Minor). A printed month the rule rejects** (future, before 1990, month 00 or 13) shows "No edition date printed on it or on canada.ca" under a printed edition such as "12-2026". The edition picker (`engine/programs.ts:130-133`) accepts the same label that `fileMonth` rejects.
   * The breaker's repro holds by reading. It is an edge case: IRCC prints real months.
   * Fix: different words when a label month exists but is rejected.
5. **Should (Minor). Earlier editions drop the source and the file's date.** `library-forms.tsx:364` shows "published 2018-06" with no "(printed on the form)" or "(canada.ca page …)", although the API sends `published_from` and `file_date` (`form-library.ts:139`).
6. **Should (Minor, another screen). The upload result in a combination's form picker** still says "published <file date>": `components/forms.tsx:67`, from `intake.ts:284`. The Forms list now uses "Published" for IRCC's month, so one word has two meanings (PRODUCT §4).
   * Fix: say "file saved …" there too, or list it as a follow-up row.
7. **Note (test coverage, not a finding on its own).** The browser suite no longer asserts the drawer's "could not be read" / "not read yet" words (API only; my walk J4 saw them right). The `canada_page` path has only a unit test (my walk J5 saw it right).

**Observations (not findings, P-26).**
* The same month can appear three times in the drawer ("IMM 5476 (11-2025) · canada.ca last updated 2025-11 · Published 2025-11"), in two formats. This follows from the pack's definition, since IRCC's page and print agree.
* At 400 the edition text itself can break as "05-" / "2026" (`editionText`, which predates this diff).
* `api/src/edition-published.ts:16` re-exports `publishedOf`, which api and web no longer import.
* Process: my scratchpad was shared with the breaker's run (same `walk.cjs` name).

## D1–D20 (1–5; this change only)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | AT-3 green; the order is the reverse of the pack's wording, with the same result on all recorded pages (finding 2) |
| D2 Data integrity | 4 | The file date is kept; the list writes nothing new; a dated guide gets a stray API month (finding 1) |
| D3 Reuse | 5 | Reuses `fileMonth`: one rule for "newer on canada.ca" and "Published" |
| D4 Rule integrity | 4 | A pass and a fail per rule, except "no guide claims one", which is vacuous (finding 1) |
| D5 Stability and recovery | 5 | Missing file, pipe and unreadable file kept apart (57/0); reloads stable |
| D6 Freshness and governance | 4 | Source named per row; earlier editions don't name theirs (finding 5) |
| D7 AI trust | n/a | No AI in this change |
| D8 Orientation | 5 | Unchanged; the date sits with the edition it belongs to |
| D9 Flow | 5 | Read-only information, no extra step |
| D10 Language | 3 | "Published 2025-11" is clear; "Not IRCC's date: …" is weak (finding 3); one word, two meanings (finding 6) |
| D11 Feedback and state | 5 | Date, none, unread and unreadable all distinct |
| D12 Visual quality | 5 | One muted line; the date never breaks (one line box) |
| D13 Accessibility and responsive | 5 | axe 0 at 5 sizes; keyboard path and focus return; no sideways scroll |
| D14 Team look | 5 | Same tokens and components; nothing new |
| D15 Speed | 5 | List 88–103 ms; a regex per edition, no new query or per-row request |
| D16 Testability | 4 | 57 + 17 + 113 green; gaps in finding 7 and the vacuous guide check |
| D17 First-use intuitiveness | simulated only | No intended user walked it |
| D18 Provenance | 4 | "printed on the form" / "canada.ca page, Last updated" named; the file date is labelled apart |
| D19 Capability closure | 5 | Upload → row shows Published 2023-02 (J7) |
| D20 Pain and wow | simulated only | No intended user walked it |

## Could not check
A real screen reader · a visible (headed) browser (headless only, in this sandbox) · an intended user (D17, D20) · live canada.ca pages (only the recorded copies of 27 Oct) · 100-program volume.

**Verdict: Approve.** Findings to fix, or list in the PR:
1. Gate `ircPublished` on non-guides (`form-library.ts:133`), with a fail test using a dated guide.
2. Record the printed-first order and the 24/24 evidence in the PR "Questions", for the tech lead to align the pack's AT-3 comment and QA-148.
3. Reword the drawer's file-date line (`library-forms.tsx:55,360`).
4. Different words when a printed month exists but is rejected.
5. Name the source on earlier editions (`library-forms.tsx:364`).
6. Retire "published <file date>" in the form picker's upload result (`components/forms.tsx:67`), or make it a follow-up row.
