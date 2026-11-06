# B88 — fresh challenge (independent, did not draft the concept)

Read on B86's head plus the concept commit fdf75af3c, 5 Nov. US$0, no server, no database, nothing clicked. Evidence comes from the code, the form readings (`p1/inventory/*.inventory.json`) and the saved field-map runs (`p2/runs/studio-fieldmap-*`). The build is already in progress in this checkout (uncommitted). Line numbers are from the committed files.

## Verdict
**Build after these changes.** The shape is right: re-point the form field to the deciding question, a second person approves, and `validate.ts` is not touched. There is no Blocker. There are three Majors. All three come from one fact the concept does not state: **today the 9 form fields go to the hand list, and after B88 the product writes them itself.** So any case where the product's own value is wrong now reaches the PDF without a person seeing it.

## The 9 form fields, checked one by one
Every reading prints the deciding question itself, and every one has exactly No = N and Yes = Y, so `yes_no_code:Y/N` is the right code for all 9. The person each box is about does not change (B88 changes only the fact and the step; `resolver.ts:84-98`).

| # | Form · block | About (saved map) | Printed question (reading) | Verdict |
|---|---|---|---|---|
| 1 | IMM 1294 · alias | form subject | "a) Have you ever used any other name (e.g. Nickname, maiden name, alias, etc.) ?" | OK; see M1 |
| 2 | IMM 1294 · national ID | form subject | "Do you have a national identity document?" | OK |
| 3 | IMM 5710 · alias | form subject | same as 1 | OK; see M1 |
| 4 | IMM 5710 · national ID | form subject | same as 2 | OK |
| 5 | IMM 5710 · US card | form subject | heading: "Are you a lawful Permanent Resident of the United States with a valid alien registration card (green card)?" (the caption wrongly repeats the national ID question; `printedQuestion` takes the heading first, which is right) | OK. The card shows the heading only. |
| 6 | IMM 1344 · sponsor alias | form subject | "Have you ever used any other name (e.g. Nickname, maiden name, alias, etc.)?" | OK; see M1, m1 |
| 7 | IMM 1344 · co-signer alias | **subject_spouse_or_partner**, with words "Only when the sponsor has a co-signer" | same | **M2** |
| 8 | IMM 0008 DEP · alias | form subject (the dependant) | same as 1 | OK; see M1 |
| 9 | IMM 0008 DEP · national ID | form subject (the dependant) | same as 2 | OK |

**Today these 9 are hand-filled (fact).** The filler runs a "derive" step only when it is spelled exactly `derive:Y if any … recorded, else N`, with no space after the colon (`p5/transforms.ts:135`). The 9 are spelled `derive: Y …`, `derive_yes_no: …` and `derive_yes_no_code:Y/N (…)`, so each one gets "step … is not in the executable set" (`:164`).

## Major

**M1. `yes_no_code:Y/N` drops the QA-165 check ("a No while a detail is recorded is never written"). On the six, this can put a No and a name on the same filed form.**
* **What breaks:**
  * `gatesOf` checks only form fields whose step is a "recorded" derivation (`engine/runtime/forms.ts:34`, `p5/transforms.ts:68,73`). A plain `yes_no_code` step has none, so the check is skipped.
  * B52 kept the worked-out step on purpose, for exactly this check (`own-question.ts:122-125`). B88 drops it.
  * The concept names IMM 0008's direct mapping as the safe example to copy. That mapping has the same gap today.
* **Example on the six (fact from the saved maps; confirm on a fresh six):**
  * The other-given-name form fields of IMM 0008 DEP and IMM 1344 read `person.other_given_name` (no s): run `…fae6bf`, `…p1of5…`, `…p3of5…`.
  * The condition accepted on Visitor visa is on `person.other_given_names`, read by IMM 1294 and IMM 5710.
  * So the singular question has no condition and is always asked. Take a dependant who answers "Has used other name" No and types "Other given name: B". IMM 0008 DEP then writes N and prints B. Today a person fills that Yes/No by hand and sees the conflict.
  * The same happens on every one of the 9 whenever the condition stops being in force. That can happen in three ways: it is removed, it is changed, or the founder picks REQUIRE (B86 §7 Q4). The answer then stays visible, the B86 rules go inert (BR-1b), and nothing cross-checks the Yes/No.
