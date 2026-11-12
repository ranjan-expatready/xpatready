# BK-17 journey test (reviewer, 12 Nov 2026)

Commit reviewed: `0646a9071` (PR #1612, branch `claude/eager-heisenberg-kzer76`). Isolated copy `rv_bk17` on :4439, configured checkpoint, live AI off, US$0, no priced button. Headless Chromium at 1440 px through Playwright (no visible browser pane in this cloud session). Set-up (case, answers, Ready to file, Record the submission) went through the product's routes, as the builder's walk did. Record the submission is C8.2's own screen. The answer change in J1 was made in the browser, as a person makes it. The scripts and screenshots are in the reviewer's scratchpad. They were not committed.

## Journeys (persona: case officer, Sample firm)
1. **Main.** The officer opens a recorded Study permit (outside Canada) family: a student of 30, and a child of 15 whose "6 months or more" answer is Yes. Both applications are recorded. In Agent view, Sample Child J, the officer clicks Edit on "Will this person study in Canada for 6 months or more?", chooses No and saves. Then the officer reloads the case. Expected: Submission to IRCC reads exactly as recorded.
2. **Alternate: a child split out, not recorded.** The child's own application was split out with a reason. Only the student's group was recorded. Then the child's answer changes to No. Expected: the child is still on an application, or the screen says in true words why they are not.
3. **Wrong role by URL.** The client (`user-P`) opens the officer's case page. Expected: no recorded filing is shown.
4. **Recovery.** In journey 2, the officer sets the answer back to Yes. Reloads (journey 1) and 20 reads at once after the change.
5. **Recorded before BK-17** (break: SQL). The stored labels are removed, and the child's filing and items are made inactive, as main's code left them.

## What happened
| # | Result | Evidence |
|---|---|---|
| 1 | **Held.** The Edit dialog showed "Now: Yes (Confirmed by the officer)", and No › Save was taken (stored value now `false`, DECLARED). After a reload, Submission to IRCC has the same text as before: "Outside Canada: Sample Student J" and "Study permit: Sample Child J", both Submitted, with their numbers. axe WCAG 2.2 A/AA: 0 violations on Submission to IRCC and on People and filings. No sideways scroll at 1024 or 400 px. Tab reaches the panel. No page errors. | `j1-1-recorded-1440`, `j1-2-dialog-1440`, `j1-3-after-1440`, `j1-after-1024/400` |
| 2 | **Failed.** After No, the child is on no application. People and filings says "Sample Child Q · **No filing: not travelling**", which is untrue: the child travels and was never marked otherwise. Submission to IRCC lists only the student, under the header "**One submission for 2 people applying**", but that recorded submission had one person. The child has no items and no readiness entry, and no fee line names them. `people[].filing` is null and `why` is null. `not_filing` is empty. GET …/filings agrees: the child is not on it. | `j2-people-1440`, `j2-submission-1440`; probe A |
| 3 | **Held.** The client sees no filing of the case. The route answers 403 (`check_bk17…` 17/17). | `j3-client-1440` |
| 4 | **Held.** Yes again brings the child's own application back (`ready_to_file`, same id, its group). A second read gives the same version. 20 reads at once all return 200 with one version and one set of labels, and the counts are unchanged: filings 2/2, items 13/13, 1 group. | probes A, C |
| 5 | **Partly.** The filing is listed again and Submitted, but its label reads "**Outside Canada**: Sample Child B" where it was recorded as "Study permit: Sample Child B". It has 0 items, and readiness is `ready: false` with 0 blocks. | probe B |

## Findings
* **Major.** In journey 2, a travelling person drops off every application without being told, and the screen says they are not travelling. Code: `api/src/case-prepare.ts:217-219` (`plan`/`ownerOf`: the derivation puts them on a recorded owner, which takes nobody new) and `api/src/submission-record.ts:124`. Words: `web/src/runtime/filing-changes.tsx:70`.
* **Minor.** The header of a recorded group follows the answers ("for 2 people applying" over a record of one person): `submission-record.ts:126` keeps the derived group's label and `why`.
* **Minor.** A record made before BK-17 is relabelled, and its items stay inactive (journey 5).

## Score (QUALITY.md "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Journey 1 is done end to end. In journey 2 the child is lost. |
| Next step obvious | ½ | Nothing tells the officer that the child still needs an application (journey 2). |
| Plain words | ½ | "No filing: not travelling" is false in journey 2. Otherwise the words are clear and unchanged. |
| Feedback and state | ½ | The save confirmation shows, and recorded reads recorded. In journey 2 the child's state is hidden, and the group count is wrong. |
| Correct data | ½ | In journey 1 the rows are unchanged and no write happens on a read. In journey 2 the child is on no filing. In journey 5 the label is relabelled. |
| Error recovery | 1 | Answering Yes again restores the child's own application. Reloads are stable. |
| Accessibility and screen sizes | 1 | axe shows 0 violations on both panels. 1024 and 400 px have no sideways scroll. The keyboard reaches the panel. 200 % zoom was not tried. |
| Speed | ½ | The case page took 2.7 s cold and 1.4 s on reload (budget: first view under 1 s). The page is unchanged by this row and was not compared with main. |
| Visual quality | 1 | No UI change. The team's panels are unchanged. |
| Trust and sources | 1 | The record (number, date, Prepared by · Reviewed by) is shown. The fees say "nothing is guessed". |
| **Total** | **7 / 10** | **Below the pass bar (8). No criterion is at 0.** |

Fixes that would raise it, most valuable first:
1. Keep a person whom the derivation would put on a recorded filing they are not on, on a filing of their own. If that is not done, list them in `not_filing` with a true reason that People and filings shows (not "not travelling").
2. Read a recorded group's header from its recorded filings.
3. Reactivate the items of a recorded filing together with the filing.

Not tested: a real screen reader; 200 % zoom; an intended user's unaided walk (D17/D20 stay with the founder); a visible (headed) browser.
