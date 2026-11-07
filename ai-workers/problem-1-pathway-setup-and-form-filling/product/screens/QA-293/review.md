# QA-293 review — the representative's tab: refuse a save, offer no Add

* **Commit reviewed:** `1230da890` on `claude/qa293-representative-answers` (base `origin/main` `fc3b57cff`). Diff: `api/src/runtime.ts` (+5), `web/src/runtime/questionnaire.tsx` (+5/−2), two new checks, one screenshot.
* **Reviewer:** independent reviewer agent. I did not build this fix.
* **How I checked:** I read the diff and every route that takes a subject id. I ran an isolated copy from a `git archive` of `1230da890` (port 4477, database `xr_studio_rv293`, now stopped and dropped), with Demo › Reset and then Demo › Load the configured checkpoint. On it I ran both new checks and a probe of my own: the view of a Visitor visa case, a `PUT` as the officer and as the client, and the Prepare view's readiness. I also ran typecheck. Live AI was off, so this cost US$0.

## Results I reproduced

| Check | Result on `1230da890` |
|---|---|
| `tests/runtime/check_qa293_rep_answers.ts 4477 xr_studio_rv293` | **7/7** |
| `tests/runtime/check_qa293_rep_tab_browser.cjs 4477` | **8/8**: 0 Add buttons on the representative's tab, 87 on the principal's, axe clean, no page errors |
| `node product/tools/typecheck.mjs` | api: 15 errors, all known; web: 0. **PASS: no new type errors (15 known, 0 fixed)** |
| Fail on main | Checked by reading the code, not by running main. Main's `putAnswer` returns 404 "That person is not on this case.", so the two 422 lines fail (5/7). Main's screen draws Add on all 17 lines, so the city, words and "no Add anywhere" lines fail (5/8). Both checks fail for the reason the bug gives. |

What the representative's tab shows on the configured checkpoint (probe, Visitor visa, the default representative user-R, an RCIC):

* **Section B: appointment of representative.** From the firm record: membership ID, licensing body, firm name. Not filled (6): licensing province, `uncompensated_other_description`, `uncompensated_category`, fax country code, supervising lawyer name, supervising lawyer membership ID. They fill IMM 5476 only.
* **Your designated individual.** Not filled (9): `person.address_*` (7) and `person.phone_country_code` / `person.phone_number`. Each fills **IMM 5475 and IMM 5476**.
* **Contact information.** Not filled (2): `person.email` (fills IMM 5475 and IMM 5476) and `person.fax_number` (IMM 5476).
* **Personal details.** Family name and given names come from the firm record.

That is 17 lines with no value, which matches the builder's "17 Add buttons". None of them is a repeating group, a declaration or a decider.

## Findings

### Blocker
None.

### Major

**M1. The new words are false for the very line qa reported, and for 10 of the 17 lines.**
* Where: the screen at `web/src/runtime/questionnaire.tsx:738` ("Not answered · not in the firm record yet") and the API at `api/src/runtime.ts:49` (`REPRESENTATIVE_NOT_TYPED`: "… This one is not in the firm record yet.").
* The firm record does hold the representative's office address, phone and e-mail. In `samples/firms.json`, sample-firm's `office` has `city: "Toronto"`, a street, a postal code and a phone, and user-R has an `email`.
* `engine/runtime/team.ts:83-86` reads those values, but under `person.mailing_address_*`, `person.telephone_number` and `person.email_address`.
* `team.ts:88-91` keeps them away from the keys this checkpoint reads (`person.address_*`, `person.phone_*`, `person.email`) on purpose. That is the tech lead's ruling on #1072: IMM 5475's map puts its designated individual on those keys.
* So for "City or town of a contact address" the screen says "not in the firm record yet" while the firm record holds Toronto. The value is held back until a reviewed map change, not missing.
* The API words are also false for a fact the firm record does give. In my probe, `PUT …/answers/representative/representative.membership_id` returned 422 with "This one is not in the firm record yet." The firm record gives R000000.
* For the Section B lines, "yet" promises a value that will never come for this representative. The licensing province "applies to lawyers and notaries only" (`team.ts:63`). The supervising-lawyer details are for a student-at-law, and `uncompensated_*` for an unpaid representative. The Sample representative is a paid RCIC.
* This is D18 (where information came from and what to do with it, `QUALITY.md:40`). The reported bug was itself misleading words.
* **Fix (small):** use words that are true for every line. For example:
  * middle column: "Not filled from the firm record";
  * right column: keep "Comes only from the firm record; it can't be added on a case";
  * API: drop the last sentence, or say "The firm record does not fill it on this case."
  * Optionally, for the contact block, say why: "The firm's office address waits for a reviewed form map (IMM 5475's designated individual is not the representative)."

