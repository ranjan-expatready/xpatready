# B83 challenge: "Ask as its own question" on the Form fields page

Independent challenger, 5 Nov (P-223 (4)). Read `concept.md`, part B of the screen-concept skill, the standards and the code at main adc904436. Ran on an isolated copy (port 4441, database dropped afterwards): Reset to the six, then the configured checkpoint. US$0: saved answers and rules only, no `*_LIVE` variable, no priced button.

Evidence labels: **Ran** = seen on the copy. **Code** = read in the code, not run. **Judgment** = my opinion, with confidence.

## Verdict: Build after these changes

The route and the placement step hold up, and the step can be reached. Four things in the concept are not true as written: BR-7 on two of the five rows, BR-8, the reach of the reason control, and the "none needed" for undo. Two Blockers and six Majors, all small. No migration is needed and the row does not need rethinking.

## Answers to the seven questions

| | Question | Answer |
|---|---|---|
| a | Reachable on the six, in order? After placement or a release? | **Yes, with a gap.** Ran: reachable after apply, on the applied draft's page and on To review › Form fields while undecided rows remain (IMM 5257 has 14). After placement it works but leaves a release error until "Ask them" is pressed again (M1). After a release, Release 1 stays frozen and the change is a draft. |
| b | One-way with no undo acceptable? | **No.** EXPERIENCE §2.8 [M] says "undo where possible", and here it is possible (B1). |
| c | Does the prefilled one press weaken the controls? | **The reason control, yes. The second person, no** for a new field. A library pick has no second person, so the reason is its only control (M3). |
| d | May the Sample table prefill a product screen? | **No** (M4): P-33, P-319, STANDARDS §3.1. |
| e | Do the GET shapes leak keys? | **Yes, by omission and through the route's refusals** (M5). |
| f | Which IMM 5257 form fields show? | **Five; two of them have no named facts** (table below, B2). |
| g | "This step blocks nothing"? | **False in three ways, four after a withdraw** (M1, M2). |

**(f) IMM 5257 (09-2023), Ran on both samples.** The two "equals" form fields (same as country of residence, same as mailing) are not listed, because the route's rule is "recorded" only.

| Form field (p.) | Printed question | Worked out from | On the six, after apply | On the released checkpoint |
|---|---|---|---|---|
| Alias (1) | Have you ever used any other name (e.g. Nickname, maiden name, alias, etc.) ? | other family name, other given names | not asked | asked |
| National ID (2) | Do you have a national identity document? | national ID number | not asked | asked |
| US card (2) | Are you a lawful Permanent Resident of the United States with a valid alien registration card (green card)? | green card number | not asked | asked |
| Question 8 A (1) | During the past 5 years have you lived in any country other than… | **none named** | not asked | not asked |
| Question 9 A (3) | Have you had any post secondary education… | **none named** | not asked | not asked |

No other PDF edition in the workspace had such a row at the time of these checks.

## Objections

### Blockers

