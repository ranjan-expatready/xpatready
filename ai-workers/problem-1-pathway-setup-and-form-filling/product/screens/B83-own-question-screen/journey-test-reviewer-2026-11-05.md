# B83 journey test: "Ask as its own question" (reviewer, 5 Nov, head 0aff0e0b4)

Isolated copy on :4442 (rebuilt fresh for each run), Chrome through Playwright, 1440 px unless stated, walked by screenshots and read as a person would. Setup through the people's steps (`tests/b83_six_steps.ts apply`; `finish` where the walk needs placement). US$0: no `*_LIVE`, no priced button. Copy stopped and dropped afterwards.

## Journeys and results
| # | Persona, goal | Result |
|---|---|---|
| 1 | Author: "the form asks this itself, so ask it" (Smart questionnaire line → Form fields → three new fields) | **Works.** The line reads "IMM 5257 works out 3 Yes/No answers from other answers"; the link lands on the section with the keyboard there. The form's words are shown, and the rows flip to "Asked as". |
| 2 | Same, keyboard only | **Works.** Tab, Enter, arrow keys and typing complete an ask; focus moves to the next row's button. Reaching the line takes 50 tabs. Focus falls to BODY after any Undo (F7). |
| 3 | Author: pick a library field | **Works.** The picker shows name and meaning, with nothing chosen. No library change is made. "Criminal History" can be picked for the alias question: the reason is the only control, and Undo is the recovery (as the concept says). |
| 4 | Author, errors: empty, short reason, no field, "!!!", near name, name of a non-Yes/No field | Each is refused in words, on the form, with focus on the message and no key shown. The near-name box appears after the refusal. One refusal gives a wrong next step (F6). |
| 5 | Wrong role: Approver, SME reader, case officer, client by URL; no person | The Approver and SME read the section with no button and "A configuration author asks these". Case officer and client do not get the section. Route: 401 with no person, 403 for case officer and client on the line's GET; the Approver's 403 on undo is proven by `check_b52`. |
| 6 | Recovery: double click, reload, two tabs, stale Undo | Double click makes one field, one change, one row. Reload keeps the state. **Stale toast Undo fails silently and stale rows do not refresh** (F2, F5). |
| 7 | Toast Undo | **Row and data go back, but the person is told nothing;** the "kept" message is lost (F2). |
| 8 | Undo after placement | **Question left placed with no word** (F3). |
| 9 | Boundary: placement, second person, Draft questions and documents | Asking after placement raises one gap (0 → 1), and "Ask them" is offered. The Approver sees "Has national ID" with the author's reason on To review. Saved conditions landed on all three questions (4 condition items). C4.11 pack 23/24: only G5 fails, known. |
| 10 | Page title: nothing undecided, loading, failed load, wrong id | Loaded with nothing undecided: right. **Loading, failed load and wrong id all say "Decided"** (F1). |

## Automated replay
Builder's `check_b83` 24/24 and `check_b52` 66/66 on fresh copies. My axe runs (WCAG 2.2 A/AA) were clean on: whole page at landing, form open at 400, 1024 and 720 × 450 (200 % zoom), asked, Approver, applied draft's page. No sideways scroll at those widths with a form open, including a long non-English name. Times: line's GET 64 ms; save to row 189–366 ms; focus move about 235 ms more; line shown about 1 s after navigation.

## Data underneath
The three rows point at the new keys and keep their `derived:` transform. Evidence quote = the form's question. `source_ref` cites the edition, page, quote, file and saved date. Each new field has one APPROVED library change after the steps (plus one WITHDRAWN from the walk's undo). Reason text is what the person typed. After undo the row reads its first named fact, and a new field is withdrawn. Audit lines themselves were not read back in this run.

## Findings (full text and fixes: `review.md`)
Majors F1 false "Decided" · F2 toast Undo silent · F3 undo leaves a placed question with no word · F4 BR-8 has no test. Minors F5 conflict refresh · F6 same-name dead end · F7 focus after Undo · F8 rows reorder · F9 read-only words during slow or failed session · F10 evidence and test gaps · F11 near-name example · F12 To review link for the author.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1, 3, 9: asked through the screen, conditions land |
| Next step obvious | ½ | Toast names the next step with no link; the line sits about 1,150 px down, under a long red gap box; rows reorder after each save (F8) |
| Plain words | 1 | No key or path on the main path; refusals in words (one wrong next step is scored under recovery) |
| Feedback and state | ½ | F1 false "Decided"; F2 no feedback on toast Undo; F3 |
| Correct data | ½ | Ask is exact; after undo a placed question stays with no word (F3) |
| Error recovery | ½ | The form's errors are good; F2, F5, F6 dead ends until a reload |
| Accessibility and screen sizes | ½ | axe clean, 400, 1024 and 200 % clean, keyboard path complete; focus lost after Undo (F7) |
| Speed | 1 | Under 400 ms for a save |
| Visual quality | 1 | Team look, calm section, wraps well (`walk/`, my 16-after-finish) |
| Trust and sources | 1 | The form's words, page, dated citation; a second person for a new field |

**Score: 7.5 / 10. Fail** (pass is 8 with no 0; none at 0). Most valuable fixes: F1, F2, F3 raise feedback, data and recovery to 1, giving 9 with F7 and F8.

## Not tested
A real screen reader. An intended user's unaided walk (D17, D20 stay with the founder). A real browser window driven by hand: I walked through Playwright and read screenshots. Undo and withdraw under races: the separate breaker's.
