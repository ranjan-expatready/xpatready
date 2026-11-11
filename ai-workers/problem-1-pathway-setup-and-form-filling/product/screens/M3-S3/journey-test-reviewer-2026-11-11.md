# M3-S3 journey test: reviewer role, 11 Nov (commit aeeb7ac5)

Copy `rev_m3s3` on :4431 (configured checkpoint, live AI off, US$0), stopped after. Headless Chromium, Playwright, axe-core WCAG 2.2 A/AA. The scripts and screenshots are kept outside the repo, in the reviewer's scratchpad (`j/a_author.cjs`, `j/c_waive.cjs`, `a*.png`, `c*.png`). The main journey ran twice with the same result (18/21 both times; the 3 fails are below).

## Journeys
1. **Author (main, configuration side).** Goal: "the officer may waive the letter of acceptance on Study permit, outside Canada". Steps: Documents → Letter of acceptance → Edit → Waivable (Space key) → Save to draft. Result: a draft with "Edited by a person"; the toast "Document requirement saved to the draft". axe 0 on the dialog.
2. **Release (crossing the screen boundary).** Signed off by the reviewer and approved by the approver through the API (another row's screen). Release 3 carries `waiver: "waivable"` on the line; releases 1 and 2 are unchanged (fingerprint stable).
3. **Case officer (main).** Open a case → Documents → ⋯ on Letter of acceptance (keyboard: Enter, arrows) → Waive… → reason → Enter. Result: the line shows Waived, the reason, and "Last change 11 Nov, 06:48 by Case officer (Sample)". Focus returns to ⋯. "0 of 2 received" leaves the line out. Readiness has no "not received" warning for it.
4. **Error.** An empty reason: "Give a reason for waiving this document." on the field, and the dialog stays open. 501 characters: 400 on the field.
5. **Alternate: a non-waivable line.** The fee receipt's menu has no Waive…; the API gives 422 in words.
6. **Wrong role.** Client: 403 "Only the case officer can do this.". Author: 403 "works on configuration, not on cases". The firm's representative may waive (staff, accepted).
7. **Recovery.** Reload keeps Waived. Request again takes the waiver back, to Requested. A Waived line's menu offers only Request again and History.
8. **Afterwards (data).** After Request again, the line and History no longer show who waived it or why. In the database, `state_reason` is NULL and the audit line has no reason (review M2).
9. **Break.** Waive racing Not applicable on one version: one 200, one 409. Three waives at once: one 200, one audit line. A client upload on a Waived line gets "is Not applicable" (review m1).

## What held
Keyboard-only path; axe 0 on 4 states; no sideways scroll at 1440, 1024, 400 and 720 px (200 %); a Unicode reason stored and shown as typed; the version lock; server-side roles; waive 58 ms; checklist read 20–34 ms.

## Findings (detail and fixes in review.md)
* Major: the waiver's "why" is lost after take-back (journey 8; `api/src/case-checklist.ts:185,192`).
* Major: the reviewer and approver cannot see Waivable on the line (screenshot a2: the drawer has no Waivable row).
* Major (code, not a step of these journeys): the not-derived guard depends on the waiver flag (`engine/runtime/case-checklist.ts:140`; the breaker reproduced it).
* Minor: wrong state word on upload (journey 9). The Waived pill has the same tone as Not requested.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–3 end to end |
| Next step obvious | 1 | Menu item is named; the dialog says "Request it again to take the waiver back" |
| Plain words | ½ | The upload refusal names the wrong state (m1) |
| Feedback and state | ½ | Waived, reason, who and when are shown on the line; Waivable is not shown on the author's line or drawer |
| Correct data | ½ | Data is exact while waived; the reason is erased on take-back; the guard flip (M1) |
| Error recovery | 1 | Field error keeps the typed text; a 409 reloads the list; take-back works |
| Accessibility and screen sizes | 1 | axe 0; keyboard-only; 400/1024/200 % |
| Speed | 1 | 58 ms waive; first view under 1 s |
| Visual quality | 1 | Team Pill, Dialog and checkbox; clean at 400 px (c6) |
| Trust and sources | ½ | Who and when are visible; the "why" is not durable and the setting is invisible to the approver |

**8/10, pass (no criterion at 0).** To raise it, most valuable first: keep the reason in the audit and History (correct data, trust); show Waivable in the drawer (feedback, trust); use the line's own state word in the upload refusal (plain words).

## Not tested
A real screen reader; an intended user's unaided walk (D17 and D20 stay with the founder); the release screens' own UI (I released through the API).
