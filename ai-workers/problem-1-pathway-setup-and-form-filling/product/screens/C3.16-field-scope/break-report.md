# C3.16 break report (breaker, 5 Nov): commit 22aef7e01

**Scope (P-26):** only what concept r4 §2–§5 builds (the scope choice, its refusals, the release mark, the case asking once, the tag and read-only line). "Not built" items (household or employer lists, household conditions, import keeping a scope, ids across cases) are not findings.
**Copies:** `brk316` on 4457 (Reset to the six, then pack2 `needQuestions` on Visitor visa and the LMIA work permit) and `brk316b` on 4458 (`tests/runtime/setup_visitor_visa.ts`, then the acceptance case part's SQL scaffolding: HOUSEHOLD on `relationship.start_date`, then submit, sign off and approve gave release 2). US$0, no `*_LIVE` switch, no priced button.
**Code under test:** partway through, the shared working tree picked up uncommitted edits from another session (9 files, including `studio.ts` placeField, `resolver.ts` aboutOf, `field-scope.tsx`). So both copies were stopped and started again from a clean `git worktree` of 22aef7e01 in the scratchpad. Every break below was then reproduced on that clean code. Some of those uncommitted edits seem to aim at Majors 1 and 3. That is not verified here.

## Breaks

**Major 1: a merge puts the employer's name in the representative's "Name of firm or organization" boxes (QA-152 trap; BR-2, BR-4 "a representative's box can never read it").**
* Repro (4457, clean):
  1. PUT `/library/fields/organisation.employer_name/scope` `{"scope":"organisation","expected":"person"}` as user-A gives 200.
  2. PUT the same on `organisation.name` gives 422, correctly: "A representative's box reads this field…".
  3. POST `/library/merges` `{"keep":"organisation.employer_name","merge":"organisation.name",…}` as user-A, then POST `/library/merges/:id/approve` as user-B. Both give 201, and the merge moves 3 form fields and 1 placement.
* Actual: GET `/combinations/<wp.lmia_inside>/preview?people={"principal":1,"spouse_or_partner":1}&answers={"case|organisation.employer_name":"Sample Employer Ltd (Sample)"}` shows these boxes all `about=case`, value "Sample Employer Ltd (Sample)":
  * IMM 5475 "Name of firm or organization (if applicable)";
  * both IMM 5476 boxes of that name;
  * IMM 5710 "Name of Employer".
* Visitor visa (no employer) now asks `organisation.employer_name` once, in "Details of intended work in Canada", and fills its IMM 5475/5476 firm boxes with it.
* Cause:
  * `approveMerge` moves form field maps and placements without reading either field's scope (`api/src/forms.ts:335`, `:377`, `:380`);
  * `aboutOf` returns FILING for any box on the principal's form once the mark is "organisation", whatever `entry.person` says (`engine/resolver.ts:98`).
* Expected: the merge is refused in BR-2's words, or the representative box keeps its own reading.

**Major 2: after a merge, Household is accepted on a field that is placed per row (BR-2 "per row in any combination is refused").**
* Repro (4457, clean):
  1. POST `/library/merges` `{"keep":"relationship.union_start_date","merge":"person.previous_residence_from",…}` (a per-row date), then approve it as user-B.
  2. `section_question` now holds lineage `person.previous_residence_from`, `canonical_field_key` `relationship.union_start_date`, `per_row`.
  3. PUT `/library/fields/relationship.union_start_date/scope` `{"scope":"household","expected":"person"}` gives **200**.
* The same field placed per row directly gives 422, so the rule exists but cannot see this placement.
* The draft snapshots of Visitor visa and the LMIA work permit then carry `relationship.union_start_date@personal_details:household:per_row` (snapshot built with this commit's `engine/snapshot.ts`).
* Cause: `factsOf` reads placements by `lineageKey: key`, not by `canonicalFieldKey` (`api/src/field-scope.ts:28`). So a merged-in placement, its per-row repeat and its condition are invisible to every refusal and to the saved-runs warning. Major 1's merge in the other direction (keep a Household field) is also unchecked.

**Major 3: a per-row placement saved at the same moment as the scope gets past the M3 refusal, 9 times out of 10.**
* Repro (4457, clean): `organisation.employer_address` (Person, placed `per_person` in `details_of_intended_work_in_canada`). Send these two requests at the same time:
  * PUT `…/scope` `{"scope":"organisation","expected":"person"}`;
  * POST `/library/fields/organisation.employer_address/placement` `{"sectionKey":"details_of_intended_work_in_canada","collectedFrom":"client_questionnaire","repeats":"per_row"}`.
* Actual: 200 and 201. The field is stored `ORGANISATION` with placement `per_row`. Across 10 resets, 9 ended in this state. Preview then asks it once on the case with `rows: []`.
* Cause: `placeField` checks the scope before it takes the field's lock, so the check can read the old scope (`api/src/studio.ts:663`; the lock is at `:673`). The scope route holds the lock but sees no per-row placement yet.
* Expected: one of the two is refused (concept C3.16-2: "the route locks the field row, m7").

**Minor 4: a merged or retired field that was never published is called "Published".** PUT `/library/fields/organisation.name/scope` after the merge answers 409 "Published: A published field's scope cannot change." The field page shows the same notice. It was a draft that got merged. Cause: `published` counts RETIRED (`api/src/field-scope.ts:32`; `web/src/pages/field-scope.tsx:32`).

**Minor 5: the approver sees four greyed-out choices and no reason.** At 1440 px as user-B on `/library/fields/relationship.cohabitation_start_date`:
* all four radios are disabled;
* there is no Save button;
* no words say who may change it (`field-scope.tsx:26`, `locked` with no notice for `!canAuthor`).

**Minor 6: focus is lost after keyboard actions.**
* After Tab to "Save as draft" and Enter, focus goes to `<body>`: the button becomes disabled.
* After Tab to "Change it in For the household" on Client B's tab and Enter, the tab switches to The application, but focus is on `<body>`, not the question (`web/src/runtime/scope-tag.tsx:38`).
* A keyboard user starts over from the top of the page each time.

**Minor 7: `"__proto__"` slips past the strict body.** PUT `…/scope` `{"scope":"household","expected":"person","__proto__":{"x":1}}` gives 200 and saves the scope. `"constructor":1` is refused with 400 as expected (`field-scope.ts:21`). It is harmless today.

## What held
* **Actors:**
  * GET: none 401, user-A/B/C 200, user-O/P 403;
  * PUT: none and an unknown actor 401, user-B/C/O/P 403, user-A 200.
* **Bodies:** an extra key, wrong types, an array, an empty body, the upper-case `HOUSEHOLD`, a missing `expected` and a 900 kB string all gave 400. Bad JSON gave 400 too.
* **Keys:** `../x`, `case.`, `case`, `名前.x`, `person.é`, `Person.Name`, `person..x`, a NUL byte, `..`, `person.x/../..` and a 5,000-character key all gave 404 in words.
* **Saves:**
  * 10 identical saves at once gave one 200 and nine 409, with one audit line;
  * mixed saves at once gave one winner;
  * a stale `expected` gave 409.
* **Publishing and placing:**
  * a published field (fixture) gave 409, and the panel is read-only in those words;
  * a conditioned or per-row placement after the scope gave 422;
  * "Ask them in their form's sections" goes through the same `placeField`;
  * changing a scoped draft's meaning (PATCH) or its name (`/name`) keeps the scope.
* **Fingerprints** (this commit's `engine/snapshot.ts` against main 86b721eac's, on the same database):
  * with no scope set, the draft and published fingerprints of all 12 snapshots on the six (after setup) are identical;
  * after Household on the union date and Organisation on the employer name, only the `vv.single` and `wp.lmia_inside` drafts move.
* **Release and case (fixture):** with the mark, submit, sign off and approve all gave 201 (release 2). On a case of it:
  * Saves:
    * on the spouse's or child's record: 422 "This is asked once for the household, not for a person.";
    * with a row on the case record: 400;
    * as the client: 403;
    * as nobody: 401;
    * as the author: 403;
    * a second save of the case-record answer with `expectedId: null`: 409.
  * Asked once:
    * asked once, in The application, tagged "For the household · Read for: Client A, Client B";
    * Client B's part shows it read-only with who and when.
  * Form copies: generated copies of IMM 5257 write the date for both adults; the child's box is "not written".
  * Not asked on a principal-only case, nor on a principal and child case.
  * Marking the spouse not travelling drops them from "Read for".
  * Prepare, checklist and filings all answer 200.
* **UI (1440 px):**
  * Tab reaches the radios, with a 2 px outline;
  * the arrow keys skip the disabled Filing choice;
  * the refusal words appear under the choice;
  * the saved-runs warning shows;
  * at 720 px (200 % zoom) the page does not scroll sideways;
  * the "Change it in For the household" button has a visible focus ring; no page errors.

## Not tried
* A document that supplies a household or employer fact (`engine/sources.ts`, M4): no document on either copy supplies one.
* The AI condition proposal path, which would need a saved C4.11 replay. By reading only: `refuseScoped` runs at proposal and again at approval (`question-condition.ts`), but it reads the placement's lineage key, so it has Major 2's blind spot.
* An Organisation fact on a real case: no combination releases on the six (B82).

## Round 2 (merged head b13d0458e, 7 Nov)
**Scope:** what the merge of main brought (B86, #1051, #1072, B120), the migration order, the scope route after the merge, the round-1 Majors, and `tests/runtime/check_c316_link_second_lander.ts`.
**Copy:** `bra5` on 4447 only (`isolated.sh` refuses the name `brA5`: lower case only). It ran the configured checkpoint (Demo › Reset, then Load the configured checkpoint as user-A), then Reset to the six plus pack2 `needQuestions` on the LMIA work permit and Visitor visa, then the checkpoint again. Live AI off, US$0. The copy is stopped and its database dropped.
**Code under test:** b13d0458e. Partway through, I ran a stray `git checkout` of main's files over the worktree. I restored it to HEAD at once (`git status` clean) and restarted the copy before any test below. During the run the branch moved to 23e70d7a7, which only adds `review-merge-2026-11-07.md` (notes only).

### Breaks
**Major 1: a condition approved at the same moment as Household leaves a household question that waits forever (BR-2, challenge M1).**
* Setup: on the six after setup, `organisation.employer_address` is a draft, placed `per_person` with no condition, scope Person. The only source of question-condition proposals is saved AI runs, and the six has no conditions. So, as named scaffolding, I inserted in SQL one `library_change` (`kind` placement_condition, WAITING, proposed by user-A) with `after` = `{"op":"eq","field":"person.criminal_history","value":true}`.
* Steps: send two requests together:
  * POST `/api/library/changes/<id>/approve` `{}` as user-B;
  * PUT `/api/library/fields/organisation.employer_address/scope` `{"scope":"household","expected":"person"}` as user-A.
* Actual:
  * started together: 3 of 5 rounds gave approve 201 and scope 200. Stored: `HOUSEHOLD`, and the draft placement holds the condition.
  * approval 5 ms ahead: 1 of 5 rounds gave the same.
  * approval 10–20 ms ahead: 0 of 10 (the scope save gets 422).
  * scope save first: 0 of 13 (the approval gets 422 "A household question cannot depend on one person's answer yet.").
* What follows from that state:
  * Preview of the work permit (principal and spouse, each answering criminal history Yes, or each No) shows the question once on the case as `"Criminal history" is Yes (waiting for person.criminal_history)` in both runs. The case's own record never holds that person fact, so the question is never asked: a rule that can never be true.
  * B86 then accepts a form-field condition on that Household field: POST `/api/library/form-field-conditions` for the IMM 5710 "Complete Address of Employer" box gave 201 WAITING.
* Expected: one of the two is refused, as `placeField` has done since round 1's review m1.
* Cause:
  * `applyCondition` runs on `this.db` with no transaction and no field lock (`api/src/question-condition.ts:67-74`, called from `api/src/lifecycle.ts:468`).
  * Its `refuseScoped` check (`:73`) reads the scope before `revise` (`:74`) writes the condition.
  * The scope route takes the field's advisory lock (`api/src/field-scope.ts:101`), but the approval never takes it.

**Minor 2: a merge approved at the same moment as Organisation puts representative boxes on an employer-scoped field (round-1 Major 1, by a race).**
* Steps:
  1. Propose a merge as user-A while both fields are Person: keep a field that no representative box reads; merge away one that a representative box reads.
  2. Then send `POST /api/library/merges/:id/approve` as user-B and, 0.12–0.21 s later, PUT `…/<keep>/scope` `{"scope":"organisation","expected":"person"}` as user-A.
* Actual: in 3 of 8 pairs both succeeded (201 and 200). Example: `person.health_details` became ORGANISATION with the 3 representative boxes of `person.given_names`. On the round-1 pair (`organisation.employer_name` ← `organisation.name`) the race was not hit in 2 tries; the save landed first and the approval got 409.
* Cause: the scope re-check at approval (`api/src/forms.ts:453`) runs in the merge transaction (`:447`) without the field's advisory lock. Meanwhile the scope route counts representative boxes (`field-scope.ts:32`) before the merge has moved them.
* Why only Minor: the resolver guard holds. In Preview those representative boxes read `about=representative` with no value, never the case's employer value (`engine/resolver.ts:98`).

**Minor 3: Household is accepted on an employer fact, and the employer link then puts the principal's employer address on the spouse's IMM 5710.**
* Steps (configured checkpoint):
  1. Scaffolding (P-33), as the second-lander check does: `HOUSEHOLD` on `organisation.employer_address` in SQL; then submit (user-A), sign off (user-C) and approve (user-B) gave release 3 (marked).
  2. Open a case as user-R (Client C), then add a spouse (Client D) as user-O.
  3. Link `sample-employer-1` as user-O.
* Actual:
  * the link copies the employer's address onto the case's own record;
  * the question reads "Read for: Client C, Client D";
  * Preview fills the address on **both** people's IMM 5710 "Details of intended work" boxes (`about=case`), while the spouse's employer name box stays `about=null`. So one form now carries another person's employer address under a blank employer name.
  * The new unit line asserts this copy as a pass: "a field marked Household is written on the case too" (`tests/check_c316_field_scope.ts:78`).
* Cause:
  * `scopeRefusal` does not refuse Household on an `organisation.` key (`engine/field-scope.ts:74-77`);
  * `carriedFacts` skips only Person facts (`engine/runtime/employer.ts:55`).
* Expected: an employer fact can only be Organisation (or Person), or the link carries only Organisation and filing facts. The concept names only Organisation for the link (BR-5).

**Minor 4: the API part of the second-lander check never runs in CI** (also the merge review's n3).
* `product/tools/run-suites.sh` picks `tests/check_*` and only two `tests/runtime` suites. Its usage line also needs a manual Demo load.
* It does not hide a failure. A re-run on the same copy fails loudly: "Nothing has changed since the released version.", 11/12, exit 1. Its IMM 5710 line checks that the box is listed under `fills`, not the value, but Preview showed the value is right.

### What held
* **Migrations:**
  * on a fresh copy, `migrate deploy` applied 61 migrations, with B86 (`…09:30:07.559`) before C3.16 (`…07.562`);
  * a second deploy: "No pending migrations";
  * the C3.16 SQL run again by hand: NOTICE "already exists, skipping", no error;
  * a deploy up to B86 and then the rest: `{CLIENT_LEVEL,CASE_LEVEL}` then all four values;
  * the schema diff names neither `FieldScope` nor `condition_rule`.
* **Scope route after the merge:**
  * GET: none 401, user-A/B/C 200, user-O/P/R 403, unknown actor 401;
  * PUT: user-B/C/O/P/R 403, none and unknown 401;
  * every checkpoint field, including `representative.*`, `representative.organization_name` and `case.uses_representative` (#1072), gives 409 "Published";
  * a stale `expected` gives 409 with reload words.
* **Round-1 Majors:**
  * M1: a merge across scopes is refused in words, both ways (409);
  * M3: placement and scope sent together, 0 of 22 broke (10 together, 12 with the placement first);
  * M2: checked in the code only (`field-scope.ts:31` reads placements by lineage key or field key).
* **#1051 with an Organisation mark:**
  * the link writes the name on the case's own record, once, and never on the principal;
  * Different keeps the typed value;
  * saves: principal 422 "…for the employer…", spouse 422 "…for the household…", client 403, a stale save 409, the officer with `expectedId` 200;
  * a link and a save sent together left one current answer in 10 of 10 rounds (the loser gets 409).
* **A scope change racing a link is not a path:** a case pins its release, no route moves a case to a newer release, and scope reaches a case only through a release.
* **B86:** a scoped field without a question condition gives 409 "No condition to hold" (`ruleInForce` needs the question's own condition).
* **B120:** the configured checkpoint loads, and no release carries a mark until scaffolding sets one.
* **Checks:** second lander 12/12 on a fresh checkpoint; `check_c316_field_scope` 33/33; `check_sh3_resolver` 85/85.
* **UI:** the Agent view shows "About the employer · Read for: Client B" beside "To confirm" and "Employer case" at 1440, 1024 and 720 px (200 %), with no sideways scroll and no page errors.

**Not tried:** a screen reader; M2 live; keyboard on the merged questionnaire (only import lines changed there).

**Verdict (round 2, b13d0458e): Block.** One Major (1: the condition approval skips the field lock, so Household plus a condition is reachable). Minors 2–4 can follow.
