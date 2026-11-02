# C3.6 answer values: review (commit 795015d2, base bae3db4b)

Reviewer: independent (did not build it). Isolated copy `rev_c36` on :4466, web rebuilt, live AI off. Date: 2 Nov.
Suites: `check_forms_c36_answer_values.ts` 27/27, `check_forms_c36_answer_values_browser.cjs` 8/8 (both on :4466). No committed file was rewritten.

**Verdict: Block** (1 Blocker, 2 Majors open). In skill terms: *Ship after fixes*.

## What holds
- `answerValues()` (api/src/rule-facts.ts:73) builds the codes from words (P-34), and refuses in words an empty value (by its place), a repeat (letter case ignored), two labels that make one code, a choice with no values or only one, and values on a non-choice. Both add routes call it before they write anything (the test checks the count is 0).
- A proposal lands with its list on accept, with codes, words and order kept. A new list gets its own WAITING ADD beside the field. The same set of codes reuses the live list. Undo of a reused list leaves that list alone, because the batch has no list ADD.
- The To review side panel lists the values in words (proposals.tsx:173). axe finds 0 problems on the open form. No sideways scroll at 1024 px or at 640 px (200 % zoom). No page errors.
- The contract changes add fields only: `values` is optional on the field payload. AI producers of field payloads still parse. `identityKeyOf`/`sameInLibrary` ignore `values`.

## Blocker
**B1. A list the second person RETURNED is published anyway.** Reproduced on :4466:
1. Accept person.travels_with.
2. user-A returns the `answer_list` ADD ("These values are wrong") and approves the `field` ADD.
3. Submit, SME sign-off, approve the combination.
4. Result: `who_the_child_travels_with_answers` is **PUBLISHED**, its ADD stays **RETURNED** for good, and person.returns_with (which reused it) is published on it too. The release reply lists only the two field ADDs (`"lists":1` under `published`).

Cause:
- The combination release publishes every draft list its snapshot's fields name (api/src/studio.ts:1004).
- `unapprovedAdds` gates fields, sections and document types only, not `answer_list` (api/src/library-changes.ts:106).
- The SME change summary has no line for the list.

Before this item, no lander attached a waiting list to a field. Now every choice fact does, so P-158 "a second person approves" is skipped for every new list.

Fix: gate the release on the list ADD (add `answer_list` to `unapprovedAdds`/`itemsOf` from `snapshot.canonical_fields[].answer_list`), or decide the field and its list as one unit. Add a test: return the list, approve the field, then release → 409 in words.

## Majors
**M1. Undo deletes a new list that another field already reuses, leaving a dangling key.** Reproduced:
1. Accept "Pet kind" (new list `pet_kind_answers`).
2. Accept "Pet kind at return" with the same codes (it reuses that list).
3. Undo the first batch within 10 s.
4. Result: person.pet_kind_at_return keeps `answer_list_key = pet_kind_answers`, and 0 rows of that list exist.

Cause: `undo` checks reuse only through `proposalItem.reuse` (proposals.ts:430-432), not through `canonical_field.answer_list_key`. The list also has no `landedStamp`, so an edit made to the list inside the 10 s is erased without a word (proposals.ts:396 stamps `r.kind` only).

Fix: refuse in words when another field points at a list in this batch, and stamp the list as well. Add a test for each.

**M2. The second person approves the list without seeing its values.**
- `/review/change/<answer_list ADD>` shows only "Add answer list: Who the child travels with: answers", the proposer and the reason. No values.
- The field page (`/library/fields/person.travels_with`) does not show its list either.
- No Studio page shows an answer list.

The person who accepts the proposal sees the values, but that person is the ADD's `proposedBy`/`appliedBy` (proposals.ts:178), so they cannot approve it. The real second person approves blind. That fails the item's own "the second person reads the list" and P-158.

Fix: show the values on the list ADD's change page, and show which list the field takes on its field page (and on its ADD).

