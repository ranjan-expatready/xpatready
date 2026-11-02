# Review: G4 part 1 (C5.7), answer-key families and runner (commit ea426ad4, branch claude/loving-franklin-k30mje)

Reviewer: a separate context that did not build this. Scope: part 1 only (engine, data, API, check), checked against `concept.md` (BR-1 to BR-8, §2b, §6, §6c), `challenge.md` (M1 to M5, m1 to m5), `STANDARDS.md`, `EXPERIENCE.md` and `QUALITY.md`. There is no screen in this part, so missing UI is not a finding. Journey test: `journey-test-reviewer-2026-11-02.md`, **8/10, pass**.

**Verdict: Approve.** No Blocker and no Major. Six Minors (all Should); none of them gives a wrong pass or lets wrong data in.

## What I ran (isolated copy `forms_g4r` on :4451, never :4400; live AI off; US$0)
- `tests/check_g4_answer_keys.ts 4451 xr_studio_forms_g4r`: **57/57 PASS**, three times (20 s on a fresh copy, then 4 s twice). Stable on rerun.
- Value-step regressions on the same copy: `check_c72_imm5257_fill` 38/38, `check_forms_slice2b` 36/36, `check_forms_c31_formats` 107/0. `check_forms_slice2` gave 41/41 on a fresh copy. It fails 3 lines when run after the Visitor visa setup, because it expects no IMM 5257 in the library: that comes from the order the checks ran in, not from this PR.
- `graph.mjs`: G1 0, G2 0, G4 0, G5 0. G3 (7) and G6 (3) name no G4 route or module: every new route is reached by the check.
- **Migration.** Additive only: three `CREATE TABLE`s, indexes, foreign keys and CHECKs, and no existing table is altered. After deploy, `prisma migrate diff --from-config-datasource --to-schema` has no line on `test_family` or `answer_key*`. The other drift lines it shows were already there before this PR. The written rollback, run inside a transaction that I then rolled back, succeeds, and `combination` is untouched. The CHECK refuses `result 'MAYBE'`.
- **Demo reset** with 3 families, 5 keys and 13 runs: 201, then 0/0/0 rows. The added line in `demo.ts:476` works.

## Special scrutiny
- **formValues = the old inline writeForm code.** I diffed origin/main `fill.ts:35-61` against `engine/form-values.ts:23-47` with leading spaces removed. The only differences are type annotations (`any` → `InventoryBox`/`BoxResult`), `cov.boxes` → `covBoxes`, and the inventory read staying in `writeForm`. The logic is the same line for line, and the fill checks above stay green. **Met.**
- **AMENDED is honest.** E1's `values.complete.json` was last changed by the 29 Oct merge (#98), before this PR, and this PR does not touch it. The key is E1's 67 values plus 16 named amendments. The check pins that E1's values as they stand fail on **exactly** those 16 (`check:101`), so a quiet copy of the product's output would break the check. The amendments are also disclosed in concept §6c and in ASSUMPTIONS C10 as at ea426ad4 (c48cde00 moves C10 to the PR as a proposal), and the check prints them. One caveat: 7 of the 16 adopt map output that E1's own form contradicts (Minor 2).
- **Staleness (BR-5).** The run stores the key version, the item fingerprint, and an inputs fingerprint (the whole draft snapshot plus the sha256 of the form field list). A family edit bumps every key's version. Checked live: I relabelled an eligibility gate and the key went PASSED → NOT_RUN ("Not run since the item changed"). The check covers map, key, field-list and answer-list changes.
- **Duties.** The officer gets 403 on read, write and run. Client A 403, nobody 401. The approver user-B reads (200) but gets 403 on family write, run and sign. The expert user-C enters keys and signs, but gets 403 on family write. The author gets 403 on sign. A sign with `version:"1"` gets 409. Two signs at once: one 200, one 409. Four creates of the same family at once: one 201 and three refused (400/409), never a 500 or a duplicate.

