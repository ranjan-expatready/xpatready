# Review: PR #391, C6.9 part 1, eligibility gates on the release (head 5120b6f2)

Reviewer: a separate context that did not build this. Scope: part 1 only (BR-1…BR-6 and BR-2a), checked against `concept.md`, `challenge.md`, `build-notes.md`, the tech lead's "Approved to build" comment (5 conditions), `STANDARDS.md`, `EXPERIENCE.md` and `QUALITY.md`. API and engine only: nothing is visible until part 3.

**Verdict: Block.** There is 1 open Major: BR-5 lets a gate on a derived fact through the release check. The fix is small: one condition and one fail test.

## What I ran (isolated copy `c69rev` on :4437, never :4400; live AI off; US$0)
- `tests/check_c69_gates.ts 4437 xr_studio_c69rev`: **56/56 PASS** (about 20 s).
- On a fresh copy, `tests/runtime/setup_visitor_visa.ts` gave 13/13. `acceptance/lib/setup_vv_m3.ts` gave **S7 PASS; S8 submitted, signed off and approved, all PASS**. S2w, S5 and S7a fail for the outside reasons the PR names (M3-0, `PUT /api/library/fees` not built, a signer warning).
- `tests/check_engine.ts`: 41/41. `graph.mjs --check`: exit 0 (G3 5, G6 2).
- **Migration.** On a scratch database, `prisma migrate deploy` then `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma`: no line touches `combination`, `assessment*` or eligibility. There are 4 drift lines on `fact_source`, `form_edition_accept`, `person_role` and `validated_copy`, plus `canonical_field_name`; none of them comes from this PR. The schema is in sync.
  - The trigger refuses an UPDATE ("assessment_frozen: …"). The CHECK refuses `run_type 'OTHER'`.
  - **The written rollback, run as written** (drop trigger, drop function, drop the 3 tables, drop the column, delete the `_prisma_migrations` row), succeeds. Re-deploying then restores the trigger. So the rollback is accurate and complete.
- **Break-it pass through the API:**
  - 6 concurrent PUTs at the same version gave one 200 and five 409s. One audit row per successful save.
  - Non-English label (é, 護照, ✓) stored exactly. Label of 161 characters → 400 on `gates.0.label`.
  - Whitespace disclaimer, `version: "2"`, `gates: "x"`, an empty body and `judgement: [5]` → each refused 400 on its field (Problem Details).
  - Case officer → 403 on GET and PUT. Content reviewer PUT → 403 (author duty). No actor or an unknown actor → 401. Malformed or unknown id → 404.
  - GET about 12 ms; the draft with its problems about 0.2 s.

## Conditions of the tech lead's approval
1. `FAIL_BEATS_MISSING` is not in part 1. That is correct; it belongs to part 2's adapter (build-notes choice 9). Note that `concept.md:79` still says "it is `true`" (minor 3).
2. One migration holds the column, three tables, the trigger and a written rollback. The PR's first line says "migration" and names `engine/snapshot.ts` and `engine/validate.ts`. Met. Not labelled: met.
3. S7 relabel: the diff of `acceptance/lib/setup_vv_m3.ts` changes only the two `label` strings (`:76-77`); keys and conditions are byte-identical. Met.
4. Q1: the disclaimer is on the release, with the Sample default and ASSUMPTIONS C8. Q2 does not apply until part 3. Met.
5. Labels stay Sample; ASSUMPTIONS C9 records the over-reach risk. Met.

