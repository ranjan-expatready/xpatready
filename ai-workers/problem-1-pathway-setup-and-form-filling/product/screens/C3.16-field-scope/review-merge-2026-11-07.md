# C3.16 — review of the merge and the second-lander check (#1054), 7 Nov 2026

Independent reviewer, P-318 (1): a diff-only check of what changed since the round-2 Approve. Read-only on the worktree; one
isolated copy on port 4446, stopped at the end. Paths below are relative to `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/`
unless they say otherwise.

## Commits reviewed

`git diff 608f793af b13d0458e`, i.e.:

| Commit | What |
|---|---|
| 78cbed9df | review round 2 record and its Minor m8 (merged field named, never its key) |
| 747cc048a | migration renamed to `20261105100000_c316_field_scope` (100% similarity, content unchanged) |
| 864549c15 | build notes: the second-lander check |
| b11c26e36 | merge of origin/main 4f42b9797 (B86, #1051, #1072, B120 and others) |
| 713631ba2 | second lander, unit part (`tests/check_c316_field_scope.ts`) |
| b13d0458e | second lander, API part (`tests/runtime/check_c316_link_second_lander.ts`) |

origin/main = 4f42b9797 = the merge base of b13d0458e (the branch is up to date with main). The remote head of #1054 is b13d0458e.
Commands used: `git show --cc b11c26e36`, `git diff 864549c15 b13d0458e`, `git diff origin/main b13d0458e --stat`, and
`git diff 86b721eac origin/main` (main since this PR's earlier base) on the files this PR touches.

## What I checked, with evidence

### 1. The merge kept both sides

* **Conflict hunks (`git show --cc b11c26e36`).** Exactly the four hunks the merge message names; each keeps both sides.
  * `api/src/question-condition.ts:12-13` both imports (`placementRefusal`, main's `spreadOf`).
  * `api/src/question-condition.ts:73-74`: this PR's `refuseScoped(...)` is checked first, then main's
    `revise(db.sectionQuestion, rows, {...}, c.proposedBy, strip)` (B86 break M1) runs unchanged. The proposal path (line 44)
    refuses before main's `spreadOf` runs, so nothing is computed for a refused proposal.
  * `api/src/runtime.ts:20-21` both imports, beside main's `linkedOf`; `web/src/runtime/questionnaire.tsx:16-17` main's
    `EmployerCaseSource, LINKED_FILE` import and this PR's scope-tag import.
* **Save rule next to A2 (`api/src/runtime.ts:328-340`).** Main's C6.11 "Uses a representative" refusal (line 328) runs first and
  is untouched. It is a `case.` key, so `isFilingFact` reads it as a filing fact whether or not the placement is marked: the two
  rules do not interact. The BR-4 words (`ONCE_WORDS`) only replace the refusal text for marked placements. The QA-289 code
  (`engine/runtime/team.ts` `representativeContact`) is neither in this diff nor reached by it.
* **`aboutOf` next to #1051's `carriedFacts`.** `engine/resolver.ts` is unchanged on main since the PR's earlier base, so the
  merge cannot have changed `aboutOf` (line 92). `engine/runtime/employer.ts:54-59` (main) skips a fact only when
  `scopeOf` is `person`, and writes `on: "case"` exactly when `isFilingFact(fact, place)`. With this PR, a marked Organisation
  placement gives `scopeOf` = `organisation` (carried) and `isFilingFact` = true (on the case). `aboutOf` (line 102) reads a
  marked Organisation fact on FILING for the principal's own form. The copy and the reader agree. An unmarked `organisation.`
  fact still goes on the principal and is read from the form's subject, as before. `api/src/employer-link.ts:52` picks the case
  subject for `on: "case"`, and compares Same or Different against the case subject's current answer.
* **Silent auto-merge interactions.** I looked for main code that writes placements or conditions without going through the
  scope guards. Every new caller (`features/placement/10-form-boxes.ts`, `20-condition-facts.ts`,
  `features/checkpoint/combination/210-rule-facts-beside.ts`, `325-conditional-documents.ts`) places through
  `studio.placeField`, where the guard sits under the field's lock (`api/src/studio.ts:679`). B86's form-field condition writes
  `form_field_map.condition_rule` only, never a placement condition. Main's own new readers of placements pass the placement
  to `isFilingFact`: `engine/runtime/case-checklist.ts:136,139`, `engine/render.ts:156,176,262`, `engine/programs.ts:24`.
  Main's `engine/snapshot.ts` change (the QA-262 fixed-point loop over `placements`) runs before the placement map, and the PR's
  `...markOf(...)` sits in that map beside main's `client_only`. Main's `api/src/runtime.ts:380` `groupFor` reads `case.` keys
  only, for `per_row` groups, and a marked field can never be `per_row` (`placementRefusal`). I found no bad interaction.

### 2. Migrations and schema

* `prisma/migrations/`: main's last migration is `20261105090000_b86_form_field_condition_rule` and this PR's
  `20261105100000_c316_field_scope` sorts after it. On the fresh copy `_prisma_migrations` lists both as finished in that order,
  and `enum_range(null::"FieldScope")` = `{CLIENT_LEVEL,CASE_LEVEL,HOUSEHOLD,ORGANISATION}`.
* Both migrations only add, and they touch different objects. B86 runs `ALTER TABLE "form_field_map" ADD COLUMN "condition_rule" JSONB`.
  This PR runs two `ALTER TYPE "FieldScope" ADD VALUE IF NOT EXISTS`. The rename in 747cc048a kept the content byte for byte.
* `prisma/schema.prisma`: line 623 has `conditionRule Json? @map("condition_rule")` (B86), and lines 45-50 have the four-value
  `FieldScope` enum. Both are present, with no conflict markers.

### 3. The tech lead's ruling (comment 6650232198)

The ruling asks for: (a) `carriedFacts` with `{ fact, repeats: "per_person", scope: "organisation" }` gives `on: "case"`; and (b) an
API check on the SQL-scoped fixture that a link puts the answer on the case subject, the question shows it, the principal's
IMM 5710 box reads it, and a value typed beforehand shows Same or Different.

* **(a)** `tests/check_c316_field_scope.ts:77` calls `carriedFacts` with exactly that placement and asserts `on === "case"`.
  Line 78 does the same for Household, and line 79 is the negative case (unmarked → `principal`). All three assert what their
  names say. The file is a `tests/check_*.ts` file, so `run-suites.sh` runs it in CI.
* **(b)** `tests/runtime/check_c316_link_second_lander.ts`, which I ran on a fresh configured checkpoint on :4446: **12/12**.
  * The listing writes the marked name on the case subject (line 47), and against the value typed beforehand it reads
    **Different** (line 48).
  * Linking without Replace keeps the typed value (BR-4).
  * On a second case, the copy lands once on the case subject with channel `linked_file`, and nothing lands on the principal
    (checked in SQL).
  * The question is asked once, on the application, and shows the linked value.
  * The principal's IMM 5710 box is among the question's readers.
  * I checked the last point on its own through `GET /api/runtime/cases/:id/forms`: on both cases, the principal's IMM 5710
    readiness lists `organisation.employer_name` as about "The application", reason "not confirmed". So the box reads the
    case's value, which is there. The unmarked `organisation.employer_address` stays about the principal.
* **Is the scaffolding sound?** Yes. On the checkpoint the field is v1 PUBLISHED with scope CLIENT_LEVEL. Its one placement is
  `per_person` with no condition (`predicate_json` is JSON null, which `factsOf` reads as no condition). Its one box
  (IMM 5710 `...Employer[0].Name[0]`) has person `none`, so there is no representative box. The scope route's own view
  (`GET /api/library/fields/organisation.employer_name/scope`) refuses Organisation for one reason only: "A published field's
  scope cannot change". So the SQL write stands in for exactly SA-1B-130 rule 4, as P-33 scaffolding should, and reaches a state
  the product allows on an unpublished field. The re-release goes through submit, sign off and approve, and the test asserts
  both the new version (`before + 1`) and the mark in the new snapshot.

### 4. M3-only guard

`git diff origin/main b13d0458e --name-only` matched against `product/tools/m2-hot-files.txt` hits only three files:
`studio/engine/snapshot.ts`, `studio/contracts/resolver.ts` and `studio/api/src/studio.ts`. These are exactly the three in the PR
body's lines "Hot file approved by the tech lead: …" (read through the REST API; the remote head is b13d0458e). Nothing under
`studio/api/src/library-`, `proposals.ts`, `review-proposals.ts`, `render.ts`, `validate.ts`, `demo*.ts`, `sources.ts`
(api) or `contracts/` other than `studio/contracts/resolver.ts` is touched; `engine/sources.ts` is not the listed
`api/src/sources.ts`. Run locally with the PR's title and body, `bash product/tools/m3-guard.sh origin/main..b13d0458e` gives:
"M3-only (C3.16); no M2-hot file changed.", exit 0.

### 5. Typecheck and suites (my own runs, fresh copies)

| Run | Result |
|---|---|
| `node product/tools/typecheck.mjs` | api 15 errors, all known; web 0; **PASS, no new type errors (15 known, 0 fixed)** |
| `acceptance/C3.16.test.ts` six part | **33/33**, including "C3.16-7 pass: back to Person, the draft is byte-identical to before" |
| `acceptance/C3.16.test.ts` case part, after `setup_visitor_visa.ts` | **16/16** |
| `tests/check_c316_field_scope.ts` | **33/33** |
| `tests/check_sh3_resolver.ts` | **85/85** |
| `tests/runtime/check_c316_link_second_lander.ts` on the configured checkpoint | **12/12** |

These match the builder's reports.

## Findings

**Blocker:** none. **Major:** none. **Minor:** none.

**Nits** (none blocks the merge):

* **n1. Only one of "Same or Different" is shown.** `tests/runtime/check_c316_link_second_lander.ts:48` proves Different only; the
  ruling's words are "Same or Different". Different is enough to prove the wiring: if the link compared against the principal,
  who has no answer, the line would read New. The Same branch is the same `factState` comparison, unchanged from #1051. If the
  builder touches the file again, a Same line (type the employer's own value on a third case) would cover the ruling's words
  literally.
* **n2. One condition in the IMM 5710 check is looser than the line's name.** `tests/runtime/check_c316_link_second_lander.ts:68`
  accepts `f.subject === principal2 || f.person === "Client B"`. The subject alone is the precise condition, and the label
  fallback could pass on a person of that name who is not the principal. The `fills` list it reads is the case view's own
  record of which boxes read this case-level answer, which is the right reader. I confirmed the same thing through the forms
  route (see 3b).
* **n3. CI does not run the API part.** `tests/runtime/check_c316_link_second_lander.ts` is not picked by `product/tools/run-suites.sh`,
  which runs `tests/check_*` and only the named runtime suites. Main's other configured-checkpoint checks
  (`tests/runtime/check_c611_checkpoint.ts`, `check_c115_employer.ts`) are run by hand the same way, so this follows house
  practice. In CI the unit part guards `carriedFacts`; the route's choice of subject (`api/src/employer-link.ts:52`) is guarded
  only by this manual check.
* **n4. Outside this diff, not from the merge: `askedOnly` ignores the mark.** `engine/qd-conditions.ts:202` (C4.11, before the
  approval) still decides "case" against "each person" by `repeats` and the `case.` prefix, not by `isFilingFact(p.fact, p)`. So a
  marked Household or Organisation decider would be listed for each person in the AI condition check's asked-only list. It
  touches AI drafting only, never answers or forms, and is not new in this range. This is for the tech lead to file or drop,
  not a change to this PR.

## Verdict

**Approve.** The merge keeps main's behaviour (B86's `c.proposedBy` at approval, #1051's `linkedOf` and `carriedFacts`, A2's
representative refusal) and this PR's approved behaviour. Migrations and schema are additive and ordered. The two new checks
do what the tech lead ruled and assert what their names say. The only M2-hot files are the three the tech lead approved.
Typecheck shows no new errors, and every suite passes on fresh copies.

## Diff-only check, 8e5197711

Independent reviewer, P-318 (1). Range checked: `git diff 23e70d7a7 8e5197711`, one commit, 8e5197711, the builder's answers to
the breaker's round 2 (`break-report.md`, "Round 2": M1, m2, m3, m4). The code changes are in `api/src/question-condition.ts`,
`api/src/forms.ts` and `engine/field-scope.ts`, plus the two checks. Paths are relative to `prototype/studio/`. The copy
`rva5` ran on port 4446 only (two fresh starts) and is stopped, with its database dropped.

### What I checked

* **No nested `$transaction`.**
  * `applyCondition` (`api/src/question-condition.ts:69`) has one caller, `Lifecycle.afterApprove`
    (`api/src/lifecycle.ts:468`, `applyCondition(this.db, …)`). `afterApprove` has one caller,
    `Screen02.decideLibraryChange` (`api/src/screen02.ts:137`), which calls it after `decideChange` returns and outside any
    transaction. So the new `db.$transaction` (`question-condition.ts:76`) always runs on the top-level client.
  * The merge (`api/src/forms.ts:448-449`) only adds `lockItem(tx, …)` inside its existing transaction; it opens no new one.
* **Lock keys match the scope route.** All three call the same `lockItem(tx, workspace, "field", [key])`, whose key is
  `library-item:<workspace>:field:<key>` (`api/src/library-items.ts:40`):
  * the scope route, `api/src/field-scope.ts:101` with `[key]`;
  * the condition, `question-condition.ts:77` with `[current.canonicalFieldKey]`, the field key, as `refuseScoped` reads it;
  * the merge, `forms.ts:449` with `[from, to]`, both field keys.
  The workspace is the same one in each (`ws.id()`, `c.workspaceId`, `m.workspaceId`).
* **No deadlock.**
  * Scope and condition take one field lock each. The merge takes two in one call, and `lockItem` sorts the keys
    (`library-items.ts:40`).
  * Each of the three takes its advisory locks first, before any row write. The merge now locks before `fieldMerge.updateMany`.
    The condition holds nothing before its lock: its earlier reads take no locks.
  * Every other transaction that takes more than one field lock takes them sorted, in one call: `api/src/sources.ts:911`.
    No transaction takes a field lock after holding another field lock.
  * The only mixed-kind pair, field then section (`api/src/studio.ts:677-678`), is never reversed: `studio.ts:725` locks a
    section only. So no wait cycle is possible.
* **The locks close both races.**
  * M1: whichever transaction takes the lock first commits first. The second then reads it, because Postgres reads committed
    data at each statement. The scope route's `factsOf` reads the placement's condition, and `refuseScoped` reads the scope,
    both after the lock.
  * m2: the merge re-reads both fields after the lock (`forms.ts:453-455`), so a scope save on either field is seen by the
    `mergeScopeRefusal` re-check.
* **The m3 refusal.**
  * Words (`engine/field-scope.ts:48`): "This is the employer's fact: choose Organisation, not Household." Plain and in the
    concept's voice. It names the scope that is allowed.
  * Position (line 78): after the key-based refusals (merged, published, `case.`, person-only), before the placement-based
    ones (per row, representative box, condition). That is right, because the key alone decides it.
  * It refuses Household only; Organisation on an `organisation.` key stays allowed (checked in the unit test).
  * No pack or fixture sets Household on an `organisation.` key:
    * the C3.16 pack's Household targets are the `relationship.%` union date (`acceptance/C3.16.test.ts:25`), a per-row key
      (`:87`), a `person.%` condition key (`:93`), a `person.%` race key (`:106`) and `person.date_of_birth` (`:85`);
    * the only SQL scaffolding with HOUSEHOLD is the union date (`:156`);
    * the second-lander check sets ORGANISATION;
    * nothing else in `acceptance/`, `tests/` or `samples/` writes the value.
* **The tests.**
  * `check_c316_field_scope`: **34/34** at 8e5197711. With only `engine/field-scope.ts` put back to 23e70d7a7 (via
    `git archive` into the scratchpad), it gives **32/34**: exactly the two m3 lines fail. This matches the builder.
  * `check_c316_link_second_lander`: **13/13** on a fresh configured checkpoint.
    * n2 is fixed: line 68 now matches by the principal's subject only.
    * n1 is fixed: line 75 types the employer's own value on a third case's application and asserts `state === "same"` on
      the case subject. If the PUT failed, the line would read New and fail, so it cannot pass by accident.
  * C3.16 six part: **33/33** on a fresh copy.
  * Typecheck: PASS, no new errors (15 known, 0 fixed).

### Findings

**Blocker:** none. **Major:** none. **Minor:** none.

**Nits** (none blocks the merge):

* **n5. A unit line's name says more than it asserts.** `tests/check_c316_field_scope.ts:81` is named "…so no employer copy is
  Household". It asserts the m3 refusal again, plus `household.length === 1`, which says the opposite: a Household-marked copy
  *is* still carried (on the case). The comment above it (lines 79-80) says this. The refusal is the guard, and that is
  right. But the name would read truer as "Household cannot be set on the employer's fact (the refusal is the guard; carriedFacts
  would still carry a marked copy)", with `household[0].on === "case"` asserted.
* **n6. Some of `applyCondition`'s reads are still outside the lock.** `placementOf` and the `sameTree` "Changed since" check
  (`api/src/question-condition.ts:71-73`) run before the transaction, so `revise` writes from rows read before the lock. This
  does not reopen M1: the scope is read under the lock, and the scope route reads placements under the same lock. It is also
  older than this diff. Moving those reads inside the transaction (`placementOf(tx, …)`) would make the whole
  check-and-write atomic against `placeField`, which takes the same field lock (`studio.ts:677`).
* **n7. One pack query could later trip the new refusal.** The per-row Household key in `acceptance/C3.16.test.ts:87` is picked as
  the first per-row draft field by key, other than `case.%`. On today's six it is `person.education_city`. An
  `organisation.%` per-row draft field would sort before `person.%` and get the new m3 refusal instead of the per-row one.
  Adding `and q.lineage_key not like 'organisation.%'` keeps the line about what its name says.

### Verdict (8e5197711)

**Approve.** M1 and m2 are closed by the same field lock the scope route takes. Nothing nests, and the lock order cannot
deadlock. The m3 refusal is worded and placed right, and no fixture depends on the old behaviour. n1 and n2 are fixed, and
the checks fail without the change and pass with it.

## Diff-only check 2 (7 Nov, head 149cc58d3)

Independent reviewer, P-303 and P-318 (1). `git rev-parse HEAD` = 149cc58d38fed7c39faa75ce153df45e3bd881e6. Range: the four
first-parent commits after my last Approve (a27b62d25): 47747b13b, 87d16a23d (merge of origin/main at 9dc77d1ac),
d34ba017f and 149cc58d3. Paths are relative to `prototype/studio/`. My copies: `rv_a5` on 4485 (the six part) and `rv_a5b`
on 4486 (a draft snapshot for a pure repro). Both are stopped, with their databases dropped. Live AI off, US$0, no priced
button, never :4400.

### What I checked

* **47747b13b (one header line).** I ran `runPlan("C3.16.test.ts", …)` from `tools/gate-b.mjs` on the file. It now gives one
  step, `studio/acceptance/C3.16.test.ts {PORT} {DB}`. The words line ends the block (`isCmd` false, and the line before it
  does not end in `&&`), so the case part's line is no longer joined onto the six part's copy. Right.
* **87d16a23d (the merge).**
  * `git show --remerge-diff 87d16a23d` is empty (header only), so there was nothing to resolve.
  * `git diff 9dc77d1ac...47747b13b` and `git diff 9dc77d1ac 87d16a23d` (that is, `87d16a23d^2 → 87d16a23d`) name the same 34
    files with the same status. With `index` lines dropped, the two patches differ only in five hunk offsets: in
    `api/src/runtime.ts`, `engine/runtime/case.ts` and `web/src/runtime/questionnaire.tsx`. There, main added lines above the
    PR's hunks (QA-293 `REPRESENTATIVE_NOT_TYPED`, QA-289 `writesParts` phone, QA-293's representative tab). The PR's net
    change is unaltered.
  * I read main's three changes against the PR's hunks. QA-293's refusal for subject `representative` comes before the
    PR's `isFilingFact` check in `putAnswer` and does not touch it. No interplay.
  * The migration `20261105100000_c316_field_scope` still sorts last: main's newest, also on today's origin/main
    9fd299219, is `20261105090000_b86_form_field_condition_rule`. It holds only the two `ADD VALUE IF NOT EXISTS` lines.
    `schema.prisma` is the only other prisma change.
* **d34ba017f (the "box" words).**
  * `SCOPE_WORDS_REFUSED.representative` is now "A representative's part of the form reads this field, so it stays about
    each person.". C3.16-2's regex matches it.
  * build-notes records the change from the concept's BR-2 words.
  * `check_qa182_no_box_words` 8/8 on my run. The only "box" left in `engine/field-scope.ts` is a comment (line 95).
  * nit: the pack's line name still says "a representative's box reads". It is a test name, not shown text.
* **149cc58d3 (breaker round 3, M1).**
  * The `documentFacts` refactor is equivalent. It now loops over every placement and asks `caseSuppliers`. An unmarked
    placement gets `[]`, and a fact with two placements adds the same supplier twice, which `add` removes (`list.some(x.key)`).
    The loop is O(placements²), harmless at today's sizes.
  * Holders are right for a marked fact whose lines are a member's own:
    * household: every member, not the case;
    * organisation: the principal only;
    * `holder.spouse`: `partnerOf(m)` for each subject `m`, the same direction `documentSubjects` used when `documentFacts`
      credited the supplier;
    * `holder.parent`: never a member id, so neither side counts it.
  * The `subjectId !== "case"` path is byte-for-byte the old one (`from = [subjectId]`).
  * The test's supply line is test-only and labelled Sample: source "Sample, test only (C3.16 pack)", quote "Sample: a
    test-only supply line, not an official reading.". It goes through the library's author-then-approver steps on the
    isolated copy.
  * The "missing" line proves the fallback, read with the "pass" line in the same run. The setup is the same and only the
    `missing:` tweaks differ. `qsM.length === 1` also shows the question is placed, so `qsU.length === 0` is not vacuous.
    It is a guard, not a fail-first line: it passes on the unfixed code too, as the build-notes' 35/37 says.
  * My runs at 149cc58d3:
    * six part 37/37, exit 0 (`rv_a5`, 4485);
    * `check_c316_field_scope` 36/36, `check_sh3_resolver` 85/85, `check_line_holders` 19/19,
      `check_forms_qa162_fact_words` 61/61, `check_qa182_no_box_words` 8/8;
    * `check_preview_sets` 29/29 (`rv_a5b`, 4486).

### Findings

**Major 1: 149cc58d3 changes Preview for unmarked facts. An application fact supplied by a document the application
itself holds is now asked again (regression against main).**
* What is wrong:
  * Before the change, `fromDocument("case", fact)` built `holders = {"case"}` for a supplier about "holder".
  * A document line whose "Whose document" is **"The application (once)"** (`who: "case"`, offered on the Documents tab,
    `web/src/pages/configuration.tsx:14`, `api/src/studio.ts:75`) gives a checklist line held by `"case"`
    (`lineHolders → subjectsFor(…, "case") = [FILING]`, `engine/render.ts:191-198`).
  * `documentFacts` already credits it to `"case"` (`documentSubjects(people, "case", "holder") = ["case"]`). So main
    skipped the question and listed the document under the case.
  * Now `from = caseSuppliers(…)`. That is `[]` for an unmarked fact (its own unit line asserts this), so `holders` is empty
    and the question is asked.
  * The same happens to a marked Household or Organisation fact whose supplying line is held by the application.
* Repro (pure, US$0): Visitor visa's draft snapshot from `rv_a5b` (the six plus `setup_visitor_visa.ts`), with one added
  Sample type that supplies `case.funds_available_cad` on a `who: "case"` base line. `previewFamily(…, "principal")` gives:
  * main 9dc77d1ac: **not asked**; `from_documents` = `[{subjectId:"case", document:"Sample application document (review repro)", …}]`;
  * branch 149cc58d3: **asked on the case**; `from_documents` = `[]`.
  * So the Fact sources tab still says Document while Preview asks the client: the same disagreement as round 3's M1, now on
    unmarked facts, which C3.16-7 and BR-3 promise stay unchanged.
* Why Major: a reachable author choice changes behaviour on main for a fact the PR never marks, and the PR's own "unmarked:
  nothing changes" check misses it. Not Blocker: it is Preview only (the case does not skip document facts yet), no stored
  value is wrong, and the six do not seed such a line.
* Fix, checked in a scratch worktree (no repo change), one line in `engine/runtime/preview.ts:100`:
  `const from = subjectId === FILING ? [FILING, ...caseSuppliers(s, renderPeople, fact)] : [subjectId];`
  * With it, the repro matches main again (not asked; `from_documents` back on the case).
  * The household fix still holds: holders only grow, and C3.16-5's lines do not depend on a case-held line.
* Fail-first test wanted: a unit or pure-preview line with a `who: "case"` supplying line, for an unmarked `case.` fact
  (asked on 149cc58d3, skipped with the fix). Ideally also one for a marked household fact held by the application.

**nit 1.** For Household, `caseSuppliers` counts every person on the case. The unit line fixes the family as including the
representative, so a representative's or sponsor's own document would supply a household fact. Unchanged from round 1
(M4); no seeded type does it. Worth one word in the concept if it is meant.

**nit 2.** The pack line name in C3.16-2 still says "box" (see d34ba017f above).

### The breaker's Minors 2 and 3, graded for the tech lead

* **Minor 2 (read_for from form fills; `engine/runtime/case.ts` scopeTagOf): Minor, agree.**
  * BR-4's own B2 rule (a child is never read the parents' union date) and C3.16-3 ("each adult's part shows the read-only
    line") make the child's silence intended.
  * `read_for` and the fills come from the same coverage, so every member whose form reads the value is named. Nothing
    needed is hidden and no value is wrong.
  * It is a wording gap between BR-4 ("each member's own part") and the pack. Fix the words in the concept, not the code.
* **Minor 3 (Organisation accepted on any person fact; `coverageGaps` skips boxes with no `about`): Minor. It does not
  block this PR, but it should be a backlog item.**
  * The concept's refusal list (BR-2) was approved as written. It guards representative boxes, conditions, per row, the
    `representative.*` keys, date of birth and has-children, and says of Organisation "another person's box stays empty".
    So Organisation on `person.passport_number` is the approved behaviour, reached only by a deliberate (if wrong) author
    choice. It is audited and goes through a second-person release.
  * Preview shows it: unresolved goes from 29 to 31.
  * The gate's skip of `!b.about` is main's behaviour, which also serves B2's intended blanks, so changing it is new scope.
  * But it is a rule that can hide a needed field from the release gate, so I recommend a backlog item for the tech lead.
    Either:
    * limit Organisation to `organisation.*` keys (the mirror of round 2's m3), or
    * have the gate count a box that a scope blanked as a gap.

### Journey score

Diff-only check: no screen, route or words a person sees changed, except the one refusal sentence (d34ba017f), which I
read. So I did not re-walk the journey. The reviewer's journey score for C3.16 stays **8 / 10**
(`journey-test-reviewer-2026-11-05.md`). Major 1 sits in its "Correct data" criterion and would hold it at ½ until fixed.

### Verdict (149cc58d3)

**Block.** One Major to fix:
1. Preview's `fromDocument` must keep the application's own checklist lines as holders for a case-level fact: `from =
   [FILING, ...caseSuppliers(…)]`.
2. Add a fail-first line for an unmarked `case.` fact supplied by a `who: "case"` line.

Everything else in the range is right: the run-line split, the merge (empty remerge diff, unchanged net patch, migration
last and add-only), the "box" words, and the household and organisation holders.

Reviewer: Block 149cc58d38fed7c39faa75ce153df45e3bd881e6 (Major 1: Preview now asks an unmarked application fact that a document held by the application supplies, a regression against main; fix preview.ts:100 to include FILING in the holders and add a fail-first line)