* **Fix (small, no words parsed):**
  * The step B88 writes is B52's shape: fact = the deciding question, step `derived:any(<facts>) recorded -> yes_no_code:<Y>/<N>`.
  * `<facts>` are the facts of the mapped form fields in the same printed block as the Yes/No. The block is found from the data path, not from words: the Yes/No's own group (`…AliasName[0]` or `…q2[0]`, `…natID[0]`, `…USCard[0]`). For all 9 this gives the family name, the given name(s), or the document fields.
  * The card lists those facts for the second person.
  * Checked against the code:
    * The filler: Yes gives Y, No gives N (`transforms.ts:108-111,134`).
    * A hidden stale name is not counted. B86's rule leaves that form field "not needed" (`forms.ts:48`), so it is not in the filler's confirmed facts (`form-values.ts:36`). The QA-165 check skips hidden facts too (`forms.ts:55`).
    * A visible detail is still caught: "answered No, but … is recorded" (`forms.ts:56-57`).
  * Tests:
    * Yes gives Y.
    * No gives N.
    * Yes, a name, then No: N, and the name never written.
    * No plus an unconditioned other given name: not written, with the QA-165 words.
    * The condition removed after approval: the same conflict is still refused.

**M2. The IMM 1344 co-signer form field would be filled for a co-signer who may not exist, from someone else's answer.**
* **What breaks:**
  * The saved map makes the co-signer block's Yes/No about `subject_spouse_or_partner`, with its own words "Only when the sponsor has a co-signer" (run `…p3of5…e34718`).
  * Words are never a rule. So after B88 the box is written whenever `partnerOf(subject)` gives a person with a confirmed answer (`resolver.ts:75-79`), whether there is a co-signer or not.
  * The form's own reading says the block is for a co-signer, who "must be the spouse or common-law partner of the sponsor" (IMM 1344 reading, `CoSignerInd` heading). Whether the person being sponsored can be that co-signer: Unconfirmed: expert.
* **Not traced (no database):** who IMM 1344's subject is on the Spouse case, and so whose answer this box gets, or whether it stays unresolved.
* **Fix:**
  * The spread test fills IMM 1344 on the Spouse case with "Is there a co-signer?" = No and shows what the co-signer block gets.
  * If anything is written, BR-2 also refuses a worked-out Yes/No whose map has words of its own: "this form field is filled only in another case (its words: …), so it stays filled by hand".
  * The Spouse Hiding error on the co-signer block then stays held and is named in the Done when as a question for the lead and the immigration expert. Do not clear it by writing a value.

**M3. BR-8 is not true in the code: a release would list this as an ordinary map edit, and the expert would not see it.**
* **Evidence:** `diff()` gives a person's change to a form field only the form's "Field map … 1 changed" line, with `needs_sme: x.ai > 0` = false (`validate.ts:266-269`). B86 added its own line only for `condition_rule` (`:259-264`). BR-9 says the decision is Sample, Unconfirmed: expert.
* **Fix:** add a "Form field question" line for a box whose fact changed to the deciding question of its old fact's condition. Set `needs_sme: true`. Say it in words, e.g. "IMM 1294, form field '…': writes the answer to 'Has used other name' (it was worked out from 'Other family name'); shared library; Sample, Unconfirmed: expert". Leave that box out of the Field map count, as B86 does. Test: a change to that box alone is listed and needs the expert.