**B1. A wrong choice cannot be taken back, and the concept makes it easy to make.** *Needed for the proof.*
* **What breaks:** a one-way change to a government form's shared field map. Nothing recovers it except Demo › Reset, which is scaffolding.
* **Example (Ran):** I asked Question 8 A ("lived in any country…") as the library field `person.criminal_history`. The route answered 201 with no second person. Asking again with another field gives 409 "already asked". A decision gives 409 "change the mapping on its field map instead", and no route does that (#967's description says so; I found none). IMM 5257's field map now reads criminal history into a residence question.
* **Evidence:** `own-question.ts:91`, `:125`; `core.ts:147` (`revise` overwrites a draft row in place, so the earlier key is gone); wireframe (concept §4) shows only a name in the picker, no meaning. EXPERIENCE §2.8 [M]; QUALITY D2, D5, D17. Undo already exists next door: `job.tsx:110`, `questionnaires.tsx:387`.
* **Judgment (high):** the concept's question 1 should be ruled against. It is possible because the "worked out" step stays on the row, so the original field is its first named fact.
* **Fix:**
  1. Add `POST /editions/:id/form-fields/own-question/undo {dataPath, reason}`: author only, same locks. It puts the key back to `recordedDerivation(transform).facts[0]`, or deletes the draft version when a published one sits under it.
  2. Show Undo on the asked row and in the toast. If a question was already placed, say so in words and leave it for "Remove from …" on the Smart questionnaire tab.
  3. Show each library field's meaning in the picker, beside the form's words.
  4. Add a pass and a fail test.

**B2. BR-7 is false on two of the five rows the screen offers.** *Needed for the proof.*
* **What breaks:** Questions 8 A and 9 A have no named facts. After asking one, a confirmed No with rows recorded writes N to the PDF, beside the listed schools or countries. The form contradicts itself and no check speaks.
* **Evidence:** Ran: `worked_out_from: []` on both; `runTransform` on the education step returns Y and N from the answer alone. Code: `engine/runtime/forms.ts:33` adds the own-question gate only when `d.facts.length`; `:42` then has nothing to compare. **Not run through a whole case.** Confidence high.
* **Also:** with no named fact, undo has nothing to go back to (the draft row's key is overwritten, Ran), the "Worked out from" line is empty, and the concept's walk leaves these two alone (its question 3). So the entry line never clears on the six.
* **Fix:** list both rows with no button and a reason: "Worked out from a list of rows, so it cannot be asked here yet." The route refuses in the same words (STANDARDS §3.4: the UI is only a convenience). The entry line counts only rows that can be asked. Asking them later stays with B74 and #865's list, with its own guard fix. `tests/check_b52_own_yes_no.ts:70-91` uses Question 8 A for its refusals, so that check moves to another open row or a fixture.

### Majors

**M1. BR-8 and its test are wrong.** *Needed for the proof.*
* **Ran, after placement:** gaps went from 0 to 1, and Submit was refused with one error per person ("…is needed by IMM 5257, but nobody is asked for it"), from `engine/validate.ts:95-96`. Same on the released checkpoint, with 3 errors. Pressing "Ask them" placed 1 and Submit then passed.
* **Code, new field:** release is refused while it waits, `studio.ts:1080-1081`. Ran: it is a WAITING library change, so "adds no To review item" is also false (`review-queue.ts:275`).
* **True part:** the step itself is optional, a form field not asked holds nothing, and `review-queue.ts:216` adds no Form fields item.
* **Fix:** rewrite BR-8: "Not asking holds nothing. Asking changes the form's needs: release waits until its question is placed, and a new field until a second person approves." Toast: "Next: Ask them in their forms' sections, or release is held." Replace the test with the pass (never asked: not held) and the two fails above. On a released combination add: "Takes effect at the next release; open cases stay on theirs." Ran: Release 1's fingerprint was unchanged, and the draft's change list shows the field, the placement and "1 changed" on the field map.

**M2. The concept's "New field waiting" link leads to a Withdraw that breaks the form field.** *Needed for the proof.*
* **Ran:** second person returns the new field, author withdraws it (`review-items.tsx:130`). The row becomes `outcome: unresolved`, key and transform null (`library-changes.ts:238`). It leaves the own-question list, asking again gives 409 "not a Yes/No form field worked out", and it now holds release as a "no decision" row.
* **What is left:** only "Not a fact" or "Filled by hand" (`job.tsx:272`). The QA-165 check is gone with no way back, so BR-7 is lost here too.
* **Fix:** withdrawing a field that an own-question row reads puts that row back to worked out (key = first named fact, transform kept, mapped). Others stay as they are today. One branch in `withdrawChange`, with a test.

**M3. The prefilled "Why" empties the reason control.** *Needed for the proof.*
* **Fact:** BR-6 asks for a reason of 8 or more characters. Prefilled, it always passes, and the record reads "(sentence) (Configuration author)" as that person's words on the audit line, the history and the second person's card (`own-question.ts:117`, `:125`). `meaning_checked` is stored true with no check run (Ran). The route's reason is the only control on a library pick (B1).
* **Judgment (high):** "one press is enough for a person who agrees" is the opposite of asking for a reason. K1 and C3.6 both start empty (`job.tsx:250`, `rule-facts.tsx:40`).
* **Fix:** empty "Why" with an example as placeholder. After the first save, the next row starts with what this person just typed. That keeps "nothing typed twice" without the system writing the reason. Meaning and name follow M4.

**M4. `suggested` puts a code table on a product screen.** *Needed for the proof.*
* **Fact:** `own-yes-no.ts:24-33` holds one form's data paths, names and meanings, keyed to one combination. Its header calls it the checkpoint's and the packs' table. The concept labels it scaffolding, then makes the screen's saving of effort and its acceptance walk rest on it.
* **Rules:** P-33 (scaffolding "never replaces the capability's path in the demo"), P-319 (no form number hard-coded), STANDARDS §3.1.
* **Example:** a second form gets no help at all, so the walk proves the table and not the capability.
* **Fact (Ran), the wireframe's default is not the six's first state:** after IMM 5257 is applied, the library has 8 person Yes/No fields and none of the three names (they arrive with IMM 0008 or IMM 1294). All three rows are new fields on the six's first run.
* **Fix:**
  1. Drop `suggested` from the GET. The table stays with the sample loader and the tests.
  2. Prefill the meaning from the form's own question, marked for the person to check. The person writes the name.
  3. Sort `yes_no_fields` by words shared with the printed question. Preselect nothing.
  4. The browser walk types the table's names. **Watch:** saved conditions land by matching words (`engine/fact-words.ts:58`; the saved run says "Ever used other name"), so a differently worded name may not land. Medium confidence; the walk will show it.

**M5. The proposed shapes cannot draw the wireframe without keys, and the route's refusals carry keys.** *Needed for the proof.*
* **Fact, shapes:** `field` and `worked_out_from` are keys (`own-question.ts:67`). The concept adds nothing for "Asked as "Has used other name"", "Worked out from: National identity document number", or "New field waiting" with its link. POST returns the key, not the name (`:129`).
* **Fact, refusals:** "Errors: the route's own words, shown as they are" puts these on the main path, against EXPERIENCE §5 and PRODUCT §4:
  * "…already asked as its own question (person.criminal_history)" (Ran, `:91`)
  * "…no printed question for form1[0].Page…" (`:87`)
  * "person.x is answered as…", "is not a library field", "is about…" (`:106-108`)
* **Example:** BR-5's "the form offers that field instead" has only a sentence to work from.
* **Fix:**
  * GET rows gain `asked_as {name, waiting, change_id}`, `worked_out_from_names` and `can_ask`.
  * `yes_no_fields` is `{key, name, meaning}`, used as values only.
  * POST returns `name`.
  * The five refusals use names and the form field's question.
  * The twin refusal returns the twin's key as a field of the problem.

**M6. No duplicate check on a new name.** *Needed for the proof, since new names are the six's first path.*
* **Ran:** with "Has National Id" in the library, "Holds a national ID", with the same meaning, was accepted with `matches: []`. The second person gets no warning. (It was also accepted on Question 8 A, which is B1's point.)
* **Rules:** STANDARDS §3.2 [M], EXPERIENCE §2.8, QUALITY D3.
* **Fix:** reuse C3.6's check (`rule-facts.ts:239-240`, `nearLabels`): a close name asks for a reason the second person reads, or the existing field. One pass and one fail.

### Minors

* **m1 Entry line.** *Needed.* The example "3" matches no real state: 5 on the six before any ask, 2 on the checkpoint. It should show to authors only, as `PlaceFromFormParts` does. Consider carrying the count in the tab's existing view (`workspace.ts:117-131`) instead of a new GET (STANDARDS §5). The concept's question 2 is right: To review links only while undecided rows exist.
* **m2 Destination page.** *Needed.* The line's link lands on a page titled "Form fields with no decision", chip "Needs you", "Release … waits", h2 "(0)" (`review-items.tsx:368`, `job.tsx:262`). Title it "Form fields"; show the chip and sentence only when rows are open; keep K1's section when empty only if its existing tests need it.
* **m3 Read-only.** *Needed.* `readOnly` means "no review duty" (`review-items.tsx:370`) and the Approver holds review, so the prop would show them the button (`core.ts:40-42`). Use `canAuthor`. The concept's BR-2 test catches this if it is run as the Approver.
* **m4 Press count.** *Needed.* "Three rows take three presses" is six: open, then save. Correct the sentence; do not add auto-open for it.
* **m5 States.** *Needed.* The conflict state is missing (EXPERIENCE §4). The route's "changed by someone else just now" should refresh the list. Invalidate the questionnaire, review queue and combination reads after a save, as K1 does.
* **m6 Contract.** *Needed, cheap.* "Contract: none needed" sits beside new shapes and a route. STANDARDS §6 [M]: put the zod shapes in `contracts/`.
* **m7 Best in class.** *Not built.* The concept admits no primary sources for step 4b. Accept it as a stated limit in the Lead response or add a follow-up; it does not change the design.
* **m8 Question order.** *Not built, for a follow-up row.* Ran: placement puts the Yes/No after its details ("Has national ID" order 5 after the number at 2; the education question 9 after 6), whichever comes first. A client meets the details before the question that decides them. This is #967's placement, not this screen, but this walk will show it.

## What is sound

* **The route:** author only, form's words with page and date, refusals for all the wrong cases, locks on one form field (per #967's review, 3 racing requests gave one success).
* **Second person for a new field:** real, Ran. Return keeps the row asked (Ran); it can be corrected and sent again (Code, `library-changes.ts`).
* **Placement:** places a waiting new field, and offers itself again through `coverage.gaps`, Ran.
* **Released means frozen:** a new draft version, Release 1 unchanged, Ran.
* **Placement of the screen:** a section in K1, no new page, no migration, the same component on both pages.
* **Entry line:** needed. **Concept's question 3:** the three are the right walk. **Acceptance through the screen:** `pack2.ts:119` does skip what is asked, and the rest of the steps ran after a part-done start, Ran.
* **Effort:** focus moving to the next row, and the states listed, are right.

## Back-end plan

| Element | Record | API | Rule | Test (one pass, one fail) |
|---|---|---|---|---|
| List rows | `form_field_map`, `canonical_field`, `library_change` (read) | GET `…/own-questions`, adding `asked_as`, `worked_out_from_names`, `can_ask`, `yes_no_fields` | BR-1, BR-3, B2 | plain form field not listed · 8 A has no button |
| Ask | same; new field through `landField` | POST unchanged, returns `name`, refuses no-named-fact rows | BR-2, BR-4, BR-5, BR-6, M6 | Approver no button, 403 · close name asks for a reason · short reason on the form |
| Undo | same row, key back to first named fact, or draft version removed | POST `…/own-question/undo` (new) | B1 | undone row is listed again and can be asked · another person refused |
| Withdraw | `form_field_map` in `withdrawChange` | existing route, one branch | M2 | row back to worked out · an ordinary new field still reopens |
| Entry line | none | tab view or GET `/combinations/:id/own-questions` | counts `can_ask` only | line shows 3 on the six, gone after the three |
| Refusal words | none | five messages | M5, EXPERIENCE §5 | no `person.` or `form1[` in any refusal |
| Release effect | none | existing | M1 | never asked: not held · after placement: held until placed · new field: held until approved |
| Walk | none | C4.11 pack, three form fields through the browser | P-322 | pack on the six, plus 1440 px walk |

## Questions for the founder

None. Everything above is the tech lead's to rule under P-223 (4); the founder reviews next morning.

## Lead response
Builder's response, for the tech lead to accept or change (5 Nov): all taken into `concept.md`.
* B1: undo route and button, picker shows meaning (BR-9). B2: 8 A and 9 A refused and listed with the reason (BR-1).
* M1: BR-8 rewritten. M2: the withdraw path restores the row (BR-10). M3: "Why" starts empty and carries over (BR-6). M4: `suggested` dropped; meaning from the form's question; library fields sorted by shared words; the walk types the table's names. M5: the new shapes; refusal words without keys. M6: near-name check (BR-5).
* Minors m1, m2, m3, m4, m6 taken (authors only, destination page, `canAuthor`, press count, `contracts/`). m5 taken: the conflict state refreshes the list, and a save refreshes the questionnaire, queue and combination reads. m7 stays a stated limit of step 4b. m8 is a question to the tech lead (a follow-up row).

## Agreement

## Build discoveries
