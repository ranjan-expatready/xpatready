# B88 — break report (QA-239, C4.11)

The breaker did not build this item. It tested commit 2d85215f3 on branch `claude/loving-pascal-do4fvf`, 5 Nov, on an isolated copy (`isolated.sh forms_b88x 4690`, setup `tests/check_forms_b88_setup.ts`, stopped afterwards). Cost: US$0, no live AI. There is no build-notes.md in the item folder. Actors: user-A author, user-B approver, user-C reviewer. Paths are under `prototype/studio/`. The breaker changed some rows directly in the database to simulate changes no route can make yet. Each of those is marked "(DB)" and was put back afterwards.
**Uncommitted edits appeared during the test.** At 06:08, `form-field-condition.ts`, `library-changes.ts` and `form-field-conditions.tsx` changed in the working tree ("B88 review M3": restore a replaced change, keep the origin). The server had loaded its code at start and does not reload, so these findings are for 2d85215f3. M4 and m7 may already be in hand.

## Verdict
**No Blocker. 5 Majors, 9 Minors.** The door itself is sound. Forged targets, wrong roles, races and the approval re-checks were all refused in words. The rule (P-303) clears the Hiding error only when both the plain field and the Yes/No are done. The fill is right. The Majors concern the way back (BR-7), the record, and the words.

## Major
**M1. The second person's page heading shows the raw code `SET_FORM_FIELD_QUESTION`.**
* What I did: proposed an ask, then opened `/review/change/<id>`.
* Expected: plain words in the heading.
* Actual: the heading reads "SET_FORM_FIELD_QUESTION when a form field is filled: IMM 1294 · …".
* Where:
  * `ACTION_WORD` has no entry for the new action (`api/src/library-changes.ts:29`). It is used in the heading (`web/src/pages/review-items.tsx:70`) and on the release page (`web/src/pages/release.tsx:19`).
  * The audit line reads "(sET_FORM_FIELD_QUESTION)" (`actionVerb`, `library-changes.ts:32`; `screen02.ts:144`).
  * The kind word "when a form field is filled" is wrong for an ask. So is the self-approve refusal "change of when a form field is filled" (`:34`).
* Missed because: the browser test's `CODES` regex does not include the code (`tests/check_forms_b88_panel_browser.cjs:15`), and it screenshots only the `<dl>`.
* Screenshot: `second-person-1024.png`.

**M2. Once the Hiding error is cleared, Undo cannot be reached in the UI (BR-7).**
* What I did: B86 confirm on the plain field, then ask and approve.
* Expected: the Yes/No stays listed as "Asks its deciding question", with Undo.
* Actual:
  * The API answers `state: asked, can_undo: true`.
  * Review and release shows no panel at all. The panel appears only under a Hiding problem (`web/src/pages/review.tsx:91`) or a waiting condition card (`web/src/pages/proposals.tsx:251`).
  * To review and Forms have no Undo button either: 0 found.
* Effect: the job's own success removes its way back. Undo works only through the API.

**M3. After a new edition, the asked Yes/No has no row and Undo answers 404.**
* What I did (DB): made a new IMM 1294 edition carrying its form fields, as `impact.ts:231` does (same fact and step, CODE_MATCH). Then I opened the panel and posted `clear: true` on the new edition.
* Expected: the carried form field is listed as asked and can be undone (challenge m2; concept §9 says "done").
* Actual:
  * Only the old edition's row appears. Undo on the new edition answers 404 "no such form field reading that question".
  * Cause: `askedOf` and `askedHere` match by `edition:dataPath` of the change record, and `reads` needs `e.fact === fact` (`api/src/form-field-condition.ts:158-177`).
  * No other route can put the step back: B52 refuses with "already asked as its own question", and nothing else edits a mapped form field.

**M4. Proposing an Undo marks the applied ask WITHDRAWN "Replaced by a later change" at once, even if that Undo is then withdrawn or returned.**
* What I did: ask approved, then Undo proposed, then Undo withdrawn.
* Expected: the ask stays APPROVED, and the release marks it RELEASED.
* Actual:
  * The ask reads WITHDRAWN "Replaced by a later change of this form field.", but its draft is still applied.
  * `closeReplaced` runs at proposal (`form-field-condition.ts:274`, also `:252`).
  * `releaseFormFieldCondition` reads only APPROVED changes (`:111`), so the release never lists or marks it.
* Effect: the record says something false (P-188). The panel still says "asked", only because `askedOf` also reads WITHDRAWN.

