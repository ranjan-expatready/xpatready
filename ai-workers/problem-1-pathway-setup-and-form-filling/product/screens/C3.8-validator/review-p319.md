# C3.8 validator, P-319 (family information forms become a library form's role): review of ce36f9cd5

PR #833, branch `claude/forms-family-role`, diff `origin/main...ce36f9cd5` (14 files). I did not build it. US$0. No copy or server was started (Lead 3's disk pause), so I read the code and ran only the pure suites.

**Verdict (screen-review scale): Ship after fixes.** One Blocker (a suite on main goes red) and two Majors (the IRCC-F09 rule goes quiet on data that is kept, and on the configured load's releases).

## What I ran (copy-free, node v24.21.0)
- `tests/check_c38_completeness.ts`: **24/24**.
- The other pure suites that import `engine/validate.ts`, `engine/form-completeness.ts` or `engine/snapshot.ts`, 12 in all:
  - edition_in_use 20/20, engine 43/43, gcore_engine 137/137, line_holders 19/19, review_item_words 7/7, screen01_rules 67/67, uxa1_counts_rules 20/20, sh3_resolver 84/84, vv_checklist 62/62, qa/qa180_two_gates 8/8.
  - **`tests/check_qa180_one_rule.ts`: 25/26, exit 1** (Blocker 1).
- `npx tsc --noEmit -p api/tsconfig.json`: exit 2. All of its errors are in test files this PR does not touch (check_c18_age_case, check_c69_runs, check_cost_check, check_vv_checklist, check_x2b_bulk_apply). None is in a changed file. CI's `types` job compares against a baseline.
- `select-suites.mjs` on the PR's files gives `ALL` (a shared contract changed), so CI runs check_qa180_one_rule and will go red.
- CI at review time: the 6 shards and `types` were still pending. `check_p319_family_role.ts` has never run, on the branch or on main.
- Grep over api, engine, contracts, web and tests for `FAMILY_INFORMATION_FORMS`, `isFamilyForm`, `missingFamilyForm`, 5707 and 5645:
  - The old list had effect in two places, `studio.ts:234-238` and `validate.ts:37,78`. Both now read the role.
  - No form number is left in `form-completeness.ts`, except inside IRCC's quoted words.
  - web/ never read the list.
  - The fixture `tests/fixtures/screen01-work-permit-release.json` is the miss (Blocker 1).

## Issues, ranked
**Blocker 1 (Must): a QA-180 guard regresses; CI goes red.**
- What fails: `tests/check_qa180_one_rule.ts:80-82` ("words (m1): IMM 5707, the family information form, is offered mapping, not removal") now fails. The line reads "...Map its form fields (Draft setup), or remove the form."
- Why: its saved release snapshot (`tests/fixtures/screen01-work-permit-release.json`) has no `form_role`, and `validate.ts:37` now reads only `f.form_role`.
- It passes on main: main's `validate.ts:37,78` matched the form number.
- So the done-when "the C3.8 and IRCC-F09 checks give the same results as on main" is not met.
- Fix: add `"form_role": "family_information"` to IMM 5707's line in that fixture. It now stands for a release built after P-319. Then add the reverse case to the same check: the line without a role is offered removal, which proves the role is what gets read.

**Major 1 (Must): kept data loses the rule with no visible sign.**
- `demo-update.yml:2` keeps data ("migrations applied, no reset"). The migration (`20261104100000_p319_form_role`) adds the column empty and sets no roles.
- So after the merge, the live demo and any kept copy have no family information form, until someone runs Reset and a load:
  - `completenessProblems` no longer reports a missing IMM 5707.
  - The no-field-map words for IMM 5707 go back to "or remove the form" (the QA-180 m1 bug again).
- No screen can set a role yet (a later row by ruling), so the founder cannot fix it from the app.
- The PR body's "Nothing changes on screen" is wrong for kept data.
- Fix (either one, said in the PR):
  - (a) A one-time data step in the migration: set `family_information` on IMM 5707 and IMM 5645 where present. This is data, not code. Releases made earlier then show one "Form changed" line on their next draft.
  - (b) The PR states that a Reset is needed and lists it in the demo update summary.
  - (a) keeps the behaviour, so I recommend it.

**Major 2 (Must): the configured load releases before the roles exist.**
- `demo.ts:96` applies the roles after `loadConfigured` returns.
- But `loadConfigured` submits and releases each of the six inside the load (`demo.ts:420-436`). Visitor visa carries `imm5707e.pdf` and `imm5645e.pdf` (`samples/wave1.json:14`).
- Two effects:
  - (i) Those submits are validated with no family information form known, so IRCC-F09 does not run as it does on main.
  - (ii) Release 1 is frozen without `form_role`. The roles are then set, so the draft no longer matches the release (`studio.ts:432`), and Review lists a "Form changed: Family Information" line that nobody made.
- `check_c10_1_configured.ts` never checks that the draft matches the release, so CI will not catch this.
- Fix: apply the roles inside `loadSix` once its intake, fill and finder steps are done, before it returns. That also covers `loadConfigured`, which calls it. Add one assertion to check_c10_1_configured: each configured release's draft `matches_release`.

**Minor 1 (Should): Review does not say what changed.**
- A role change reaches each combination's next release as a plain `Form changed` line: the label is the title (`validate.ts` diff), with `needs_sme` false.
- The approver (the second person, which is P-149's protection here) cannot see that IRCC's family information rule now reads a different form.
- Fix: name the role change in the line's words, for example "Family Information: now the family information form (was no role)". Consider `needs_sme` true, since the change alters what IRCC requires of the package.

**Minor 2 (Should): two authors setting a role at once.**
- `form-library.ts:260-272` reads, then writes. Two authors at once both get `changed: true`, and one Activity line has the wrong "was".
- Fix: `updateMany({ where: { id, formRole: def.formRole } })`, and answer 409 on a count of 0.

**Minor 3 (Should): the sample roles can undo an author's choice.**
- `import.ts:21-24` (`applySampleFormRoles`) fills every role that is null. "Start With an LMIA from its reviewed release" runs `importConfiguration` on a six that is already loaded.
- So an author's deliberate "no role" on IMM 5707 is silently set back, with no Activity line.
- Fix: apply the sample roles only to forms created in this load, or log a line.

**Minor 4 (Should): misplaced doc comments.**
- `form-library.ts:255-259`: the new JSDoc sits under listAgain's "X5 slice c" comment, which now describes setRole.
- `contracts/form-library.ts:38-44`: `FORM_ROLES` sits between the `GET /library/forms` comment and `LIBRARY_TYPES`.
- Fix: move each block above its own declaration.

**Minor 5 (Should): wrong word in a test label.**
- `check_p319_family_role.ts:74` calls user-C "a viewer". user-C is the Content reviewer (SME), with the duties review and sme (`core.ts:41`).
- Fix: say "the SME (no author duty)".

## What holds
- **Migration:** additive and nullable, with a CHECK limited to the known roles. Prisma `formRole String? @map("form_role")` matches. main's code runs on the new schema.
- **Snapshot:** `form_role` is added only when it is set, so forms without a role keep their fingerprint.
- **Suites' fixture (`loadSteps`):** the roles are set inside `importConfiguration` before `buildSnapshot`, so IMM 5707 has its role before Release 1.
- **Contract:** the enum matches `FORM_ROLES`; `allOf[2]` is the object that changed.
- **completenessProblems:** one indexed query per review, scoped to the workspace (not a request per row).
- **Role API:**
  - `need(author)`, a strict zod body with a reason of 3 to 300 characters.
  - 404 and 409 in words; no change when the role is the same.
  - The Activity line says who, from what, to what, and why.
- **P-318 (6):** respected. Either form with the role fills the line, and nothing removes one.

## D1-D20 (this change only)
D1 4 (does what P-319 and the ruling ask, except the kept data and configured load, M1, M2) · D2 3 (column limited by a CHECK; read-then-write race, m2) · D3 5 (the role is defined once, on the library form) · D4 3 (IRCC-F09 goes quiet on kept data and during the configured load) · D5 4 (resets are clean; kept data is not) · D6 4 (Activity line with a reason; Review line does not name it, m1) · D7 n/a (no AI) · D8-D14 n/a (no screen change) · D10 4 (plain words in the API and Activity) · D15 5 (one extra query) · D16 3 (a guard turns red, B1; the configured case is untested, M2; the server check has not run yet) · D17 simulated only · D18 4 (Guide 5256 quoted, marked Sample) · D19 3 (no screen control, by ruling) · D20 simulated only.

## Not checked
- check_p319_family_role.ts, on the branch or on main (needs a copy).
- The C3.8 and C11.15 acceptance packs.
- The six's live data.
- graph.mjs: it writes `qa/graph.json`, and this review writes nothing else.
- Whether a breaker has run.

Journey report: `journey-test-reviewer-2026-11-04-p319.md`, **6.5/10, does not pass**.

**Verdict: Block.** Fix B1, M1 and M2, then re-review the diff.

---

# Round 2: diff-only re-review of `ce36f9cd5..e0820e631`

Reviewer, 4 Nov 2026, about 11:10 IST. I reviewed only the diff (6 code files plus the records). No copy or server was started, because the disk pause is still on. US$0.

**Verdict (screen-review scale): Ship after one fix.** Every round-1 Must is closed. One Major is left: the breaker's M3 fix misses a character that the PR's own precedent refuses.

## What I ran (copy-free, node v24.21.0, at e0820e631)
- `tests/check_qa180_one_rule.ts`: **27/27, exit 0** (it was 25/26). The new reverse case passes.
- `tests/check_c38_completeness.ts` 24/24. check_engine 43/43. check_screen01_rules 67/67. check_review_item_words 7/7.
- `npx tsc --noEmit -p api/tsconfig.json`: the same five test files fail as in round 1 (check_c18_age_case, check_c69_runs, check_cost_check, check_vv_checklist, check_x2b_bulk_apply). None of them is a changed file.
- Probe of `FormRoleBody` (scratchpad `probe2/`):
  - Refused: NUL, U+007F, U+202E and U+2066.
  - Accepted: a line break, a tab, Hindi, an emoji, 300 characters after the trim.
  - **Also accepted: a lone surrogate.** The JSON body `"half \ud83d of an emoji"` passes the check (Major 1 below).
- **CI:**
  - The only run is for **ce36f9cd5** (run 41778468855). `kind` and `types` are green. The 6 shards were still running at 11:05 IST.
  - **Nothing has run on e0820e631.** `gh pr view` reports `mergeable: CONFLICTING`, so GitHub starts no pull_request CI for this head.
  - The conflict is one hunk in `engine/import.ts:118` (from `git merge-tree` against origin/main fceb93458). Main's IRM rule regex (#820) meets this PR's new `applySampleFormRoles` line. The fix is to keep main's line and add the new one.
  - So `check_p319_family_role.ts`, the data-step case included, **has still never run anywhere.**

## Round-1 items
| Item | Status | Evidence |
|---|---|---|
| **B1**: QA-180 m1 guard red | **Closed** | `check_qa180_one_rule.ts:18-22` (`withRole`): `withRole` gives the saved release's IMM 5707 its role. `:87-89`: the reverse case shows that with no role, IMM 5707 is offered removal. So the role is what gets read. 27/27. |
| **M1** (reviewer and breaker M1): kept data loses the rule | **Closed** | `migration.sql:10`: `UPDATE … WHERE form_key IN ('IMM 5707','IMM 5645') AND form_role IS NULL`. The keys match the stored form (`normaliseCode` gives "IMM 5707"). `check_p319_family_role.ts:85-89` runs the migration's own UPDATE line on a workspace with no role. See Minor 1 for what this means for releases on the demo. |
| **M2** (reviewer and breaker M2): configured load releases before the roles | **Closed in code** | `demo.ts:417` applies the roles after rows 1–8 (intake, finder, maps) and before rows 9–12 (submit, SME, release). `loadClaimed:96` still runs it after every load. My request for a `matches_release` assertion in `check_c10_1_configured.ts` was not done (Minor 2). |
| Minor 1 (reviewer) / **breaker M4**: Review line does not name the role, no second person | **Sent to the tech lead** | The builder's PR comment recommends a follow-up row: a role change goes through LibraryChange (P-149) and is named in the review words, with SME sign-off. That touches `validate.ts`'s diff words, which Lead 3 limited to the two reads. **I agree** it is a follow-up, and I keep it at Minor: the release approver still approves, so no gate is bypassed. **The tech lead must open that row before this merges.** |
| Minor 2 / breaker m1: race | **Closed** | `form-library.ts:270-271`: `updateMany where {id, formRole: read}`, then 409 "Changed meanwhile" on a count of 0. No Activity line is written on a 409. Two identical sets at once now give one 200 and one 409. That is acceptable. |
| Minor 3 / breaker m2: sample roles undo an author's choice | **Left, said in the PR comment** | Demo workspace only. Accepted. |
| Minor 4 / breaker m4: doc comments | **Closed** | The setRole JSDoc sits on setRole, and the X5 slice c comment is back on `listAgain` (`form-library.ts:276-277`). The `GET /library/forms` comment is above `LIBRARY_TYPES` (`contracts/form-library.ts:48`). |
| Minor 5: "a viewer" label | **Closed in the check** | `check_p319_family_role.ts:8-9,75-76`. The PR body (Checks, item 7) still says "a viewer" (Minor 1 below). |
| Breaker M3: a NUL reason changes the role with no Activity line | **Partly closed** (Major 1) | `contracts/form-library.ts:45-46` refuses control characters and bidi marks. The check covers NUL and U+202E (`:79-81`). |
| Breaker m3: a guide or checklist takes a role | **Closed** | `form-library.ts:266` gives 409 with words, using the same `libraryType` rule as the import. The check (`:82-84`) picks a guide, checklist or document. In the suites' fixture that is IMM 5488 ("Document Checklist…"), so it gets 409 as expected. A null role (clearing) is still allowed on any kind. That is right. |

## Issues, ranked (round 2)
**Major 1 (Must): a lone surrogate in the reason still changes the role with no Activity line (breaker M3, not fully fixed).**
- The PR says the fix follows `contracts/cost-check.ts`. But that file refuses two things: control characters (`:37`) and, in its next lines, a lone surrogate (`:38-39`, "Break 3 m5: … cannot be stored either"). `contracts/runtime.ts:21-22` (`LONE`) records the same thing: "PostgreSQL refuses it (a 500 before)".
- `FormRoleBody` copied only the first of the two.
- So a body `{"role":null,"reason":"half \ud83d"}` passes zod. Then:
  - `setRole` writes the role (`form-library.ts:270`).
  - `audit.log` (`:272`) writes the reason into `summary` and the `detail` jsonb, and that write fails.
  - The person gets a 500. The IRCC-F09 role has changed for every combination that uses the form, and nothing records it.
- That is the same outcome as the breaker's M3, by another character.
- Fix, either one:
  - (a) Add the lone-surrogate refine, or reuse `INVISIBLE` / `LONE` from `contracts/runtime.ts`. Add a `\ud83d` case to `check_p319_family_role.ts:79-81`.
  - (b) Better, add this as well: put the role write and the Activity line in one `$transaction`. Then any failure in the audit leaves the role unchanged, which is what the PR's "nothing was changed" words promise.

**Minor 1 (Should): the PR body is out of date with the data step.**
- "On the demo: Nothing changes on screen" is no longer true. The migration gives IMM 5707 and IMM 5645 their role on the kept demo, but the releases already made carry no `form_role`.
- So after the upgrade, every released combination that has either form shows its draft as different from its release, with one "Form changed: Family Information" line. That is the trade I accepted in round-1 M1(a), and the right one. But the founder will see it on the live demo, so the PR body and the demo update summary must say so.
- Also: the Checks list still says "a viewer" (item 7), and it does not list the new NUL, U+202E, guide and data-step cases.

**Minor 2 (Should): the configured load has no test that its drafts match their releases.**
- Round-1 M2 asked for one assertion in `check_c10_1_configured.ts`: each configured release's draft has `matches_release` (`studio.ts:432`).
- The code is right (`demo.ts:417`), but nothing in CI would catch the roles being moved after the releases again.

**Nit (no action needed in this PR):**
- `migration.sql:10` and `applySampleFormRoles` mark IMM 5707 and IMM 5645 whatever their kind.
- `setRole` (`:266`) refuses any form that `libraryType` does not call a "form". An IMM 5645 that the intake took in as a `document` titled "Family Information" (no word "form") counts as a "checklist" by that rule. So the sample can mark a form that an author could not mark.
- It makes no difference to IRCC-F09 (it reads by form_key, as main did). It is worth making it consistent when the role gets its screen control.

## What holds in this diff
- The data step is idempotent (`AND form_role IS NULL`) and passes the column's CHECK. It runs once, at deploy, in every workspace. That is right for a list the code used to hold in every workspace.
- The check takes the migration's own UPDATE text instead of a copy, so the two cannot drift apart.
- The 409 words are plain and say what to do ("reload and look again", "restore it in the library"). The 400 words say "Type it again; nothing was changed". Today that is true for every character except a lone surrogate (Major 1).
- A no-op still returns `changed:false`, with no write and no Activity line.

## Journey re-score (reviewer role; traced through the diff, no new report file because this round writes only this file)
Journeys 6, 7 and 8 from `journey-test-reviewer-2026-11-04-p319.md` now hold in code:
- 6, kept data: the data step.
- 7, configured load: roles before releases.
- 8, the saved fixture: 27/27.

Journey 4 (error) gains one failing input: a lone surrogate gives a 500, with the role changed and no record.

| Criterion | Round 1 | Round 2 | Why |
|---|---|---|---|
| Task completed | ½ | 1 | Fresh, kept and configured data all keep IRCC-F09 |
| Next step obvious | ½ | ½ | No screen control yet (by ruling); the Review line does not name the role (follow-up row) |
| Plain words | 1 | 1 | The new 409 and 400 words are plain |
| Feedback and state | ½ | ½ | The "Form changed: Family Information" line after the upgrade is not announced (Minor 1) and does not name the role |
| Correct data | ½ | 1 | Roles on kept data; configured releases frozen with them |
| Error recovery | ½ | ½ | Race and guide cases fixed; a lone surrogate still gives a 500 with an unrecorded change (Major 1) |
| Accessibility and screen sizes | ½ | ½ | No screen change; not walked |
| Speed | 1 | 1 | Unchanged |
| Visual quality | ½ | ½ | No screen change; not seen |
| Trust and sources | 1 | 1 | Unchanged |

**7.5 / 10: does not pass yet** (needs 8). Fixing Major 1 makes error recovery 1, which gives 8.0 / 10. The score is provisional: nothing was walked in a browser, and check_p319 has not run.

## Before the label (not review findings: the merge conditions)
- Merge main to clear the `engine/import.ts:118` conflict: main's IRM regex plus the one `applySampleFormRoles` line.
- Then CI must be green on that head, with `check_p319_family_role.ts` among the suites.
- If the merge commit changes anything beyond that one hunk, it needs a look before the label.

**Verdict: Block.** To fix:
1. **Major 1:** in `contracts/form-library.ts:45-46`, refuse a lone surrogate (as `cost-check.ts:38-39` or `runtime.ts` `LONE` does). Better still, also put `form-library.ts:270-272` in one transaction. Add the case to `check_p319_family_role.ts:79-81`.
2. **Minor 1:** update the PR body. Say that after the upgrade, released combinations with IMM 5707 or IMM 5645 show one "Form changed: Family Information" line. Fix "a viewer" and list the new cases.
3. **Minor 2:** add the `matches_release` assertion to `check_c10_1_configured.ts`.
4. **Tech lead:** open the follow-up row for breaker M4 / my Minor 1 (a role change through LibraryChange, named on Review, with SME sign-off).

Majors 1 and 2 from round 1 and the Blocker are closed. Once item 1 is fixed and CI is green on the merged head, I would approve without another full round: the fix is a one-line contract change plus one case.
