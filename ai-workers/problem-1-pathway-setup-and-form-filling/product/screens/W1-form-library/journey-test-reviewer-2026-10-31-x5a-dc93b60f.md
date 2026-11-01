# Journey test: X5 fill hardening (PR #146), reviewer, 31 Oct 2026, commit dc93b60f (head 5ae993a0)

Role: reviewer. This is the one journey score for this check.

Scope: Shared library › Forms after this diff:
* the fill's words, from what the fill did;
* the "newer on canada.ca" mark when a date moves back;
* a form whose only file is held;
* the drawer's "what IRCC accepts" when a form has no file.

**Setup.**
* Isolated copy `x5hrv` on :4456, ledger `/tmp/x5h-rv-ledger`, web built with `npx vite build`.
* Playwright (Chrome, headless) script `/tmp/x5h-rv-scripts/journey.cjs`, run 3 times. Outputs were identical apart from timings.
* Screenshots are in `/tmp/x5h-rv-shots/` and are not committed.
* SQL seeding was used only to set up states for the break pass.
* US$0, with no `*_LIVE` set.

## Journeys (configuration author first, then the approver)
1. **Main, keyboard only (author).** Goal: "bring IRCC's forms into the library." Tab to "Fill from IRCC's forms list", press Enter, read the result, then open a new row by keyboard.
2. **Alternate (author).** "Say what IRCC accepts for this new form." Open a "Listed by IRCC · no file yet" row's drawer and read what comes first.
3. **Control (author).** "Set it on a form I already have." Open IMM 1295 (Ready).
4. **Repeat.** "Fill again next week." A second fill on the same list.
5. **Wrong role (approver).** Look for Fill and Set accepts, then call both by URL.
6. **Concurrency.** Four to six people press Fill at once (Promise.all, 3 rounds, on an empty library and on the sample).
7. **canada.ca's date moves back (author).** A form marked Newer whose index date steps back, but stays later than the file.
8. **Held file (author).** A form whose only PDF waits for a second person while canada.ca's date moves on.
9. **Screen sizes.** The no-file drawer at 1024 px, at 720×450 (200 % zoom) and at 400 px.

## What happened
* **J1.** 16 Tabs reach Fill. Enter gives "Filled from IRCC's forms list: 221 new forms listed (no file yet), 9 already in the library." in 117–120 ms. Enter on CIT 0001 opens its drawer. Escape puts focus back on the CIT 0001 row. axe finds 0 violations after the fill and in the drawer (`j1-after-fill.png`).
* **J2.** The drawer's "What IRCC accepts" says "Not set yet. Upload or find its PDF first: what IRCC accepts is set on a form's current edition." It has no Set button (`j1-drawer-nofile.png`). The reason is clear. The drawer has no control for either step; the page's Upload and the finder are where they were.
* **J3.** IMM 1295 still offers "Set what IRCC accepts" and shows no note.
* **J4.** "0 new forms listed (no file yet), 230 already in the library."
* **J5.** The approver sees no Fill button. Their drawer is read-only, with no note and no button. Their fill by URL gets 403. An author's accepts call on a no-file form, by URL, gets 409 "No edition yet".
* **J6.**
  * On an empty library, every round has one fill saying "230 new, 0 already" and the others "0 new, 230 already". The table has 230 rows and every reply is 201.
  * On the sample, one fill says "221 new, 9 already" and the others "0, 230".
  * All six fills each said "1 with a newer edition on canada.ca".
* **J7.**
  * Setup: IMM 5488's file is dated 2019-01. The previous read was 2026-01 and set the mark. The index now says 2024-10.
  * After the fill the row reads **Ready**, and nothing tells the person a mark was removed.
* **J8.** IMM 0008 has a held upload (Needs your OK). The fill marks nothing, and the stored date moves from 2019-01 to 2026-05 without a word. In the drawer, the held-only form says "Upload or find its PDF first".
* **J9.** No sideways scroll at any of the three sizes. The note wraps inside the drawer (`j3-drawer-*.png`).
* **Console and page errors:** none in any run.

## Data underneath
* After J1 the database has 237 `gov_form_def` rows: 230 listed by the index plus the sample. There is 1 audit line per fill, and its counts match its words.
* Nothing else changed: no edition, no ledger line.
* Roles are enforced on the server (J5).

## Break pass (15 minutes)
* **Major.** J7: a partial step back clears a mark that the list's own rule would keep (`library-index.ts:53`).
* **Minor.**
  * J8: the held path is not covered by `hasHeldFile` (m13 is still open).
  * A held edition dated at the index's date is called "newer" in the words while the list says "No file yet" (IMM 5476).
  * Concurrent fills each claim the same mark (J6).
  * The held-only drawer tells the person to upload again.
  * A blank or 301-character title row disappears for the finder and upload-run as well, not only for the fill (code; the recorded copy has no such row).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J4 done in the screen |
| Next step obvious | ½ | No-file drawer says what comes first; the held-only form is told to upload again (J8) |
| Plain words | 1 | Counts and the note in plain words |
| Feedback and state | ½ | "Newer" claimed for a held current edition and by every racing fill (J6) |
| Correct data | ½ | Ready on a file older than canada.ca's date after a step back (J7) |
| Error recovery | 1 | Refill, races and wrong role are all safe |
| Accessibility and screen sizes | 1 | axe 0; keyboard path; 1024 px, 200 % and 400 px |
| Speed | 1 | Fill 117–120 ms |
| Visual quality | 1 | Team look, the drawer reads cleanly |
| Trust and sources | ½ | A "check canada.ca" mark removed silently (J7) |

**Score: 8 / 10. Pass, with no criterion at 0.**

To raise it, most valuable first:
1. Clear a mark only when the edition's own canada.ca date answers it (correct data, trust).
2. Words for a held-only form's drawer (next step).
3. Count "newer" only for the marks this fill set (feedback).

## Could not test
* A real screen reader.
* An unaided walk by an intended user (D17 and D20 stay with the founder).
* Live canada.ca.
