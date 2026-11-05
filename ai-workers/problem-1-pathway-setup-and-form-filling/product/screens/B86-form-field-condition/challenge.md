# B86 — fresh challenge (independent, did not draft the concept)

Read on base e5f974a02, 5 Nov. US$0, no server started, nothing clicked. One pure-engine probe through `formCoverage` on a small made-up snapshot (no database, no AI), kept outside the repository. Line numbers are from this base.

## Verdict
**Build after these changes.** The shape is right: a person confirms, a second person approves, the comparison stays as it is. It does not yet close the trap for a person, and its fill change has the wrong home. One Blocker (order of rows), five Majors, six Minors. Every fix below makes the row smaller or the same size, except M3, M4 and M5.

## Objections

### Blocker

**B1. The walk's first step does not exist for a person on the concept's base. Needed for the proof.**
* **What breaks:** Done when 1 needs "Has used other name" to be a question before step 5 can propose a condition on it. On this base no screen offers "ask this Yes/No form field as its own question".
* **Example:** on the six, by screens only, `person.has_used_other_name` is not placed, so the condition on "Other family name" is left out. There is no card, and nothing to confirm.
* **Evidence (fact, high):** QA-234 is Open. `grep own-question web/src` finds nothing. PR #1036 (B83) is Open, with no labels. `acceptance/lib/pack2.ts:125` calls the route, so the pack passes where a person cannot (P-322). Second dependency: Done when 5 needs a release on the six, and QA-233 (B82) is Open at this base, which refuses Submit there.
* **Fix:** the concept names both dependencies. The row starts after #1036 is on main. It either waits for B82 or says in its definition of ready that Done when 5 is proved on a case from a copy where B82's three lines are handled. The concept mentions neither today.

### Major

**M1. A box rule with no matching question condition blanks an answered value, and nothing catches it. Needed for the proof.**
* **What breaks:** BR-5 obeys the box's rule whatever the question now says. BR-3 re-checks only that the box still reads the question and that its words are the same.
* **Examples:**
  * The box is confirmed from a waiting card and approved, then the card is rejected, or the second person returns the condition. The question stays always asked, and its Yes/No is asked too because the indicator box reads it. A client answers No but also types a name, or the deciding answer is never given. The form drops the answer silently.
  * The same happens when a person later removes the condition by hand (`check_grounding_db.ts:141` shows that route).
  * The release is not the safety net. `studio.ts:1201` publishes every draft box of every form the releasing combination uses, so another combination can carry that rule out. BR-4's added strictness does not catch this: the deciding question is placed, so the rule passes.
  * The POST also has no check of the effect. BR-1 copies "the question's own condition" from a HIDE or REQUIRE placement too. With HIDE the box would be written exactly when the question is hidden. The 29 fixture conditions are REQUIRE or OPTIONAL.
* **Fact or judgment:** the code path is fact (`render.ts:243`, `validate.ts:182` compares only for placements that have a condition). The harm is judgment, confidence high.
* **Fix (smaller than the concept):** **a box's rule is in force only while it equals its question's own SHOW condition** (the same `bareCond` comparison). Otherwise the box behaves as today and the row reads "Holds a different condition" with Undo. POST refuses (409, in words) unless the question's effect is SHOW, or a waiting card supplies it. This makes the orphan inert, closes order-of-approval and rejected-card together, and lets BR-4's added strictness and its new word line go: the question's own Unreachable check already covers it, so **the rule file does not change except `boxCond`**.