## Issues (ranked; all Minor, Should)
1. **BR-6 edge: a key update without `edition` silently re-targets the key to the current edition.**
   - Where: `engine/answer-keys.ts:146` (`str(b.edition).trim() || m.form_edition`), used by `PUT /answer-keys/:id`.
   - Live: a key written for "IMM 5257 (01-2020)" fails its run in words. A PUT that leaves out `edition` then stores "IMM 5257 (09-2023)", and nothing says so.
   - Fix: on update, keep the stored edition unless one is given, or refuse a changed edition without a reason.
2. **7 of the 16 amendments adopt map output that E1 contradicts.**
   - E1 has `SameAsCORIndicator = Y` and `SameAsMailingIndicator = Y`, yet the key expects the country where applying and the five residential-address boxes to be written (`check:56-59`). These are likely map defects that the passing key now treats as correct.
   - The stored key carries no mark on these boxes. Once it is in the product, an expert signing in part 2 cannot tell them apart from E1's checked values.
   - Fix: make sure the PR's expert questions list all 16 (I could not read the PR body), and carry the "amended" reason with the key before anyone signs it (part 2).
3. **STANDARDS §6 [M] "Contract first": not met yet.** There is no `contracts/answer-keys.ts` zod schema (other features have one, for example `contracts/eligibility.ts`); validation is written by hand in the engine. It was deferred to part 2 in concept §8 (challenge m4). It must land with part 2 at the latest.
4. **Guards no test fails without.**
   - Removing the version `WHERE` in the family save transaction (`api/src/answer-keys.ts:97`) or in the sign (`:184`) fails no line: the stale tests send `version: 0` and stop at the earlier check.
   - The retired-combination 409 (`:147`) and the approver-run 403 are not tested either.
   - Fix: add a two-at-once save line and those two fail lines.
5. **Family save race.**
   - The signed-key count and the reason check (`api/src/answer-keys.ts:93-95`) are read outside the transaction. A key signed between that read and the save goes back to Draft with the reason "Family changed: " and nothing after it.
   - Fix: count inside the transaction, or refuse the save there when it finds a signed key.
6. **Plain words on a line.** A line's label is the raw map caption, so the date-of-birth year line reads "YYYY". This is a note for part 2: the screen's "Box (caption) · Person" should give the plain name.

## Standards [M] (part 1 scope)
| Line | Result |
|---|---|
| Engine has no I/O | Met: the check scans imports, and the engine has no `fetch`, `Date.now()` or `new Date()` |
| Optimistic concurrency, 409 naming who | Met (Issue 4: the guards are untested) |
| Idempotent creates | Met: unique (workspace, key) and (family, combination, kind, ref), refused 400/409 |
| Migration preserves records, rollback recorded | Met: additive, rollback rehearsed |
| Indexed reads, no N+1 | Met: `answer_key(combination_id)`, `run(key_id, ran_at)`; list in 90 ms |
| Personal data never logged | Met: audit lines hold keys and counts, and the check proves no values appear |
| Problem Details with field errors | Met (400/409); 403/404 use the app's usual `fail` |
| Authorisation on the server, deny by default | Met: see Duties above |
| Contract first (zod) | **Not met yet**: Issue 3 |
| A rule's test fails when the rule is removed | Mostly met: BR-1 to BR-7 each have pass and fail lines; gaps in Issue 4 |

## D1–D20 (1–5; part 1 is API and engine only)
D1 5: every BR has a behaviour and a pass and a fail line · D2 4: duplicates and stale saves refused; edition re-target (1) · D3 5: one value step shared with the fill · D4 4: rows with gaps, people who are not travelling, unknown gates refused · D5 4: reset, double sign and double create hold; family race (5) · D6 4: signed by, at, change reason, versions; audit · D7 n/a (no AI, US$0) · D8–D13 n/a (no screen; part 2) · D14 4: team model names mapped in §2b · D15 5: run 95–140 ms · D16 4: 57 lines; untested guards (4) · D17 simulated only · D18 4: E1 provenance and amendments disclosed (2) · D19 n/a until G2 · D20 simulated only.

## After ea426ad4
The branch head c48cde00 only removes ASSUMPTIONS row C10, a records file: no code, migration or check changes. So the review holds, provided the PR carries C10 and the 16 amendments as its proposal (Issue 2). The builder's pkill of `studio/tests/check_*` did not reach my runs: all three finished with a summary, and a fourth run afterwards on :4451 gave 57/57 again. I did not review the merge of origin/main that comes next: per the way of working, a later push needs a new review.

