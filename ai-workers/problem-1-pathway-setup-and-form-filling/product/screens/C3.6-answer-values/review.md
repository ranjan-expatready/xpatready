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