**M2. BR-5's home in `render.ts` is what the question list reads, so the concept's reason for "the list does not move" is wrong. Needed for the proof (Done when 7's stop line).**
* **What breaks:** the concept says nothing here touches the list. But `pqr-drafts.ts:77` → `factSources` → `sources.ts:94,100` reads `previewRender`'s coverage rows. Other readers of the same rows are `form-part-placements.ts:137`, `engine/coverage.ts:42`, `runtime/case.ts:273` (`fills`, then `needed` at `:289`) and `runtime/questionnaires.ts:101`.
* **Example:** a preview has no answers, so **every confirmed box is `cannot_tell`, which is "not true"**. A build that skips the row, or skips `needs` at `render.ts:135-137`, moves `vv.single-ae2133b8a398`, stops the deciding question being asked (P-62), and shows "Not needed: … is No" on Preview for a question nobody has answered. The Coverage union and `web/src/pages/preview.tsx:11` would also need a new word.
* **Fix:** **leave `render.ts` alone. Put BR-5 in `runtime/forms.ts formCoverage`, beside the QA-165 guard.** Every writer goes through it: fill-case, sign-steps, case-prepare, submission, and `answer-keys.ts:322`. Preview, list, placement and `fills` then cannot move, by construction. Mark the box with its own coverage word and drop its value. **Do not reuse "answered on screen":** `submission-record.ts:31` counts it as a current value. The other readers need one small change each:
  * `factsOf`: none needed, since it takes only "confirmed fact".
  * `form-values.ts:36`: already falls to `detail`.
  * `mandatory.ts`: a line before `:67`, or the box falls to `:83` "needs an answer". This holds whether or not a value is stored.
  * `answer-sheet.ts:48-51`: skip the box, or it is listed as `waiting` on the portal sheet.
* **Words:** "is No" only when the answer is false. Unanswered reads "Waiting for 'Has used other name'". Tests: list sha, a stale value, unanswered, mandatory, sheet.
* **Known difference (judgment, acceptable):** the Studio's sample fill (`fill.ts:78`) reads render directly, as it does for QA-165 today. It is not a filing.

**M3. The concept's own example leaves IMM 5257's Yes/No box stuck for ever. Needed for the proof (Done when 5).**
* **What breaks:** Yes, a typed name, then No. The name box blanks, as BR-5 wants, but "Have you ever used any other name?" stays unwritten with an instruction nobody can carry out.
* **Evidence:**
  * **Probe (fact):** gate No and name both confirmed gives the indicator box `coverage "answered on screen"`, fix "…answered No, but "Name" is recorded: correct one of them, then confirm…", while the name box reads `confirmed fact, "OLD NAME"`. Cause: `forms.ts:42-44`.
  * A principal's questionnaire answer is confirmed on entry (`case.ts:60`), so no staff step is involved.
  * The hidden question has no control, only "Not asked now: a rule hides it. The earlier answer is kept and not used." (`questionnaire.tsx:698-702`).
  * An answer cannot be cleared: "an answer can be changed but not cleared" (`:467`, `:775`), and I found no delete route for an answer. So flipping to Yes does not help either.
  * QA-165 was built on REQUIRE, where the question stays visible. No released SHOW condition exists today, so nobody has met this. `mandatory.ts:67` lists it as "needs an answer".
* **Fix:** a fact whose question is hidden by its SHOW condition does not count as "recorded" at `forms.ts:42` or `:66`, matching the screen's own words. The form then writes No. REQUIRE keeps QA-165 exactly, so `check_c72_imm5257_fill` stays green. The tech lead rules that Done when 5's "never written" means the name is never written and the Yes/No writes N. If he rules otherwise, a way to clear an answer is needed instead.

**M4. The trap moves to the other combinations, and §8 and BR-2 hide it. Needed for the proof for the words and the count; the door itself is Not built.**
* **What breaks:** a question's condition is library-wide, and §8 measures only the forms `vv.single` files. Saved maps show other forms' Yes/No boxes reading these same questions with **no words at all**, so BR-2 refuses them. `validate.ts:182` then refuses that combination's Submit for good. BR-2's copy says "Correct its map first", but **no route writes `form_field_map.condition`** (fact: its writers are `sources.ts:917`, `impact.ts:231` and `import.ts:112` only).
* **Example (fact from the newest saved runs, confidence medium until measured on a copy):**
  * IMM 1294: `…AliasNameIndicator` reads `person.other_family_name`, transform "derive: Y if any other family or given name is recorded…", no words. `natIDIndicator` is the same.
  * IMM 5710, IMM 0008 DEP and IMM 1344 are the same.
  * The way out is "ask as own question", but its table holds only `vv.single` (`own-yes-no.ts:32`). The route needs `isWorkedOutYesNo`, whose pattern needs `^derived:` (`p5/transforms.ts:68`, `own-question.ts:83`), so these transforms look refused too. Not run end to end.
  * The same runs show `other_family_name` on 4 boxes of IMM 1344 and 3 of IMM 0008, so "1 click, 9 of 222" holds for one combination only, each click with its own second-person approval.
* **Fix (no new door here):**
  1. Re-measure §8 across all six: boxes per target question, words or none, worked-out or not.
  2. The refusal names the real way by the box's kind. A worked-out Yes/No points to asking it as its own question, if the route takes it. Otherwise it says plainly that this form cannot carry the condition yet, and gives the choice: keep it and hold this combination, or remove it.
  3. The tech lead opens a row for the worked-out boxes of the other forms, as he did for the answer values.
  4. The second person's line says how many form fields elsewhere are still unconfirmed (RULES-MODEL §5 guard rail 3). A count is enough.

  Bulk stays Not built.

**M5. The door's ends: a returned change is stuck, and BR-7's Undo is refused before the first release. Needed for the proof.**
* **What breaks:** "Same shape" as `question-condition.ts` carries `OPEN = WAITING, RETURNED, APPROVED` (`:14`, `:41`) into the new kind.
* **Examples:**
  * A second person returns a confirmation. Withdraw refuses every kind not listed (`library-changes.ts:223-224`), so the row can only be resent and never dropped.
  * A second person approves, and the author sees it was wrong. An approved change stays open until a release (`releaseCondition` pattern), so Undo gets "Already waiting". On the six nothing has been released yet, so the mistake can be undone only after it ships, which BR-7 exists to prevent.
* **Fix:**
  * Add the kind to the withdraw list ("nothing applied before approval", as `SUPPLIES_KIND`), and refuse resend the same way (`:187`), so proposing again re-runs the checks.
  * Block a new proposal only on WAITING or RETURNED.
  * An approved change that a later one supersedes is closed, not left open.
  * Release marks it RELEASED when no draft box remains.
  * Tests: return → withdraw → propose again; approve → Undo → approve, all before any release.

### Minor

* **m1. "No field codes" resolver (Needed for the proof, Done when 9).** It is sound for the three indicator codes, once the box reads its own question. Say the rule exactly: only identifier-shaped tokens (`natIDIndicator`), matching one data-path segment of that edition exactly. Plain words such as "purpose" or "Other" are never resolved. Saved words also carry notes such as "data path sits under MaritalStatus but…" and "PCRIndicator", and those rows would read wrongly if resolved loosely. When the code's box is a worked-out Yes/No reading the target itself (M4's forms), show "another form field" and no warning, or "Only when Family name… = Y" appears with a false alarm.
* **m2. Card or library (Needed).** BR-1 does not say which wins. Take the card only while it is waiting, belongs to this combination, its target is this fact, and the library holds no condition or the same one; otherwise 409. One test.
* **m3. BR-6 both ways (Needed).** The refresh must also lower a rating (un-confirmed goes back to Check) and leave Decide alone. Add one test for each, and keep "already waiting" in the message.
* **m4. BR-10 (Not built).** Drop it. The concept itself says refusing is safe. With M1, a merged deciding field leaves the rule inert and refused until re-confirmed, at no cost, and `Reader` kinds and change-set previews stay untouched. Merging the box's own fact is already handled (`api/src/forms.ts:377`).
* **m5. Review page (Needed for the walk).** `review.tsx:87` shows 8 problems until "Show all". On the six the panel can sit behind it. Sort "Hiding a value" first or show a count. One line.
* **m6. Records.** Rule 3 of SA-1B-7 is the team's requirement and outranks the audit's exception, so §7 question 3 goes to the founder, not "for the record" (AGENTS rule 2). "C: not now" is cited as a standing ruling, but I find it only in this concept; give its source or ask.

