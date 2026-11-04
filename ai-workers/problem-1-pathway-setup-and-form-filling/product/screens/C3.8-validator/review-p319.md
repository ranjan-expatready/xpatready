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
