# B88 — a worked-out Yes/No form field asks its form's own deciding question (QA-239, C4.11)

Base: B86's head d68a8b79a (#1053), stacked. US$0, live AI off. No board: tech lead approves after the independent challenge (P-223 (4)). Ruling: #1053 comment 6649004387 (3).

## 1. Job
A question's condition is library-wide (`question-condition.ts:43`). Accepting Visitor visa's conditions puts "Hiding a value a form reads" on every other combination whose forms read those questions. B86's door clears the plain form fields with words. **Job: on any combination, an author can clear the rest, the worked-out Yes/No form fields, by saying, with the form's printed question beside the deciding question's words, that the form field asks that deciding question; a second person approves; the form field then writes the person's own Yes/No and no longer reads the hidden value.** Personas: author, approver. Requirement: SA-1B-7 rule 3, P-322, P-303 (no rule relaxed).

## 2. Measured by route (fresh six at B86's head, US$0, people's steps; probe `tests/check_forms_b88_spread.ts` setup)
With **all 7 conditions Visitor visa's run proposes accepted and approved** (other family name, other given names, criminal history details, military service details, US card number and expiry, national ID number; the second military card left, it repeats the first):

| Combination | Hiding errors | Plain form fields (B86 door) | Worked-out Yes/No (this row) | Unreachable |
|---|---|---|---|---|
| Spouse | 2 | 4 | 2 (IMM 1344 sponsor, co-signer) | 0 |
| Express Entry | 7 | 13 | 2 (IMM 0008 DEP alias, national ID) | 0 |
| Study permit | 5 | 5 | 2 (IMM 1294 alias, national ID) | 0 |
| With an LMIA | 7 | 7 | 3 (IMM 5710 alias, national ID, US card) | 0 |
| With 1 condition (QA-239) | 1 / 2 / 1 / 1 | | | 0 |

**Unreachable: 0 by route,** with 1 or all conditions: every deciding question is already asked on each combination. So it is not named or built.

**The 9 worked-out Yes/No each print the deciding question itself** (form readings, `p1/inventory/*.inventory.json`): IMM 1294, IMM 5710, IMM 1344 (×2), IMM 0008 DEP "Have you ever used any other name (e.g. Nickname, maiden name, alias, etc.)?"; IMM 1294, IMM 5710, IMM 0008 DEP "Do you have a national identity document?"; IMM 5710 "Are you a lawful Permanent Resident of the United States with a valid alien registration card (green card)?". Each has the options No = N, Yes = Y. Their maps read the hidden detail (`person.other_family_name`, `person.national_id_number`, `person.us_green_card_number`) through free-text steps ("derive: Y if any other family or given name is recorded, else N") that the filler does not recognise, so today they go to the hand list anyway. **IMM 0008's own copy of the same question is already mapped straight to `person.has_used_other_name` with `yes_no_code:Y/N`** (the AI's map): this row gives the other 9 that same shape, through a person.

## 3. Business rules
* **BR-1 Only the deciding question, never typed.** The target is the deciding question of the question's own SHOW condition, read by the server: the condition must be `"<deciding>" is Yes` (`eq … true`), the deciding field must be a Yes/No library field about the same group (person, case). Any other condition (No, a value, all/any): 409 in words, nothing changed. No route takes a field from the browser.
* **BR-2 Only a worked-out Yes/No that prints a question.** The form field is mapped, its step is a worked-out Yes/No (B86's `isWorkedOutYesNo`), it reads this question, and the form's reading gives its printed question (`printedQuestion`, B52) and a Yes code and a No code among its options. Otherwise 409 in words (no printed question: "map it on its field map").
* **BR-3 Second person, one change per form field.** Same door and record as B86 (`form_field_condition` change, key edition:form field; one WAITING or RETURNED at a time), new action `SET_FORM_FIELD_QUESTION`. At approval it is checked again: the form field still reads that question with the same step, and the condition still has that deciding question; else 409 "changed since".
* **BR-4 What approval changes.** A draft version of the form field: reads the deciding Yes/No field, step `yes_no_code:<Yes code>/<No code>` from its own options (IMM 0008's shape), origin a person, the printed question as its evidence, the step it replaces kept on the change. Nothing else in the map moves.
* **BR-5 The rule stays as strict (P-303).** `engine/validate.ts` is not touched. The Hiding error clears only because this form field no longer reads the hidden value; the plain form fields still need B86's confirmation, and any other reader still refuses.
* **BR-6 The fill.** The form field writes the person's own confirmed Yes/No (Y or N) and never the hidden detail; a No writes N. Hidden details are not "recorded" (B86 BR-5b) and the plain fields holding the condition are left empty when No (B86 BR-5).
* **BR-7 Way back.** The panel keeps the form field under the question it used to read, as "Asks its deciding question", with Undo: the same door, a second person, restores the step it replaced (BR-4). Undo is refused when the form field changed since.
* **BR-8 Visible at release and to others.** The change summary lists it as B86's are; the second person's line names how many other combinations file that form (all of them get it, every edition is its own form field).
* **BR-9 Sample.** The decision is "this form field asks the same question", Sample, Unconfirmed: expert (AGENTS rule 4).

## 4. Layout (no new page: one more action on B86's existing row)
```
IMM 1294 (06-2026) · Question 2 A Have you ever used any other name…?
  The form asks: "a) Have you ever used any other name (e.g. Nickname, maiden name, alias, etc.)?"
  Asked here as: "Has used other name" (the condition's deciding question)
  A worked-out Yes/No      [ Asks the same as “Has used other name” ]
```
After: "Waiting for a second person" (link to To review) → "Asks its deciding question" (Undo). The to-review card shows the printed question, the deciding question, and "Writes Y when Yes, N when No". Keyboard, one button per row, axe clean at 1440 px.

## 5. Copy
Button: "Asks the same as “X”". Tooltip line: "This Yes/No prints the deciding question itself: asked as that question, it writes the person's own answer, Y or N, and the hidden answer is never read." Refusals (BR-1, BR-2) as listed in the code, each saying nothing changed.

## 6. Contract and tests
`GET /combinations/:id/questions/:fact/form-fields` rows gain `asks: { printed, deciding, deciding_field } | null` and `can_ask`; state `asked` (with `can_undo`). `POST /library/form-field-conditions` gains `ask: true` (and `clear: true` on an `asked` row). Tests: `tests/check_forms_b88_spread.ts` (Done when on the six: every other combination's Hiding cleared by product steps; before that, refused; list sha unmoved; US$0), `tests/check_forms_b88_door.ts` (BR-1 to BR-4, BR-7 pass and fail, 401/403/404/409, the fill: Yes → Y, No → N, the name never written).

## 6b. P-319: the ask-as-own-question table is data
`api/src/own-yes-no.ts` `OWN_YES_NO` (combination and form numbers in code) moves to `samples/own-yes-no.json` with the same words and paths; the module reads it. The packs and the checkpoint read the same table, so the list `vv.single-ae2133b8a398` cannot move (pinned by B86's test).

## 7. Question for the tech lead (recommendation first)
1. **Second person or direct?** B52's own-question is direct for a field the library has. **Recommend a second person** (BR-3): this changes what a shared form writes for every combination filing it, as B86's does, and keeps one record and one Undo per form field.
2. **Pack step.** Recommend qa adds `C4.11-27 pass` on the six: with the conditions accepted on Visitor visa, each other combination's Hiding errors are cleared by B86's and B88's routes. Until qa's OK it lives in `check_forms_b88_spread.ts`.

## Not built
Bulk ask; parsing the AI's step text; a door for conditions decided by No or by a value (none measured); Unreachable (0 by route).
