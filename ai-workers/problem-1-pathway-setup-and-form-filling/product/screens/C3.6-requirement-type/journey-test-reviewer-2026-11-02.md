# Journey test (reviewer): C3.6, a document type named while adding a requirement

Commit cc83cbdb. Isolated copy `forms_c36r` on :4457, after Demo › Reset to the six. Combination: "With an LMIA – inside Canada". Date: 2 Nov.
Headless Playwright (Chromium) with axe; data read with psql. US$0.
Screenshots are kept outside the repository (not committed).

## Journeys
1. **Main (configuration author, user-A).** Goal: "this combination needs a hotel booking document the library lacks."
   - Steps: Documents › Add a document › leave "(a new type)" › type "Proof of hotel booking (Sample)" › Save to draft.
   - Expected: it waits for a second person; no type and no line are written.
2. **Hand-off (approver, user-B).** To review › Proposals › the combination's group › Open › Accept.
   - Expected: a DRAFT type with its ADD waiting.
3. **Back to the author.** Documents › Add a document › choose the new type from the select › Save.
   - Expected: the line is added.
4. **Error.** The same name again while it waits.
   - Expected: refused in words; the dialog stays open.
5. **Wrong role (user-C).** Expected: no Add button; the server answers 403.
6. **Alternate names.** Accented ("Relevé bancaire"), 80 characters, non-Latin ("银行对账单"), letter-case variant; the same name from another combination.
7. **Race.** Four saves of one name at once.
8. **Edit.** An existing line edited to "(a new type)" with a name (PATCH).
9. **Keyboard and screen sizes.** Keyboard-only main path; 400, 1024 and 1440 px.

## What held
- J1: the dialog opened in 110 ms. Save to toast took 289 ms. The toast read: "Proof of hotel booking (Sample)" waits for a second person on To review › Proposals. Add the line with it once it is accepted.
  - The dialog closed. No line was written. Exactly 1 proposal: rules, Check.
- J2: the item sits in the combination's group: "Document type · Rules · New library item".
  - Its reason: "Named by a person while adding a document requirement: a second person checks the name and what it proves".
  - Accepting it landed `proof_of_hotel_booking_sample` as DRAFT, with its ADD WAITING.
- J3: the new type is in the dialog's select, and the line was added (1 row). Not a dead end.
- J4: refused in words, "already waiting on To review › Proposals: decide it there, then add the line with it". The dialog stays open.
- J5: no Add button for user-C; the API answers 403.
- J7: 202, 409, 409, 409: one proposal.
- J9: axe found 0 problems on the dialog. No sideways scroll at 400, 1024 or 1440 px.
  - Keyboard: Tab reaches the name field and Save; Enter proposes.
  - No page errors. The console shows only the expected 409.

## Findings
- **Major (correct data).** J6 produced duplicate types. Details in review.md M1.
  - "Relevé bancaire" from a second combination lands `releve_bancaire_2`, so two types share one name.
  - "Hotel voucher" and "hotel  VOUCHER" both wait.
  - The same name re-added on the same combination after acceptance is refused with "Proposal 1 (document_type) is already in the library as releve_bancaire …", which is not plain words.
- **Minor (next step).** The line's whose, mode, condition and source quote are lost when the dialog closes on a wait.
  - The instruction toast lasts 4.5 s.
  - Nothing tells the author when the type is accepted, and there is no link to To review.
- **Minor (feedback).** J8: PATCH answers 200 "waiting … Add the line with it", but the line already exists and keeps its old type.
- **Minor (trust).** The second person reads "What it means: Asked for by a document requirement on "<combination>"", which is filler, and "IRCC's words: No quote" even when the author typed a source quote.
- **Note.** After a save, focus lands on the page body, not the Add button. This happens on the normal add path too, so it is not caused by this change.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 to J3 end to end: proposal, accept, line |
| Next step obvious | ½ | The toast says what to do, but there is no link or return path, and the line is typed again |
| Plain words | ½ | Toast, hint and 409 are plain; the accented or long-name 409 shows a key and "Proposal 1 (document_type)" |
| Feedback and state | ½ | The toast is right; it goes after 4.5 s; the edit message is wrong (J8) |
| Correct data | ½ | Correct on the main path; duplicates on case, accents and another combination (J6) |
| Error recovery | ½ | A 409 keeps the dialog; a wait drops the line's details |
| Accessibility and screen sizes | 1 | axe 0; 400, 1024 and 1440 px; keyboard path |
| Speed | 1 | 289 ms to save |
| Visual quality | 1 | One hint line; the dialog is unchanged at 400 px |
| Trust and sources | ½ | Marked Rules and Sample; "What it means" is filler; the typed quote is dropped |
| **Total** | **7/10** | **Below 8: not a pass** |

## Fixes that would raise the score (most valuable first)
1. Duplicates: normalised-name reuse and waiting checks, and a `proves` without the combination name (Correct data, Plain words, Trust).
2. Keep or reuse the line's details after a wait, and add a link to To review (Next step, Error recovery).
3. Edit-path wording for PATCH (Feedback).

## Not tested
- A real screen reader.
- A headed browser walk.
- 200 % zoom beyond the 400 px width.
- An intended user's unaided walk (D17 and D20 stay with the founder).
