# Break report: PR #391, C6.9 part 1 (eligibility gates on the release), head e3a01067

Breaker: a separate context that did not build or review this. Scope: part 1 only (BR-1…BR-6, BR-2a; concept "What gets built" §8 item 1). Nothing on the "Not built" line is reported. I did not repeat what `review.md` already proved (6-way race, 161-character label, whitespace disclaimer, roles 401/403, rollback run as written, trigger and CHECK, BR-5 derived fact).
Setup: isolated copy `brk391` on :4437 (never :4400), fresh database (`prisma migrate deploy` applied this migration cleanly). `tests/check_c69_gates.ts 4437 xr_studio_brk391` gave **65/65**, so Visitor visa (VV) is released with S7's gates. Live AI off, US$0. Requests used `x-actor: user-A` (author), `user-C` (signs off) and `user-B` (approves). `release()` below means submit, sign every change-summary line, then approve.

**Verdict: 1 Major, 6 Minor. No Blocker.**

## Major
**M1. The release check lets through a gate that can never be true, or that waits on a field the questionnaire hides. This breaks STANDARDS §3.6 ("no hidden field a form or rule needs, no rule that can never be true").**
- **Repro (on VV, all released as release 10):** I PUT S7's two gates plus three more:
  - `vv.contra`: `{op:"and",args:[{op:"eq",field:"person.criminal_history",value:false},{op:"exists",field:"person.criminal_history_details"}]}`. The VV placement asks `criminal_history_details` only when `criminal_history` is `true` (its placement `condition`). So this gate can never be Met.
  - `vv.hidden`: `{op:"exists",field:"person.criminal_history_details"}`. It reads "Not answered" forever for anyone who answers no.
  - `vv.uci`: `{op:"exists",field:"person.uci"}`. That field is placed as `OPTIONAL` ("only some people have it").
  - **Result:** PUT → 200. `GET /combinations/:id` lists **no** Eligibility problem, at any level. Submit, sign-off and approve → **201**.
- **Same with a value of the wrong type (release 6):** `{op:"eq",field:"person.criminal_history",value:"false"}`, and `value:"maybe"` too. `criminal_history` is a yes_no field. `evaluate` compares with `===` (`contracts/rules.ts:129`), so no answer can ever match. PUT → 200, no problem listed, released. The change summary reads only "Gate: Answered no to the criminal history question (Sample) (rule changed)", so the SME signs it without seeing that the value is a string. An `and` of `eq true` with `eq false` on the same fact is also accepted and released.
- **Expected:** the release check (BR-5, `gateProblems`) refuses, or at least warns on, three things: a gate fact whose placement is conditional or OPTIONAL, a gate that contradicts the placement condition of its own fact, and an `eq`/`in` value that does not fit the fact's type.
- **Actual:** `engine/eligibility-gates.ts:90` checks only placed ∩ read. `checkCondition` (`engine/validate.ts:41`) checks only the ordered ops against date and number fields.
- **Impact from part 2:** every traveller is "Not eligible on this application's rules" (with `FAIL_BEATS_MISSING` false and everything answered), or stays "Possibly eligible" forever. The cause is a frozen release that cannot be fixed without a new release.

## Minor
**m1. A NUL character or a lone surrogate gives a 500, not a 400 on the field.**
- **Repro:** PUT with `label:"Pass\u0000port"`, judgement `["money\u0000"]` or disclaimer `"Indicative only and nothing more.\u0000"` → **500**. The log shows Postgres `22P05 unsupported Unicode escape sequence`. Sending raw `"a\ud800b"` in a label gives 500 with `22P02 invalid input syntax for type json`.
- **Where:** the jsonb write at `api/src/eligibility.ts:56`. Nothing is stored and no audit row is written; the server stays up.

**m2. A deep condition gives a 500 (stack overflow).**
- **Repro:** a gate whose condition is `{op:"not",arg:…}` nested 1000 deep (19 KB body), or `and` nested 1000 deep → **500**. The log shows `RangeError: Maximum call stack size exceeded` in ajv, through `checkCondition` (`engine/validate.ts:36`) from `checkGates` (`engine/eligibility-gates.ts:46`).
- **Also:** depth 995 is accepted, frozen into release 9 and served without trouble. There is no depth bound at all.
- **Expected:** 400 on `gates.N.condition` with a depth limit.