## Issues (ranked)
1. **Major (Must): BR-5 does not refuse a gate on a derived fact, so a release can carry a gate that no case can ever answer.**
   - **Where:** `engine/eligibility-gates.ts:83` checks placed ∩ read only when `fieldTypes.has(f)`. A derived key (allowed by `checkCondition` at save) skips the check entirely.
   - **Live scenario on :4437:** an author PUTs `{key:"vv.derived_probe", condition:{op:"gte", field:"person.nomination_days_until_expiry", value:1}}` → 200. Its input `person.nomination_expiry_date` is placed nowhere in Visitor visa. The draft's problems then list **nothing** under Eligibility, so submit and release would go through. From part 2, this gate would read "Not answered" for every traveller forever, and the outcome would stay "Possibly eligible" with a missing fact nobody can be asked for.
   - **Against the concept and the notes:** concept BR-5 says a gate fact must be "placed, and read by a form box or a rule. Otherwise it is an error". `build-notes.md:23` (choice 5) says "A derived fact … is refused at release". The code does not do what either says.
   - **Also:** `engine/snapshot.ts:174` adds gate facts after the derived-input expansion at `:166`, so a derived gate's inputs would not travel with the release either.
   - **Fix:** in `gateProblems`, refuse any gate fact that is not a placed-and-read library fact, i.e. `if (!fieldTypes.has(f) || !(placed.has(f) && read.has(f)))`. Use a message for the derived case that names it by its plain words. Add a BR-5 fail line to `check_c69_gates.ts` (a gate on a derived key → release error). Allowing derived gates whose inputs are asked would be a later choice (the challenge route), not this PR.
2. **Minor:** the optimistic-lock race (`api/src/eligibility.ts:77`, `UPDATE … WHERE version = current`) is correct (my 6-way race: 1 winner) but has no test. Removing the `WHERE` clause would fail no line. Add a two-at-once PUT line.
3. **Minor:** `concept.md:79` says `FAIL_BEATS_MISSING` "is `true` as recommended". That contradicts binding condition 1 (`false`). Amend the line, so part 2 is not built to the wrong default.
4. **Minor:** the retired-combination 409 (`api/src/eligibility.ts:60`, build-notes choice 6) has no test.
5. **Minor:** a save with no gates and no judgement lines but a custom disclaimer stores the disclaimer, then drops it from the release without a word (`engine/eligibility-gates.ts:67`). Refuse it on the field, or say so in the GET.
6. **Minor (graph G3):** `GET /combinations/:id/eligibility-gates` is listed as "no test reaches". The suite does call it (`check_c69_gates.ts:129`) through a variable `url`, which the graph cannot see. Use a literal path once.
7. **Minor:** a "changed" gate line in the change summary reads only `Gate: <new label>` (`engine/eligibility-gates.ts:95`). The SME signs a condition change without seeing what was there before. Consider "condition changed" or "label changed" in the label.

## Code checks (skill §5)
- **Correctness:**
  - PUT and GET follow §6. BR-2/BR-2a refusals are on the field. The 409 names who saved and when, and carries `current`.
  - Refusal order is 400 before 409 (choice 1, stated).
  - GET's `released` reads the newest release (`RELEASED` and `SUPERSEDED` are the only statuses).
- **Fingerprints:**
  - `snapshotEligibility(null)` gives `undefined` and `gateFacts(undefined)` gives `[]`, so a combination without gates assembles exactly as before.
  - The suite shows another combination's draft sha unchanged, and releases 1, 2 and 3 re-hash to their stored `sha256`.
  - `eligibility` is added to the `diff()` completeness guard, so there is no stray "Configuration" line.
- **Migrations keep data:** expand only, with a nullable column. Demo reset deletes `case` (the cascade reaches `assessment`) and `combination` (`api/src/demo.ts:438,443`); there is no TRUNCATE anywhere.
- **Server authorisation:** deny by default (`readerOf`, `need(author)`). "Another firm 404" does not apply to these configuration routes: the Studio has one workspace and no firm scope. It applies to part 2's runtime routes.
- **No per-row requests:** the PUT does two library reads in parallel.
- **Mutation reasoning:** removing BR-2a's default, the BR-5 push, the disclaimer default or a BR-4 line each fails a named line in the suite. Removing the race guard fails none (minor 2).

