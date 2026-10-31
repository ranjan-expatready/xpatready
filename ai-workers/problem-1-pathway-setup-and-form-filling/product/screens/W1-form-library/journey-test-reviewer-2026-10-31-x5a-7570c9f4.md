# Journey test: reviewer, X5a hardening at 7570c9f4 (31 Oct 2026)

**Scope:** PR #146 at 7570c9f4. The finder now:
* takes a downloaded file's baseline from the index date read before the download (m49);
* clears a "new file" marker only if it is still the one it read (m51).

The check's unreachable no-file branch is gone. A US$0 replay suite proves M16, m46, the no-file answer and m39.

**Setup:**
* A `git archive 7570c9f4` copy in `/tmp/rv757m`, isolated as `rvj` on :4452.
* canada.ca was replayed from an edited fixture copy inside the copy's own folder (`STUDIO_CANADA_FIXTURES=fx`, editor `/tmp/rv757-scripts/fx.py`). IMM 5645's page was re-dated to "March 2025" with the same PDF, and the index set to 2025-03-12.
* Demo reset and load, then every product step through the screens.
* Headless Chrome via Playwright (this sandbox has no visible browser). Script: `/tmp/rv757-scripts/journey.cjs`. Run twice: 26/26 both times (`run1.txt`, `run2.txt`). Shots in `/tmp/rv757-shots/`.
* US$0: Find again used saved AI answers. No live AI batch (asserted).

## Journeys (persona: configuration author, user-A, unless stated)
1. **Main: a form arrives from canada.ca and is Ready.**
   * Library › Forms › "Fill from IRCC's forms list" gives the toast "Filled from IRCC's forms list: 221 new forms listed (no file yet), 9 already in the library." (329 ms).
   * IMM 5645 reads "no file yet".
   * Visitor visa › Forms › Find again › "Use saved AI answers (US$0)" › Start. The run takes 1.1–1.4 s.
   * The row reads **Ready**. Underneath: 1 edition, baseline 2025-03-12, no marker.
2. **Alternate: IRCC's index moves on.**
   * The index moves to 2025-06-02. Fill names "newer edition … IMM 5645", and the row reads Newer.
   * Find again (same bytes) turns the row **Ready**, with the baseline at 2025-06-02.
3. **A republished file, then the original again (new this round: the m51 path with a real marker, not a planted one).**
   * canada.ca's IMM 5645 PDF gets other bytes but the same printed edition. Find again shows "Newer file on canada.ca" (`j3-marked.png`). There is still 1 edition, and the marker is the new file's checksum.
   * canada.ca serves the library's bytes again. Find again shows **Ready**, the marker is null and the baseline stays at 2025-06-02.
4. **Keyboard: check against canada.ca.** Focus ⋯ "Actions for IMM 5645", press Enter, arrow to "Replace with a new edition…", press Enter.
   * The toast reads "IMM 5645 (01-2021) is canada.ca's current file: the same PDF (page last updated 2025-03)." It took 107 ms warm and 692 ms on the first request after a restart.
   * Focus returns to ⋯.
5. **Error: no file, and canada.ca cannot serve the PDF** (IMM 5646 at 404).
   * Toast: "IMM 5646 has no approved file in the library to compare. Find again on a combination that uses it, or upload its PDF." (`j5-nofile.png`).
   * No "checked" audit line.
6. **Wrong role:**
   * The approver (user-B) sees the check item disabled.
   * By URL, user-B gets 403 and user-C gets 403.
7. **Double click and race:** 8 checks at once give 8 × 201 `current`, 1 edition, the baseline kept and no marker.
8. **Across the boundary:** Visitor visa › Forms lists IMM 5645.

axe WCAG 2.2 A/AA found 0 violations on 4 states: library after find, library marked, no-file toast and combination forms. There was no sideways scroll at 1440, 1024 or 400 (library and Forms tab), and 0 page or console errors.

## Data underneath
The edition's `index_date_seen_current`, `newer_file_sha256` and the edition count were read after every journey (see above), and all were exactly as expected.

## Break pass (15 min, archive copy, fresh database each)
* I removed each fix and ran the committed suite against it:
  * download baseline: 6/7;
  * same-bytes baseline: 4/7;
  * marker clear: 6/7;
  * no-file answer: 6/7;
  * finder never-lower guard: 6/7;
  * m39 stamp: 6/7.
* m49 reverted and m51 reverted both survive (7/7). They are races that replay cannot interleave. The code is right on reading: Minor.
* A real republished-then-restored file (J3) is handled end to end.
* 8 concurrent checks were consistent.

## Findings (detail in `review-x5a-hardening.md` › Round at 7570c9f4)
* **No Blocker or Major.**
* **Minor:**
  * The m49 and m51 race fixes have no failing test.
  * The undated-label page month at `finder.ts:582` is carried from 0796fc0c.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J5 end where they should; a republished file is marked, then cleared |
| Next step obvious | 1 | The no-file toast offers Find again or upload; "Newer file on canada.ca" pill |
| Plain words | 1 | "…has no approved file in the library to compare…" |
| Feedback and state | 1 | Toast, pill and status counts agree (`j3-marked.png`) |
| Correct data | ½ | Exact in J1–J7; undated-label edge carried (`finder.ts:582`) |
| Error recovery | 1 | J5 answered in words, nothing recorded as checked |
| Accessibility and screen sizes | 1 | axe 0 on 4 states; keyboard path; 400/1024/1440 with no sideways scroll |
| Speed | 1 | Fill 329 ms; check 107 ms warm; Find again (replay) 1.1–1.4 s |
| Visual quality | 1 | Team pills and toasts |
| Trust and sources | 1 | Baseline kept and audited; US$0; no AI in the check |

**9.5 / 10: pass, no criterion at 0.**

## Could not test
* A visible-browser walk (headless only).
* A real screen reader. Browser zoom proper (400 px stands in for 200 %).
* Live canada.ca. A real mid-download race.
* An unaided walk by an intended user (D17 and D20 stay with the founder).