## Retrofit mapping
Recorded: concept §2b (team `TestFamily`/`AnswerKey`/`AnswerKeyRun` → ours, with our additions marked), plus the lift package.

## Could not check
The PR body (to confirm it lists the 16 expert questions); any UI (part 2); a real expert's reading of the amended values. Running the other suites also rewrote tracked evidence files in this copy (`studio/evidence/forms-slice2*`, `p2/runs/stub-pass/*`, `p2/screening/canary-digest.json`). Other tracked files changed during the session too (W1 screenshots, ai-orchestration evidence). Restoring them was refused by permission, so they are left modified and uncommitted.

**Verdict: Approve**

## Re-review 3a3cf527
I read `git diff ea426ad4..3a3cf527 -- prototype/studio`. That holds the fixes (`f2ea8988..3a3cf527`: `engine/answer-keys.ts`, `api/src/answer-keys.ts` and the check) and the merge of origin/main.
- **The merge breaks nothing G4 relies on.** Its only change to an engine file the runner reads is `engine/render.ts`: a new `asked` flag on questionnaire rows and a `factName` helper. Neither touches box coverage. Its other changes (`contracts/workspace.ts`, `runtime/questionnaires.ts`, web pages, qa checks) are not imported by G4. No migration, schema, `fill.ts` or `form-values.ts` changes.
- **Ran it** on fresh copies on :4451. `check_g4_answer_keys` passed **73/73** on four runs, three of them on fresh copies. `check_c72_imm5257_fill` 38/38, `check_forms_slice2b` 36/36. `graph.mjs` names no G4 route or module.
- **Break M1 fixed.** The family save now locks the family's keys (`SELECT … FOR UPDATE`), refuses a sign that landed first unless a reason is given, and unsigns and versions every key in one `UPDATE` (`api/src/answer-keys.ts:103-106`). My own 20 tries of a family save racing a sign: **0 keys left Signed after their family changed** and 0 empty reasons. With no reason, a sign that wins gets the family save refused (400); with a reason, the key returns to Draft as "Family changed: race".
- **Break M2 fixed.** `gone()` (`engine/answer-keys.ts:248-252`) adds a failing line for expected values about a person no longer in the family (or no longer travelling, for rules). Live, I replaced the principal: the run failed on that person's line.
- **My Minors.**
  - **1 fixed:** an update that names no edition keeps the key's own (`api/src/answer-keys.ts:176-177`), with a fail line in the check.
  - **4 fixed:** two-at-once sign and family-save lines, the approver-run 403, and the retired-combination 409 for change and sign.
  - **5 fixed** with M1.
  - **6 fixed:** a line's label is now the heading plus the caption.
  - **2** is moved to the PR's expert questions and **3** (zod contract) to part 2, as recorded. That is accepted for part 1: the [M] contract line must be met in part 2.
- **Break minors.** m1 (the PUT guard includes the state), m2 (422 with no form field list), m3 (edition capped at 60), m4, m5, m7 (depth, NUL, invisible text and line separators refused), m6 (one error, stops early), m8 (`constructor` refused; own keys only), m10, m11 (partly: a principal who stays home, person fields about `case`, a "none apply" given twice) and m12 (400 on `family_id`) are each fixed with a check line. One gap: m9's run on a retired combination still returns 200. It changes no key and is a read-like action, so it is not a finding.
- **New Minor (Should): the check is no longer rerunnable on the same copy.** Its last lines set IMM 5257's `inventory_file` to NULL and retire `vv.single` without putting them back (`check_g4_answer_keys.ts`, last block). A second run on the same copy crashes at `:39`, and a later suite on that copy (`check_c72` gave 409) fails. Fix: restore both at the end. Not blocking: the suites start a fresh copy.
- **Note:** the engine now imports `contracts/runtime.ts` (zod) for `INVISIBLE`/`LONE`, so add it to the lift package list in concept §2b.

No Blocker or Major is open.

**Verdict: Approve** (commit 3a3cf527)