## D1–D20 (part 1, API and engine only)
- D1 requirement fit 4: BR-1…BR-6 and BR-2a are present; BR-5 has a gap (issue 1).
- D2 data integrity 4: concurrent saves refused (tested live) and audit row before/after, but an unanswerable derived gate gets in.
- D3 reuse 5: reuses `checkCondition`, `canonical`, the `factWords` and `participants` patterns.
- D4 rule integrity 3: the derived gate is a rule that can never resolve (issue 1).
- D5 stability 4: the stale save names who saved last; 409 with `current`.
- D6 governance 5: audit row with the list before it; Eligibility lines need the SME; second-person approval.
- D7 AI trust n/a: no AI.
- D8–D14 n/a: nothing visible in part 1.
- D15 speed 5: 12 ms GET.
- D16 testability 4: a pass and a fail per BR, except the derived case and the race.
- D17 simulated only.
- D18 provenance 4: Sample labels, ASSUMPTIONS C8/C9, and the canada.ca re-check is owed by the tech lead.
- D19 closure 3: S7/S8 green; the end-to-end outcome waits for parts 2–3.
- D20 simulated only.

## Graph (P-86)
`graph.mjs --check` exits 0. The new GET is a G3 gap only because of the variable path (issue 6). The PUT is tested by `check_c69_gates.ts`. No page uses either route; that is expected, since a gate-authoring screen is on the "Not built" list.

## Retrofit mapping
Recorded in `build-notes.md` "Team-name mapping" (AG-03 §3.2 gate list, AG-3-32 disclaimer, §7 `Assessment`/`AssessmentOverride`). Matches the concept §1.

## Could not check
- No browser walk: nothing is visible in part 1, and the worktree has no web build.
- canada.ca was not reachable (labels stay Sample; the tech lead re-checks VV-R01).
- D17 and D20 need an intended user.

Journey score: **8/10** (pass, no 0), in `journey-test-reviewer-2026-11-02.md`.

**Verdict: Block** on 5120b6f2. Fix issue 1 (Major). Minors 2–7 are optional for this PR.

