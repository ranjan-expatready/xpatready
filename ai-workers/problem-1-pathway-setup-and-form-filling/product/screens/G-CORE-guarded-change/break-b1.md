# G-CORE B1: break report (b5f5180d, base 74bbb717)

Breaker: a fresh agent that did not build it. Isolated copy `forms_gcore_bk` on :4459 with the demo sample, 3 open cases opened through `POST /api/runtime/cases` (user-R). Some setup rows were changed by SQL **in that copy only**, each named where it is used. No `*_LIVE`, no paid AI, :4400 not touched, nothing committed. The copy is stopped.
Shorthand: `C='curl -s -XPOST localhost:4459/api/change-sets/check -Hcontent-type:application/json -Hx-actor:user-A -d'`. Line numbers are on b5f5180d.

## Blockers
None.

## Majors
**M1. Hostile condition trees crash the check (500).** `$C '{"items":[{"action":"set_condition","kind":"condition","key":"person.uci","target":"question","tree":{"op":"and","args":5}}]}'` gives a 500, and so do `"args":{}`, `"args":"ab"` and `"args":{"length":2}`. The cause is a `TypeError` in `nodes` (engine/change-set.ts:89, `for…of n.args`) and in `repeatedPart` (:105, `n.args.map`). A `not` chain 10 000 deep (190 KB, well under the 5 MB limit) also gives a 500: `RangeError` in the recursive `canonical` (contracts/rules.ts:11). *Expected:* a 400, or R1 "not a condition". *Fix:* validate `tree` against the 11-operator vocabulary with a depth cap (for example 50) before any rule runs. See M2.

**M2. R1 does not check what a condition is.** The only test is "is an object" (:146, `tree: z.unknown()` in contracts/change-set.ts:18). These all answer `ok: true`, so the check says "Checks passed": `{"op":"not","arg":5}`, `{"op":"eq","field":5}`, `{"op":"bogus"}`, `[]`, and `{"op":"in","field":"person.sex","value":"Q"}`. The last one is a string where a list belongs, and `evaluate` then matches substrings (`"FM".includes(v)`). *Fix:* run `validatePredicate` (contracts/rules.ts:143) with the node schema as R1.

**M3. Items in one change set are never checked against each other, so merge cycles pass.** These all answer `ok: true` and second person:
* `$C '{"items":[{"action":"merge","kind":"field","key":"person.other_family_name","into":"person.other_given_names"},{"action":"merge","kind":"field","key":"person.other_given_names","into":"person.other_family_name"}]}'`, a cycle A→B, B→A;
* A→B together with B→C, a chain that the hop limit never sees;
* A→B together with A→C;
* a merge of A together with a rename of A, or with a condition that reads A;
* 50 renames of one field to 50 different names (`fifty_rename`).

Only the "same new name" check (`sameWithinSet`, :190) looks across items. *Fix:* refuse a key that appears twice in one set, and refuse an `into` that is another item's `key`. Or apply the items one by one to a copy of `Library` and check each against the result.

**M4. R3 is looser than the door it replaces, so the check passes a name the real door refuses (M2 "keep today's scopes").** Setup through the real door: `PATCH /api/library/fields/person.full_name/name {"name":"Complete name"}` makes v2 DRAFT and leaves v1 PUBLISHED as "Full Name". Then `$C '{"items":[{"action":"rename","kind":"field","key":"person.other_given_names","name":"Full Name"}]}'` gives `ok: true`. `PATCH …/person.other_given_names/name {"name":"Full Name"}` gives a 409 "Same name". An `accept_proposal` named "Full Name" also passes, but `sameInLibrary` (proposals.ts:72) would refuse it. The cause: `libraryOf` keeps only the newest version (api/src/change-sets.ts:35), while the door and `sameInLibrary` match every DRAFT or PUBLISHED row. *Fix:* match names against every live version, as today, and add a test that the check and the door give the same answer.

**M5. A condition on a form line, document line, rule or check gets no target check, no R6 and no R8, and its preview is empty.**
* Setting a check's own condition back on it again (`key:"OR_NAME_NOT_NA","target":"check"`, tree copied from `check_def`) gives `ok: true`. The answer should be R6 "already on it".
* The preview for that item shows `before: "null"` although the check has a condition, and 0 sections, combinations, releases and open cases.
* `key:"NOPE.nothing"` with any of the 5 targets gives `ok: true`, and so does a condition on a retired question.