## Re-review 43487860
I read `git diff 3a3cf527..43487860`: four small fixes from the Devin review, each with a fail line.
- **`cannot_tell`.** `runFieldMap` (`engine/answer-keys.ts:232-234`) now gives a failing "cannot tell" line, naming the missing facts. It no longer compares boxes. The shape it reads, `applies: "cannot_tell"` with `missing`, matches `engine/render.ts:76,160`. A form that cannot be settled is never a pass, whether or not the key expects it. Correct.
- **Object keys.** `valueProblem` now also checks object keys (invisible characters, at most 60 characters; array indexes are skipped). Correct.
- **Inventory path.** `inventoryOrNull` resolves the path, then requires it to be inside `SOLUTION` and to end `.json` (`api/src/answer-keys.ts:66-69`). A `../` path gets 422 (check line). `fill.ts writeForm` still reads its path without this guard, but that code predates G4 and is outside this PR.
- **Demo scope.** It now counts families, keys and runs (`api/src/demo.ts:431-432`). All three tables have `workspace_id`.
- **Ran it** on a fresh copy on :4451. `check_g4_answer_keys` passed **76/76**. Then, on another fresh copy, `check_d1_reset_to_six` passed **25/25**.
- **Still open, Minor:** the check is not rerunnable on the same copy. Its last block now also points `inventory_file` at `/tmp/outside.json` and still leaves `vv.single` retired. Restore both at the end.

No Blocker or Major is open.

**Verdict: Approve** (commit 43487860)

## Part 2 review 860bf1a9
Scope: the combination's Tests tab (list, Run, Sign, lines), the Families section and family editor, and the Expected editor. That is local branch `g4-part2-local`, `git diff 43487860..860bf1a9`, not pushed. Judged against concept §3–§5, challenge M5 (b), STANDARDS and EXPERIENCE. The concept has no board and still needs the tech lead's approval (P-223 (4)). Journey test: `journey-test-reviewer-2026-11-02-part2.md`, **8.5/10**.

**Verdict: Block.** Two Majors, both with small fixes; no Blocker.

### What I ran (`forms_g4r` :4451, `forms_g4rb` :4452; never :4400; live AI off; US$0)
- **`vite build`:** built.
- **Web `tsc --noEmit`:** exit 0.
- **`check_g4_answer_keys`:** **87/87**, twice on the same copy, so part 1's "not rerunnable" Minor is fixed.
- **`check_g4_tests_tab_browser`:** **37/37**, twice on fresh copies.
- **`graph.mjs`:** G1, G2, G4 and G5 are 0. No G3 or G6 entry names an answer-key route or module.
- **My own walk,** in Playwright Chromium as user-A, user-C and user-B:
  - on a fresh copy;
  - with the keyboard;
  - at 400, 720 (200 %) and 1024 px;
  - axe on six more states: no violation.
- **New reads:** officer and client get 403 and nobody gets 401 on `GET /answer-keys/fields` and `GET …/answer-keys/boxes`.

### Concept fit
- **§4 Tests tab:** present.
  - Families show the Sample badge, the people count and Edit.
  - Each item shows each key's Draft · Sample / Signed state, Passed / Failed (n of m) / Not run with its reason, and Run.
  - The lines table puts failures first and gives the filler's reason.
  - Sign is for the expert only (greyed with its reason for the author). Change asks for a reason on a signed key.
- **Expected editor (challenge M5 b):** met. It offers every mapped box in the form's order (161 on IMM 5257), with caption, meaning and whose fact it reads. A choice box picks from the form's own options, label beside code. Empty means "stays blank". There is no "fill from a run", and boxes a person fills are left out.
- **§5 copy:** the empty state and the Sample tooltip match word for word.
- **Deviations:** "Box (caption)" is headed "Value", and "Not written" appears only as the family picker. Neither breaks a rule.
- **Part 1 Minor 3 is closed.** `contracts/answer-keys.ts` (zod) is parsed by the API, and the web uses its types (STANDARDS §6 [M] met).