### Minor

**m1. "What blocks filing" and the forms panel still tell the client or the case team to supply these facts.** This is older than this PR, but it is the same journey.
* `api/src/case-prepare.ts:368` decides who owes a fact with `isClientField(s, fact)` and ignores whose fact it is.
* On the probe case, the Prepare view's readiness said:
  * "The case team: IMM 5476 for Sample Client A: 6 facts missing or not confirmed (Province or territory of the law society the representative belongs to, …)";
  * "The client: IMM 5476 …: 19 facts missing or not confirmed (…)". These 19 include the representative's 11 `person.*` facts, mixed with the principal's under the same labels.
* `web/src/runtime/forms.tsx:151` lists them as "Facts to answer or confirm".
* Nobody can act on any of them. They are CRITICAL warnings, so they can only be passed with a reason.
* Follow-up row: the owner should be `representative` ("The representative of record") with words that say "comes from the firm record". That needs the readiness `missing` entries to carry the fact's own subject: `api/src/readiness-inputs.ts:80` passes the form holder's subject.

**m2. The representative's tab says "17 missing" for good, with no action.** The tab trigger, the section pills and the section nav (`questionnaire.tsx:666`, `:677`) all count them.
* Part of this is release configuration: the six Section B facts are `required: true` with no condition, but most do not apply to an RCIC.
* Follow-up for the forms lane and the tech lead: conditions on `representative.licensing_province`, `uncompensated_*` and `supervising_lawyer_*`.

**m3. Two API routes still answer subject `representative` with the 404 "That person is not on this case."**
* The routes are `groupFor` (`api/src/runtime.ts:377-378`), which serves `addRow` and `noneApply`.
* Nothing is written. The screen cannot reach them today, because no repeating group is about the representative on the checkpoint.
* If a release ever placed a per-row fact about the representative, the section's "Add an entry" would reach this 404 again.
* Optional: refuse in `groupFor` with the same 422 as `putAnswer`.

The other routes are covered or harmless:
* `confirmSection` refuses first on `ConfirmSection`'s uuid check (`contracts/runtime.ts:94`): 400 "Choose whose section to confirm." On screen the button is disabled because firm-record answers are never sent as seen (`questionnaire.tsx:709`, `:757`).
* Undo refuses on `UndoBody`'s uuid regex (`api/src/case-changes.ts:21`): 400, nothing written.
* `fill-case.ts:218` returns 404 "No such person." through `idOf` (`:44`). That is correct: the representative holds no form.
* The client portal: the client's questionnaire view never lists the representative's facts (`engine/runtime/case.ts:304`). A client's `PUT` now gets the same 422 (probe).
* The PQR view drops them, because `roleOf("representative")` is `""` (`case.ts:389`).

**m4. The tests: sound, with two gaps.**
* The "refused saves write no answer" line (`check_qa293_rep_answers.ts:21-28`) counts only answers joined to `case_participant`. It could never see a row written for a non-participant subject, and it passes on main too. It works as a guard, but it does not tell the fix from main.
* Nothing covers the client actor (now 422, verified in my probe) or a fact the firm record gives (`membership_id`). That second case would have shown M1.
* The browser check is good: it finds the line by its `a-representative-…` id, checks that no Add or Edit button is there, counts 0 Add buttons on the tab and more than 0 on the principal's tab, and runs axe and a sideways-scroll check.

