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
