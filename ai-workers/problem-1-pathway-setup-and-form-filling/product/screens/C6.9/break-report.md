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
