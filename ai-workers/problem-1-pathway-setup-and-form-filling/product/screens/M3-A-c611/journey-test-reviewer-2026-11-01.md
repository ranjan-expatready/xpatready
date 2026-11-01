# Journey test, reviewer: C6.11 Firm, users and case team, 1 Nov 2026

Commit a9b54597 · isolated copy `rev_c611` on :4435 (Visitor visa release 1) · Chrome via Playwright, run headless because there is no display here. Steps used only what a person sees, apart from the data checks under "Data underneath". Script and screenshots: `/tmp/rev_c611/walk.cjs`, `/tmp/rev_c611/focus.cjs`, `/tmp/rev_c611/shots/` (scratch, not committed). US$0.

## Journeys (written from concept §11 BR-20, §6 and board frames 1 and 2)
1. **Main.** Firm admin user-R opens a Visitor visa case. Goal: "open the case with me as representative and our case officer". Expected: both prefilled, the case opens, and the header shows both with a Stand-in chip.
2. **Main, continued.** user-R changes the representative to user-T. Goal: "hand the case to my colleague while I'm away". Expected: a reason is asked for; then "A new IMM 5476 is needed", IMM 5476 facts from user-T, and the earlier representative in the history with the reason.
3. **Alternate.** user-R takes the case officer off. Expected: a reason is asked for, and the history keeps the officer.
4. **Error.** Reason "abc" on a change, and an empty reason on take-off. Expected: refused on the field, and nothing changes.
5. **Wrong role.** Case officer user-O opens "Case team". Expected: read-only, with "Only the firm admin changes the case team".
6. **Isolation.** Solo user-S opens the Sample firm's case URL and the case list. Expected: "No such case", and the case is not listed.
7. **Solo, keyboard only.** user-S opens a case. Expected: the same person is prefilled as representative and case officer, with the solo note; Enter submits; Tab reaches "Case team"; Escape closes and focus goes back.
8. **Recovery.** Reload after a change; two "Assign" presses at once.
9. **Across the boundary.** The client opens the same case and sees no team (P-129).

## What happened
| # | Result | Note |
|---|---|---|
| 1 | Held | Prefilled with user-R and user-O; opened in 249 ms. Chip: "Representative (Sample) · CICC R000000 · Case officer (Sample)", Stand-in. Shot 02 |
| 2 | Held | Notice, R000002 and the reason kept in the history. Shot 05. Copy slip: "p.m.." |
| 3 | Held | "No case officer now"; the chip says "no case officer". No warning before the last officer goes. Shot 06 |
| 4 | Held | "Say why … (at least 5 characters)" shown, nothing changed. Shot 04 |
| 5 | Held | No controls, with the explanation shown. Shot 09 |
| 6 | Held on the page | "This case could not be opened · No such case." Shot 10. **But** `/api/activity` as user-S gives 3 lines about that case (the History page shows them): **Major** |
| 7 | Mostly | Prefill and note right, Enter opened the case, Tab reached "Case team", focus moved into the dialog. **After Escape or Close, focus fell to `<body>`**, and the existing "Open a case" dialog does the same: Minor |
| 8 | Held | The team survived a reload. A race gave 201 and 409, so one row |
| 9 | Held | No chip for the client |

## Automated checks
* axe WCAG 2.2 A/AA: 0 violations in 6 states:
  * Open a case (R)
  * the case page
  * the team dialog
  * the team dialog after the change
  * Open a case (solo)
  * the case page at 200 % zoom
* No sideways scroll: case page at 400, 1024 and 512 px (1024 at 200 %); team dialog at 400 px.
* Console: only the expected 400 responses (the refused reasons), the solo 404, and the client's 403 on the agent questionnaire mode (that 403 is older than this PR).
* I ran the script once, not twice. These checks are mine and not in CI: the builder has no browser journey for these states (review Major 2).

## Data underneath
* `check_c611_team.ts`: 47/47.
* After the walk, the case had one current LEAD_REPRESENTATIVE row (user-T). The ended row for user-R holds the reason, and `ended_by` is user-R.
* The audit trail reads: opened, representative_changed, officer_ended.
* Server roles enforced:
  * user-T trying to take someone off: 403.
  * user-O assigning: 403.
  * Another firm: 404.
* A case opened before the migration (rows deleted): "No representative of record yet", then assigned by the firm admin (200).

## Break it
* A reason of 400 non-English characters: "Keep it to 300 characters", on the field.
* Two Assign presses at once: one row.
* Another firm's case by URL: 404.
* A reference the other firm already uses: 409 "already exists". This reveals the other firm's case (Minor).
* Activity feed across firms: leaks (**Major**).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–3 and 7 done in the product's own screens |
| Next step obvious | 1 | One "Case team" action; prefilled choices; the notice says what IMM 5476 must name |
| Plain words | ½ | The case pages are plain. History shows "assigned user-O …" (raw ids), plus the double full stop |
| Feedback and state | 1 | Toasts, the notice, field errors, "Case opened" |
| Correct data | ½ | Rows exactly as entered and the history kept. Isolation breaks in the activity feed |
| Error recovery | 1 | Short reason, refused race and legacy case all recover with a plain message |
| Accessibility and screen sizes | ½ | axe clean, widths and zoom fine, keyboard path works. Focus is not returned on close |
| Speed | 1 | 249 ms open; one request per view |
| Visual quality | 1 | Matches board frames 1 and 2, team components |
| Trust and sources | 0 | **Below the bar.** Stand-in SI-9 chips and Sample licence values are right, but a firm's case activity is visible to another firm |

**Total 7.5 / 10: below the 8 pass mark, with one criterion at 0.**

Fixes to raise the score, most valuable first:
1. Filter the activity feed by firm. This raises "trust and sources" and "correct data".
2. Names instead of ids in audit summaries ("plain words").
3. Return focus to the trigger on close ("accessibility").

## Not tested
A real screen reader. A visible-browser walk (none possible here, so I ran headless with screenshots). An unaided walk by an intended user (D17 and D20 stay with the founder). A second run for flakiness.
