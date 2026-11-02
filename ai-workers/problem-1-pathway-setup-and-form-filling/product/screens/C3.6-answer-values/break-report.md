# Break report: C3.6 answer values (commit 795015d2, branch forms-c36-values)

Isolated copy `brk_c36` on :4467 (`xr_studio_brk_c36`), web rebuilt, demo reset and load, test predicates inserted as
`tests/check_forms_c36_answer_values.ts` does (that suite: 27/27 pass on this copy). Live AI off, no priced button. API paths are relative to `/api`.

## Blocker

**B1. A choice field is released while its answer list is not, even when the list was returned.**
Steps: accept `person.travels_with` (values) as user-C, which creates field ADD and list ADD `who_the_child_travels_with_answers`. As user-B: approve
the field ADD (`POST /library/changes/<field>/approve`), return the list ADD (`.../<list>/return`), then `POST /pack/release {expectedChanges:7}`.
Expected: the field cannot be approved or released without its list, or both go together.
Actual: 201. `person.travels_with` (and `person.returns_with`, which reused the list) are **PUBLISHED** with `answer_list_key` pointing at a list
that stays **DRAFT** with its ADD **RETURNED**. The live library now has choice fields whose list is not live. Nothing ties the two ADDs together.
The field's change view (`api/src/screen02.ts:104`) does not show the approver the list or its state either.
Code: `api/src/proposals.ts:236-239` (two independent `waitingAdd`s), release in `api/src/library-changes.ts` (publishes each approved ADD alone).

**B2. Undo removes a list that another accepted field already uses (dangling reference).**
Steps: propose fact_1 `["Alone","Both parents"]` and fact_2 `["Both parents","Alone"]`. As user-C accept fact_1 (batch A), then accept fact_2
(it reuses the new DRAFT list `fact_one_answers`). Within 10 s, `POST /review/proposals/undo/<A>`.
Expected: refused in words ("now used by …"), as the C11.13 M3 guard does for proposals of kind reuse.
Actual: `{"undone":1}`. `answer_list` row `fact_one_answers` is deleted, but `person.fact_2.answer_list_key = fact_one_answers` remains (0 rows).
Its field ADD still waits, so approving and releasing it publishes a choice field with no list.
Code: guard `api/src/proposals.ts:437-441` looks only at `reuse.match="reuse"` proposals; landValues reuse is invisible to it; delete at :449.

## Major

**M1. Reuse takes a waiting DRAFT list, not the live one.** `landValues` matches `status in (DRAFT, PUBLISHED)` (`proposals.ts:185`), so a second
field is attached to a list nobody has approved (the suite's own "reuses the live list" check passes on a DRAFT list). This is the root of B1 and B2.

**M2. The edit action skips every C3.6 rule.** `POST /review/proposals/decide {action:"edit"}` only checks the contract (`proposals.ts:361`):
- `valueType:"yes_no"` with values `maybe/perhaps` lands with 201, giving a BOOLEAN field with answer list `fact_three_answers`.
- `valueType:"code"` with no `values` lands a choice field with no list (201, `answer_list_key` empty).
- Codes are typed rather than built, and need not match their words: `{code:"sun",label:"Moon"}` lands as `sun=Moon`. A label of a single space `" "` lands as an empty-looking value.
- `valueType:"banana"` lands (STRING). This is an earlier gap, but the edit now also carries a list for it.
- Duplicate codes (`red`/`red`) give 409 "the database refused a duplicate. Refresh to see the current state": wrong words, and refreshing does not help.
Expected: an edit runs `answerValues` (valueType ↔ values, built codes, two or more, distinct) like the add routes do.

**M3. Values in other scripts are refused with a false message.** `["Оба родителя","Один родитель"]`, `["両親","片親"]`, Arabic values, and
`["Alone","Один"]` are all refused: `Answer value "Оба родителя" has no letters or digits`. The same message appears in the browser alert. Accented Latin works
(`Père` gives `pere`). Code: ASCII-only slug, `api/src/rule-facts.ts:81-83`. Expected: a non-Latin value gets a code (for example `v_1`) or a correct refusal.

## Minor

- m1. The ASCII slug and the 60-character cut merge distinct values, and the refusal says they are "the same answer value": `C++`/`C#`, `18`/`18+`,
  `İstanbul`/`Istanbul`, two values that share their first 60 characters (`…A yes` / `…A no`), and `✈️ Alone`/`Alone`. `Straße` becomes the code `stra_e`. (`rule-facts.ts:81`)
- m2. The UI textarea has `maxLength={8000}` (`web/src/components/rule-facts.tsx:19`), so 400 values of about 20 characters are silently cut to 369 lines, the last
  one possibly cut mid-word, with no message. The API accepts the full 400 × 200.
- m3 (from the code, `proposals.ts:184-187`). Reuse compares codes only, so the reviewer can accept labels that never land. `["ALONE!","Both-parents"]` reuses a list worded "Alone/Both parents".
- m4. Two parallel accepts with the same code set (`Par A` `["Xa","Ya"]`, `Par B` `["Ya","Xa"]`) create two lists, `par_a_answers` and `par_b_answers`, with
  identical codes. The identity rule breaks under concurrency because `landValues` takes no lock.
- m5. `values:"Alone\nBoth"` (a string) is refused as "Invalid input: expected array, received string" (Zod words, not plain words).
- m6. Returning the field ADD while approving the list ADD leaves an orphan published list (the same unlinked-pair cause as B1).

## What held
- Empty and whitespace-only values (NBSP included), repeats in any letter case, one value only, no values on a choice, and values on yes_no or date
  are all refused in words, by place, on both add routes. Nothing is proposed after a refusal.
- 401 values are refused ("At most 400"). 400 × 200-character accented values (156 KB body): proposed in 0.09 s, To review group 196 KB in 10 ms,
  accepted with 400 list values. Non-string values (numbers, null, nested arrays, booleans) are refused: "Write each answer value as words."
- Permissions: user-B (approver), user-O (officer) and user-P (client) get 403 on both add routes; user-P and user-O get 403 on decide.
- XSS: `<img onerror>` and `<script>` in the label and values are shown as text on To review, with no dialog and no page error (screenshot at 1024 px and 200 %).
- Keyboard: Add, then name, type, meaning, values and Propose are reachable with Tab. The values box appears only for a choice.
- Undo of a batch whose list nobody reuses removes the field and its list (suite check).