## What is sound (checked in code)
* **The guard is not weakened (P-303).** Swapping to `e.condition_rule` leaves `validate.ts:182` as it is: SHOW only, one failing box fails the form, every edition counts. Text never compared equal, so nothing is freed. By grep, no rule test gives a box an object condition, so existing tests stay unedited. With M1, a client reaches OK only when box and question hold the same condition and the fill obeys it.
* **The second hole is real (probe, fact).** A hidden question's confirmed answer is written today at `render.ts:138-139`, against the screen's own "kept and not used". Calling it out was right.
* **The approval's re-check is safe.** A refused apply goes back to WAITING (`screen02.ts:136-137`); `revise` on a draft updates in place and `strip` carries the new column.
* **BR-8 is needed.** `field_maps` is not in `KINDS`, and `studio.ts:1034` would refuse a box-only change.
* **BR-6's claim holds.** `qd-conditions.ts:248` clears by itself. The saved v2 pair names questions by key, so `named_exactly` passes and Ready is reachable for the two agreed items.
* **BR-9 is right.** `impact.ts:231` carries an unchanged box; `sources.ts:911` starts fresh.
* **Snapshot additive-only keeps old fingerprints.** Released snapshots are frozen, so open cases do not change.
* **A copy goes out of date on a changed answer** through `changedFacts`, since the box leaves or joins the facts.
* **Answer keys.** The families and the E1 key hold none of the target facts, and `runFieldMap` goes through `formCoverage`, so keys test the guard. A rule changes the key's item fingerprint, so it runs again.
* **Fill trials are unaffected today.** Every record's `map_version` is null. Leave `mapVersion` alone; it is worth revisiting only when a record carries a version.
* **Unconfirmed deciding answers are safe.** A required gate that fills the form blocks filing at `readiness` until confirmed. Keeping the same truth as "hidden" is right.
* **Replay is safe** once M2 is applied: role, key and label do not depend on the rule. Do not add the rule to `conds` or `used` in `snapshot.ts`; the question's predicate already brings the deciding field.
* **Scope is honest.** Bulk, propose-to-others and one-line approval are rightly Not built. All 9 Done when are covered once B1 and M3 are answered. "Sample, Unconfirmed: expert" (BR-11) is right.