## Minor
* **m1. Which map the six hold (evidence).** The saved part run `…p1of5…` already maps the IMM 1344 sponsor Yes/No to `person.has_used_other_name` with `yes_no_code:Y/N (derived: …)`. That step starts with `yes_no_code`, so B86 would not call it worked out. The §2 table says it is. Name the map version the six hold, and print the 9 steps in the spread test.
* **m2. The row and Undo after the move (BR-7).** B86's panel lists form fields by `e.fact === fact` (`form-field-condition.ts:108,112`). After approval the box reads the deciding question, so it drops out of the hidden question's panel.
  * Build the "Asks its deciding question" row from the form field: its fact is the deciding question of this question's condition, and its step is B88's. Do not build it only from the change record. Show it on every combination that files the form, not only the proposer's.
  * Otherwise, after a new edition, the carried box has no row and no Undo. The carry itself keeps fact and step, but turns the evidence into "Unchanged from …" and the origin into CODE_MATCH (`impact.ts:231-232`).
  * Say, as B86 BR-9 does, that a replayed map (`sources.ts:911`) silently puts back the AI's step, so the Hiding errors return.
* **m3. A false warning if B86 goes first.** Before B88, the given-name form field's words "only when AliasNameIndicator = Y" resolve to the Yes/No box's current fact, "Other family name". That raises "Its words name 'Other family name', not … 'Has used other name'" (`form-field-condition.ts:117,120`, `plainWords`). After B88 they resolve to "Has used other name". The walk and the spread test do B88's 9 first, or the warning skips a worked-out Yes/No.
* **m4. A dead-end refusal.** BR-2's "map it on its field map" has no route behind it. No screen edits a mapped form field (`screen02.ts:53` refuses; the only writers are `own-question.ts:126`, `form-field-condition.ts`, `sources.ts:911`, `impact.ts:235`). Say it stays held, as B86's NO_WORDS does.
* **m5. Approval re-checks (BR-3).**
  * Also check that the deciding field is still a Yes/No library field in the same group. Retiring a field unmaps its form fields (`library-changes.ts:241`).
  * Also check that it is not itself under a SHOW condition. Otherwise it gets a new Hiding error. That is safe, but it is avoidable.
  * Undo needs only the form-field check.
* **m6. The second person's line.** `spreadOf`'s words (`form-field-condition.ts:46`) tell a worked-out Yes/No to "hold it". Count the two kinds apart and name the right step for each.
* **m7. Two `isWorkedOutYesNo` functions.** `engine/form-field-condition.ts:34` and `api/src/own-question.ts:35` give different answers for these 9. B52's list never shows them. Rename one, or test both on the 9 steps.
* **m8. Scope and records (P-319).** §6b, moving `OWN_YES_NO`, is not needed by the door. `FORM_SETUP` in `form-setup.ts` still keys by combination and form. Say that the Done when's P-319 covers B88's new code, or move §6b to its own PR (one small item = one PR). `tests/probe_b88.ts` (untracked) submits on every combination: keep it out of the PR, or make it `check_forms_b88_spread.ts`.

## What is sound (checked in code)
* **The rule stays as strict (P-303).** The rule lists readers by `e.fact` (`validate.ts:177`), so a re-pointed form field stops reading the hidden answer, and nothing else changes. The deciding question carries no condition. A form still fails while any of its plain form fields is unconfirmed (`:185`). No text or words become a rule.
* **No form field reads an unasked fact.** The snapshot pulls in every library placement whose fact a form field of the combination reads (`snapshot.ts:180,186`). So every combination filing these forms asks the deciding question. This agrees with the concept's "Unreachable: 0".
* **Yes = Y, No = N** on all 9 (table above). The person a box is about does not change.
* **The saved list cannot move.** Visitor visa files IMM 5257 and IMM 5707, and none of the 9 forms. `p2/question-lists/` holds only `vv.single-ae2133b8a398`, so no other combination's saved pairs depend on a list.
* **Second person (§7 Q1): agree.** This changes what every combination filing the form writes, as B86 does. B52's direct route makes the same kind of change for IMM 5257 with one person. Note that difference for the lead; do not copy it.
* **Same door and record.** One open change per form field (same key, WAITING or RETURNED blocks), a later change closes an approved earlier one, and release marks it (`form-field-condition.ts:18,65,70-79`). All of this works unchanged for the new action.
* **New edition.** An unchanged box carries its fact and step (`impact.ts:231`), so the fix survives a new edition (see m2 for its row).
* **Scope is honest.** Bulk, parsing the AI's steps, and No or value conditions (none measured) are rightly Not built.

## Lead response

## Agreement

## Build discoveries
