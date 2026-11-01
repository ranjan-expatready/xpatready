# Break report: C3.12 published date (`FormEdition.published`), commit 456fb7d0, 1 Nov 2026

Breaker: I did not build this. Scope: concept `screens/04-shared-library/concept.md` BR-12 (the Forms list "Published" column) and the drawer, as the diff builds them.

**How I tested.** Isolated copy `brk_c312` on :4472 (`tools/isolated.sh`), fresh database, sample through `/demo/load`. US$0, no live AI, no `*_LIVE`. Afterwards I stopped the copy, dropped its database and deleted its var folder.
* `check_forms_c312_field_map.ts`: 38/38 passed. A first run died at `/demo/load` with "fetch failed: other side closed" and the server stopped, with nothing in its log. I could not reproduce it, and the round-2 reviewer saw the same. I read it as the machine, not this diff.
* Browser walk: Playwright plus axe (WCAG 2.2 AA) at 1440, 1024, 720, 512 and 400 px, on the list and on the IMM 5257 drawer.
* All test input I added (rows, copied PDFs, a FIFO) was test-only and has been removed.

Note: the shared working tree's HEAD moved during my run (another session committed 10440a56, which has records only). The code under test did not change.

## Findings, ranked

### Major

**M1. One file that does not answer stalls the Forms list for 60 s, every 10 minutes. Readers stack up, and no other unread edition gets its date.**
* **Repro:**
  1. Insert an edition with `published` NULL whose `stored_path` is a file the reader blocks on (I used a FIFO).
  2. Set 10 other editions to NULL.
  3. `GET /library/forms/list` as user-A.
* **Expected:** the list answers within budget (STANDARDS §9: first view < 1 s), and the readable files get their dates.
* **Actual:**
  * The first list took **60.26 s**. The second took 0.20 s, inside the back-off.
  * All 11 rows stayed NULL: the 10 healthy files are never written, because the whole batch fails as one.
  * After a restart, **5 parallel list reads each spawned their own reader and each waited 60.6–60.7 s.** There is no in-flight guard: `failedAt` is set only after the timeout.
  * Ten minutes later, the next list stalls again.
* **Where:**
  * `api/src/edition-published.ts:30`: the back-off check runs only before the call.
  * `edition-published.ts:36`: one `execFile` call with a 60 s timeout, awaited inside the GET.
  * `form-library.ts:91`: the list awaits it.
* A slow or hostile PDF (pypdf on a crafted file), an NFS hiccup or a cold disk gives the same result.
* **Severity Major:** the main library screen can hang for a minute, and no date for any form is ever filled while one bad file is in the batch.

**M2. "Date not in the file" is shown for files that do have a date.**
* The API turns three different cases into the same `published: null` (`publishedOf`, `edition-published.ts:26`): "not read yet" (NULL), "reader failed or is backing off", and "file names no date" ('').
* The web then says "Date not in the file" for all three (`web/src/pages/library-forms.tsx:46`, plus the drawer at `:348` and `:352`).
* **Repro:** after M1's failed batch, set IMM 1295 (09-2023) and IMM 5257 (06-2018) to NULL, then list.
  * The API returns `IMM 1295 published: null` and the older edition `IMM 5257 (06-2018) published: null`.
  * The page says "Date not in the file", but the files say 2026-06-04 and 2019-04-18 (pypdf ModDate).
* The same false statement shows permanently for any edition whose file is missing from disk. By design that row stays NULL; the builder's own test row `IMM 5257 (01-2017)` is an example.
* **Expected:** "Not read yet" or "File not found" for a NULL row, and "Date not in the file" only for ''.
* **Severity Major:** a statement about an IRCC file is shown as fact while it is false (P-170 spirit: never guess).

### Minor

**m1. Impossible dates are shown as real ones.**
* `pdf_date` (`tools/read_form_identity.py:60-65`) and `read_html` (`:73`) take any eight digits. `publishedOf` only checks the shape `\d{4}-\d{2}-\d{2}`.
* Reader output on crafted test files:
  * ModDate `D:99991399` gives "9999-13-99".
  * `D:00000000` gives "0000-00-00".
  * `D:20991231` gives "2099-12-31".
  * An HTML page's `dcterms.modified` of 2025-13-45 gives "2025-13-45".