## Round 2 (head e3a01067)
Fix commit 07e389af, then a merge of main that brings in only `tests/check_c119_library_items_browser.cjs` (#394). That file is identical to `origin/main`'s (0 diff lines), and main is an ancestor. Fresh isolated copy `c69rev` on :4437 (never :4400); live AI off; US$0.

**What I ran:**
- `check_c69_gates.ts`: **65/65**.
- `setup_visitor_visa.ts`: 13/13. In `setup_vv_m3.ts`, S7 and all three S8 lines pass; S2w, S5 and S7a fail for the same outside reasons as before.
- `check_engine.ts`: 41/41.
- `graph.mjs --check`: exit 0, G3 down from 5 to 4. Both eligibility-gates routes are now tested by `check_c69_gates.ts`.

**Round 1 issues:**
- **Major 1 (BR-5, derived gate fact): fixed.**
  - `engine/eligibility-gates.ts` `gateProblems` refuses a derived fact that is not a library fact. The message names it in plain words, using the derived field's own description through `validate.ts:105`.
  - **My round 1 scenario, re-tried live:** the PUT of a gate on `person.nomination_days_until_expiry` → 200 (saved, as designed). The draft now lists an error: "This gate reads "Days from the application date to the nomination certificate expiry; …", a value worked out from other answers, not one a case is asked …". Submit is refused 400 with the same words.
  - **Mutation:** I disabled the new branch, and both new BR-5 fail lines (pure and API) failed (63/65). I restored the file with `git checkout`.
  - The snapshot order is unchanged, with a comment giving the reason (`snapshot.ts:171-173`). That is acceptable now that derived gates never release.
- **Minor 2 (race): fixed.** Four PUTs at once give exactly one 200 and three 409s (test line).
- **Minor 3: fixed.** `concept.md:79` now says `false` until the founder answers Q3, per condition 1.
- **Minor 4: fixed.** The retired-combination 409 is tested. The test retires a spare combination by SQL and restores it: test-only, acceptable.
- **Minor 5: fixed.** A disclaimer with no gate and no judgement line → 400 on `disclaimer`. I checked it live on the copy.
- **Minor 6: fixed.** The GET uses a literal path, and the graph now sees it.
- **Minor 7: fixed.** A changed gate reads "Gate: <old> → <new>", plus "(rule changed)" when its condition changed. Both are tested.

**New issues:** none. The S7 relabel, the migration and schema, permissions and fingerprints are unchanged since round 1, and their lines still pass.

**Journey score:** 9/10. "Correct data" goes from ½ to 1: journey 9 now holds. The UI criteria stay ½ until part 3.

**Verdict: Approve** on e3a01067. There is no open Blocker or Major. The label still waits for the tech lead's word on the migration slot (condition 2).

## Round 3 (head b05f5d45)
Fix commit 02d873a6 answers `break-report.md` (M1, m1–m6). Then a merge of main brings in only `tests/check_c44_question_types_browser.cjs` (#395); it is identical to `origin/main`'s. Fresh isolated copy `c69rev` on :4437 (never :4400); live AI off; US$0.

**What I ran:**
- `check_c69_gates.ts`: **87/87**.
- `setup_visitor_visa.ts`: 13/13. In `setup_vv_m3.ts`, S7 and all three S8 lines pass; S2w, S5 and S7a fail for the same outside reasons as before.
- `check_engine.ts`: 41/41. `graph.mjs --check`: exit 0.

**The breaker's repros, re-run through the API (scratch script; every one answered in words):**
- **M1, now refused:**
  - `vv.contra`, `vv.hidden` (the details question asked only after a yes) and `vv.uci` (optional) each save 200. The draft then lists a release error naming the condition or "optional", and submit gets 400.
  - `eq criminal_history "false"` and `eq "maybe"` → 400 "…but it is a yes/no question: use true or false".
  - An `and` with `eq true` and `eq false` on the same fact → 400 "…both true and false, so it can never be true".
- **m1:** NUL in a label, a judgement line, the disclaimer or a condition value, and a raw lone surrogate in a label or judgement line, each → 400 on its field. There are no 500s left.
- **m2:** depth 1000 (`not` and `and`), 995 and 21 → 400 "nested too deep: at most 20 levels". Depth 19 → 200.
- **m3:** 2001 characters and 4.76 M characters → 400 "Keep the disclaimer to 2000 characters". 2000 characters, and a disclaimer with line breaks, → 200.
- **m4:** a reorder alone now gives the line `Eligibility|gate_order` "Gates reordered: …", and submit gives 201 (it was 400 "Nothing has changed"). A reorder no longer slips into the next release unreviewed.
- **m5:** zero-width, BEL/ANSI, RLO, `\n`, `\r\n` and `\t` in a label → 400. A judgement line of combining marks only → 400 "cannot be empty". A line break in a judgement line → 400.
- **m6:** labels that read the same ignoring case and spacing → 400. Judgement lines that are the same apart from case or spaces → 400 on lines 1 and 2. 100 emoji in a label and 61 in a judgement line → 200; 161 emoji → 400 (lengths now count characters).

**No false refusals:**
- S7's own gates save and release, and the Visitor visa draft lists no Eligibility problem after S8.
- On all 6 combinations of the copy, no draft shows an Eligibility problem. `gateProblems` returns nothing without `snapshot.eligibility`, so other drafts and releases are untouched.
- The suite's fingerprint lines (every release re-hashes to its stored sha; another combination's draft sha is unchanged) still pass.
- Value types in the library are text, yes_no, date, code, country, address and number. `misfit` treats code, country and address as text, which fits what a gate compares.

**`contracts/runtime.ts`:** the only change is `export` on `INVISIBLE` and `LONE` (`:20`, `:22`). The regexes and `clean`/`text` are byte-identical. There is no barrel re-export and no clashing name; the only new importer is `engine/eligibility-gates.ts`. Additive and harmless.

**Mutation:**
- Disabling the placement check (M1a) fails 4 lines (83/87).
- Disabling the value check *at release* fails nothing, because only the save-time check is tested (minor R3-1).

**Build-notes item 11, "not caught":**
- Contradictions across `or`/`not`, ranges that cannot meet, one gate contradicting another, an answer-list code not on its list, and a person fact asked once per case.
- **Acceptable for part 1.** These are the same limits the existing rule checks have for placements and rules, and they are stated, not hidden.
- The expert now signs each gate with its rule shown in words and values, before and after (`conditionWords`), so the SME sign-off can catch them.
- The answer-list code is the most likely in real authoring. It is worth a follow-up row with the immigration expert, not a block here.

**New minors:**
- **R3-1:** add one fail line for the value check at release (for example, a library field whose type changed after the save). Today, removing the release-time `valueProblems` passes 87/87.
- **R3-2:** the change-summary rule words use field codes ("person.criminal_history is false"). The SME reads codes on the Review tab (D10, C3.8 names facts by meaning). Use `factWords` there.
- **R3-3:** the duplicate refusal quotes the *new* text ("Gate 1 already reads "passport  ANSWERED""). Quoting gate 1's own label would read better.

**New Blocker or Major:** none.

**Journey score:** stays 9/10. "Correct data" holds: no gate that can never be true, or that can never be answered, reaches a release in any repro.

**Verdict: Approve** on b05f5d45. There is no open Blocker or Major. The label still waits for the tech lead's word on the migration slot (condition 2).

## Part 2 review (fd26c492)
Scope: BR-7…BR-14, BR-17, BR-18, the §6 run routes and R4 (P-230 (1)). Diff `origin/main..fd26c492` (4db71982, fd26c492). Fresh isolated copy `rev_c69` on :4439 (never :4400); live AI off; US$0 (no `ai_batch` row). There is no UI in this part. Part 3 (override, review, the page) is out of scope, so C6.9-11…13 are expected to fail.

**What I ran (each on a fresh copy):**
- `check_c69_runs.ts`: **60/60**. `check_c69_gates.ts`: **87/87**. `check_vv_prepare_api.ts`: **32/32**.
- `acceptance/C6.9.test.ts`: **12/15**. C6.9-11…13 fail with 404, as expected (the part 3 routes do not exist yet).
- `graph.mjs`: no gap names an assessment route or C6.9.
- My own probes, from scratch scripts (`scratchpad/probe/*.mts`):
  - A client gets 403 on GET one with a **real** run id. An author gets 403 on POST and on GET one. No `x-actor` gets 401.
  - Confirm section does write new answer ids (I compared them), and the run stays up to date. Re-answering the same value also keeps it up to date.
  - The audit text is "…ran an eligibility check on case 5e70564d for person fcc41f91 (first run): possibly eligible". It holds no answer value.
  - Reasons: 301 characters → 400 `reason`; a line break → 400; a non-English reason → 201. A `person` that is not text → 400 `person`.
  - An UPDATE is refused by the trigger. DELETE is allowed, by design, so a case's deletion still removes its runs.

**What holds:**
- BR-7: clients get 403 on every route and another firm 404, both via `reach`. The case subject, someone not on the case, and a person with `applies: false` are each refused 400 on `person`. The pin-mismatch 409 comes from `reach`.
- BR-8: the envelope matches the concept and the trigger freezes the row. The trigger test is not vacuous: without the trigger, `reason` would read `changed`.
- BR-9:
  - The `exists` rewrite means an unanswered passport is Not answered, never Not met.
  - An invalid date counts as missing (`checkValue` filter). The shared `evaluate` is unchanged.
  - Removing the rewrite or the filter fails `check_c69_runs.ts:31` and `:143`.
- BR-10: `FAIL_BEATS_MISSING = true` (P-229 (3)) applies to `not_eligible` gates only (`eligibility.ts:70`). No gates → 409, and no row is written.
- BR-11, BR-12, BR-17 and BR-18 hold.
- BR-13 compares values, never answer ids. It is worked out on every read and never written: `out_of_date` is not in `result_json`.
- BR-14: a first run needs no reason. A later run needs a non-empty one, trimmed.

**R4 / C6.9-7: faithful to P-230 (1).**
- P-230 (1) says the background question "gives needs the representative's review, never a hard Not eligible". The test now asserts all four of:
  - the outcome is POSSIBLY_ELIGIBLE;
  - `vv.no_convictions` is in `reviewGates`;
  - it is *not* in `failedGates`;
  - the gate's own state is still `not_met`.
- That is stricter than the old line, and it matches BACKLOG R4: "a gate carries 'when not met' … as data; the background gate is needs review".
- `whenNotMet` is data:
  - It is stored only when set to `needs_review`, so older fingerprints are unchanged. Any other value is refused on `gates.N.whenNotMet`.
  - It is carried in `snapshot.eligibility`, and a change to it is a change-summary line in words.
- The default (`not_eligible`) path is still tested both ways in the pure tests (`check_c69_runs.ts:68,72`).
- R4's "copy says the representative reviews" belongs to the page (part 3).

### Majors
**M1. False "Not met" / NOT_ELIGIBLE on an answered once-per-case fact without the `case.` prefix (AG-3-12).**
- Cause: `engine/runtime/eligibility.ts:36-38` (`aboutOf`/`valueOf`) decides whose fact it is from the prefix (`case.*` → case, everything else → person).
- But answers are keyed by **who answered** (`knownOf`: the case subject's answers are about `"case"`), and `evalCondition`'s `factsOf` gives a person the case's facts whatever their prefix.
- On a Visitor visa case, `relationship.start_date` and `representative.*` are placed `once_per_case` and asked of the **case subject**. I checked this with the agent view on :4439.
- So for `exists relationship.start_date` answered `2020-01-01`:
  - `valueOf` sees it as missing and rewrites it to the sentinel;
  - `evaluate` sees it present, so `eq "__missing__"` is false;
  - the result is **state `not_met`, outcome NOT_ELIGIBLE**, `values` null, `inputs[].about` the person.
- Repro (pure, real keying): `scratchpad/probe/pure.mts` prints `{"outcome":"NOT_ELIGIBLE","state":"not_met","values":{"relationship.start_date":null},…}`.
- Same cause, second effect: for any operator on such a fact, `inputs` records `null`, so `out_of_date` never sees that fact change (BR-13).
- Reachable through data: part 1 lets such a gate save and release (its round 3 "not caught" list includes "a person fact asked once per case"). It is not reachable with S7's two gates.
- Fix: read the value where `evaluate` reads it. Use the person's key, then `kkey("case", f)`, in `valueOf`, `inputsOf` (record that `about`) and `nowOf`. Add a pass and a fail line using a once-per-case non-`case.` fact. Refusing such gates at PUT or release would also do.

**M2. Two simultaneous first runs both succeed with no reason (BR-14; STANDARDS §2 [M] "Idempotent creates").**
- Cause: `api/src/assessments.ts:66-76` counts earlier runs, then creates, with no transaction or lock.
- Repro: `Promise.all` of two `POST /runtime/cases/:id/assessments {person}`, which a double click on part 3's button will do. Both return **201**, and the case has 2 `MANUAL` rows with `reason` null. The second one is a later run that has no reason.
- Fix: do the count and create in one transaction under `pg_advisory_xact_lock(hashtext('assessment:'||case||':'||person))`, as `ai.ts:211` does. Add a race test.

### Minors
- **m1:** the line "…with no answer value in its words" only counts audit rows (`check_c69_runs.ts:126`). Assert that the summary does not contain the answered values. My probe shows that it holds today.
- **m2:** the client 403 on GET one is tested only with a non-existent id (`check_c69_runs.ts:108`). Add a real id. My probe shows 403 today.
- **m3:** the scale line covers 5 runs for 2 people (`:169-170`); the concept asks for 4 people × 10 runs in under 300 ms. The queries are not per-row: one `findMany` with includes, plus one read of today's answers.
- **m4:** the concept is not updated for R4 in two places:
  - §6 "Assessment fields" and "ours" (`concept.md:178,182`) do not list `reviewGates` or the gates' `whenNotMet`;
  - §8 row 10 (`:229`) still reads "a fail with all answered → Not eligible `vv.no_convictions`".
- **Not a finding:** with S7, no Visitor visa gate can now reach NOT_ELIGIBLE. The travel document gate is `exists`-only, so it is Met or Not answered. The pure tests cover NOT_ELIGIBLE.

**Not checked:** the UI (part 3), a real screen reader, and canada.ca wording (Sample).

**Journey score:** 8/10 (`journey-test-reviewer-2026-11-02-part2.md`). Correct data and error recovery are ½ because of M1 and M2; the UI criteria are ½ until part 3.

**Verdict: Block** on fd26c492. Fix M1 and M2, each with its test. The minors can go in the same PR or follow.

## Part 2 review round 2 (36163fad)
Delta `fd26c492..36163fad`, one commit. Fresh isolated copy `rev_c69` on :4439 (never :4400); live AI off; US$0.

**What I ran:**
- `check_c69_runs.ts`: **75/75** on a fresh copy, then 72/72 on the same copy (the setup lines are skipped the second time). The 40-at-once race line passed both times.
- `check_c69_gates.ts`: **87/87**. `check_vv_prepare_api.ts`: **32/32**. Each ran on a fresh copy.
- `acceptance/C6.9.test.ts`: **12/15**. C6.9-11…13 fail with 404, which is part 3.
- `graph.mjs --check`: exit 0.

**Round 1 findings re-checked:**
- **M1, fixed.**
  - `engine/runtime/eligibility.ts` `aboutOf` now reads the person's own answer, else the case's, whatever the prefix. `inputsOf` and `nowOf` read the same way.
  - My repro `scratchpad/probe/pure.mts` now gives `LIKELY_ELIGIBLE`, `state: met`, `inputs[0].about: "case"`, value `2020-01-01`.
  - There are 4 new lines (pass, and fail on out of date). The out-of-date line fails against the old `nowOf`.
- **M2, fixed.**
  - The count and the insert run in one `$transaction` under `pg_advisory_xact_lock(hashtext('assessment:case:person'))`. The `reason` refusal is thrown inside it, so it rolls back.
  - My 2-at-once probe now gives 400 + 201, with one MANUAL row.
  - A heavier probe I wrote, `race100.mts`: 100 POSTs at once across 2 people, with and without reasons. Result: 35 × 201 and 65 × 400 (all on `reason`), **no 5xx**, and exactly 2 MANUAL rows, one per person.
- **m1, fixed.** The audit check searches the summary and the detail for the answered values, and requires at least one audit row, so it cannot pass vacuously.
- **m2, fixed.** A client reading a real run id gets 403 (tested; my probe agrees).
- **m3, fixed.** 4 people × 10 runs: 40 rows are listed in under 300 ms.
- **m4, fixed.** Concept §6 lists `reviewGates` and `whenNotMet`, and the PUT body has `whenNotMet?`. §8 row 10 is reworded for R4.

**Breaker's fixes:**
- **m1:** a gate not met now lists the facts it could not read, and `missingInputs` takes them from every gate. Tested for a `not_eligible` gate (Not eligible) and a `needs_review` gate (Possibly). A Met gate lists nothing.
  - Side effect, checked: with `FAIL_BEATS_MISSING = false`, a failed gate with a fact missing inside it would now read Possibly eligible. That is closer to AG-3-13 ("all gate inputs are present"). The switch is `true`, so nothing changes today.
- **m3:** after `PATCH applies:false`, the run reads `out_of_date: true, not_travelling: true`. A traveller is not marked. A person removed from the case is treated the same way.
- **m4:** characters are counted with `[...x].length` (300 emoji pass, 301 are refused), and a reason needs a letter or a digit (`"—"` → 400). Unicode words still pass: my probe gave 201.

**New minors (not blocking):**
- **r2-1:** when both the person and the case have answered the same fact, `aboutOf` shows the person's value. `factsOf` (`render.ts:104`), which the verdict uses, takes whichever comes last in the Map. So `values` and `inputs` could show a value other than the one judged. It is rare: a fact is normally asked of one subject. Fix: pick the same subject in both.
- **r2-2:** on breaker m2, left as a known limit and asked in the PR: a gate on a row fact compares row 0 only. That can give a false **Not met**, not only Not answered. For example, `eq` on row 0 fails while row 1 matches.
  - Visitor visa has no such gate, and it is disclosed, so it does not block.
  - The follow-up should refuse row-fact gates at release (part 1's check) rather than leave them.
- **r2-3:** `not_travelling` is not in concept §6 "Assessment fields / ours".

**Journey score:** 9/10. Correct data and error recovery go back to 1. Accessibility and visual quality stay ½ until the page (part 3). The journey report is unchanged since round 1; this note supersedes its score.

**Verdict: Approve** on 36163fad. No Blocker or Major is open. The three minors can be follow-ups.