### Nit

* **n1.** `api/src/runtime.ts:45-50`: the new constant sits between B115's doc comment and `offeredRoles`. `offeredRoles` loses its doc comment, and two doc comments now sit on `REPRESENTATIVE_NOT_TYPED`. Move the new lines above line 45.
* **n2.** On the representative's tab, three older texts no longer fit:
  * `questionnaire.tsx:681` says "Click Edit on any answer to change it.", but nothing there can be edited.
  * The disabled Confirm section's title is "Nothing answered yet in this section" (`:757`), but Personal details has two answers from the firm record.
  * The note "No fixed list for this answer yet: check it before confirming the section." (`engine/runtime/case.ts:320`) shows under the representative's country (screenshot), where no answer can ever be given.
* **n3.** The right-hand text appears 17 times, three lines each (screenshot). One notice per section, or per tab, would read better. Optional.
* **n4.** `aboutRepresentative` tests the literal `"representative"` (`questionnaire.tsx:624`) instead of importing `REPRESENTATIVE`. `team.ts` uses `Buffer`, so it is not safe to import in the browser, and the literal matches the existing `FIRM_RECORD` copy at `:620`. Acceptable.

### Is `q.subjectId === "representative"` the right test? Yes.
* A question is about the representative only when the renderer's `about` is `"representative"`. `caseView`'s `subjectOf` keeps that literal (`engine/runtime/case.ts:273`), and `render.ts:93` and `team.ts:78` use the same key.
* Relationship keys (`representative/…`) never reach the view, because `case.ts:291` drops any `about` containing "/".
* A representative is never a participant: `addPerson` refuses one (`runtime.ts:215`).
* On the checkpoint, no question under that subject is one a person must answer on a case.
* The edit dialog opens only from a line's button (`questionnaire.tsx:640`, `:687`, `:741`), so it cannot be reached on this tab now.

## Product question (for the tech lead)

The representative's details that the firm record does not fill on a case are, on the Visitor visa checkpoint:
* 6 IMM 5476 Section B details;
* 9 contact-address and phone details under "Your designated individual", which IMM 5475 and IMM 5476 both read;
* e-mail and fax under Contact information.

Where should they come from?

* **A. The firm record only (this PR).** A save on a case is refused. The details fill once the firm record holds them, or, for the contact block, once a reviewed map change lets IMM 5476 read the firm's office block and gives IMM 5475's designated individual its own person.
* **B. Typed on each case.** They are stored on the case as facts about the representative, and both forms use them.

**Recommendation: A.** The case for it:
1. **B is not cheap on the write side.**
   * `client_canonical_answer.subject_id` is a uuid foreign key to `answer_subject`, with a required party (`prisma/schema.prisma:1504`).
   * `state()` reads stored answers only for participants' subjects (`api/src/runtime.ts:268-272`).
   * So B needs a per-case subject that is not a participant (a migration), and the mapping in `putAnswer`, confirm, undo, the changes feed and out-of-date marks.
   * Only the read side is cheap. `knownOf` keys any non-participant subject by its own id (`engine/runtime/case.ts:224`), so fill and view would pick the answers up. `state()` already lets the firm record win over a stored answer (`runtime.ts:287-288`).
2. **B breaks the ruling on #1072.** 10 of the 17 also fill IMM 5475. A typed value would print the representative as IMM 5475's designated individual, the person IRCC says is "someone who will not act as your representative" (`team.ts:88-91`).
3. **B would carry one representative's details to the next.** A per-case value is stored as "the representative", not tied to one user. After a change of representative of record (BR-20, `team.ts:146-155`), the earlier representative's typed details would fill the new representative's IMM 5476 without anyone seeing.
4. **For the contact block, the gap is the map, not the data.** The firm record already holds the office address, phone and e-mail (`samples/firms.json`).
   * For the 6 Section B details, the fix is conditions in the release, so a paid RCIC is not asked about a law-society province, a supervising lawyer or unpaid representation.
   * The firm record is the place for the rest (fax).

