# B83 concept: "Ask as its own question" on the Form fields page

Row: #967's follow-up 1 (Lead 10, 5 Nov). Capability C4.11 (its Yes/No questions on the six), P-322. No board: the tech lead approves after an independent challenge (P-223 (4)).

## 1. Job and journey
A configuration author, setting up a combination on the six, makes a form's Yes/No form field a question of its own, in the form's words. Today only the route does this (#967, `POST /editions/:id/form-fields/own-question`): the checkpoint and the packs call it, and a person cannot. Journey: Forms (apply the field map) → **this step** → Smart questionnaire "Ask them in their forms' sections" → Draft questions and documents, whose saved conditions then land on those questions (C4.11 step 5).

## 2. What exists, what is new
| Layer | Exists | New |
|---|---|---|
| Rules, record | `api/src/own-question.ts`: refusals, second person for a new field, the form's words cited | **A form field with no named facts is refused** (BR-1); undo (BR-9); near-name check (BR-5); refusal words without keys (M5). Withdrawing a waiting new field puts an own-question row back to worked out (`library-changes.ts`, BR-10) |
| API | POST own-question; GET `/editions/:id/form-fields/own-questions` | POST `…/own-question/undo`; GET rows gain `can_ask`, `why_not`, `worked_out_from_names`, `asked_as {name, waiting, change_id}`; `yes_no_fields {key, name, meaning}`; POST returns `name`. GET `/combinations/:id/own-questions`: editions with form fields that can be asked and are not, with counts. Shapes in `contracts/` (STANDARDS §6) |
| Screen | `FormFieldDecisions` (K1), on `/review/form-fields/:id` and an applied draft's page | a second section; one line on the Smart questionnaire tab; the page's title and chip change when nothing is undecided |
| Migration | none needed | none |

## 3. Business rules (each with a pass and a fail test)
* BR-1 Only a form field whose "worked out" step **names the facts** is offered: the QA-165 check needs them. IMM 5257's Questions 8 A and 9 A name none (`worked_out_from: []`): they are listed with no button and "It cannot be checked against the answers it is worked out from yet", and the route refuses in the same words. **This also closes a gap in #967:** on those two a confirmed No with rows recorded would write N. Source: QA-165, challenge B2.
* BR-2 Only the author acts (`need("author")`, shown by `canAuthor`, not by the page's review `readOnly`, which the Approver also passes). Anyone else with the page reads it.
* BR-3 The words shown and cited are the form's (`printedQuestion`); with none, no action, only the reason. P-170, #967 M2.
* BR-4 A Yes/No library field, or a new one with a name and meaning; never a typed key. A new one waits for a second person. BR-7, P-53, P-34.
* BR-5 A name the library holds is refused, and the form offers that field. A **near** name needs a one-line reason (C3.6's `nearLabels`). P-149 (2).
* BR-6 "Why" is the person's own words, 8 characters or more, and **starts empty** for the first row: it is the only control on a library pick (challenge M3). After a save the next row starts with what that person just typed.
* BR-7 The form field keeps its "worked out" check (a No with a detail recorded is never written). QA-165.
* BR-8 **When it counts:** a form field never asked holds nothing. The row needs no decision, so it adds no "Form fields" item to To review. But once one is asked, "Ask them in their forms' sections" must be pressed, or release is held (`validate.ts`, nobody is asked for it), and a waiting new field holds release until approved or withdrawn, like every new shared field. A released combination keeps its release; the change counts from the next one. The section, the toast and the row say so (review F4).
* BR-9 **Undo (EXPERIENCE §2.8 [M]):** the author can take it back, on the row and in the toast, with the same locks. The form field reads its first named fact again; a fact retired since is refused in words (breaker m1). A row released under the undo or under an ask is frozen: refused in words, never rewritten or deleted (breaker B1). A new field still waiting with nothing else reading it is withdrawn with it, the check and the withdrawal one step under the field's lock (breaker M2). "Nothing else" is one list, `fieldReaders` in `api/src/where-used.ts`: form fields, another row's step, rules, conditions of forms, document lines and questions, checks, fact sources, worked-out values, a document type's facts, waiting changes and waiting drafts (breaker M1). When something does, the field stays and the words name it. An approved field stays in the library. A question already placed stays too: the words name its sections and where to remove it (review F3). The result is said on the row, whichever Undo was pressed (review F2).
* BR-10 Withdrawing a waiting new field on To review puts an own-question row back to worked out, never "unresolved" (which would lose the QA-165 check and hold release); a draft that only held this ask goes, so a release sees no change (breaker M3); with its named fact retired, the row goes to "no decision", which To review lists.
* BR-11 **Withdrawing while something reads the field (tech lead's ruling on breaker M5):** To review's withdraw is not refused: a rule fact (C3.6) is read by its rule by design, and a refusal would stop an author withdrawing one. But a reader is never left broken silently: the page names the readers before the press, the answer names them after it, and each one in a draft holds Submit and release by its own name and the field's name, never a key (`withdrawnFieldLines` in `engine/validate.ts`), until it is changed. Form fields are not among them: the withdrawal puts those right itself.

## 4. Layout (an inline section on a page that exists, EXPERIENCE §3; no new page)
**Where the button sits.** A new section under "Form fields with no decision", inside `FormFieldDecisions`, so it shows on To review › Form fields and on the applied draft's page. Left out when the edition has no such form field.

```
Yes/No form fields worked out from other answers (5)                     ← h2
The form asks these itself, but its field map works the answer out from other answers, so nobody is asked
and conditions cannot rest on them. Ask one as its own question: the form's words stay its source.
─────────────────────────────────────────────────────────────────────────
p. 2  Do you have a national identity document?                 [Ask as its own question]
      Worked out from: National identity document number
p. 1  Have you ever used any other name (e.g. …)?       ✓ Asked as "Has used other name"  [Undo]
p. 1  During the past 5 years have you lived in any country …?
      It cannot be checked against the answers it is worked out from yet.
─ open row ──────────────────────────────────────────────────────────────
  ( ) Use a library field  [ Choose… ▾ ]  (name and meaning; closest words first)   (•) Name a new one
      Name [                    ]   What it means [ Whether: Do you have a national identity document? ]
  Why [ e.g. The form asks this itself before its details ]                    [Ask it · US$0]
```
**Saving effort:** the meaning starts from the form's own question; library fields sort by shared words, none chosen for the person; "Why" carries over after the first row. Open then save, so three rows take six presses, and focus moves to the next row's button. No Sample table on a product screen (P-33, P-319): `own-yes-no.ts` stays for the loader and tests.

**How a person gets there.** To review only links here while an edition has undecided form fields, so the Smart questionnaire tab shows authors one line, above "Ask them in their forms' sections", while a form field that can be asked is not: "IMM 5257 works out 3 Yes/No answers from other answers. Ask them as their own questions." Link: the edition's Form fields page. Its title reads "Form fields" with no chip until the list has loaded, "Decided" only once loaded with nothing undecided, and the error state when the edition cannot be read (review F1); "Needs you" and "Release … waits" show only with something undecided.

**States.** Empty: left out · Loading: as K1 · Normal · Long words: wrap · Asked: tick, name, Undo · New field waiting: "Asked as "X" · a second person approves it on To review; release is held until then", and Undo (no link: To review shows the author nothing of it, review F12) · Cannot be asked: no button, the reason · No printed question: no button, "The form's words cannot be read for this form field: map it on its field map" · Error: under the form, `role="alert"`, focus moves to it · Conflict (someone changed it just now): the row, and the list refreshes on any refused save or undo · Read-only (not the author): no buttons, "A configuration author asks these" · Saving: busy.

## 4b. Best in class
Tax-filing interviews and bank onboarding ask one question and move on with the answer prefilled; they never show an internal key. So: the words are prefilled from the form, a mistake takes one press to undo, and focus moves to the next row after a save. Reviewed from general knowledge of those products, not from fresh primary screenshots: **a limit of this concept**.

## 5. Copy (P-63: "form field", never "box"; no keys on the main path)
Title, intro and line as above. Button "Ask as its own question". Save "Ask it · US$0". Toast: "Asked as "X". Next: Smart questionnaire › Ask them in their forms' sections, or release is held." with Undo. Tooltip on the title: "Yes/No form fields the field map fills from other answers. Asking one here puts the form's own question to the client." The route's five refusals are reworded to carry names, never `person.…` or `form1[0]…`; a same-name refusal returns the field's key as data, for the form to offer.

## 6. Contract and tests
Shapes above, in `contracts/`. `tests/check_b83_undo_withdraw.ts` (the route: races, every reader, BR-8, BR-11, no key in any refusal) and `tests/check_b83_own_question_screen_browser.cjs` on a fresh copy, labelled C4.11, one pass and one fail per rule, BR-1 to BR-11, keyboard only on the main path, axe, 1440, 1024 and 400 px. Route tests move in `check_b52_own_yes_no.ts`: its refusals and its new-field path used Question 8 A, which is now refused, so they use undo first. **The C4.11 pack on the six with the three form fields asked through the screen, in the browser, and not by the API step** (`pack2` skips what is asked; the walk types the table's names, since saved conditions land by matching words, `fact-words.ts:58`), plus a 1440 px walk. Fixes: QA-234 (P-317).

## 6b. Capability or scaffolding; needed or not
Everything is capability and *Needed for the proof*. *Not built*: a Yes/No question for Questions 8 A and 9 A (B74, #865's list); question order, where placement puts the Yes/No after its details (challenge m8: #967's behaviour, a follow-up row).

## 7. Questions (recommendation first)
1. **Scope:** this row now also changes the route (refuse 8 A and 9 A, undo, near-name check, words) and the withdraw path in `library-changes.ts`. Recommendation: yes, in this PR: the first closes a real gap in #967 and the rest make the button safe. No permission change, so no breaker (say if you read undo differently).
2. **Entry line on the Smart questionnaire tab,** and the Form fields page's title when nothing is undecided. Recommendation: yes; without it the step cannot be reached at zero undecided form fields.
3. **Question order (m8):** a follow-up row, not here. Recommendation: file it; a client meets the details before the Yes/No until it is fixed.

## Definition of ready
Acceptance test: `check_b83_own_question_screen_browser.cjs` plus the C4.11 pack as above. Row text: this page. Decisions: questions 1–3, the tech lead.
