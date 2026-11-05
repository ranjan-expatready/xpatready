# B88 journey test, reviewer, 5 Nov 2026 (commit 2d85215f3)

How it was run: my own isolated copies on :4456 and :4457 (forms range), Chrome through Playwright, headless, with a screenshot at each decision point, kept in the reviewer's scratchpad and not committed. The people are simulated (`xr-actor`): the author is user-A, the approver user-B, the content reviewer user-C. Saved answers only: US$0.

## Journeys (written from concept §1, §3, §4 before walking)
1. **Main path (author, then approver).** The author is on Study permit, whose own author did nothing, and wants to release despite the Hiding error Visitor visa's condition put there. Steps: Review and release → "Form fields that read this answer" → "Asks the same question" on IMM 1294's Yes/No (keyboard) → Waiting → Open on To review. The approver opens To review, reads the line, opens the card and clicks Approve. Expected: the form field reads "Has used other name" with Y/N, and the Hiding error is gone after B86's button on the family name.
2. **Way back (author).** Undo on the "Asks its deciding question" row (keyboard) → waiting → the approver returns it with a reason → the author withdraws it. Expected: the ask stays in force and the records say so.
3. **Recovery: Undo approved.** On Spouse, IMM 1344's co-signer box: Undo approved. Expected: the step is restored exactly, the Hiding error comes back, and BR-10's warning shows.
4. **Wrong role.** The author tries to approve their own change; a content reviewer opens the panel or posts. Expected: no Approve button, and 403 in words.
5. **Double click / two tabs.** Three Undo proposals at the same moment. Expected: exactly one waits, and the others get 409 in words.
6. **Bad input.** Ask and undo together; a plain form field asked; a worked-out Yes/No confirmed instead of asked; a question with no condition. Expected: 400/409 in words, nothing written (spread test).
7. **Sizes.** The panel at 1440, 1024, 512 (1024 at 200 % zoom) and 400 px. Expected: no sideways scroll.
8. **Across the boundary.** Release, then a client's form: Yes writes Y, No writes N, and the name is never written. Only the pure test covers this (`check_forms_b88_fill.ts`); I did not walk it.

## What held
* J1: the panel shows in 913 ms (373 ms warm). One Tab reaches the button, and the focus ring shows. One activation gives exactly one WAITING change. To review shows the line in words (625 ms). The approver approved through the page's own button, and the database then holds `person.has_used_other_name | derived:any(person.other_family_name, person.other_given_names) recorded -> yes_no_code:Y/N | HUMAN`. The builder's browser test, re-run, was 30/30, including the Hiding error gone and axe AA clean.
* J3: Undo approved → the co-signer box is "A worked-out Yes/No" again, with the warning "Its own words also say: … Ask it only if its deciding question is the whole condition (Sample, Unconfirmed: expert)", and Submit lists the Spouse Hiding error again.
* J4: the author's own card shows "You proposed this" and no Approve button. A reviewer gets 403 in words (spread test).
* J5: 201 / 409 / 409, with one WAITING row in the database.
* J6: every refusal is in words and writes nothing (spread test, 25/25).
* J7: no sideways scroll at any width; the 400 px layout reads well.
* Trust: the form's printed question comes from its reading; "Sample, Unconfirmed: expert" on the panel and the card.

## Findings (details and fixes in `review.md`)
* **Major: raw code `SET_FORM_FIELD_QUESTION` in the change page title**, including on the approver's page. Cause: `api/src/library-changes.ts:29` has no word for it.
* **Major: label-in-name (WCAG 2.5.3).** The button shows "Asks the same question" but is named "Asks the same as “…”"; Undo is named "Make … worked out from other answers again" (`form-field-conditions.tsx:49-50`). axe's `label-content-name-mismatch` flags it.
* **Major (J2): a false record.** After the Undo was returned and withdrawn, the first ask is still applied, yet its record reads `WITHDRAWN: Replaced by a later change of this form field.` and its page chip says "Released" (`form-field-condition.ts:71`, `review-items.tsx:70`).
* **Major: no test for the approval re-checks ("Changed since").** Removing them leaves every suite green.
* Minor: the deciding question's words are the field's long meaning, citing IMM 5257's page on other forms' cards. The returned page offers "Correct it and send it again" with Name and Meaning fields and "Withdraw the new field" (inherited from B86).

