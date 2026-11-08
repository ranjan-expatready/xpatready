# Journey test (reviewer role): QA-165 gate follow-ups, #1318 at bc9080638, 8 Nov 2026

**Copy.** rv165 on :4456, with a fresh Reset and Load of the configured checkpoint. Live AI was off (US$0).
**How it was walked.** A headless Playwright walk at 1440 px, then 1024 px and 400 px (`acceptance/lib/browser.ts`), plus API reads of the data underneath. There was no visible browser pane in this session, so the steps were run as a person would, by role and label, not by watching a screen.
**Evidence.** Screenshots are in the session scratchpad and are not committed (`…/scratchpad/rv/shots/`):
- 1–9: the client's three parts
- 10–12: the officer's IMM 5257 card (1440 px and 1024 px) and the IMM 5257 SCH1 card
- 13: Ready to file

## Journeys
1. **Main path: the client, who has none of these documents.** Goal: "I have no other name, no national ID, no green card."
   - Steps: open each part (Personal details, National identity document, US PR card), answer No (once with the keyboard: focus No, then Space), then Save and continue.
   - Expected: no details are asked, and the answer is saved.
2. **Alternate: the client picks Yes, then changes to No before saving.** Expected: no details are left behind.
3. **Hand-off: the officer opens Forms › IMM 5257 and Ready to file.** Expected: the 3 Yes/No boxes are written N, and readiness tells the truth.
4. **Error: the officer tries to lock a copy that readiness holds back.** Tried on IMM 5257 SCH1, a PDF upload. Expected: a refusal that says how to fix it.
5. **Data underneath:**
   - the answers are saved once, as DECLARED
   - the 8 follow-ups are `hidden=true`
   - the generated PDF holds N, N, N (read from the XFA data)
   - the 46-box count is run

## What held
- Journey 1:
  - Each part shows only its Yes/No question.
  - After No and Save, the part reopens with no details (screenshots 3, 6, 9).
  - The answers are saved as `false` (DECLARED).
  - All 8 follow-ups are hidden: other names, the 4 national ID details, and the 2 green card details.
- Journey 2: before saving, picking Yes shows no details live. They appear only after Save, which is pre-existing questionnaire behaviour. No then leaves nothing behind.
- Journey 5:
  - AliasNameIndicator, natIDIndicator and usCardIndicator are written "N".
  - 44 of the 46 mandatory boxes are written, including citizenship, country of birth, native language and the Employment row.
  - Readiness lists both of the empty boxes.
- Accessibility and screen sizes:
  - axe (WCAG 2.2 A and AA) found 0 violations on the Forms tab.
  - No sideways scroll at 1440, 1024 or 400 px.
  - No page errors.
- Speed: prepare takes 0.33–0.65 s and forms 0.17–0.24 s.

## Findings
- **Major: false "not ready".**
  - IMM 5257 says "2 facts to answer or confirm before filing" for the Taiwan PIN and Israel passport boxes.
  - The form's own script requires these only for passport country 203 or 206. The Sample passport is 205.
  - Every IMM 5257 filing therefore carries a CRITICAL line that has to be passed (screenshot 13).
- **Major: lock is a dead end.**
  - Locking the SCH1 copy gives 409 with "5 facts to answer or confirm before filing: do that, then generate a new copy."
  - These are form fields that no question asks, or that are filled by hand. No screen can resolve them.
- **Minor: the card lists the same 2 lines twice** (screenshot 10), once under "Facts to answer or confirm" and again under "Marked mandatory on IRCC's form, still empty".
- **Minor: wrong question words.** The Taiwan and Israel lines read "Question 1d. Have you taken a test … English or French?". This is pre-existing in the map's caption, and is now also shown on Ready to file.
- **Not this row (pre-existing):** the client's question reads "Whether the person holds a national identity document". That is the field's meaning, not a question in the client's words.

## Break it (short pass)
- Double Save on No: one answer is kept.
- Reload in the middle of a part: the answer is kept.
- A wrong role on the officer API was not retried here; this row changes no permission.
- Lock while readiness holds the form back: refused, which is correct, but the words are wrong (above).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | The client's No path works and N is written. The officer's form cannot reach ready or be locked. |
| Next step obvious | ½ | "No question asks it yet" gives the reason but not the next step |
| Plain words | ½ | Form fields are called "facts"; another question's caption is shown |
| Feedback and state | ½ | "Saved" is shown and the details are hidden; but readiness is falsely "not ready" |
| Correct data | 1 | N, N, N written; 44/46 boxes; no "SAMPLE" in a list box |
| Error recovery | 0 | The lock refusal has no way out, and its advice does not work |
| Accessibility and screen sizes | 1 | axe 0; no sideways scroll at 1440, 1024 or 400 px; keyboard No works |
| Speed | 1 | Under 1 s |
| Visual quality | ½ | The same lines twice on one card; long CRITICAL lines |
| Trust and sources | ½ | Conditions are marked Sample with the field's own words; the cited section B wording is not in the PR yet |
| **Total** | **6.5 / 10** | **Fail: below 8, and one criterion is 0** |

Fixes that would raise the score, most valuable first:
1. Do not count a box that the form makes conditional when its condition does not hold (error recovery, task completed, feedback).
2. Give "left empty on the form" its own words in the pill, the list and the lock 409, and list each line once (words, next step, visual).
3. Put the section B wording in the PR (trust).

**Not tested:** a real screen reader; an intended user's unaided walk (D17 and D20 stay with the founder); Adobe Validate.