**M5. The new buttons' visible labels are not in their accessible names (WCAG 2.5.3 Label in Name, level A).**
* "Asks the same question" is announced as "Asks the same as “Whether the person has ever used…”".
* "Undo" is announced as "Make Question 2 A … worked out from other answers again".
* Where: `web/src/components/form-field-conditions.tsx:49-50`.
* Effect: a speech-input user who says the visible label does not hit the button. axe (AA tags) does not flag this.

## Minor
* **m1. Approval does not re-check the block's details (BR-4).**
  * What I did (DB): between proposal and approval, re-pointed IMM 1294's other-given-name field to `person.other_given_name`.
  * Actual: approval still wrote `derived:any(person.other_family_name, person.other_given_names)`. QA-165 then never sees the box that is really there (`:96-102`).
* **m2. `blockFacts` can climb to a whole section (`engine/form-field-condition.ts:91`).**
  * For a Yes/No that sits directly under `PersonalDetails[0]` (IMM 1294 and IMM 5257 `PCRIndicator`, `SameAsCORIndicator`), it returns about 25 facts: birth city, citizenship and so on.
  * Asked, such a box could never write No (QA-165).
  * Not one of the 9 boxes measured: latent.
* **m3. A returned ask is refused with "withdraw it, then confirm the form field again"** (`library-changes.ts:190`). It should say "ask it again".
* **m4. `clear: true` on a worked-out row that was never asked gets B86's words** ("cannot be filled only under this condition"), not "nothing to undo" (`form-field-condition.ts:239`).
* **m5. The proposer's reason is left off the To review card for an ask** (`api/src/review-queue.ts:276`); B86's card shows "Reason: …".
* **m6. A reason of only zero-width spaces is accepted.** `z.string().trim().min(3)` (`form-field-condition.ts:120`) does not strip Cf characters; B52's `said` does.
* **m7. After Undo, the box keeps `origin: HUMAN` and the ask's printed-question evidence.** The AI's step is back, but it is no longer counted as AI-proposed (`applyAsk`, `:103`).
* **m8. A stale second tab shows the refusal in words, but the row is not refreshed.** It still offers "Asks the same question" (screenshot `two-sessions-1024.png`).
* **m9. After Enter on the ask button, focus falls to `<body>`.** The next Tab does reach "Open on To review", and a polite live region says "Sent to a second person on To review.".

## What held
* **Roles:** no actor 401; user-B, user-C or a client proposing 403; self-approve 403; client or officer approving 403; withdraw by user-B 403.
* **Forged targets:**
  * A random edition or combination: 404.
  * IMM 1294's box on Visitor visa, or IMM 5257's box on Study permit: 404.
  * A national-ID box under the family-name fact: 404.
  * A plain box with `ask`: 409.
  * An extra `field` key: 400 (strict schema).
  * `ask` together with `clear`: 400.
  * `"ask":"true"` as a string: 400.
  * Nothing gives the browser a way to name the target or the step.
* **Races:** 6 asks at once gave one 201, five 409 and one record. Approve by user-B, approve by user-C and withdraw at once gave exactly one decision.
* **Approval re-checks (DB):** each answered 409 "Changed since", the change went back to WAITING and nothing was written:
  * the condition changed to No;
  * the condition's effect changed to HIDE;
  * the condition was removed;
  * the box's step changed;
  * for Undo, the box changed.
* **Undo with no earlier step on record (DB):** 409 "Nothing to undo".
* **No route clears a Hiding error alone.** B52's one-person route lists none of IMM 1294's boxes and refuses the Yes/No with 409. The Hiding error stayed until both B86's confirmation and B88's ask were approved, and it came back on Undo with the AI's step restored.
* **Fill:** `check_forms_b88_fill.ts` passes 30/30. Code read: the filler's context holds only confirmed boxes (`engine/form-values.ts:30`), so a stale hidden name is never counted; No with a visible detail stays "answered on screen" (`engine/runtime/forms.ts`).
* **Return:** refused without a note. Then resubmit was refused (409), approving a returned change was refused (409), and so was a new ask (409).
* **Screen:**
  * No sideways scroll at 1024 px or at 720 px (200 % zoom).
  * axe AA clean (only the experimental `focus-order-semantics` on the info icon).
  * Reachable by Tab, with a visible 3 px focus ring.
  * Reload straight after Enter showed "waiting"; Back worked.
  * No console errors.
* **Budget:** the panel's GET took 26-52 ms on the sample data.
* **Not applicable:** B88 has no upload (it reads the committed form readings), so the hostile PDF does not apply. Nothing is typed but the reason, so duplicates and non-English text do not apply; a reason over 300 characters gets 400. 100 programs / 400 combinations: scale work is the team's (STANDARDS §9).
