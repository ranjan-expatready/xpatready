# Journey test (reviewer role): QA-165's last two (Taiwan PIN, National Israeli passport), local commit 07efe1897, 8 Nov 2026

**Copy.** The builder's forms copy on :4452 (database `xr_studio_tw`). It was reset and the configured checkpoint loaded by `tests/check_qa165_taiwan_israel_api.ts`. Live AI was off (US$0).

**How it was walked.**
- A headless Playwright walk by role and label, at 1440, 1024 and 400 px. No visible browser pane was available in this session.
- API and database reads of the data underneath.
- A break-it pass on the country answer.

**Evidence.** Screenshots are in the session scratchpad and are not committed (`…/scratchpad/shots/`):
- `author-questionnaires-*.png`
- `client-person-details-{1440,1024,400}.png`

## Journeys
1. **Main path: a client with an Indian passport (the Sample family).** Expected: neither question is asked, neither form field is written, and IMM 5257 is ready.
2. **Alternate: a client with a Taiwanese passport (TWN).** Expected: only the Taiwan question is asked. Readiness waits on it. A Yes is written Y.
3. **Alternate: the same client changes to an Israeli passport (ISR).** Expected: the Taiwan question hides again, and its answer is kept but not used. The Israel question is asked. A No is written N.
4. **Hand-off: the officer's Forms card and a generated copy.** Expected: the copy's values match the answers.
5. **Author: Visitor visa › Smart questionnaire (SQR) › Personal details.** Expected: the "Only if" column says when each question is asked, in plain words.
6. **Author: the B116 door's Undo on the Taiwan form field.** Expected: the form field goes back to nothing filling it.
7. **Break it: the client types the country as "isr" or "Israel"** in the free-text box (`web/src/runtime/questionnaire.tsx:66`: a `country` question with no options is a text box).

## What held
- **Journeys 1 to 3: 9/9 on the API check.** Only the right question is shown for IND, TWN and ISR. Written: nothing, then Y, then N in the Israel field with the Taiwan field empty.
- **The client screen.** For an ISR passport, the client's own Personal details part shows the Israel Yes/No under the passport fields. The Taiwan question is absent. No sideways scroll at 1440, 1024 or 400 px, and no page errors.
- **The hidden Taiwan answer is kept.** The questionnaire API still returns `value: true` (confirmed) with `hidden: true`. The copy leaves the Taiwan field empty, and readiness does not wait on it.
- **Journey 6.** Undo returns the form field to `unresolved` with no words (201).
- **Grounding.** Removing any one of the three agreements in `askedWhenGround` makes R7 fail (35/36 each):
  - the fact check
  - the country-label check
  - the rule lookup

  Removing `scriptWords` also fails R7. Each was tested on a scratch copy, never in the repo.

## Findings
- **Major: "isr" gives Ready over a form field the form's own script requires** (Journey 7).
  - The question condition is `eq "ISR"`, compared exactly. The map's `code_list` step matches the case-insensitive country code: "isr" is written as 206.
  - With "isr", the generated copy holds `CountryofIssue = 206` and no `IsraelPassportIndicator`, while the Israel question is hidden.
  - IMM 5257's Forms readiness says `ready: true` with nothing open, because `engine/runtime/mandatory.ts:63` skips a field B86 calls "not needed" after the script rule at line 61 has required it.
  - Before this change, the same answer listed the Israel field as left empty. "Israel" (a name, not a code) is still said honestly: the country field is listed as left empty.
- **Major: the author's "Only if" text shows an internal form path and a fact key.**
  - The SQR row reads: "Only if Asked only when the passport's country or territory of issue is Israel (IMM 5257's own script: its own script requires it only when form1[0].Page2[0].MaritalStatus[0].SectionA[0].Passport[0].CountryofIssue[0].CountryofIssue[0] holds 206, … which the map fills from person.passport_country_of_issue)".
  - This breaks `EXPERIENCE.md` line 46 [M] (no IDs or paths on the main path), and "own script: its own script" is doubled. Source: step 230, `conditionPlain`.
- **Minor: test naming.** The client reads the field's meaning ("Whether, for this trip, the person will use …"), not the form's printed question. This is the same as the earlier B116 questions, so it is not new here. But T3's name says the hidden answer "is kept", and the check does not assert it (it held when I read it).

## Score (journey score, `QUALITY.md`)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1 to 3 pass end to end (9/9), and the client screen shows the right question |
| Next step obvious | 1 | For TWN, readiness waits on the question ("needs an answer"), not on an unexplained empty field |
| Plain words | ½ | The author's "Only if" shows a raw form path and a fact key (Major 2) |
| Feedback and state | 1 | A hidden answer is kept and not used; the question shows and hides with the country |
| Correct data | ½ | "isr" writes 206 with the Israel field empty, and readiness says Ready (Major 1) |
| Error recovery | ½ | Changing the country back recovers. A mistyped country gives no warning and a false Ready |
| Accessibility and screen sizes | ½ | No sideways scroll at 400, 1024 or 1440 px. No axe run and no keyboard-only walk |
| Speed | 1 | The client part loads in about 0.7 s after my fixed 1.5 s waits are taken off; no request per row seen |
| Visual quality | 1 | The new Yes/No matches its neighbours (`client-person-details-1024.png`) |
| Trust and sources | 1 | The condition is grounded in the form's script, country list and saved text, and labelled Sample |
| **Total** | **8/10** | Pass by the journey bar (8, no 0), with 2 Majors open for the review verdict |

**Could not test:**
- a real screen reader or axe
- an intended user's unaided walk (D17 and D20 stay with the founder)
- the Taiwan "Only if" row after Undo: Undo removed it from the questionnaire, as expected