**m3. The disclaimer has a minimum length but no maximum.**
- **Repro:** PUT with a 4.76 M-character disclaimer → 200. It was released as release 8: the snapshot grew from 0.50 MB to 5.26 MB, and the change-summary line "Disclaimer: …" is 4,760,011 characters long, and that is the line the SME is asked to sign.
- **Where:** `contracts/eligibility.ts:11` and `engine/eligibility-gates.ts:58`. The only limit is the 5 MB body limit.
- **From part 2:** this text is copied onto every run and every page.

**m4. Reordering gates is never reviewed, but it rides along in the next release.**
- **Repro:** PUT the same two gates in reverse order → submit gives **400** "Nothing has changed since the released version", yet the draft's sha differs.
- **Ride-along:** then PUT that reversed order plus one new judgement line → release() → 201. The change summary has only `officers_judgement|changed`, but release 7's `snapshot.eligibility.gates` order is reversed.
- **Why it matters:** gate order is content. BR-10 makes `missingInputs` "in gate order", and the page lists gates in order.
- **Where:** `engine/eligibility-gates.ts:103-106` compares by key only. Judgement order, by contrast, does give a line.

**m5. A label that is visually empty, or carries control characters, is stored.**
- **Repro:** each of these is a 200 and is frozen: label `"​​"` (zero-width only), judgement `"́́́"` (combining marks only), label `"Pass\u0007\u001b[31mport"` (BEL and ANSI escape), label `"‮Sample tropssap"` (right-to-left override), and label or judgement lines with `\n`, `\r\n` or `\t`.
- **Expected:** "an empty label" (BR-2) to cover the invisible cases, and labels and lines to be one line of printable text. A label of only ` ` is already refused, because `trim` removes it.
- **Where:** `engine/eligibility-gates.ts:28`.

**m6. Duplicates by meaning are accepted, and lengths count UTF-16 units, not characters.**
- **Duplicates:** two gates with different keys but the same label ("Passport answered") → 200. They cannot be told apart on the page or in the change summary. Judgement `["Is in good health","is in good health ","IS IN GOOD HEALTH"]` → 200.
- **Lengths:** 100 emoji in a label are refused with "Keep the label to 160 characters", and 61 emoji in a judgement line with "…120 characters" (`:34`, `:52`).

**Note (not counted):**
- The assessment foreign keys are `ON UPDATE CASCADE`. Changing a `runtime_case.id` is refused by `trg_assessment_frozen` (tried in a rolled-back transaction). Ids never change, so this is harmless, but the two declarations contradict each other.
- `check_c69_gates.ts` run on a copy where the "six" sample is already loaded fails 24 of 65, because its setup expects a fresh copy. Its usage line says to start a fresh copy, so this is not a finding.

## What held
- **Roles:** on PUT, user-B and user-C get 403 (author duty). The persona header `approver` also gets 403. user-O, user-R and user-P get 403 on GET and PUT. An empty or unknown actor gets 401.
- **Ids:** an all-zero UUID, a non-UUID, `..%2F..%2Fsession` and a quote-injected id all give 404.
- **Wrong types:** these are refused 400 on their field: `version` given as null, `"5"`, `true`, `1.5` or 1e20; a body of `[]`; a body with `gates` null; `gates` entries `[null]` or `[1]`; `judgement` given as a string; a non-string judgement line; 31 gates; 21 judgement lines. `version:-1` gets 409. Non-JSON gets 400.
- **Conditions:** these are all refused: a root `subjectKind:"person"` (lower case), a nested `subjectKind`, an extra key in a node or on the root, an object inside `value` or `in` (so no phantom gate fact through `gateFacts`), `exists` with a value, `and:[]`, `gte` on a text field, and a condition given as an array or a string.
- **Unknown top-level keys** (`by`, `at`, `savedBy`, `released`) and unknown gate keys (`enabled`, `plain`, `subjectKind`) are stripped. `savedBy` cannot be spoofed.
- **Keys:** a key with spaces round it is trimmed and checked for duplicates; a non-ASCII key is refused.
- **Concurrency:** 8 first saves at once (no version) gave one 200 and seven 409s. The audit rows equal the saves (3 for 3, none on a 409 or 500).
- **Release path:** a PUT after sign-off makes approve refuse, 409 "draft changed". A PUT racing approve could not get unreviewed content into the release: approve was 409 and the release kept its reviewed judgement.
- **Emptied save:** release() lists every gate, the judgement and the disclaimer as "removed", and GET then answers `released: null`.
- **Big body:** a 5 MB `in` list is still validated, giving 400.
- **Migration:** deploys on a fresh database. The trigger refuses UPDATE. Deleting a `runtime_case` cascades to `assessment` and `assessment_review`.
- **Demo reset:** `POST /api/demo/reset {"confirm":"RESET"}` with gates and 9 eligibility releases present removed everything (`remaining_rows: 0`, preserved files unchanged). `demo/load six` then gives 6 combinations with `eligibility` null.
- **Not applicable to part 1:** no UI, so keyboard, 1024 px, 200 % zoom, uploads and planted-instruction PDFs do not apply. The budgets do not apply either (GET 25–90 ms).

