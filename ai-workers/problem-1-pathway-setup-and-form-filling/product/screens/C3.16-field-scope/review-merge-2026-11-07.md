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
