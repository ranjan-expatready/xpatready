# B169 journey test: reviewer, 11 Nov 2026 (commit 9540d3057)

Copies: :4521 (branch data, "Load the configured checkpoint", then qa144), :4531 (main's form-library-sample.json, for the
before state). Headless Chromium (Playwright), axe-core WCAG 2.2 A/AA. US$0, live AI off. My scripts and screenshots are in
the reviewer's scratchpad (`walk/walk.cjs`, `walk/sheet.cjs`); none were added to the repository.

## Journeys
1. **Main, content publisher:** "Which IRCC account does spousal sponsorship file through?" Immigration programs › Spouse or
   common-law partner › Forms tab. Expected: PR Portal, Sample. Got: the select reads **PR Portal** (click to the combination
   0.6 s, to the Forms tab 1.2 s). "Filing: Mixed: online and PDF · Sample until the immigration expert confirms". axe 0.
2. **Alternate:** Visitor visa's Forms tab still reads APR Portal (no regression).
3. **Across the boundary, case officer:** open an fs.spouse case through "Open a case" (release 1), then open the IMM 0008 answer
   sheet. Expected: "Filed through PR Portal". Got: **"Filed through PR_PORTAL: set by the combination, not on the case"** on
   the case page and on the answer sheet, at 1440 and at 1024 (`j3-fs-case-officer-1440.png`, `j3-fs-sheet-officer-1440.png`).
   `/prepare` as the case officer: `portal_words` is the same string. Cause: `api/src/case-prepare.ts:664`.
4. **Keyboard only:** from the top of the Forms tab, Tab reaches the account select in 33 presses, with visible focus.
5. **Sizes:** the Forms tab at 1440, 1024 and 400 px, and the sheet at 1440 and 1024 px: no sideways scroll.
6. **Recovery:** after a reload the Forms tab still reads PR Portal. "Reset to the six", then "Reset" and "Load the configured
   checkpoint" (check_b169 part 2): PR Portal each time.
7. **Wrong role:** `/runtime/cases/:id/prepare` as the configuration author is refused 403 in words ("works on configuration,
   not on cases"). As the case officer it is 200.
8. **Empty / before:** with main's data, both loads leave fs.spouse with no account. The Forms tab offers "Not set" and the case
   shows no account line (check_b169 FAIL lines 8 and 9: `"portal":"(none)"`).

## Data underneath
The release-1 snapshot (main vs branch) differs only in `combination.portal`. Form lines, channels, sources and library guides
are identical. The other combinations' accounts are unchanged. `/channels` changes only in `account`. The case was recorded once
with reference REV-B169-….

## Break it (short)
- **Citation mutations:** a changed quote word fails check_b169. `page_modified` set to the `dcterms.issued` date still passes
  (Minor, review issue 2).
- **The entry removed** (main's file): check_b169 fails 7 of 9 lines and names fs.spouse. The rule is real.
- **Two tabs changing the account:** not run. That rule is the Forms tab's 409 (`forms.ts:138`), which this row does not change.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | PR Portal set on the six and the checkpoint; check_b169 9/9 |
| Next step obvious | 1 | Forms tab account line; case says "set by the combination" |
| Plain words | ½ | "PR_PORTAL" raw on the case page and answer sheet (J3) |
| Feedback and state | 1 | Survives reload and both loads (J6) |
| Correct data | 1 | Snapshot diff is only the portal; qa144 28/28 |
| Error recovery | ½ | Reload and reset hold; the two-tab case was not exercised by me |
| Accessibility and screen sizes | 1 | axe 0 (Forms tab, sheet); 1440/1024/400 no sideways scroll; keyboard reach |
| Speed | 1 | Tab 1.2 s, case 1.8 s, sheet 0.5–1.0 s; unchanged by this data row |
| Visual quality | 1 | Team look unchanged; the account select fits at 400 px |
| Trust and sources | ½ | The quote, page and date are in the data only; the case line carries no Sample mark |

**8.5 / 10, no 0: pass on score.** The plain-words Must (review issue 1) still blocks approval.
Fix that raises the most: show `ACCOUNT_WORDS` on the case side ("PR Portal"). That takes plain words to 1.

Not tested: a headed browser, 200 % zoom, a screen reader, an fs.spouse submission record, an intended user's unaided walk
(D17, D20: the founder).