## Minors
- m1. The edit action (API only; rules items have no readings, so the UI has no edit button for them) skips `answerValues()`.
  - Duplicate codes come back as 409 "Already in progress or already exists: the database refused a duplicate", which is wrong words.
  - Values on a `yes_no` edit are accepted, and that yes/no field gets a list (`person.seat_kind|yes_no|seat_kind_answers`).
  - Codes are typed through this route (P-34).
  - Fix: run the same checks on an edited field payload.
- m2. `landValues` reuses DRAFT lists whose ADD is WAITING or RETURNED, so a returned list spreads to new fields (proposals.ts:185). Prefer a PUBLISHED list or one whose ADD is approved, or refuse a list that was returned.
- m3. Approving the list and returning or withdrawing the field leaves an orphan list ADD. Withdraw handles fields only (library-changes.ts:164).
- m4. The pure test checks a multi_choice repeat. No test lands a multi_choice fact or checks how a rule reads it downstream (my probe landed one: `value_type multi_choice`, `data_type ENUM`).
- m5. The tests have no case for a split decision, a release, a cross-batch Undo or an edit with values, so removing the rules that B1/M1 need would fail no test.

## Standards and dimensions (short)
- Words: plain and right ("Answer values, one per line", "Several from a list").
- Keys never typed: met on both add routes, not on edit (m1).
- Sources: values labelled Sample in the meanings, and the source names the rule (P-170 n/a, Sample).
- Second-person approval: **not met** (B1, M2).
- Data integrity: **not met** (M1).
- Accessibility: axe 0. Keyboard-only uses standard controls (not walked key by key).
- D17/D20: simulated only.
- Graph: C3.6 is named by 6 tests (GRAPH.md:54). Overall graph counts G3 5 and G6 2; not checked whether this item's routes are among them.

## Journey score (reviewer): 6.5 / 10, fail (see `journey-test-reviewer-2026-11-02.md`)

## Could not check
A real screen reader. An intended user's unaided walk. Runtime R3 using the list (another lane).

## Round 2 (b09bad01)

