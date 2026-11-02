# Break report: G4 part 1 (C5.7, answer-key families, keys and runner), commit ea426ad4

Breaker: a separate context that did not draft, build or review this. Scope: part 1 only, which is the engine, data and API (concept §6, §6b "Needed for the proof"). There is no UI in part 1, so keyboard, 1024 px, zoom, reload and back are not applicable. There are no uploads, so the planted-instruction PDF is not applicable. Scoring, preview families, approver families and auto-run at submit are on the "Not built" line and are not reported.
Setup: isolated copy `forms_g4b` on :4452 (never :4400). `setup_visitor_visa.ts` gave 13/13 and `check_g4_answer_keys.ts 4452` gave **57/57**. Families came from `samples/answer-key-families.json` with new keys. The expected values were the check's passing IMM 5257 key (66 lines, PASSED). Actors: user-A author, user-C expert, user-B approver, user-O/R/P case people. The attack scripts are in the session scratchpad. For a few probes I changed rows directly in my own copy's database: `retired_at`, and `form_edition.inventory_file` (NULL, or pointed at a copy of the inventory).

**Verdict: 2 Major, 12 Minor. No Blocker.**

## Major
**M1. A signature survives a family change that races with the expert's Sign. This breaks BR-7 ("so does a change to its family") and challenge Q3.**
- **Repro:** key at version v, Draft. In parallel: `PUT /answer-keys/families/:id` (mother's `person.family_name` changed to `CHANGED1`, correct version, no reason) and `POST /answer-keys/:id/sign {version:v}` as user-C. Both returned **200** in 7 of 10 tries.
- **Result:** in 1 of those 7 the key ends **SIGNED at v+1**. Its `signed_at` (10:44:14.882) is earlier than the family save (10:44:14.885), and the family now holds `CHANGED1`. The audit reads "signed" then "changed the test family" with no "back to Draft". The `change_reason` is the stale "Family changed: " from an earlier save.
- **Why:** the transaction at `api/src/answer-keys.ts:100-101` runs two statements without a lock. Statement one (SIGNED→DRAFT) matches no rows, the sign at `:184` (`where version v, DRAFT`) commits between the two statements, and statement two bumps the version under the signature. The `signed` count at `:93` is also read before the transaction, so the reason demanded at `:95` can be skipped the same way.
- **Impact:** a signed key stands on facts the expert never saw. That is exactly what Q3 forbids, and G2 will accept it as "signed".

**M2. Expected values for a person who has left the family are ignored without a word, and the run reads PASSED. This breaks BR-4 ("passes only if every line passes") and BR-2.**
- **Field-map repro:** family with `kid` (child, applies false); key with `kid: {FamilyName: "SHOULD-FAIL"}`. The run fails on kid's line ("does not apply"), as it should. Then the family PUT removes kid → 200. Run again → **PASSED 66/66**, and `GET /answer-keys/:id` still shows `expected.people.kid`.
- **Rule-set repro:** set father's `applies` to false after a rule key lists `father: NOT_ELIGIBLE`. Father's line disappears from the run.
- **Follow-on:** re-saving the key as-is now gives 400 ("kid is not a person of the family"), so the stored key cannot be saved as it is.
- **Where:** the runner iterates `family.people` only (`engine/answer-keys.ts:201`, `:227`). `updateFamily` (`api/src/answer-keys.ts:86-106`) never checks the keys that use a person it drops or stops.
- **Expected:** the family save is refused, or the orphaned expected values give failing lines.

## Minor
- **m1. A key PUT racing a Sign drops the signature with no reason.** PUT (no reason) and sign at the same version, run in parallel: both 200 in **15 of 15** tries, and the key ends Draft. The PUT read the state as DRAFT before its slow `buildSnapshot`. Its `updateMany` (`api/src/answer-keys.ts:173`) filters on version only, and signing does not bump the version (`:184`). So BR-7's reason is skipped and the audit lacks "(were signed: back to Draft)". The sign's own 200 response sometimes already shows `state: DRAFT` (`:187`). This is fail-safe (no false signature), hence Minor.
- **m2. With no form field list, a signature box takes a value and can be signed.** I set `inventory_file` to NULL on IMM 5257 (09-2023). The key with `Page3…Signature[0].TextField2[0]: "MOTHER EXAMPLE"` → 201, and the expert signs → 200. With the inventory present the same body is 400. The run gives 422, yet `list` still offers the item. Once the inventory is back, the signed key fails for ever. The check at `engine/answer-keys.ts:156` is skipped when `inv` is null, and `create`/`update` pass `inventoryOrNull` (`api/src/answer-keys.ts:153`, `:167`). This goes against BR-4 / challenge M5 (c).
- **m3. A key's edition is unchecked text, and a PUT re-targets it without a word (BR-6).**
  - **Any value:** `expected.edition` takes any string: "IMM 5257 (01-2020)", or **1,000,000 characters** (201). That key's run response is then **3 MB**, and the combination list grew to 1.3 MB.
  - **Re-targeting:** a PUT without `edition` rewrites the key to the map's current edition ("01-2020" became "09-2023" on a Draft key). The cause is `engine/answer-keys.ts:146` (`|| m.form_edition`, no length cap, no check against known editions).
- **m4. Deep JSON in a fact value gives a 500.** A fact value nested 5,000 or 10,000 levels deep → **500**. The log shows `RangeError: Maximum call stack size exceeded at JSON.stringify` at `engine/answer-keys.ts:84`. 3,000 levels gives 400 and 1,000 levels is stored. The server stays up.
- **m5. A NUL character gives a 500, and a lone surrogate is stored altered.** A fact value `"EX\u0000"` → **500** (Postgres `22P05`, jsonb write at `api/src/answer-keys.ts:79`). A label with `\ud800` → 201, stored as U+FFFD. A label with `\u0000` → 404 "Not found", which is the wrong word.
- **m6. 10,000 facts do the full work before saying no.** 10,000 facts → 400 after **9,951 field errors**, a **1.5 MB** response. `LIMITS.facts` (600) is checked, but every fact is still validated (`engine/answer-keys.ts:74-89`): there is no early return.
- **m7. Invisible text passes as a name or a reason.**
  - **Labels:** family `label: "​​"` and principal label `"‮​"` (RTL override) → 201 (`engine/answer-keys.ts:57`, `:67`: `.trim()` keeps U+200B).
  - **Reasons:** a signed-key reason of `"​"` → 200, and `"line one line two"` → 200 as "one line" (`:264`, `api/src/answer-keys.ts:95` test only `\n\r`).
  - **Expected values:** `"EXAMPLE​"` → 201. Its fail line then reads expected "EXAMPLE", got "EXAMPLE".
- **m8. A person id that is a JavaScript built-in name gives wrong fail lines.** The id `constructor` passes `PERSON_ID` (`engine/answer-keys.ts:25`). With no expected values for that person, `expected.people["constructor"]` is the built-in Object constructor (truthy) at `:202` and `:228`.
  - **Rule set:** the line has no `expected` and no reason.
  - **Field map:** the lines say "written, not expected: add it to the key" instead of "the key has no expected values for them".
  - Both still fail.
- **m9. Writes still work on a retired combination.** Create is refused (409, `api/src/answer-keys.ts:147`). On a retired combination, though, PUT, Sign and Run all return 200 (run PASSED).
- **m10. `about` with an extra segment is accepted.** `about: "mother/parent_1/extra"` → 201: only the first two segments are checked (`engine/answer-keys.ts:79-80`). The fact belongs to nobody, so it is silently dead.
- **m11. Other family inputs are accepted unchecked.**
  - **`none_apply`:** an unknown group (`no_such_group`) is accepted, and so is the same group twice (`:98`).
  - **Rows:** a `row` on a non-repeating fact (`person.family_name`, row 0) is accepted (`:82`).
  - **Subjects:** a person field about `case` (`person.family_name`) is accepted.
  - **Principal:** a principal with `applies:false` is accepted. All of these give runs that cannot mean anything.
- **m12. A non-UUID `family_id` gets 404, not 400.** `family_id: 42` → 404 "That test family does not exist". RFC 9457 field errors expect 400 on `family_id` (`api/src/answer-keys.ts:151`).

## What held
- **Roles:**
  - The approver reads (200) but cannot write, sign or run (403).
  - Officer, representative and client get 403 on every route; no header or an unknown actor gets 401.
  - The expert cannot write or change a family (403); the author cannot sign (403).
- **Stale versions:** stale or string `version` gives 409 on the family PUT, key PUT and sign. A sign with no body gives 409.
- **Concurrency:** 4 parallel family creates with one key gave 201 + 409×2 + 400. 4 parallel key creates gave 201 + 409×3. 3 parallel signs gave one 200. Two PUTs at one version gave 200 + 409. No 500s.
- **Prototype pollution:** `__proto__` as a person, a box or a gate → 400 on the field. A top-level `__proto__` is ignored; `({}).polluted` and `isAdmin` stay undefined.
- **Malformed ids:** non-UUID, zero-UUID, `%00`, `..%2f`, quote-SQL → 404. A body that is an array → 400.
- **Limits:** label 121 characters, 13 people, row 1.5 / "1" / 50+, a gap in rows, no principal or two principals, a family key with capitals or `ü` → all 400. Space-padded duplicate keys are caught. Non-English labels are stored intact.
- **Stale Passed (BR-5):** I found none.
  - **Inventory:** repointing the inventory, and editing its content (`max_chars` 3), both give "Not run since the combination changed". The re-run fails, naming "value is 7 characters; the box holds 3".
  - **Key and family edits:** a PUT landing during a run leaves "Not run since the expected values changed", and a family edit bumps every key.
- **Editions and kinds:** an edition mismatch fails in words (BR-6). Scoring is refused in words. A form outside the combination → 400.
- **Budgets** (56 keys, sample data): list 151 ms, GET key 73 ms, run 149 ms, 20 parallel runs 2.0 s, families list 20 ms.

## Part 2 break 860bf1a9
Breaker: a separate context. Scope: part 2 = `git diff 43487860..860bf1a9` (Tests tab, family editor, Expected editor, `GET …/answer-keys/boxes`, `GET /answer-keys/fields`); build notes' "Not built" (409 "load their version" button, box search, scoring) not reported as missing. Copy `forms_g4x` on :4453, `setup_visitor_visa.ts` 13/13, E1 family + key from `tests/g4_e1_key.ts`; Playwright (Chromium) as user-A/C/B/O; scripts in the session scratchpad. **Verdict: 3 Major, 7 Minor, no Blocker.**

### Major
**P2-M1. A key signed while the author edits it: Save does nothing visible.** Author opens Change on a Draft key and edits a box; the expert signs (200); author presses Save → PUT 400 on `reason` ("These expected values are signed: give a one-line reason"). The dialog shows no message and no reason field; pressing Save again does the same. The reason field only shows when the key was Signed at mount (`web/src/components/answer-key-editors.tsx:195`, `:264`), and `reason` counts as a "shown" field (`:209`) so it is not said above the form either. The family editor handles the same case (`:87` `setAskReason`); the key editor does not.
**P2-M2. After a 409, closing and reopening loads the same stale version, so you get 409 again (and again).** Two tabs, same family: tab 1 saves; tab 2 gets "Changed by someone else … Reload their version" (good). In tab 2, Cancel → Edit shows the old name, and saving again → 409 again. The list still shows the old label. The same happens with the same key edited by the expert and then the author. Build notes ("closing and reopening loads the latest") and EXPERIENCE §conflict ("reload or merge") are not met: `useSave` invalidates only on success (`:36`), and the editors seed from the cached list (`:72-75`, `:192`). The 409 body's `current` is ignored. Only a page reload gets out.
**P2-M3. The family editor's Facts table is wider than the dialog at every width.** With E1's family (48 facts), the dialog body is 1187 px of content in an 894 px box at **1440 and 1024 px**. All 48 fact "Remove" buttons and most value boxes sit off to the right, and the Facts hint text is cut ("An a…"). The cause: the field `<select>` sizes to its options in a `1fr` track (`:128`, `:130`; one is 811 px). The slice's 1024 px check measures page scroll and photographs only an empty family (screenshot 05).

### Minor
- **m1. Address and phone boxes change control while you type, and focus is lost** (WCAG 3.2.2). Clearing the phone JSON turns the textarea into a one-line input, and focus jumps to the dialog. Typing a complete `{…}` turns it back into a textarea, and focus jumps again, so further keys go nowhere. Typing `{"x":1}` into a name fact turns it into JSON and saves an **object**. A partial `{"number":"1"` in the phone box is sent as a plain string with no "write the parts as JSON" error. The cause is `kinds` (`:78`) re-derived from the raw text on every keystroke (`:43`). The server accepts these (an object as a name, a string address, "31/02/2020" as a date: 201). Runs then fail with the filler's reason, never a 500 or a false pass.
- **m2. Expected values for a person dropped from the family are removed when you save the key, with no warning.** The family save that removes a travelling `kid` gives no warning. The run then fails naming kid (part 1 M2 held). Opening Change shows only travelling people (`:190-193`), and Save drops kid's values without a word: the next run reads PASSED 66/66.
- **m3. Focus is lost on Save, Cancel and Remove.** After a save, focus goes to `<body>` (the Dialog has no trigger to return to). After "Remove" on a person, it goes to the dialog. A keyboard user starts again from the top of the page.
- **m4. A long family name with no spaces scrolls the page sideways.** A 120-character label (`長い名前… عائلة… XXXX…`): the page is 1046 px wide at 1024, and 814 px at 720 (200 % zoom). The cause is the family row's label span (`answer-key-editors.tsx:172`, no `overflow-wrap`).
- **m5. Who can do what is only found out at Save** (build notes deviation 6). The approver sees Write a family, Edit, Change, Run and Write expected values enabled. They can fill 161 boxes and only then get the 403. EXPERIENCE lists a read-only state for "no permission".
- **m6. Changing a signed key with no change still unsigns it.** A PUT with the same expected values and any reason → 200 DRAFT. The signature is lost for nothing.
- **m7. Reload or Back mid-edit loses everything without asking.** The guard covers only Escape, the X and the overlay. There is no `beforeunload` anywhere in `web/src`, so reload, Back or the tab bar discard an open family or 161-box editor.

### What held
- **Roles:** `/answer-keys/fields` and `/boxes`: no actor or an unknown one → 401; officer, representative and client → 403; author, expert and approver → 200. The officer's `/c/:id/tests` says "This page is for the configuration people". The approver's save shows the server's 403 in the dialog.
- **`/boxes` inputs:** no form, two forms → 400; an unknown form, `<script>` or lower-case name → 404, with the text escaped; a zero UUID → 404; a 20 kB query → 431.
- **Hostile JSON:** `__proto__` and `constructor` in an address are stored as data, and nothing is polluted. Nested 50 deep, 20,000 keys, or a 200,000-character city → 400 on the field. `null` → 400. `<img onerror>` is rendered as text.
- **Families and keys:** a dropped person fails the run by name. Expert sign, then the author's Change with a reason → Draft, "Back to Draft: …"; a signed family edit asks for the reason up front.
- **Keyboard:** a whole family written by keyboard (Tab order is logical, Enter submits); options picked by typing; Escape with changes asks first.
- **Text and zoom:** non-English labels and values (中文, ÑÚÑEZ, Arabic, Ж) are stored and shown intact. The Expected editor fits at 1024 px and at 720 px (200 %) with Save in view.
- **Budgets:** the Expected editor's 161 boxes (56 choice boxes, 4,161 options) open in 0.3 s, or 0.36–0.54 s for 322 boxes (2 people). Typing costs about 20–50 ms a keystroke, focus stays put, and there are no long tasks. List 143 ms (22 keys), boxes 59 ms, fields 13 ms, families 8 ms.
