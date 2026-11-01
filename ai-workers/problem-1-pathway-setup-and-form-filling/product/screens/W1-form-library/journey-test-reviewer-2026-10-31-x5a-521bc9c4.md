# Journey test: reviewer, X5a hardening at 521bc9c4 (31 Oct 2026)

**Scope:** PR #146 at 521bc9c4. The finder now writes the guarded baseline when it downloads a file or finds identical bytes, and clears its own stale marker. The check now:
* answers "no approved file" before downloading anything;
* clears the finder's marker only if it is still the one it read;
* audits the baseline the file keeps.

**Setup:**
* A `git archive 521bc9c4` copy in `/tmp/rv521`, isolated as `rvw` on :4450.
* canada.ca replayed from an edited fixture copy inside the copy's own folder (`STUDIO_CANADA_FIXTURES=fx`). IMM 5645's page was re-dated to "March 2025" with the same PDF, and the index set to 2025-03-12.
* Demo reset and load (demo chrome), then every product step through the screens.
* Headless Chrome via Playwright (no visible browser in this sandbox). Script: `/tmp/rv521-scripts/journey.cjs`. Run twice: 28/28 both times. Shots in `/tmp/rv521-shots/`.
* US$0: Find again used saved AI answers; no `*_LIVE`.

## Journeys (persona: configuration author, user-A, unless stated)
1. **Main: a form arrives from canada.ca and is Ready.**
   * Library › Forms › "Fill from IRCC's forms list" gives the toast "Filled from IRCC's forms list: 221 new forms listed (no file yet), 9 already in the library." (199–258 ms).
   * IMM 5645 reads "Listed by IRCC · no file yet".
   * Visitor visa › Forms: the author clicks "Find form numbers by rules (free)" (the first slot), then Find again › "Use saved AI answers (US$0)" › Start. The run takes about 1.35 s.
   * Library: IMM 5645 (01-2021) reads **Ready** (`j1-library-1440.png`). At 0796fc0c this row read "Newer edition on canada.ca" (M16).
2. **Alternate: canada.ca edits the page later.**
   * The index moves to 2025-06-02. Fill gives "…1 with a newer edition on canada.ca (IMM 5645)", and the row reads **Newer edition on canada.ca**.
   * Find again (saved answers) gives "7 already". The row reads **Ready**, with the baseline at 2025-06-02. At 0796fc0c it stayed Newer.
3. **Keyboard: check against canada.ca.** Focus ⋯ "Actions for IMM 5645", press Enter, arrow to "Replace with a new edition…", press Enter.
   * Toast in 55–60 ms: "IMM 5645 (01-2021) is canada.ca's current file: the same PDF (page last updated 2025-03)."
   * Focus returns to ⋯. The audit line's `baseline` is 2025-06-02, the value kept.
4. **Empty and error: a form with no file whose PDF canada.ca cannot serve** (IMM 5646, PDF answering 404).
   * Toast: "IMM 5646 has no approved file in the library to compare. Find again on a combination that uses it, or upload its PDF." (`j4-nofile.png`). No "could not be read", and no "checked" audit line.
   * The same with the fix removed gives 409 "canada.ca's PDF could not be read".
5. **Other bytes:** canada.ca's IMM 5409 PDF gets 9 extra bytes.
   * Toast: "canada.ca now serves a different PDF for IMM 5409 than the library's file (IMM 5409 (01-2023))… or upload canada.ca's PDF."
   * The baseline is unchanged (2023-01).
6. **Wrong role:**
   * The approver (user-B) sees "Replace with a new edition…" disabled, and the API by URL gives 403.
   * user-C gets 403. No actor gets 401.
7. **Double click and race:** 8 checks at once give 8 × 201 `current`. There is still 1 edition, the baseline stays 2025-06-02, and there are 8 audit lines with the same baseline.
8. **Across the boundary:** the Visitor visa › Forms tab lists IMM 5645, and axe finds 0 issues.

## Data underneath
* After J1: one IMM 5645 edition, `DOWNLOADED`, `index_date_seen_current` 2025-03-12, no marker.
* After J2: 2025-06-02.
* With a planted `newer_file_sha256`, Find again (replay) sets it to null, and the row reads Ready (m46).
* All of this was also run as `/tmp/rv521-scripts/j-m16.sh`, which is used for the mutations.

## Break pass (15 min)
* A guide gives 409. An unknown code and a 5,000-character code give 404.
* Mutation copy, each a fresh database, with the committed suite vs my repro:
  * the finder's download baseline, same-bytes baseline and marker clear, and the check's no-file early answer, each **survive the suite** and are caught by the repro;
  * the m48 guard survives both (a race);
  * the m45 audit is caught by the suite.
* From reading the code: the finder's new marker clear (`finder.ts:586`) is unguarded, the m48 shape. The window is milliseconds, so this is Minor.
* Harness note: in run 2, one mid-run read showed "Used by: Not used". My poll ended before the run finished (1.0 s vs 1.35 s). This is not a product fault.

## Findings (detail and fixes in `review-x5a-hardening.md` › Round at 521bc9c4)
* **Major (D16, [M] STANDARDS §7):** M16, m46 and the no-file answer have no committed test that fails when the fix is removed. The new no-file test passes without its fix.
* **Minor:**
  * m49, the unguarded finder marker clear.
  * The two carried Shoulds from 0796fc0c: the undated-label page month at `finder.ts:582`, and the m39 test.
  * A flaky 300 ms timing assertion (`check_forms_x5_library.ts:127`, once 330 ms).
  * A dead else-branch at `form-library.ts:271`.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J5 end where they should; M16 Ready after download and after Find again |
| Next step obvious | 1 | No-file and other-bytes toasts both offer upload; the unused form is no longer sent to Find again only |
| Plain words | 1 | "…has no approved file in the library to compare…" |
| Feedback and state | 1 | Toast and row agree; fill names the newer form |
| Correct data | ½ | Exact in J1–J7; the undated-label edge (`finder.ts:582`) is carried, and the finder's clear is unguarded (m49) |
| Error recovery | 1 | J4 answered in words, nothing recorded as checked |
| Accessibility and screen sizes | 1 | axe 0 on 4 states; keyboard path; 400, 1024 and 1440 with no sideways scroll |
| Speed | 1 | Check 55–60 ms; fill 200–258 ms; Find again (replay) about 1.35 s |
| Visual quality | 1 | Team toasts and pills (`j1-library-1440.png`, `j4-nofile.png`) |
| Trust and sources | 1 | The audit names the kept baseline; PDF address recorded; US$0, no AI in the check |

**9.5 / 10: pass, no criterion at 0.** The score is for the experience. The PR is still blocked on the D16 Major, which is about test coverage, not behaviour.

## Could not test
* A visible-browser walk (headless only).
* A real screen reader. Browser zoom proper.
* Live canada.ca. A file switching mid-check.
* An intended user's unaided walk (D17 and D20 stay with the founder).