Same copy `rev_c36` on :4466, web rebuilt, live AI off, US$0. Fix diff `bf057573..b09bad01` (merge of #412 ignored).
Suites on :4466 (each after a demo reset): c36 answer values 38/38, its browser 8/8, p149 73/73, rule facts 42/42, c36 acceptance 17/17, c1113 21/21, c34 29/29, screen02 slice2 53/53 (the file has 53 checks, not 62), queue_tx 8/8. No committed file was rewritten by a test.
Note: while I reviewed, uncommitted edits appeared in this tree (`api/src/proposals.ts` `ridingLists`, `api/src/rule-facts.ts` `valuesCompared`, and the breaker's round 2 in break-report.md). They are not part of b09bad01. This verdict is for b09bad01 only.

**Verdict: Block** (1 Major open). In skill terms: *Ship after fixes*.

### Round-1 findings
- **B1 fixed.** The list has no ADD of its own and rides with its field. Combination route (studio.ts:1004) with the field RETURNED: submit 201, SME sign-off 201, approve → 409 "Release refused: it uses "Who the child travels with", a new shared field that is returned to the author". Field and list stay DRAFT. With the field APPROVED, the combination release publishes field and list together (`lists:1`) and the ADD becomes RELEASED. Pack release does the same (`publishLibraryChanges` → `releaseFieldList`). Withdraw of the returned field removes the field and its list (0 rows each).
- **M1 fixed for fields.** Only a PUBLISHED list with the same codes, words and order is reused (`landAnswerList`), so a second field never shares a draft list. `dropFieldList` keeps a list another field still names. See R2-M1 for the remaining hole.
- **M2 fixed.** `/review/change/<field ADD>` shows "Answer values: Cat · Dog · Москва (new list, approved with this field)", or "(an existing list)". axe 0, no sideways scroll at 1024 px, 640 px at 200 %, or 400 px, no page errors (screenshot in my scratchpad).
- **m1 fixed for route 1.** An edit is checked again by `checkedFieldValues`: values on yes/no are refused, a choice with no values is refused, and the codes are rebuilt from the words. See m-r2a for route 2.
- m2 and m6 are gone with the design change. m5 is covered by the new tests (release, return, reuse, edit).

### Major
**R2-M1. A form's answer list reuses a C3.6 draft list that has no ADD, and Undo then deletes it under the accepted item.** I reproduced this on :4466 (also break R2-M1):
1. Accept `person.zz_x` with the values English/French. This creates DRAFT `zz_probe_answers`, with no ADD.
2. Run the rules pass on IMM 5257. "Preference language" is proposed as `reuse` of `zz_probe_answers`. Accept it (201, `landedAs: zz_probe_answers`).
3. Undo the step-1 batch → `{"undone":1}`.

Result: the list has 0 rows, and the form item stays `accepted` with `decided_key = zz_probe_answers`. Before this, the form's list also "reused" a list nobody had approved, and it would never reach the library on its own.

Cause:
- `sameInLibrary` and `usableInLibrary` still treat any DRAFT list as a library item (proposals.ts:68-70, :87).
- `dropFieldList` counts only field users (answer-values.ts `dropFieldList`).

Fix: a draft list with no `answer_list` ADD is not reusable by another proposal. Also, Undo and withdraw keep (or refuse in words) a list that an accepted item names. Add a test that fails when either rule is removed.

### Minor
- m-r2a. Route 2 (`/rules/:key/fact`) sets no `work.ruleFact`, so `needsValues` is false (proposals.ts:241). An edit of such an item to `code` with no values lands `person.pick_kind|code|(none)`, a choice without a list. API only: rules items have no edit button. Fix: also require values when `r.step === "rule_fact"`.
- m-r2b. Once released, a list that was new on that change reads "(an existing list)" on the change page. The words are right for the approver before release and slightly off afterwards.
- The breaker's round 2 also lists R2-M2 (rule value not among the values) and m-a to m-e. I did not re-score them here.

### Dimensions (changed since round 1)
- Second-person approval: **met**. The release is gated through the field, and the approver sees the values.
- Data integrity: **not met** (R2-M1).
- Keys never typed: met on add and on the route-1 edit.

### Journey score (reviewer): 9 / 10, pass (see journey file, Round 2). The verdict is still Block because R2-M1 is open.

## Round 3 (c0d427e6, then 7d5d3d54)

Reviewed at the builder's head **7d5d3d54** (c0d427e6 plus one commit: a list is riding only when a DRAFT field names it and it has no ADD). Same copy `rev_c36` on :4466, web rebuilt, server restarted on 7d5d3d54, live AI off, US$0.
Suites on :4466 (each after a demo reset): c36 answer values 44/44, its browser 8/8, p149 73/73, rule facts 42/42, c36 acceptance 17/17, c1113 21/21, c34 29/29, queue browser 28/28, screen02 slice2 62/62, proposal contract exit 0. I reverted the screenshots the suites rewrote (02-ai-work, W1-shared-library).

**Verdict: Block** (1 Major open). In skill terms: *Ship after fixes*.

### Round-2 findings
- **R2-M1 fixed.** My reproduction (scratchpad `probe3.ts`) on 7d5d3d54: accept `person.zz_x` with English/French, run the IMM 5257 rules pass. "Preference language" is now proposed as `new`, not reused, and lands as `preference_language`. Undo of the field batch → `{"undone":1}`, the field's list is gone, and no accepted item names it. The seeded p149 draft list with no field is still reusable (p149 73/73). The new test fails if `ridingLists` is removed (it asserts 0 reuses of the riding key).
- **R2-M2 fixed on both add routes.** Route 1: `["Both parents","One parent"]` against `eq "alone"` → 400 "Rule r_a compares person.p_a with "alone", which is not among the answer values (both_parents, one_parent)…". The typo `Alon` gets the same refusal. Values inside `and`/`not`/`in` are found. Route 2 is refused when the rule reads the built key. See m-r3a for the edit.
- **m-r2a fixed.** A route-2 edit to `multi_choice` or `code` with no values → 400 "A choice needs its answer values…". With values, it lands `code` plus `pe_probe_answers`.
- **m-r2b fixed.** The page reads "a released list".
- **m-e fixed with one regression (R3-M1).** 400 values sit in a 212 px box. Approve is at y = 817 at 1024 px, 837 at 640 px (200 %) and 904 at 400 px. No sideways scroll, no page errors.
- **m-d partly fixed.** ZWSP twins are refused ("A" is listed twice). See m-r3b.

### Major
**R3-M1. axe finds a serious issue on the change page when the list scrolls (the [M] "axe-core on every screen state" is not met).** `/review/change/<field ADD>` with 400 values gives `scrollable-region-focusable` (1 node) at 1024, 640 (200 %) and 400 px. A 2-value list is axe 0. Cause: the `<ul className="max-h-48 … overflow-auto">` in `web/src/pages/review-items.tsx:85` cannot take focus. Fix: give the list `tabIndex={0}` and an accessible name (for example `aria-label="Answer values"`). Add an axe run on a long-list state to `check_forms_c36_answer_values_browser.cjs`.

### Minor
- m-r3a. An edit on To review can still drop the value the rule compares, because the lander does not run `ruleValuesKnown`. Route 1 added with Both parents/Alone, then edited to Both parents/One parent → 201, and it lands `both_parents,one_parent` while the rule says `eq "alone"`. This is API only: the screen has no value editing. Fix: run the same check in `LANDERS.field` when `work.ruleFact` names the rule.
- m-r3b. The soft hyphen U+00AD is not dropped (`answer-values.ts:25`). `Alone` and `Alone`+U+00AD land as `alone` and `alone_2`, which look the same. The breaker's m-d named this character.
- m-r3c (nit). A rule that compares a choice with a number (`eq 3`) passes, because `valuesCompared` keeps strings only.
- Not fixed and to be listed in the PR, as the builder says: m-a, m-b, m-c.

### Dimensions (changed since round 2)
- Data integrity: **met** for the screen paths. m-r3a is API only.
- Accessibility: **not met** (R3-M1).

### Journey score (reviewer): 9.5 / 10, pass (see journey file, Round 3). The verdict is still Block because R3-M1 is open.

## Round 4 (285f45e2)

Reviewed at **285f45e2** (7d5d3d54 plus one commit). Fresh copy `rev_c36` on :4466 (`tools/isolated.sh`), web rebuilt, live AI off, US$0. No files rewritten by the suites (git status clean).
Suites on :4466: c36 answer values 46/46, its browser 12/12, c36 rule facts 42/42 (regression spot-check: it covers the changed `rule-facts.ts`).

**Verdict: Approve** (no open Blocker or Major). In skill terms: *Ship*.

### Round-3 findings
- **R3-M1 fixed.** My probe (scratchpad `r4.cjs`): a 400-value field change opened by user-B gives axe 0 at 1024 px, 640 px (200 %) and 400 px. Tab reaches the list (named "Answer values"), `:focus-visible` shows the 3 px ring, and ArrowDown/PageDown scroll it (scrollTop 368). No sideways scroll, Approve at y = 817 / 837 / 918, no page errors. The new browser step runs axe on a 60-value list.
- **m-r3a fixed on both routes.** Route 1 is covered by the new test. Route 2 (`/combinations/:id/rules/:key/fact`): `work.ruleValues = ["alone"]` is stored. An edit to Both parents/One parent → 400 "Rule r_r4_three compares this fact with "alone", which is not among the answer values…", and an edit that keeps Alone → 201. Proposals made before this commit have no `ruleValues` and skip the check (acceptable: they are draft data only).
- **m-r3b fixed.** U+00AD is dropped; `Alone` and `Al­one` are refused as listed twice.
- Still open, listed in the PR as agreed: m-a, m-b, m-c, m-r3c.

### Dimensions (changed since round 3)
- Accessibility: **met**.
- Data integrity: **met**, including the API edit routes.

### Journey score (reviewer): 10 / 10, pass (see journey file, Round 4).
