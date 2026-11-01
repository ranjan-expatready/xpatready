# Journey test (reviewer): C3.6 "Add the fact this rule needs", round 2, commit e539a616

Reviewer agent (did not build it). Isolated copy `rev_c36r2` on :4456 (fixture `wp.family`, stopped after); :4400 not touched; no model calls (US$0). Scripts and screenshots are outside the repo (`/tmp/rev_c36r2/`).

## Journeys
1. **Main (author):** Questionnaires › "Add a fact a rule needs" › pick rule › name, about whom, type, meaning › Propose › "Proposed as person.…" with focus on "Open Proposals". Held (keyboard only, 1024 px).
2. **Near duplicate:** "Name of the visa officer" is refused as close to "Name". The reason field appears; with a reason it is proposed (201). Held, but focus falls to `<body>` after the refusal.
3. **Approver accepts:** user-B accepts on the queue and the field lands DRAFT, "Needed by Rule R-05: …". Held.
4. **Approver edits at accept** (label and about-whom changed to a sponsor fact): it landed as `person.visa_refused_before`, label "Sponsor's earlier refusal", subject PERSON. **Wrong data.**
5. **Name of a retired field:** retire `person.biometrics_required`, then propose "Biometrics required": 201 with key `person.biometrics_required`. Accept gives 409 "already in the library (added since it was proposed)". That message is untrue and the proposal can never land. **Dead end.**
6. **Two names, one built key:** "Résumé gap" (R-03) and "Resume gap" (R-04) both give 201 with the same key `person.resume_gap`. The first accept lands; the second gets 409 for good.
7. **Parallel adds, same combination** (3×): 201, 409, 409. Held (the round-1 M2 is fixed).
8. **Parallel adds, two combinations** (wp.family R-07, vv.single with a probe rule; same label, 3× each): 201 on both, giving **2 waiting proposals with one identity**.
9. **Wrong role:** user-B sees no form (canAuthor). On the API, a valid rule gets 403 and an unknown rule gets 404. Held.
10. **400 px with the form open:** the panel wraps. The page scrolls sideways (474 px), but the cause is the page header/tabs, not this panel (elements over 400 px are all outside `[data-rule-facts]`).

## Automated and data
* Acceptance `check_forms_c36_acceptance.ts` on my copy: 17/17.
* Each accept checked in SQL: one row, values as entered, except journey 4.
* axe WCAG 2.2 AA on the open new-fact form: 0 violations.
* Every control has a label. No `aria-invalid` or `aria-describedby` on the refused field.
* Console: only the expected 400 of the near-duplicate refusal.
* Propose answers well under 1 s.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J3 reach the library through the product's own screens, no SQL |
| Next step obvious | ½ | one select of 108 rules, each up to 300 characters, no grouping |
| Plain words | 1 | messages in words; Sample and "not meaning-checked" stated |
| Feedback and state | 1 | role=status done line, link focused; reason field appears on "close to" |
| Correct data | ½ | J4 an edit's subject and name are ignored for the key; J8 duplicate waiting items |
| Error recovery | ½ | J5/J6: a false 409 and no way to land; the only way out is reject and propose again |
| Accessibility and screen sizes | ½ | axe clean, labels OK; focus lost to body after a refusal; no field-level error link |
| Speed | 1 | sub-second |
| Visual quality | 1 | team controls, wraps at 400 px |
| Trust and sources | 1 | origin rules, Sample, "Needed by rule …" source |

**8/10, pass (no 0).** Most valuable fixes: (1) build the key at landing from the item's own subject and name, not a frozen `work.ruleFact`; this fixes J4–J6. (2) Lock on the same scope as the waiting check (J8). (3) Focus the reason field, or the error, after a refusal.

Could not test: a real screen reader; an intended user's unaided walk (D17/D20 stay with the founder).