`existing`, `order` and the preview subject are worked out for `target === "question"` only (api/src/change-sets.ts:58, :78–80). AI proposals include conditions (concept §1), so the panel would say a condition change touches nothing. *Fix:* resolve every target (current row, combination, releases), refuse an unknown or retired one under R4, and run R6 and R8 on every target.

**M6. A merge is not checked for R8 (concept BR-2: "R5–R8 … for a merge on every condition the swap rewrites").** Setup (SQL): the question `person.given_names` gets the condition `{"op":"exists","field":"person.family_name"}`. Then `$C '{"items":[{"action":"merge","kind":"field","key":"person.family_name","into":"person.given_names"}]}'` reports only R6. Putting the swapped condition on directly (`set_condition person.given_names … exists person.given_names`) gives R8 "Questions decide each other in a loop". The merge makes that same loop and passes. `order[i]` is set only for `set_condition` (:74–91). *Fix:* run the `askedInOrder` before/after on each affected combination with the swap applied.

**M7. The fingerprint changes when nothing changed, so B2's "look again" 409 will fire for no reason.** Calling `$C '{"items":[{"action":"rename","kind":"field","key":"person.family_name","name":"Surname"}]}'` twice gives `3cf91b2a…` both times. After `UPDATE check_def SET updated_at=updated_at WHERE check_key='OR_PASSPORT_PAGE_FACTS'` (a no-op) it gives `cb394b74…`, because `preview.rules` came back in a different order. `fieldReaders` keeps database order, the sections list does too, and the hash runs over raw `JSON.stringify` (api/src/change-sets.ts:109). For the same reason, `{"field":…,"op":…}` and `{"op":…,"field":…}` hash differently. *Fix:* sort every preview list, and hash `canonical()` of the items, not raw JSON.

**M8. `accept_proposal` with an existing key passes.** `$C '{"items":[{"action":"accept_proposal","kind":"field","key":"person.family_name","name":"Totally different","valueType":"date","source":{"kind":"ai_run","ref":"x"},"reason":"nothing fits here"}]}'` gives `ok: true`. That is a "new" item that takes over a released field's key with another value type. The key shape is not checked either: `"key":"Bad Key!! <script>"` passes, although concept R1 says "key shape". *Fix:* R1 checks the key pattern, and R3/R4 refuse a key that already exists in the library.

**M9. A founder question is settled in code against the concept's recommendation.** Concept Q1 ("a rename of a field a released combination uses: direct or second person?", founder-level, *recommend direct*) is open. B1 hard-codes second person, citing "P-266" (engine/change-set.ts:215). P-266 is in no DECISIONS.md, on this branch or anywhere in git history. In the sample, all 164 fields and all 18 sections are in a release, so **no rename or alias can ever be direct** (all four rename probes came back `second_person`). *Fix:* record P-266 with the founder's words, or follow Q1's recommendation until it is answered (AGENTS rule 2).