# Part 2 (fd26c492): eligibility runs (BR-7…BR-14, BR-17, R4)
Setup: isolated `brk_c69` on :4431, fresh database; `check_c69_runs.ts` **60/60**. I then released VV releases 3 and 4 as user-A/C/B with extra Sample gates (`case.funds_available_cad gte 8000`, an `or`, `not`, a row fact `person.education_institution`). Live AI off, US$0. Not reachable: a pin change (`pack_work_pin` is insert-only, ADOPT not built), so BR-13's "release changed" branch was not attacked. **Verdict: 1 Major, 4 Minor. No Blocker.**

**M1 (Major). Concurrent runs skip BR-14: many MANUAL rows, no reason.** Repro: fresh case on release 2, 40 `fetch` POSTs at once with `{person}` and no reason (`Promise.all`). Gives **40 × 201**, 40 `assessment` rows `run_type MANUAL, reason NULL`, and 40 audit rows "(first run)". Expected: one 201 and 39 × 400 on `reason`. Each later run should be RERUN and need a reason. Cause: `count` then `create` with no lock or unique key (`api/src/assessments.ts:66-76`). `addRow` takes `pg_advisory_xact_lock` for the same pattern (`runtime.ts:319`). With 12 or 30 `curl`s the race did not show, so the suite cannot catch it.

**m1. A missing fact inside a gate that is Not met is not listed.** The pure adapter, gate `and[exists person.passport_number, eq person.criminal_history false]`, passport unanswered, history `true`, gives `NOT_ELIGIBLE` with `missingInputs: []`. With `whenNotMet: needs_review` it gives `POSSIBLY_ELIGIBLE` with `missingInputs: []` and the gate in `reviewGates`. Expected (P-229 (3), BR-10): "the missing facts are listed too". Cause: `missing` is filled only for `not_answered` gates (`engine/runtime/eligibility.ts:57,69`).

**m2. A gate on a row fact reads only the first live row, and the trace is lost.** Release 4 has gate `exists person.education_institution`. I added two education rows and answered only row 2: the gate is Not answered and `missingInputs` names a fact that is answered. Every row-fact input has `answerId: null`, because `ids` skips row answers (`assessments.ts:42`). Expected: either the release check refuses a gate on a per-row fact, or the gate reads any row. Removing row 1 did mark the earlier run out of date (`was "Sample Uni 1" → now "Sample Uni 2"`), which is correct.

**m3. A person marked not travelling after a run still has a current-looking verdict.** I ran the spouse, then `PATCH …/people/:sp {applies:false}`. `GET ?person=sp` returns `MANUAL out_of_date:false`, outcome unchanged, and nothing says they no longer travel. A new run is refused 400 (correct). BR-7 says travellers only, and BR-13 does not cover a change to the person. For part 3: the card would show a verdict for a non-traveller.

**m4. The reason is counted in UTF-16 units, and an "empty" reason is accepted.** 150 emoji → 201. 151 emoji → 400 "Keep the reason to 300 characters". Reasons `"."`, `"—"` and five combining marks only → **201** as a reason on a rerun. Part 1 treats a line with no letter or digit as empty and counts code points. `contracts/eligibility.ts:27` does neither.

