# Journey test: C4.6 Preview by person per channel, reviewer, 1 Nov

Commit 7831153e on the isolated copy `review_c46` (:4439), sample loaded. I walked it in headless Chrome through Playwright, using what a person sees: tabs, selects and buttons. The scripts were scratch work in `/tmp/rv46/` and are not committed. US$0.

## Journeys
| # | Persona · goal | Steps | Result |
|---|---|---|---|
| J1 | Configuration author: "show me what the principal gets on each channel" | Forms tab: set IMM 1295 to Online (later wave), IMM 5707 to Paper, IMM 5257 SCH1 to Signed by hand and scanned. Each change shows a toast. Then open the Preview tab | The count reads "1 filled on the portal (later wave) · 5 filled PDFs to upload · 1 PDF to print, sign and mail · 2 PDFs to sign". The Online group shows the later-wave note. The pills read "Signed in pen" and "Signed by hand and scanned". **But "5 filled PDFs" includes 2 checklists that the Forms tab marks "not filed"** |
| J2 | Author: the same, for the spouse | Click "Spouse or partner · …" | The count is the spouse's own. IMM 5475 is not listed for the spouse. Switching takes 230 ms |
| J3 | Author: an Online line in the couple group | IMM 5409 set to Online, IMM 1295 back to PDF upload. Open the spouse | The count says "1 filled on the portal (later wave)", but **no later-wave note appears anywhere**. IMM 5409 shows only an "Online" pill under "Filed once for the couple" |
| J4 | Author: an empty person | Child 1 and Representative have 0 forms | "No form applies to this person for this family." No count line is shown, which is correct |
| J5 | Approver (wrong role) | Forms tab as user-B. Then PATCH the channel by URL | No "Filed as" select is offered. The PATCH returns 403. The approver can read Preview |
| J6 | Error: a signature that does not fit its channel | Set "Typed name" on a Paper line | Refused with 400, in words: "A Paper line is signed in pen". Preview keeps "Signed in pen" |
| J7 | Recovery: reload, Back, and a bad person in the URL | Reload, Back, `?person=nobody` | Reload keeps the person. Back returns to the Forms tab (the person switch replaces history; this existed before the PR). An unknown person falls back to the principal |
| J8 | Across the screen boundary: draft against release | Preview → Released | The released channels show, with no Online group until the change is released |

## Automated replay
- The builder's `check_c46_preview_channels_browser.cjs` passed 18/18 on :4439, including axe and 1024 px.
- My own pass:
  - axe WCAG 2.2 A/AA: 0 violations on the spouse view and on a 720 px view.
  - No sideways scroll at 400, 1024 or 512 px (200 %).
  - Keyboard: Tab reaches the spouse button and Enter switches person.
  - No page errors.
- The API check passed 16/16. The neighbouring checks passed: preview_sets 27/27, preview_sets_browser 24/24, engine 38/38.

## Data underneath
- The draft snapshot holds exactly what was set: IMM 1295 ONLINE, IMM 5257 SCH1 HAND_SCANNED, IMM 5707 PAPER/PEN. Nothing else changed.
- IMM 5488 and IMM 5905 are `form_kind: document` with no channel. Their channel reads as PDF upload by default, which is the source of the wrong count.
- The release is unchanged until it is released.
- Roles are enforced on the server (403).

## Break-it
- Every way IRCC does not accept is refused in words. Example: "IMM 5475 is filed as Online, but the Form library records that IRCC accepts it only as a PDF upload."
- An unknown person falls back to the principal.
- Severity of what I found: Major for the checklist count, Major for the missing note on Online lines outside the Online group, Minor for "(P-102)" shown on screen.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Each person's outputs per channel and PDFs to sign are shown |
| Next step obvious | 1 | Tabs and person buttons; the draft and the release are labelled |
| Plain words | ½ | "(P-102)" is shown on screen; "PDFs to sign" overlaps "print, sign and mail" without saying so |
| Feedback and state | 1 | Toasts on save; Draft and Released kept apart |
| Correct data | ½ | Checklists are counted as "filled PDFs to upload"; an Online couple line gets no later-wave note |
| Error recovery | 1 | A signature that does not fit is refused in words; bad URLs fall back |
| Accessibility and screen sizes | 1 | axe 0; 400, 1024 and 200 % OK; keyboard OK |
| Speed | 1 | Tab 273 ms, switch 230 ms |
| Visual quality | 1 | Pills are consistent with the Forms tab; no overflow |
| Trust and sources | 1 | The parked portal is stated; Sample is labelled on the Forms tab |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no 0) |

Changes that would raise the low criteria, most valuable first:
1. Leave checklists out of the PDF count.
2. Show the later-wave note on every Online line.
3. Drop "(P-102)" from the on-screen words.
4. Say "of which N to sign".

## Not tested
- A real screen reader.
- An intended user's unaided walk (D17 and D20 stay with the founder).
- A visible, headed browser pane: the walk ran headless through Playwright.