## Back-end plan
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Box rule | `form_field_map.condition_rule Json?`, additive; snapshot key only when set | none | `validate.ts:174` `boxCond` only | old fingerprint unchanged; Done when 2 cases, existing tests unedited |
| Confirm, un-confirm | `library_change` kind `form_field_condition`, `matches` { before, after, words, data path, edition } | `POST /library/form-field-conditions`; existing approve, return, withdraw (M5) | server copies the condition (m2); SHOW only (M1); words required; re-check at approval | 401, 403, 404, 409 in words; return → withdraw; approve → Undo before release |
| Panel | none | `GET /combinations/:id/questions/:fact/form-fields?item=`, every edition | states from M1; words per m1 | each state; keyboard, axe, 1440 px; a form with no words (M4) |
| Fill | none | none | `forms.ts formCoverage` only (M2); in force only per M1; `forms.ts:42,66` (M3) | first, failing on main: stale value; Yes→No→Yes; unanswered; mandatory; sheet; `check_c72` green; list sha printed |
| Ready | `proposal_item` rating | Saved draft | BR-6 both ways | Check→Ready; one round stays Decide; un-confirm→Check |
| Release | none | none | `diff` line (BR-8); mark released | a box-only change is listed and can be submitted |
| Six-wide count | none | none | none | §8 re-measured (M4) |

## Questions for the founder (≤3, recommendation first)
1. **Reading of the team's rule SA-1B-7 rule 3 ("publish blocks a placement that hides a field a form box or rule reads").** Recommend: a box confirmed under the same condition does not read the field while it is hidden, and the fill now guarantees that, so the rule holds. If you read it literally, B falls and the conditions become REQUIRE. Build need not wait: this is reviewable next morning under P-223 (4).
2. **B or C,** only if the tech lead finds no record of "C: not now". Recommend B, for the concept's reasons.

## Lead response

## Agreement

## Build discoveries