## Note for the builder
This worktree has uncommitted changes to 14 `product/screens/C11.6/screenshots/*.png`, written at 04:02 UTC by a C11.6 walk that someone else ran in this worktree. This review did not make them. Do not commit them with this item by accident.

## Verdict
**Request changes**: M1 only. Make the words true for every line, both on the screen and in the API message. Then this can be approved. Refusing is the right fix under the stated rulings. m1 and m2 are follow-up rows, and m3, m4 and the nits are optional.

## Round 2 (the last)

* **Range reviewed:** `1230da890..e42914579`, one commit: "review round 1 (Request changes) answered".
* **How I checked:** I made a fresh `git archive` of `e42914579` and ran it as an isolated copy on port 4478, with Demo › Reset and then Demo › Load the configured checkpoint. That copy is now stopped and its database dropped. Typecheck ran on the same archive. Live AI was off, so this cost US$0.

| Check | Result on `e42914579` |
|---|---|
| `check_qa293_rep_answers.ts 4478 xr_studio_rv2932` | **10/10**. The workspace count was 430 before and 430 after every refused call. |
| `check_qa293_rep_tab_browser.cjs 4478` | **8/8**: 0 Add buttons on the representative's tab, 87 on the principal's, axe clean, no page errors. |
| `node product/tools/typecheck.mjs` | **PASS**: no new type errors (api: 15 known; web: 0). |

### Round 1 findings
* **M1: fixed.** Every line on the tab is now true.
  * Left column (`web/src/runtime/questionnaire.tsx:738`): "Not answered · not filled from the firm record". This is true for all 17 lines on the configured checkpoint. That holds for the lines whose value the firm record lacks: the licence details, and fax. It also holds for the lines whose value it holds under other keys but does not use here: the office address, phone and e-mail (`team.ts:88-91`, the ruling on #1072).
  * Right column (`:741`): "Only the firm record fills this; it is not added on a case". This states the source as designed (C7.7, C6.11), and it is true whether or not the firm record holds the value.
  * Lines the firm record does fill still show "From the firm record" and "Change it in the firm record". The membership ID shows R000000.
  * The API words (`api/src/runtime.ts:48`): "… come only from the firm record of the representative of record, so they are not saved on a case." I saw this 422 for a fact the firm record does not fill (`person.address_city`, `representative.licensing_province`) and for one it does (`representative.membership_id`). The words promise nothing, so they are true in both cases.
* **m3: fixed.** `groupFor` refuses `representative` with the same 422 before it looks up the person (`runtime.ts:379`). That covers `addRow` and `noneApply`: both returned 422 with those words, and nothing was written.
* **m4: fixed.**
  * The no-write check now counts every answer, row and group answer in the workspace.
  * New lines cover the membership ID, a client's save (422 here), and the row and none-apply routes.
  * The membership-ID line fails on `1230da890` for the right reason: there the words said "not in the firm record yet".
* **n1: fixed.** `offeredRoles` (`runtime.ts:52`) has its own doc comment again. The constant and its doc comment now sit above it (`:45-48`).
* **m1, m2: not changed, and that is accepted.** They predate this PR and the builder will propose them as follow-up rows: who owes these facts in "What blocks filing" (`case-prepare.ts:368`), and the permanent "17 missing" with no conditions on the Section B facts.
* **n2, n3: not changed, and that is accepted.** These are optional nits.

### New in this range
* **Nit (not blocking):** the first line's name in `tests/runtime/check_qa293_rep_tab_browser.cjs:45` still reads "the representative's city (not in the firm record)". For the city that is the very claim M1 found untrue, since the firm record holds Toronto. It is only a label: the line itself checks the button count. It could read "(not filled from the firm record)".
* Nothing else is wrong in the range. The new refusal comes after `parse(NewRow)` and `parse(NoneApply)`, so a malformed body still gets its own 400 first. The 404 for a person not on the case is unchanged (verified).

### Verdict (round 2)
**Approve.**