**Notes (not counted).**
- `rulesAsOfByProgram` is the UTC date: release 4 was approved at 23:12 on 1 Nov (UTC−5) and reads `2026-11-02`. This is choice 3 and documented.
- A gate `not exists f` on a missing `f` reads Not answered, by BR-9's rewrite.
- An expired passport (`2001-01-01`) passes "answered", because a validity check is on the Not built line.
- The list is not paged: 449 runs give 1.04 MB in 50–65 ms, within §9.

**What held.**
- **Roles:** user-P and user-Q get 403 on POST, list and one, including for an unknown id. user-A, user-B and user-C get 403. user-S gets 404 on POST, list and one. A missing or unknown actor gets 401. user-R and user-O are allowed.
- **Ids:** a non-UUID, the zero UUID and a quote-injected id give 404. An upper-case case id or aid works.
- **Bodies:** each of these gives 400 on its field: an empty body, `[]`, `{}`, a person that is `null`, a number or an array, a reason that is a number, NUL, U+202E, a lone surrogate, and a reason of spaces only. A non-JSON body gives 400 and a 6 MB body 413.
- **People:** the case subject is refused 400 (BR-7). So are a person from another case, a person id padded with a space, and a person id in upper case. An unknown, empty, repeated or case-subject `?person=` gives 400. Extra keys (`runType`, `createdBy`, `results`) are ignored, so the run is still RERUN by user-O.
- **Facts:** "8000", 8000 and " 8000 " all read 8000, and re-answering the same number leaves a run up to date. "8000.00", "8,000", "7999.5", "abc" and "-1e9" fail their own check and count as missing, never Met. `case.*` facts read as `about:"case"`. Confirm section never marks a run out of date. A changed, added or invalidated value names `was` and `now`.
- **Outcomes:** an `or` with one branch true is Met while the other branch is missing. `not` and needs_review combinations give the expected result. A needs_review gate not met plus a not_eligible gate not met gives NOT_ELIGIBLE with both lists. A release with no gates gives 409.
- **No score and no AI:** no `ai_batch` row was written, nothing returned a 500 (0 errors in `api.log`), and audit rows carry no answer value.

# Part 3 (2572b9b0): override, review and the staff eligibility page (BR-15, BR-16, §4–§5)
Setup: isolated `brk_c69` on :4431, fresh database, web built from this commit; `check_c69_runs.ts` **89/89**. I opened case f27411ec (two travellers, release 2 with gates) and used case 9430f6a3, pinned to release 1, which has no gates. Requests were sent with `fetch`. The browser was Chrome through Playwright at 1024 px, and at 512 px with scale 2 for 200 %. Live AI off, US$0. **Verdict: 1 Major, 5 Minor. No Blocker.**

**M1 (Major). Overrides are not idempotent: a double-click, Enter pressed twice or a concurrent POST writes duplicate rows.** This breaks STANDARDS §4 [M] "Idempotent creates".
- **API:** 20 identical override POSTs at once gave 20 × 201, 20 `assessment_override` rows and 20 audit rows.
- **Page:** in the Override drawer, pressing Enter three times in the Label field gave **3 rows**. A double-click on "Keep the override" gave **2 rows**.
- **Expected:** one row, and the repeat refused or answered with the same row.
- **Cause:**
  - `submit` calls `go.mutate` even while the request is pending (`web/src/runtime/eligibility.tsx:211`; the `busy` flag only disables the button).
  - The service is a plain `create` with no key and no lock (`api/src/assessments.ts:130`). Part 2's run route takes an advisory lock for the same pattern.
- **Effect:** every copy shows under the badge. In the run I tested, 31 override boxes pushed "Rules checked" off the first screen (screenshot `elig-1024.png`).
- **Same cause on review:** a double-click on "Mark reviewed" stores one row, which is correct, but then shows the error "Already seen by Case officer (Sample) on … UTC." straight after the success toast.

**m1. An override sent from a stale page lands on the old run and does not show on the page.**
- **Repro:** open the Override drawer on run A. In another session, user-R runs again, which makes run B the latest. Submit the drawer.
- **Actual:** 201 and the toast "Override kept beside the result". The page now shows run B with no override; the override is on run A and shows only as the "Overridden" pill in History.
- **Why the guard misses it:** the 409 check compares `fromOutcome` with the frozen run's own outcome (`assessments.ts:125`). A drawer always sends the outcome of the run it opened, so this 409 can never fire from the page.
- **Expected:** a 409 "The result changed since you opened it", or at least a message that the override went on an earlier check.

