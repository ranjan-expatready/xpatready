# Journey test — C7.6 B2 Ready to file by screens (reviewer, 6 Nov 2026)

**Commit:** `804c044306eb0fdb80eb1f4c08fe2a5953d50f51` (PR #1171). **Copy:** isolated `rv_b2` on :4434, configured checkpoint (Demo › Reset, then Load the configured checkpoint, through the builder's check). **Browser:** Playwright Chromium, headless (no visible pane in this session), 1440 / 1024 / 400 px and 512 px (1024 at 200 %). Live AI off, US$0. Review: `B2-review.md`.

## Journeys (from J-B2, BR-8, BR-11, P-155, P-238)
1. **Main, case officer:** "I want to see what still stands before this filing can go, and clear it." Open the case, read the Ready to file panel, pass each warning with a reason. Expect: lines grouped by who owes them, in the server's words, no percentage; each pass shows who and when.
2. **Main, representative of record:** "I review the filing before it goes." Review the filing, confirm. Expect: "Prepared by · Reviewed by" with the licence.
3. **Main, case officer:** press Ready to file. Expect: the filing reads "Ready to file"; Record the submission (C8.2) opens.
4. **Error:** Ready to file while lines are open. Expect: refused, naming the same lines; nothing changes.
5. **Error:** pass with no reason, with "1234", with 360 characters. Expect: refused on the field; nothing stored.
6. **Wrong role:** the case officer (no Review button; the POST is 403); the client (no panel; a POST pass is 403); a block (no Pass; a POST is 409).
7. **Recovery:** double click on Pass; two tabs passing the same line; reload after passes.
8. **Boundary:** after Ready to file, C8.2's Record the submission is enabled and a missing number is refused.

## What held
* J1: 8 open lines on my case ("The case team · 2 lines", "The representative of record · 1 line", "The client · 5 lines"), each in the server's words, CRITICAL ones first. Each pass: toast "Passed with your reason: who and when are recorded.", the line moves under "Passed with a reason (n)" with “reason” — passed by Case officer (Sample), date and time. A Hindi and Arabic reason was stored and shown as typed.
* J2: user-R sees Review the filing and the officer does not. After Confirm the review, the panel reads "Prepared by · Reviewed by: Case officer (Sample) · Representative (Sample) (licence R000000), Nov 6, 2026, 03:24 p.m."; `filing_review` holds user-R, kind `reviewed`.
* J3: Ready to file in 480 ms; the pill and `/prepare` both say Ready to file; the focus moves to the filing heading. J8: the builder's check (Record the submission enabled, a missing application number refused on its field, status unchanged).
* J4: a red notice "Not ready to file" with the server's detail and the same lines; `/prepare` stays `not_started`. The notice goes away once a line changes.
* J5: each refused on the field (`aria-invalid`, role alert): "Say why this warning is passed (at least 5 characters, with words)." and "Keep it to 300 characters."; 0 rows stored.
* J6: officer review POST 403; client pass 403; block pass 409 "No validated copy read back blocks Ready to file and cannot be passed: fix it instead."; the client gets "This page is for the case officer".
* J7: a double click stores 1 row; two tabs store 1 row (the second tab's reason is refused, 409); after a reload the state is the same.
* Accessibility: axe WCAG 2.2 A/AA 0 violations on 7 states (the builder's check). Keyboard: Tab from the panel heading reaches Ready to file, then each "Pass with a reason: …" (named by its line). Focus moves into the reason field, Cancel returns it to the opener. No sideways scroll at 400, 1024 and 512 px.
* The builder's check ran twice on my copy: 46/46, exit 0, both times (not flaky).

## Findings (detail and fixes in `B2-review.md`)
* Minor — two tabs: the second person's 409 message is removed with the line at once (no toast), so their reason is dropped silently and the focus goes to the page body (`readiness.tsx:168-171`).
* Minor — form rows still say "1 fact to answer or confirm before filing" while the filing reads Ready to file (`forms.tsx:141`).
* Minor — the "Critical warning" pill repeats the server's "CRITICAL: " prefix (`readiness.tsx:32`, `:178`); the header paraphrases `status_rule` (`:54`); no tooltips on the status pills (`:106`); the reason field allows 400 characters, the server 300 (`:185`).
* Minor — at 1440 px three success toasts stack over the right end of the passed lines after quick passes (seen in my walk's screenshot of the Ready state).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J3 and J8 by screens on two cases; the builder's check 46/46 twice |
| Next step obvious | ½ | one Pass per line and one Review for the representative; but the primary Ready to file button is offered while 8 lines stand (J-B2 wants the refusal), and lines such as "Fix it, then confirm it" have no way to the place to fix them |
| Plain words | ½ | server words and people's names, but "Critical warning" + "CRITICAL:", "Not started" for a filled filing, and "before filing" on form rows |
| Feedback and state | ½ | toasts, field errors, a refusal that lists the lines and clears itself; the two-tab 409 is not seen; no status tooltips |
| Correct data | 1 | one row per pass under a double click and two tabs; who and reason stored; the review tied to the facts hash |
| Error recovery | 1 | refused reasons stay in the field to fix; Cancel restores focus; the stale refusal clears; reload is safe |
| Accessibility and screen sizes | 1 | axe 0 on every state; keyboard path; 400, 1024 and 200 % with no sideways scroll |
| Speed | 1 | panel 0.3–0.5 s on a warm page (1.8 s on a cold first load), Ready to file 0.5 s, one read per case (no per-row requests) |
| Visual quality | 1 | team components, the same look as the forms panel; the toast stacking is minor |
| Trust and sources | 1 | only the server's lines and states; who, when, reason and licence shown; no AI on this path |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no criterion at 0) |

Fixes that would raise the score, most valuable first: show the 409 `detail` on a pass (feedback); drop "before filing" from the form rows and the doubled "CRITICAL" (words); a link from a fixable line to its place (next step, C7.7's tab).

## Not tested
A real screen reader; a visible (headed) browser pane; an intended user's unaided walk (D17 and D20 stay with the founder); the self-reviewed path for a representative who also prepared the filing; a filing with a real block (the checkpoint's single-adult filing has none); a fact change after Ready to file (my test answer was refused 422, and that rule is the server's, reviewed on #861).