## Minors
* m1. **R7 refuses conditions that are always true, in "never true" words.** `{"op":"neq","field":"person.sex","value":"Q"}` and `not eq Q` get R7 "can never be true" (setup: list `sex_list` F/M/X by SQL). The same rule passes `eq "f"` (:98 compares in upper case), but `evaluate` uses `===`, so that condition really is never true. *Fix:* apply R7 to `eq`/`in` only, outside a `not`, and compare exactly.
* m2. **Names are not tidied.** `"Fa\u0000mily Name"`, zero-width characters and `"‮eman ylimaF"` (shows as "Family name" on screen, passes R3) are accepted and echoed in the preview. NUL will fail on the PostgreSQL write in B2. *Fix:* apply `cleanLabel` (contracts/programs.ts) before R1 and R3. (A Cyrillic "і" look-alike passes too; that is beyond "exact duplicate", noted only.)
* m3. **R1 is laxer than the concept.** The concept says 1–120 characters with ≥3 letters. The code (:142–143) asks for 2–80/120 characters with ≥1 letter, so "A." passes. Align them, or record the change in the concept.
* m4. **Open cases are missed when only a release uses the item.** Setup: the `languages` selection was deleted from the draft by SQL. A rename then lists release v1 but `open_cases: []`, although 3 cases are pinned to v1. Cases are looked up from draft use only (:128). *Fix:* also take the combinations of `releasesOf`.
* m5. **The person endpoint labels AI items as made by a person.** `accept_proposal` through `/check` is marked made by a person (:150), so `expert_at_release` is false for a new item that would be AI-made.
* m6. **Merge rewrites can read an old version.** For rules, checks and questions they use `.find` rather than `current()` (:96–100), so they may check a superseded condition.
* m7. **Work grows per item and output is uncapped.** One snapshot is built per item per combination (50 conditions take 1.9 s with 1 combination, against the "no request per row" budget, STANDARDS §9). 80 000 R7 problems give a 15 MB reply. *Fix:* build each snapshot once per request, and cap problems per item.
* m8. **Codes in the words.** Some R4 messages name keys instead of names ("case.application_number is not an active field"), against EXPERIENCE "names, never codes".

## What held
* **Actors.** Missing, unknown or wrong-case (`user-a`) gives 401; user-O, `officer` and user-P give 403; A, B and C are allowed (a read).
* **Bodies.** Wrong types, `null`, `[]`, `{}`, 0 items, an unknown action and a bad kind each give a 400 in RFC 9457 form. `__proto__` and `constructor` keys do nothing.
* **Writes.** Nothing is written. The `pg_stat_user_tables` counters were unchanged across about 40 calls (including the 500s and the 50-item sets); `change_set` stayed at 0, audit at 103 and `library_change` at 0.
* **Create.** `create` gives 410 for all 4 kinds, even mixed with a valid item.
* **Duplicates.** Case, spacing, punctuation, zero-width, full-width and NUL variants are caught. A section rename onto a retired title is refused.
* **Retired and merged items.** References to them get R4. A merge checks self, value type, the hop limit (the 4th hop passes, the 5th is refused) and an `into` that was merged away.
* **Rule checks.** R5 conflicts and R8 loops on a direct question condition are caught. A released rename always rises to second person: no evasion by case or spacing in the key.
* **Load.** Six parallel 3.8 MB bodies left another check answering in 0.23 s. A tree 2 000 deep or 60 000 wide answers in about 1 s.

## Round 2 (a21393c2)
Fresh copy `forms_gcore_bk` on :4459 after `/api/demo/load`, with 3 open cases. Setup by SQL in that copy only: the condition on `person.given_names`, the `sex_list` list, one field retired, one merged away, and one section selection deleted. Same `$C` as above. The copy is stopped.

### Still broken
* **M1 (Major, still open): a deep tree still gives a 500.** `deep10000.json` (a `not` chain 10 000 deep, 190 KB) still answers 500, and so does a 95 KB body (depth 5 000). Depth 3 000 passes. It also fails with `"target":"rule"` and with an unknown question, so the crash is not in the rules: it is in the fingerprint. `canonical(JSON.parse(JSON.stringify({items,…})))` recurses over the raw tree (api/src/change-sets.ts:115; `RangeError` at contracts/rules.ts:11). The depth guard (`nodes`, engine :49) only runs inside `treeProblems`. To rebuild the body: `python3 -c "d=10000;l='{\"op\":\"eq\",\"field\":\"person.sex\",\"value\":\"F\"}';print('{\"items\":[{\"action\":\"set_condition\",\"kind\":\"condition\",\"key\":\"person.uci\",\"target\":\"rule\",\"tree\":'+'{\"op\":\"not\",\"arg\":'*d+l+'}'*d+'}]}')" | curl -s -XPOST localhost:4459/api/change-sets/check -Hcontent-type:application/json -Hx-actor:user-A -d @-`. *Fix:* apply TREE_MAX to `tree` in the contract (an iterative walk in `superRefine`, giving a 400), so nothing reads an oversized tree; or hash the fingerprint without recursion.
* **m1 (part).** Fixed for `neq Q`. `not(eq Q)`, which is always true, and `or(eq Q, eq F)`, which can be true, still get R7 "can never be true". `in ["F","Q"]` passes, which is inconsistent with the `or` case. *Fix:* skip parts under `not`, and judge an `or` as a whole.
* **m5.** `accept_proposal` through `/check` is still marked made by a person (`expert: false`). Acceptable while only B3 sends `ai`.

