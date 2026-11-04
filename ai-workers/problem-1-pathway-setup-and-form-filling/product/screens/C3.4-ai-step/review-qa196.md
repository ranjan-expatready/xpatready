# Review: QA-196 (AI form checks and guide checks land on To review), PR #802 at 8c1cd1dab

Reviewer: a fresh agent that did not build it. Diff `git diff origin/main...8c1cd1dab` (13 files, +330/-12). One isolated copy, b7_rv on :4614 (`xr_studio_b7_rv`, since stopped and dropped). US$0: no `*_LIVE`, saved/stub runs only. The C3.4 pack ran with PR #771 merged into a temporary local branch, since deleted and never pushed.
This is a lander plus one panel section on To review. Screen-review checks (2)–(4) apply to the panel and Library › Checks rows it touches. Journey report: `journey-test-reviewer-2026-11-04-qa196.md` (**7.5/10, fail: a 0 on Correct data**).

**Verdict: Block (Changes needed): 1 Blocker, 1 Major.**

## What held (evidence)
- **The new check fails on main and passes on the branch.** `check_qa196_check_landers.ts` scores 20/20 (exit 0) on the branch. With main's `proposals.ts`, `review-proposals.ts`, both contracts and `masters-ai.ts` put back, it scores 4/20 (exit 1): "accepted with its own step", and no reads.
- **The C3.4 acceptance passes with #771: 20/20, exit 0.** Its 4 new steps cover the refusal, the mapped form check, the guide check and Library › Checks after a reload.
- **The tech lead's ruling is followed:**
  - The form → shared field translation works. `engine/validate.ts` is untouched.
  - One key lands on every filing combination. I checked this with two combinations (Outside Canada was added through the product's own `POST /combinations/:id/forms`), and Library › Checks shows one row used in both.
  - A removed line (v1 RETIRED) is skipped.
  - An unmapped field gives a 409 naming the printed questions, and nothing is written.
  - A landed check warns by default. "Serious warning" is chosen before Accept (an edit). A cross check edited to block is refused (400 from the contract's `z.literal("warn")`).
- **Undo and its stamp across combinations hold.** A clean Undo removes the rows on both combinations and the item waits again. After one copy changed (`updated_at`), Undo refuses with 409 and both rows stay. Release changes `status`, which the stamp also catches.
- **Duty and races hold.** `need(author)` (`proposals.ts:414`) gives 403 for both the content reviewer and the approver. Two Accepts at once give 201 + 409 and one set of rows (row lock in `decide`).
- **The panel is accessible.** axe 0 violations on the panel and on Library › Checks. No sideways scroll at 1440, 1024, 400 or 512 px. The select is reached by keyboard. The arrow has screen-reader text.
- **Cost of the list is small.** `checkReads` runs per check item when a group opens (`review-proposals.ts:78`): about 4 queries each, with captions cached per file. With 17 form checks the group opens in 60–570 ms by API, inside STANDARDS §9.
- **Graph `--check`** is clean. No new route or page.

## Blocker (1)

**B1. Every landed AI check is stored with the opposite meaning: it fires for people who pass and stays silent for the person it is meant to catch.** `api/src/proposals.ts:458` stores `predicateJson: tree` as the AI wrote it.
- **What the AI's tree means:** the C3.4 prompts say `tree_json` is "TRUE when the answers pass" (`p2/prompts/masters-form.v2.md:19`, `masters-guide.v2.md:21`), and the examples follow that (passing case `expected: true`).
- **What a stored check condition means:** a check *fires* when its condition is true. See `engine/render.ts:276` (`.filter((x) => x.r.applies === true)`). The section-check writer uses the same convention: "lt funds 1000" → "Funds under CAD 1,000" (`tests/check_c44_part2.ts:96`). `engine/snapshot.ts:208` copies the condition unchanged into a release.
- **Proven on the product's own Draft Preview** (`GET /combinations/:id/preview?answers=`):
  - The landed military check fires its serious warning for `person.military_service=false` (no service).
  - The landed guide check fires "An applicant under 18 has the form signed by a parent…" for age 30, and fires nothing for age 12 unsigned.
- **Why the tests miss it:** they compare stored rows and never evaluate a landed check.
- *Fix:* store `{ op: "not", arg: <tree without subjectKind>, subjectKind }`, or turn the tree around in the lander. Do this for both kinds. Keep the proposal's examples as they are.
- *Fail test:* in `check_qa196_check_landers.ts`, accept a check, then call Draft Preview with a passing answer (expect no fire) and a failing answer (expect the message). Do the same for a guide check. Both must fail on 8c1cd1dab.

## Major (1)

**M1. A form check lands with the form's printed choice words as its values, so on a shared field it can never fire, even after B1 is fixed.** `proposals.ts:431` renames the fields only, not the values.
- **What landed:** all 17 real IMM 5257 checks compare a box with its printed words: "Yes", "* Yes", "* No", "Other", `["Married","Common-Law"]`. The landed tree is `neq person.military_service "Yes"`.
- **What the shared answers are:**
  - A yes/no answer is `true`/`false` (`engine/qd-conditions.ts:39`, `engine/eligibility-gates.ts:56`).
  - A choice answer is the answer list's value key. The field map carries the translation, either the transform (`yes_no_code:Y/N` in IMM 5257's saved map) or `optionMap`.
  - `evaluate` compares strictly (`contracts/rules.ts:130`).
- **Result:** declared service (`true`) with no details still evaluates the tree to true. The masters step itself refuses such checks for that reason (`engine/masters-ai.ts:147-151`, P-296 (3): "Any other value can never equal an answer, so the check could never fail").
- **Scope:** the ruling says the check lands "through the edition's field map onto shared fields". Today only half of that is done.
- *Fix:* in `landCheck`, translate each `eq`/`neq`/`in` value on a mapped box. A `yes_no_code` transform gives `true`/`false`. The inverse of `optionMap` gives the answer value key. When a value cannot be translated, refuse with a 409 that names the question and the value, as the unmapped case does. Show the value translation in "What it reads" too.
- *Fail test:* the landed military tree evaluates `{person.military_service:true}` without details as failing (it fires, after B1).

## Minor (5)
- **m1. Raw keys in refusals.** The Undo refusal (`proposals.ts` undo, the line this PR extended) and the bulk refusal name a check by its identity key: `"IMM 5257 (09-2023)|form1[0].Page3[0]…"`. `nameOf` (`proposals.ts:57`) has no case for checks. *Fix:* return `p.sentence` for `form_check` and `cross_check`. The toast "It landed as AC-…" is the same pattern as other kinds: optional.
- **m2. The group is guarded only by the prompt.** `proposals.ts:448` accepts any `[a-z_]` group from the AI. `section_check` would block filing (`engine/runtime/forms.ts:131`, against P-136 and this PR's "a landed check warns"). `form_native` and `document_validity` are never evaluated (`render.ts:271`). P-153: code is the guard. *Fix:* keep `official_rule` and `readiness_warning`, and map anything else to `official_rule`.
- **m3. No path to the next step.** An unmappable form check sits under "Ready to accept", whose tip says "You can accept these together". "Map these on the form's field page" (`web/src/pages/proposals.tsx:192`) has no link. The description says "Form check · shared library" (`:169`) while the check lands on combinations. *Fix:* add a link to the edition's field page, and say "lands on each combination that files {form}".
- **m4. The test is weak on several combinations.** "Lands on every combination … under one key" passes with one combination (`check_qa196_check_landers.ts:140`, `filing: 1`), and Undo across several combinations is not tested. I proved both by hand (journey J6). *Fix:* add IMM 5257 to a second combination in the test.
- **m5. The acceptance setup can collide.** The SQL setup (`acceptance/C3.4.test.ts:91`) inserts `version 1` field-map rows. If a later C3.2 change maps those boxes in the demo data, the insert hits `@@unique([formEditionId, dataPath, version])` and the pack crashes. *Fix:* use `on conflict do nothing`, or insert only when nothing is in effect. It is labelled setup and the product has its own path (C3.2), so this is not a P-33 finding.

## D1–D20 (this change only)
D1 ½ the ruling's shape is met; meaning and values are not (B1, M1) · D2 ½ duplicates and races are refused, but wrong conditions are stored · D3 1 one key and one library row for every filing combination · D4 0 landed checks fire on the wrong answers (B1) · D5 1 Undo, stamp, double click and reload hold · D6 1 batch audit line, AI_PROPOSAL origin, quote kept · D7 ½ visible and reversible, but the "What it reads" translation hides the value gap · D8 1 To review › group › panel · D9 ½ no link to the mapping step (m3) · D10 ½ raw identity keys in refusals (m1) · D11 1 toast, Undo bar, refusal toast · D12 1 team components · D13 1 axe 0, four widths, keyboard · D14 1 · D15 1 within budget · D16 ½ fails without the lander, but nothing tests behaviour on a case · D17 simulated only · D18 1 IRCC quote with file and edition · D19 0 the outcome across screens (a check on a case) is inverted · D20 simulated only.

## Retrofit / graph
No new page or route. `checkReads` is shared by the lander and To review. `renamed` is now exported from `masters-ai.ts` with no other change. Graph check is clean.

## Could not check
- A real screen reader.
- An intended user's unaided walk (D17, D20).
- A two-tab race between two *different* proposals with the same sentence (no unique constraint, as in `saveCheck`).
- A retired combination (`retiredAt`) still filing the form: `landCheck` does not filter it. Not shown in the demo data.
- `tsc` was not re-run. The builder's `count-any` equals the base.
