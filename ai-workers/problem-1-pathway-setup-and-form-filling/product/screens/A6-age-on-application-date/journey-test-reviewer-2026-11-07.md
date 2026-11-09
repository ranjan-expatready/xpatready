# A6 (B102): journey test, reviewer role, 7 Nov 2026

Commit `78a874439` (PR #1222). Fresh isolated copy :4471, Demo › Load the configured checkpoint (about 2 min), Chromium headless through `acceptance/lib/browser.ts`. My scripts were kept outside the repo (scratchpad) and were not committed. Only these rows were inserted by SQL, as scaffolding: rules that read facts the library lacks, as the builder's J-A6a does. Everything else was done on screen. US$0, live AI off.

## Journeys (main path first)
1. **J1, main, author, keyboard only, 1440.** "Work out a child's age instead of asking it." Questionnaires › Facts a rule needs › Work it out instead (Enter) › Tab through Worked out as, From, On › "Work it out · US$0" (Enter). Expected: the row leaves, one value with an audit line, and Review names both dates.
2. **J2, empty choice.** Choose "Choose a date…" in From. Expected: a refusal in words.
3. **J3, two tabs, one fact.** Both open the form; tab A saves; tab B saves. Expected: B is refused in words and one value exists.
4. **J4, wrong role.** Content reviewer and Approver on Questionnaires; the reviewer and the case officer by URL.
5. **J5, small screens.** The form at 400 px; Questionnaires at 512 css px (1024 at 200 %).
6. **J6, case officer by screens, 1024 and 400.** Documents first (no date yet), then Agent view › The application › "Date the application is submitted" › Add (Day, Month, Year) › Save, then Documents again.
7. **Break.** A birth date of 2099-01-01; clearing the application date; a fact a rule compares with text, worked out as an age; a hostile key in the URL.
8. **Builder's walks re-run.** J-A6 9/9 and J-A6a 5/5 at 1440 and 1024.

## What held
* J1 by keyboard: Tab order toggle › three selects › button. Saved in **207 ms**; the row left. Data: one `derived_field` with the server's words "Age in whole years from Date Of Birth, on Application date." and one audit line naming the author.
* The J1 end (concept J-A6a): the Approver's Review shows "Calculated answer · Age in whole years from Date Of Birth, on Application date. · added · Immigration expert" (screenshot `j1-review-approver.png`, scratchpad).
* J3: tab B shows "person.… is already worked out: the rules read it as it is." under the form, and the database holds one value.
* J4: the reviewer and the Approver see "The configuration author adds it" and no button. By URL, the reviewer gets 403 and the case officer 403.
* J5: no sideways scroll at 400 px or 512 px, and axe (WCAG 2.2 A/AA) is clean on the row and form.
* J6: before, the age line reads `Age: answer "Date the application is submitted" first.` After the date is answered by screens (2.2 s including typing), it reads `Age 10 on 2026-11-07 (the application date)`, at 1024 and at 400 (no sideways scroll). There was no page error on any journey.
* A key `<script>` in the URL gets 404 in words; nothing is rendered.

## Findings
* **Major.** A fact compared with `eq "alone"` was accepted as an age (201), and the review problems list does not flag it. The rule can never be true (`api/src/worked-out.ts:77-78`; review M1).
* **Minor.** After the save, focus falls to `<body>` and there is no confirmation (`web/src/components/rule-facts.tsx:88-90`; review m1).
* **Minor.** With a 2099 birth date (saved, flagged by the existing B-M2 check), the age line reads `Age: answer "The person's date of birth" first.` instead of "check …" (review m2).
* **Minor.** J2: the empty "Choose a date…" snaps back to Date of birth, so the empty choice cannot be made (review m6). The server refusal for an empty From exists but cannot be reached from the screen.
* **Note.** Clearing the application date with an empty value is refused (400) by the existing answer route. The concept's "Clear the application date" step was therefore checked only as "no date yet" (J6 before). Not this row's code.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 and J6 done by screens; C6.4 30/30 |
| Next step obvious | ½ | Defaults pre-filled and "It will read" before saving; after the save nothing points to Review or release |
| Plain words | ½ | §5 copy exact; keys in some refusals and on the row ("reads person.age_years"); "Date Of Birth" casing comes from the library label |
| Feedback and state | ½ | Refusals under the form with focus; no save confirmation; the age line misleads for a flagged birth date |
| Correct data | ½ | One value, audit, race-safe; a wrong-type fact is accepted (Major) |
| Error recovery | 1 | Two tabs, parallel adds and wrong role all refused in words |
| Accessibility and screen sizes | ½ | axe clean, 400/1024/1440/200 % fine, keyboard path complete; focus lost after the save |
| Speed | 1 | Save 207 ms; the date dialog is instant |
| Visual quality | 1 | Team components; calm row form (`walk/author-1440-01-work-out-form.png`) |
| Trust and sources | 1 | Sample, US$0, the age names its date, the Review line needs the immigration expert, Guide 5256 quoted |

**7.5/10: not a pass (needs 8 and no 0).** The fixes that raise it, most valuable first:
1. Refuse non-numeric facts (correct data → 1).
2. Focus and a status line after the save (feedback, accessibility → 1).
3. "check …" for a flagged birth date.

## Not tested
A real screen reader. An intended user's unaided walk (D17, D20: the founder). Timings on the Mac. The fixture-run C6.4.