### Issues
1. **Major (Must): no read-only state for people who may not act.**
   - Breaks EXPERIENCE §4 [M] "read-only (… no permission)" and §2.8 [M] "Prevent errors before messaging them".
   - The approver sees Write a family, Edit, Change, Run and Write expected values all enabled, and each is refused only after the click. The expert can type a whole family and then gets "does not hold the author duty".
   - Where: `web/src/components/answer-keys.tsx:53-54`; `answer-key-editors.tsx:167, 174, 280`.
   - Build-notes deviation 6 records this, but an [M] line cannot be waived.
   - Fix: grey each action with its reason by duty (author for families; author or expert for keys and Run), as Sign already does through `useSessionView`. Keep the server's sentence for a race. Add a fail line per role to the browser check.
2. **Major (Must): a 409 cannot be recovered in the app** (EXPERIENCE §4 [M] conflict state).
   - Two tabs change the same key. After the second tab's 409, Cancel and reopen Change: it still shows the old values, and Save gives 409 again, every time. Only a browser reload gets out of it.
   - Cause: `useSave` (`answer-key-editors.tsx:34-37`) invalidates nothing on error, and both editors are seeded from cached lists (`answer-keys.tsx:61`, `answer-key-editors.tsx:176`).
   - The build notes say "closing and reopening loads the latest": it does not.
   - Fix: on 409, invalidate the list and the families (or use the 409 body's `current`), plus a two-tab fail line.
3. **Minor (Should): rule-set lines show codes.** They show `NOT_ELIGIBLE`, `not_met`, `not_answered` and "missing: person.passport_number" (`answer-keys.tsx:28-30`). Map them with `OUTCOME_WORDS` and `GATE_WORDS` and the field's label.
4. **Minor (Should): the rule-set editor says "what the form should hold"** (`answer-key-editors.tsx:219`).
5. **Minor (Should): the toast and the pill count different things.** The toast counts passes ("failed, 1 of 6 values"); the pill counts failures ("Failed (5 of 6)"). `answer-keys.tsx:42` vs `:50`.
6. **Minor (Should): wrong stale reason after a family change.** It reads "Not run since the expected values changed"; it should name the family change (concept §5 stale copy).
7. **Minor (Should): the field picker shows library keys.** The options read "person.family_name" (`answer-key-editors.tsx:130`; EXPERIENCE §5). Show the label and keep the key in the hover text.
8. **Minor (Should): gaps in the tests (D16).**
   - No browser line covers the rule-set editor or its run.
   - The UI's "box a person fills is not offered" line cannot fail on IMM 5257, which maps no such box.
   - The API's zod messages leak "Invalid input: expected nonoptional…" (not reachable from the screen).
   - `libraryFields` says "none retired", but `effective(…, "draft")` can return retired rows (`engine/snapshot.ts:24`).
9. **Minor (Should), carried from part 1 Minor 2:** the 16 amended IMM 5257 boxes carry no mark in the editor or the lines. An expert signing in the UI cannot tell them from E1's checked values.

### Standards [M] (part 2)
| Line | Result |
|---|---|
| Pick, don't type | Met (options, roles, sections and fields picked; free text only for text boxes) |
| Contract first (zod) | Met |
| Authorisation on the server | Met (new reads 403/401) |
| Problem Details on the field | Met (errors on their fields in both editors) |
| No request per row | Met (one list read; lines only when opened) |
| axe on every state | Met |
| Read-only and conflict states | **Not met:** Issues 1 and 2 |
| Plain words | Partly met: Issues 3, 7 |
| A rule's test fails when removed | Mostly met: Issue 8 |

### D1–D20 (1–5)
| # | Score | Evidence |
|---|---|---|
| D1 | 4 | §4 and M5 (b) built; small deviations from the concept |
| D2 | 4 | 409 and duplicates refused |
| D3 | 5 | Editor and run share `captionsOf` and `formOptions` |
| D4 | 4 | Signature boxes excluded |
| D5 | 3 | The 409 loop (Issue 2) |
| D6 | 4 | Signed by and on, Back to Draft with its reason |
| D7 | n/a | No AI |
| D8 | 5 | Trail, one row of tabs |
| D9 | 4 | |
| D10 | 3 | Issues 3, 4, 5, 7 |
| D11 | 3 | Issues 1, 2, 6 |
| D12 | 4 | |
| D13 | 5 | axe clean, keyboard, 400 px and 200 % zoom |
| D14 | 4 | Team components |
| D15 | 5 | Reads under 200 ms, run 336 ms |
| D16 | 4 | Issue 8 |
| D17 | simulated only | |
| D18 | 3 | Issue 9 |
| D19 | n/a | Until G2 |
| D20 | simulated only | |

### Could not check
- A real screen reader, or an intended user's unaided walk.
- Mac Chrome.
- The PR body: it is not pushed yet.

**Verdict: Block** (commit 860bf1a9). To fix: Issue 1 (read-only state by duty) and Issue 2 (409 recovery), each with a fail line. Minors 3–9 are to fix or list in the PR.

## Re-review 10f90396
I read `git diff 860bf1a9..10f90396`: the fixes are in `b64928f7`, and the records and screenshots are in `10f90396`.

### What I ran
- **Builds:** web rebuilt (`vite build`).
- **`check_g4_answer_keys`:** **88/88** twice on one fresh copy (:4451).
- **`check_g4_tests_tab_browser`:** **46/46** on two fresh copies (:4452).
- **My own walk,** Playwright Chromium on a fresh :4451, as user-A, user-B and user-C.

### My Majors
- **Major 1, read-only by duty: fixed.**
  - The approver gets the notice "Read-only for you" with who may do what.
  - Write a family, Edit, Change, Run, Sign and Write expected values are greyed with `aria-disabled`, each with its reason as the hover text and as the button's description.
  - The greyed controls stay focusable. A forced click or Enter does nothing, so no refusal toast.
  - The approver still opens Lines.
  - The expert has only Write a family and Edit greyed ("Only the configuration author writes test families."). The author has only Sign greyed.
  - axe finds no violation on the approver's view.
  - The check has a fail-proof line per role.
- **Major 2, recovery after a 409: fixed.**
  - Two tabs change the rule-set key. The second gets "Not saved … Load their version". The button loads the other tab's value ("Possibly eligible"), and the next save goes through.
  - Cancel and reopen in the stale tab now shows the latest value.
  - Both editors read the latest version when they open (`refetchOnMount: "always"`). The form keeps the version it opened with, so a refetch never overwrites the other person's change.
  - The check has lines for a family and for a key.

### Breaker items
- **P2-M1, signed while being changed: fixed.** I opened Change, the expert signed in another tab, then I saved. The reason field appeared; with a reason the save went through and the key went back to Draft.
- **P2-M3, Facts table too wide for the dialog:** the check's 48-fact line holds at 1440 and 1024 px.

### My Minors
- **3:** fixed. Rule-set lines read "Not eligible / Possibly eligible".
- **4:** fixed. The rule-set editor's copy no longer talks about the form.
- **5:** fixed. The toast says "failed, 1 of 1 values wrong" and the pill "Failed (1 of 1)", so both count failures.
- **7:** fixed. The field picker shows the label, with the key underneath and on hover.
- **8:** partly fixed. Retired fields are now filtered out.
- **6, 9 and the rest of 8:** left, with reasons in `build-notes.md`. I accept them as Minors.
- **Server change (break m6):** a signed key saved with the same values keeps its signature, and the check has a line for it. Correct: the reason check still comes first.

### New Minor (Should)
The 409 notice says the way out twice: "Reload their version, then make your change again. Load their version (your changes here are dropped), then make your change again." Keep one sentence.

No Blocker or Major is open. The journey score rises from 8.5 to about 9: the feedback-and-state and error-recovery criteria now hold.

**Verdict: Approve** (commit 10f90396)

## Head 1fcfbd48
The head is 10f90396 (approved above), plus 3aa54010 (records only), plus a merge of origin/main (part 1 #513 is in). The tech lead has approved the concept (Q1–Q3 as recommended).

### What the merge changed
I read `git diff 10f90396 1fcfbd48 -- '*studio*'`.
- **Untouched by the merge:** the answer-key files (engine, api, contracts, web), `combination.tsx`, `form-values.ts`, `render.ts`, `snapshot.ts`, `options.ts`, `form-steps.ts`, `runtime/forms.ts`, `runtime/eligibility.ts`, the Prisma schema, `core.ts`, `demo.ts`, `lib/api.ts` and `controls.tsx`.
- **`contracts/workspace.ts`:** only adds helpers (`irccWords`, `FIND_DESCRIPTION`, `endSentence`, `ONLINE_OPTION`). TABS is unchanged, so the Tests tab stays.
- **`engine/runtime/case.ts`:** `caseView` adds one staff-only check (a worked-out "has children" Yes over a No). It changes no box coverage or value, and a run compares boxes, not checks.

### What I ran
In `/home/user/g4wt` on fresh copies, never :4400:
- **Web build:** built.
- **`check_g4_answer_keys`:** **88/88** (:4451).
- **`check_g4_tests_tab_browser`:** **46/46** (:4452).

No Blocker or Major is open. The Minors stay as recorded above.

**Verdict: Approve** (commit 1fcfbd48)

## Head 4783acc9
I read `git diff 1fcfbd48 4783acc9`: four fixes from the Devin review in `answer-key-editors.tsx`, the `parts` flag on `GET /answer-keys/fields`, and my last Minor.

### What I ran
In `/home/user/g4wt`, web rebuilt, on fresh copies (never :4400):
- **`check_g4_answer_keys`:** **88/88** (:4451).
- **`check_g4_tests_tab_browser`:** **50/50** (:4452). It has a pass line for each of Devin's four findings.

### Fixes I walked myself (as the expert, on :4452)
- **(1) Field map, a person who stays home: fixed.**
  - The E1 key's editor now offers the husband too, headed "not travelling: give values only if IMM 5257 applies to them".
  - A value given for him is stored under `father`, and the mother's values are kept.
  - The run then fails on one clear line: "IMM 5257 does not apply to EXAMPLE FATHER (Sample) in this combination". That is correct: the key expected a form the combination does not file for him.
  - Rule-set keys still offer only travellers (code read).
- **(2) Key for another edition: fixed.**
  - I moved a key to "IMM 5257 (01-2020)" by API. Its run failed on the edition line.
  - The editor then warned "Another edition … saving moves it to IMM 5257 (09-2023). Check every value against the new edition first."
  - After the save: edition 09-2023, Draft, Not run. The next run has no edition line and fails only on the key's own left-out boxes.

### Read in the code and covered by the check's lines
- **(3)** A new phone or address fact gets the JSON box.
- **(4)** Remove on a person asks first, naming their facts and "none apply" groups, then removes them too.
- **My Minor:** the 409 notice now gives the way out once.

### Not checked here
The builder reports two more Devin defects in this head: the edition move when the new edition has removed boxes, and the phone "select …;" prefix in `byParts`. I did not check them. As I read the code, the first ends in a refused save (400), never in wrong data. The next head needs its own look.

No Blocker or Major is open from my review.

**Verdict: Approve** (commit 4783acc9)

## Head eb0422a7
I read `git diff 4783acc9 eb0422a7`: Devin's second pass is in `e1cfdff2`; `eb0422a7` holds records only.

### The two fixes
- **The edition move now drops values for boxes the new edition lacks.**
  - It says which boxes first, in the "Another edition" notice, then drops them on save. Without an edition change nothing is dropped.
  - The server would refuse those boxes anyway, so the save no longer fails on fields the form does not show.
  - The notice names a dropped box by its form path ("form1[0].OldEditionBox[0]"). This is a rare state; Minor, Should: name it by caption where one is known.
- **`writesParts` (`engine/field-format.ts`) is a pure addition.**
  - It is three lines: a new export built on the existing `core()`. No existing function changed.
  - `check_forms_c31_formats` on a fresh copy: **107 passed, 0 failed**.
  - `GET /answer-keys/fields` now also marks a phone read part by part after "select primary/alternate phone;". A derived tick reading the same phone is not marked, and the check has lines for both.

### What I ran
In `/home/user/g4wt`, web rebuilt, on fresh copies (never :4400):
- **`check_g4_answer_keys`:** **89/89** (:4451).
- **`check_g4_tests_tab_browser`:** **51/51** (:4452), including the new line for the edition move with a dropped box.

No Blocker or Major is open.

**Verdict: Approve** (commit eb0422a7)