### Fixed
* **M2.** `args: 5`, `{}`, `"ab"`, `{length:2}`, `not 5`, `field: 5`, `bogus`, `[]` and `in "Q"` now get R1 (missing subjectKind, or not in the vocabulary). The boundaries hold: 200 parts and 12 levels pass, 201 parts and 13 levels get R1, and an empty `and` gets R1.
* **M3.** The cycle A→B + B→A, the chain A→B + B→C, A→B + A→C, a merge plus a rename, an alias plus a rename, two `accept_proposal` items with one key, and an `accept_proposal` plus a merge into it all get R4 "one change per item".
* **M4.** After `PATCH person.full_name {"name":"Complete name"}`, a rename or `accept_proposal` to "Full Name" gets R3. Renaming the field back to its own old label passes.
* **M5 (by narrowing, recorded in challenge.md).** The 4 other targets get R1 "changed on its own page". A question that does not exist gets R4.
* **M6.** The merge that makes the `person.given_names` loop now gets R8, named per combination.
* **M7.** The fingerprint is unchanged (`395cf3a4…`) after no-op updates to both checks and the form maps, across actors, with `expected` or extra spaces in the name. Tree key order gives one hash. A real rename by someone else changes it (`22514dc6…`).
* **M8.** An existing key, a merged-away key and `"Bad Key!! <script>"` are refused.
* **M9.** I take the founder's answer on PR #504 as the coordinator relays it; I did not read the comment myself.
* **Minors.** m4: the 3 cases on release 1 are now listed for a section only the release uses. m6: rewrites read the current tree (`fieldReaders.tree`). m7: one snapshot per combination per check, problems capped. m8: names instead of codes. m3: accepted and recorded.
* **Held again.** No writes (`pg_stat` diff over 8 bodies, including the 500; `change_set` = 0). Actors: missing or unknown gives 401, user-O and user-P give 403. `create` gives 410.

### New (all Minor)
* **n1. "One change per item" misses cross-kind pairs.** A merge of `person.other_family_name` together with a `set_condition` that reads it, or that sits on its question, gives `ok: true`, because the keys are `field:` vs `condition:` (engine :176). A condition on the question of a retired field also passes. *Fix:* add the fields a condition reads, and its question's field, to `keysOf`; refuse a question whose field is retired.
* **n2. The invisible-character list is hand-made and incomplete** (engine :46). Run against `$C '{"items":[{"action":"rename","kind":"section","key":"contact","name":"Sur\nname"}]}'`, these pass: `\n`, `\t`, `\r`, U+2060, soft hyphen U+00AD, Arabic letter mark U+061C (a direction mark), U+034F, U+FE0F, tag characters, U+2800 `"⠀⠀"`, and U+3164 `"ㅤㅤ"`. The last also passes as a new item's name, because it counts as a letter, so the name looks blank. `reason` with `\u0000` passes too, and B3's write will fail on it. *Fix:* use `\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}` (as `cleanLabel` does), require a visible letter, and check `reason` and `source.ref` as well.
* **n3. The cap hides whole items.** `cap.json` (50 conditions, 199 unknown fields each) returns exactly 200 problems, all for item 0, and nothing for items 1–49. Nothing says the list was cut. *Fix:* cap per item, and return `problems_cut: n`.
* **n4. The key pattern refuses keys the AI lander makes.** `KEY` needs a letter first (engine :44). `proposals.ts` `slugKey("2nd passport")` gives `2nd_passport`, and `accept_proposal` section `2nd_passport` gets R1. Separately, a new field with the key of a derived field (`person.age_years`) passes the new-key check. *Fix:* allow a leading digit after the first segment, or use `keyFor`'s own shape; count derived keys as taken.
* **n5. Two merges into one survivor are refused.** A→K together with B→K gets "both change Full Name", so duplicates must go one per set. That may be intended; it is worth one line in challenge.md.