## Score (0 / ½ / 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | spread 25/25 on the six; J1 done through the page, approval included |
| Next step obvious | ½ | one button and a link to To review; a returned change lands on a form that cannot be sent again (m6) |
| Plain words | ½ | raw action code in the title (M1); a long meaning citing another form instead of the field's name (m1) |
| Feedback and state | ½ | Waiting, Asks its deciding question, Returned are all right; a live change shows "Released" (M3) |
| Correct data | ½ | exact steps, race-safe, Undo exact; the record of the replaced change is false (M3) |
| Error recovery | ½ | refusals in words, nothing written; the returned path is a dead-end form (m6) |
| Accessibility and screen sizes | ½ | keyboard path, axe AA, no sideways scroll at 400–1440 px; WCAG 2.5.3 fails (M2) |
| Speed | 1 | panel under 1 s, To review 625 ms |
| Visual quality | 1 | B86's card, team components, clean at 400 and 1440 px |
| Trust and sources | 1 | printed question from the form's reading, Sample, Unconfirmed: expert, a release line for the expert |
| **Total** | **7 / 10** | below the pass mark of 8, no criterion at 0 |

**Verdict: does not pass (7/10).** These fixes would raise the score, most valuable first: M3 (correct data, feedback) → M1 + m1 (plain words) → M2 (accessibility) → m6 (recovery, next step). With M1–M3 fixed, the score would reach about 8½.

## Could not test
A real screen reader; an intended user's unaided walk (D17/D20 stay with the founder); a full release record on the six; a client case filled end to end (journey 8, covered only by the pure fill test); real 200 % browser zoom (simulated as a 512 px viewport).

## Round 2: re-walk on 7ce4a9630 (diff only), same day
Fresh copies on :4456 and :4457. Re-runs: browser 47/47, spread 36/36, fill 31/31.

Journeys re-walked:
* **J2 (way back):** the author opens the new closed section "Form fields that follow a question's condition (2)" with the keyboard and presses "Undo: …". The approver returns it through the page with a reason. The ask goes back to APPROVED, and its chip reads "Approved · in the next release".
* **Wrong words:** the change title is "Change the question a form field asks: … asks "Has used other name" (Y when Yes, N when No)".
* **Accessibility:** WCAG 2.5.3 (`label-content-name-mismatch`) finds none; axe AA is clean; no sideways scroll at 1024, 512 and 400 px.
* **Speed and console:** the followers section shows in 386 ms with no console errors.

Break pass on the step-finding (tech lead's request; details in `review.md`): the 39 worked-out Yes/No form fields in the six's maps and the 147 Yes/No boxes in the readings.
* On the case path, no wrong value: QA-165 refuses every No that has a named detail recorded.
* **Major:** on the Studio's sample PDF fill (render coverage, no QA-165) the same step writes **Y** for a No. Shown with the fill test's made-up form. Not reachable today: Client A holds none of these facts.

| Criterion | Round 1 | Round 2 | Evidence |
|---|---|---|---|
| Task completed | 1 | 1 | spread 36/36; the walk done through the page |
| Next step obvious | ½ | 1 | Undo reachable once the problem is gone (followers section) |
| Plain words | ½ | 1 | title in words; deciding question by its name |
| Feedback and state | ½ | 1 | returned or withdrawn Undo leaves the ask "Approved · in the next release" |
| Correct data | ½ | ½ | records true and race-safe; R2-M1 (Y for a No on the sample fill) |
| Error recovery | ½ | ½ | refusals in words; a returned ask still lands on B86's "Correct it and send it again" form |
| Accessibility and screen sizes | ½ | 1 | 2.5.3 and AA clean, 400–1440 px |
| Speed | 1 | 1 | 386 ms |
| Visual quality | 1 | 1 | team components, followers section matches |
| Trust and sources | 1 | 1 | printed question, Sample, Unconfirmed: expert |
| **Total** | **7** | **8½ / 10** | passes the bar of 8; no criterion at 0 |

Round 2 verdict: **passes (8½/10)**. The review still blocks on R2-M1 (fixing it would raise "correct data" to 1).

## Round 3: R2-M1 fix only (9527f905f)
Differential test of the filler at 7ce4a9630 against 9527f905f: 600 cases, 4 differ. All 4 are the answer No with a named detail recorded, which before wrote Y and now goes to a person. Every other value is unchanged. "Correct data" rises from ½ to 1: **9 / 10** (passes; no criterion at 0). Not re-walked in the browser (no web change in this diff).
