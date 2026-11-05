# C11.6 How each form is filed: journey test, reviewer, 5 Nov 2026

Commit **ef188a489** (PR #1056), isolated copy http://localhost:4450 (database xr_studio_c116, Visitor visa release 2, acting as user-O, the case officer). Live AI off, no priced button, US$0. Walked headless with Playwright (`/opt/pw-browsers/chromium`). This environment has no visible browser pane, so the "like a person" walk was scripted clicks and keys plus reading the screenshots. Each run opened a new family case (Client A, Spouse A, Child A1, Child A2). Reviewer scripts and screenshots are in the session scratchpad and are not committed.

## Journeys (persona: case officer, unless named)
| # | Goal in their words | Steps | Expected | Result |
|---|---|---|---|---|
| R1 main (J7 2.3) | "Which IRCC account, and how does each form go?" | Open the case | Account shown once, read-only; each form on its line's channel, with signature and what IRCC accepts | Held. "Filed through APR Portal: set by the combination, not on the case" with a lock and no control. 5476/5257 PDF upload, 5707 Online, child 5257 only |
| R2 main, keyboard (J7 5.2) | "File Client A's 5707 as a PDF upload" | Focus the row button, Enter, ArrowDown, Tab to Save, Enter | Saves for that person only, focus comes back | Held. Focus starts on the current way; toast "…now filed as PDF upload. The combination's line is unchanged."; focus returns to the row |
| R3 alternate | "Put it back the way the combination files it" | 5707 → Online again | Row reads "The combination's default" | **Failed.** Row reads "Online … Changed from Online (the combination's default) by Case officer (Sample), Nov 5, 03:32 a.m.." (shot r3-back-on-default). Same for 5257 back on PDF upload (R7) |
| R4 error (J7 5.2) | "IMM 5476 online; IMM 5257 online; 5257 on paper" | Open each dialog; choose Paper; Save with no reason, then with one | Greyed with IRCC's line; reason asked; refused on the field | Held (builder check 37/37 twice, reviewer screenshots). Online on 5476 greyed with "Upload this form along with your online application"; the reason refusal shows on the field with focus there |
| R5 break | "Long, non-English reason; double-click Save" | 504 chars of Arabic and Chinese, then double-click | One change, one audit line, wraps | Held. The box stops at 400 characters with no counter. 1 audit line. Wraps at 400 px with no sideways scroll |
| R6 recovery | "Oops, close it" | Change the choice, press Escape | Asks before discarding | Held. "Discard your unsaved changes?"; dismissing it keeps the dialog open |
| R7 conflict | Two tabs on the same item | Tab 2 saves 5257 → PDF upload; tab 1 saves from its older read | "Changed since you read it", Reload, no duplicate | Held. Reload, then Save returns "same", 2 audit lines in total (Paper, then tab 2's change). The notice does not say *what* changed |
| R8 wrong role | Client or author by URL or API | Client opens /cases/:id; PATCH as client and as author | Refused | Held. Notice "This page is for the case officer"; PATCH 403 for user-P and for user-A |
| R9 boundary (J7 5.2 → 5.3/5.5) | "Now prepare what I file" | After 5707 → PDF upload, read Prepare application | The same channel everywhere on the page | **Failed.** Prepare application still lists "IMM 5707 for Sample Client A · Copy, not for filing". `GET /runtime/cases/:id/forms` still returns `channel: "ONLINE"` (shots m1-channel-row-5707, m1-prepare-row-5707) |
| R10 reload | "Is it kept?" | Reload the page | Change kept | Held |

Empty, loading and error states are drawn in code (item-channels.tsx:54–57) but cannot be reached on this data. The "IRCC no longer accepts" red state (:77) and the submitted, read-only state (:78) were not reachable here: there was no library change after the release and no recorded submission.

## Automated replay
* `tests/check_c116_channels_browser.ts 4450 xr_studio_c116`: **37/37 twice** (24 s). `acceptance/C11.6.test.ts`: **14/14**. `graph.mjs --check` exit 0. `m3-guard.sh` passes (M3-only, no M2-hot file).
* Reviewer replay: axe WCAG 2.2 A/AA on the dialog at 400 and 720 px (720 px is 1440 at 200 % zoom): 0 violations. No sideways scroll at 400, 720 or 1024 px.
* Console: only the expected 409 (stale) and 403 (client) resource lines.

## Data underneath
The item row holds the new channel and reason (null after a change that needs no reason). The spouse's item is untouched. The audit line names who, from, to and "(reason given)" without the reason's text. The combination's line is unchanged. Double-click and two-tab saves write no duplicate. The server checks the version under the case's row lock (case-prepare.ts:515–518).

## Speed
`GET …/prepare` 0.15–0.17 s, three runs. The panel shares its query key with `OutOfDate` (out-of-date.tsx:23), so it adds no request: 2 prepare GETs per view, the same as on main (submission.tsx:50 has its own key). The case page reached its rows in 1.6 s, mostly the rest of the case page.

## Score (QUALITY.md "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J7 2.3 and 5.2 done on screen, keyboard only (R1, R2, R4) |
| Next step obvious | ½ | Separate panel, away from the "Prepare the filing" rows where r5c frame 6 puts ⋯ Change channel. After a change, the panel below says otherwise (R9) |
| Plain words | ½ | The dialog shows "Sample for the M3 path … (FQ-2, FQ-3)" (builder shot 03). "a.m.." double stop. "Changed from Online" on an Online row (R3) |
| Feedback and state | ½ | Toast, focus return and Reload all good. The state line is wrong after a change back to the default (R3) |
| Correct data | ½ | Item, audit and line are correct. Prepare application and `/forms` ignore the item's channel (R9) |
| Error recovery | 1 | Reason refused on the field, stale Reload, discard guard, double-click safe |
| Accessibility and screen sizes | 1 | axe 0 at 400/720/1024/1440, keyboard path, focus management, no sideways scroll |
| Speed | 1 | 0.15 s API, no new request |
| Visual quality | 1 | Team Pill/Button/Dialog/Notice, calm rows. For 5476 the same not-accepted note repeats three times (shot r5-720-dialog) |
| Trust and sources | ½ | IRCC's line is quoted, but with no link or date. A person-set Sample record is shown as a quote under "IRCC does not accept it here" |
| **Total** | **7.5 / 10** | **Below the pass mark (8).** No criterion at 0 |

**Fixes that raise the score, most valuable first:** (1) make Prepare application and `/forms` follow the item's channel (correct data, next step). (2) Row text on the default after a change: "The combination's default" plus who set it back (feedback, words). (3) Show a person-set accepts record as "Sample record, set by a person" rather than quoting its internal note, and give IRCC's line its link or date (trust, words).

## Not tested
A real screen reader. An intended user's unaided walk (D17, D20 stay with the founder). The read-only (submitted) state and the red "no longer accepted" state on screen. Mac Chrome.