* Each would show as "Published 9999-13-99 (the date in the file)".
* Reaching an edition needs an upload that a second person accepts, so the severity is Minor.
* **Expected:** a real calendar date that is not in the future; otherwise ''.

**m2. A damaged file or a transient read error is recorded as "no date" for good.**
* `published_only` returns None for any exception (`read_form_identity.py:142-143`). That writes '', which is never read again.
* **Repro:** a `%PDF-1.7` header followed by zero bytes gives `null`, which is stored as ''.
* A one-off I/O error is therefore indistinguishable from "the file names none", and only a database edit can recover it.

**m3. The GET does uncounted work for every unread row on every request.**
* `editionFile` calls `manifest()`, which runs a synchronous `readFileSync` and `JSON.parse` of the 43 KB `manifest.json` (`engine/import.ts:14`). This happens per unread row, per list call, for rows that stay NULL by design (missing files).
* 400 such rows added about 45 ms to every list request (0.086 s became 0.13–0.17 s), on the event loop.
* There is also no in-flight guard: two concurrent list reads both run the full reader. That is harmless for correctness (the `published: null` guard holds) but doubles the work.

**m4. "Published" is not its own column.**
* BR-12 lists "Edition as printed · Published" as separate columns. The build puts the published date as a muted second line under Edition, at 1440 and below.
* The header still reads "Edition". The result is readable, but it drifts from the concept's list.

**m5. A checklist saved as an HTML page would show "Published <date> (the date in the file)".**
* The web hides the line only for `type === "guide"` (`library-forms.tsx:155`, `:157`, `:348`).
* For an HTML checklist, the date is canada.ca's "Date modified" for the page, not a publication date in a file.
* None is in the sample, so this is code reading only.

## What held
* **Migration.**
  * Expand-only: one nullable TEXT column with no default, which is a metadata-only change in PostgreSQL.
  * On the populated copy (419 editions) I ran the recorded rollback (`DROP COLUMN "published"`), deleted the migration row and re-ran `prisma migrate deploy`. Every step succeeded in about 1 s, the rows were kept and all became NULL, and the next list refilled them.
  * The rollback line is right: no index, constraint or view depends on the column.
  * Timestamp `20261101150000` is unique across all 278 remote branches. The others for that day are `120000` and `130000`.
  * `start.sh` runs `prisma generate`.
* **Backfill on the sample:** 17 editions read in one call. The first list took 0.44 s, later lists 0.10 s.
* **Backfill at 400 PDFs** (528 MB, unique paths): first list 2.41 s, then 0.10 s, with all 400 written. That is over the 1 s first-view budget once, but STANDARDS §9 leaves scale work to the team.
* **Two concurrent list reads:** both returned 200, and there were no double or lost writes.
* **Upload racing the backfill:** the `published: null` guard keeps an intake-set date.
* **Wrong role:**
  * Client A and Case officer get 403, and no actor gets 401.
  * None of them triggers the reader (the 10 NULL rows stayed NULL).
* **Dates are the right file's:**
  * The current edition and its older edition each keep their own date (IMM 5257: 2026-06-04 and 2019-04-18).
  * The edition label is never used as the date (IMM 5707 is edition 01-2023, published 2025-04-11).
  * Values match pypdf ModDate on the committed files.
* **ONLINE editions** are excluded from both the backfill (`channel: "PDF"`) and the list (`printedApproved`).
* **Paths outside the root:** `storedPath` is server-generated only, and the reader returns a date at most, so there is no content leak.
* **Layout and accessibility:**
  * At 1440, 1024, 720 (1440 at 200 %), 512 (1024 at 200 %) and 400 px: no sideways scroll, the date appears on every form and checklist row, and the drawer shows "Published … (the date in the file)" plus the older edition's date.
  * axe found 0 violations on the list and in the drawer at every width.
