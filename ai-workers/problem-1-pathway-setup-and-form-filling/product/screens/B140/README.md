# B140 — C6.18 officer entry for background answers: UX note (P-392)

Row B140 = L-SA10, P-244 (amends P-97, C4.9), P-406. Pull request 1246. Board: `screens/M3-agent-view/design/draft-agent-view.html` (P-164): "Background and declaration answers are the client's: you can see them, not confirm them (P-97)", which P-244 amends: staff may record one, marked Officer, and the client re-confirms it before signing. Intent, not pixels (P-44). No new screen part: a pill and a note on the Agent view's existing lines and sections, and one list on the client questionnaire's existing overview. Scorecard: the UX lane's BIC-01..20 (`design/best-in-class-m3-case-screens-2026-11-07.md`, on #1245's branch, not yet on `main`).

## Decisions, each with its best-in-class line

| # | Decision | Best in class (what we follow) |
|---|---|---|
| 1 | **Which answers are background answers comes from the forms' own reading** (IMM 5257's "BACKGROUND INFORMATION" block, IRCC-F08) or a library client-only section (P-97). Nothing is listed in code (P-319). | Source and provenance on every value (BIC-05): the rule is the form's own heading, not a guess. |
| 2 | **"Officer" pill** beside an answer staff recorded, with who and when in its tooltip and under the line ("Agent view · Case officer · 7 Nov, 10:36"). | Status by shape and text, never colour alone (BIC-19); every chip has a tooltip with context (BIC-14). |
| 3 | **"Waits for the client"** replaces "To confirm" on such an answer; the officer's **Confirm section does not confirm it** and its toast says how many wait. | Signing and submission are recorded events with who and when (BIC-16); no stale or unchecked answer reaches a signature (BIC-03). |
| 4 | **One muted line on a background section** says the rule in plain words; **a hint in the Add/Change dialog** says what saving does before it is done. | Help in place: what is needed to act is visible, not hidden in a tooltip (BIC-14); errors and consequences said before the action (BIC-13). |
| 5 | **No blank is defaulted:** no Yes/No is preselected; a blank is refused with words; Confirm section never makes an answer. | "Not answered yet" is a normal state, not an error (BIC-04); GOV.UK Design System radios guidance: do not preselect. |
| 6 | **Client: "Check what your case officer recorded (n)" first on the questionnaire**, one line per answer (question, value, who and when), "This is right" or "Change". Each answer is checked on its own; there is no "all right" button. | Check before it leaves (BIC-12, GOV.UK "Check answers" pattern: every answer with a Change link before the declaration); one primary action per panel (BIC-11): row buttons are secondary. |
| 7 | **In the part itself**, the same line sits above the question ("Your case officer recorded No on 7 Nov, 10:36. Is it right? If not, change it below and save."). Changing the value makes it the client's own. | Errors and checks where they happen (BIC-13); plain words for the client, short sentences (BIC-20). |
| 8 | **The forms say why:** IMM 5257's readiness names it "waits for the client to re-confirm" and Ready to file's words say "recorded by staff, the client re-confirms it". | Task list states say what is needed and from whom (BIC-10). |

## Walk (1440 px, configured checkpoint copy, screenshots in `walk/`)
01 the Background section with its note · 02 the Add dialog: hint shown, no radio preselected · 03 saved: "Marked Officer: the client re-confirms it before signing", pills "Waits for the client" and "Officer" · 04 Confirm section: still waits, toast says so · 05 Forms: IMM 5257 waits for the client · 06 client: "Check what your case officer recorded (1)" · 07 the part: the line above the question · 08 re-confirmed toast · 09 the list is gone · 10 officer: "Counts as confirmed", "Officer" kept, "confirmed by Client A".

## Review and break (on 69c33c235)
Fixed in c2a7b8d5c and after, each with a fail test: "This is right" after a change (M1), blanks in other shapes and re-confirming an answer with a problem (M2 / m1), the re-confirm words hidden in "and N more" (m1 / m3), Confirm section staying the main button (m2), the audit naming the officer by id (m5). Reports: `review.md`, `break-report.md`, `journey-test-reviewer-2026-11-07.md`.

## Known limits (said, not hidden)
* **Tooltips are the native `title`**, as on every pill of the case screens today; BIC-14 asks for hover and keyboard focus. One change for all pills, a follow-up row.
* **IMM 5257 Schedule 1 (and later IMM 5669) are not covered (review M2, break M3; Unconfirmed: expert).** Schedule 1's own reading has no "BACKGROUND INFORMATION" heading (its parts: "Military service", "Membership or Association with Organizations", "Government positions"), so its answers behave as on `main`: the officer enters and confirms them. Calling them background would be a guess (AGENTS rule 4). Asked on the pull request: the immigration expert says whether they are background answers for P-244; if yes, the library's client-only section flag (P-97), which this rule already reads, marks them (it needs an author route to set it: a follow-up row).
* **The checkpoint's Sample case** has Client A re-confirm the record's background answers the officer entered (`api/src/sample-case.ts`, counted as `reconfirmed`), a person's step the checkpoint stands in for (P-33).
* **A repeating group's "none apply" in a background section** is not marked: no checkpoint release has a repeating group in a Background block or client-only section.
* **Interaction with B150 (pull request 1251, P-411):** P-411 makes every declared answer fill the forms at once, staff entries included. This PR keeps an officer-recorded background answer off the forms until the client re-confirms. See the question for the tech lead on the pull request.