**m2. A release without gates still shows "Run eligibility check".**
- **Repro:** case 9430f6a3 (release 1, no gates).
- **Expected (§5):** the text "This application's release has no eligibility rules yet…" and no button.
- **Actual:** the button is shown. The text appears only after a click, as "Nothing was run: …" (409). The page never reads whether the release has gates (`eligibility.tsx:107,124`).

**m3. Closing a drawer with Esc (or Cancel) puts focus on `<body>`, not on the button that opened it.**
- **Repro, keyboard only:** focus "Override result…", press Enter, then Esc. `document.activeElement` is BODY. The History drawer does the same.
- **Effect:** a keyboard user starts again from the top of the page (WCAG 2.4.3).
- **Why:** each drawer mounts a new `Panel` with `open` already true and has no Dialog trigger, so Radix has nothing to return focus to (`eligibility.tsx:136-139`).
- **Inside the drawer, focus is trapped correctly:** 12 Tabs stayed in the dialog.

**m4. A long unbroken label or reason runs out of the card.**
- **Repro:** an 80-character label `x…x`, or a 500-character reason with no spaces.
- **Actual:** the page's `scrollWidth` is 3154 px at 1024 px and 2790 px at 200 % (`elig-1024.png`, `elig-200pct.png`).
- **Why:** the override `<p>` (`eligibility.tsx:150`) lacks `[overflow-wrap:anywhere]`, which its neighbours have. The "Run by … reason … note" line (`:180`) lacks it too.

**m5. Override text checks are weaker than the run reason fixed in part 2 m4, and the reason field accepts a newline it then refuses.**
- **Weaker checks:**
  - These are accepted (201): label `"."`, reason `"—"`, and a label of three combining marks only. The page shows an empty-looking override line.
  - Lengths count UTF-16 units: 41 emoji in a label give "Keep a label … to 80 characters". The cause is `contracts/eligibility.ts:32`, which uses `.max`, not code points, and has no letter-or-digit check.
- **Newline:**
  - The override reason is a `Textarea`, so Enter types a newline.
  - The API then refuses it with "Write it as one line of plain text." (400 on `reason`).
  - A review note, by contrast, keeps `\n` (200), but the page shows it on one line.
- **Copy (not counted):** the 409 says "on 2026-11-02 06:34 UTC", while the page shows local time "Nov 2, 2026, 06:34 a.m." (§5 copy is "on 2 Nov 14:20").

**What held.**
- **Concurrent reviews:** 10 at once from user-O, user-R and user-T gave one 200, nine 409s ("Already seen by … UTC") and one row. There was no 500.
- **Roles (override and review):**
  - user-P, user-Q, user-A, user-B and user-C get 403. user-S (the other firm) gets 404. An empty or unknown actor gets 401.
  - On an unknown or malformed id, a client gets 403 and staff get 404. An upper-case aid works.
- **Stamps:**
  - user-R and user-T are stamped "Reviewed" with their licence; user-O is stamped "Seen" with licence null.
  - Extra keys (`createdBy`, `stamp`, `id`) are stripped, so the stamp cannot be spoofed.
- **Body refusals, each 400 on its field:**
  - an empty body, `[]`, non-JSON, a null label, 81 characters, spaces only, NUL, U+202E and a lone surrogate;
  - a reason of 501 characters or containing `\n`;
  - a `programKey` that is wrong, upper-case, padded or 100 000 characters long.
- **Other refusals and edges:** a `fromOutcome` that is stale or junk gives 409, and a numeric one gives 400. On notes, NUL, 501 characters and a number give 400.
- **XSS:** `<img onerror>` and `<script>` in the label, reason and note render as text, with no dialog fired. Non-English text and RTL text display.
- **Audit:** overrides and reviews each write an audit row with no answer values (before is the outcome, after is the label). The engine's outcome stays visible beside the overrides.
- **Visibility:**
  - The client sees no card. The page says "This page is for the firm's staff" and makes no assessments request.
  - user-S gets "No such case" and a 404 on the list.
  - user-T sees the card and the page.
- **Keyboard and logs:** ↑↓ in the People listbox moves the selection and focus. There were 0 errors in `api.log`.
