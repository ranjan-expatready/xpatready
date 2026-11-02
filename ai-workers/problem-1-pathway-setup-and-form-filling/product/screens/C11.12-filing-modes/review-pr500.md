# C11.12 PR 2 + PR 3 on main — review of #500 · reviewer · 2 Nov

**Commit reviewed: c0211908** on `claude/funny-curie-mbttn2`: b240665c (the merge) + 86f72c09 (one Sponsor line) + 9f9bf553 (break fixes) + c0211908 (one next step). PR 2 and PR 3 are unchanged from #478 and were approved there. This round covers the merge resolution, the three commits after it, and whether main's newer code still works with C11.12.
**Copy:** `rev500` on :4471, started fresh for each suite. It is now stopped and its database is dropped. US$0: no `*_LIVE` flag set, no priced button pressed. Scratch scripts are in `/tmp/claude-0/-home-user-xpatready/8e4dec5e-2543-5f8f-8654-971a92f276b3/scratchpad/`. Journey report: `journey-test-reviewer-pr500-2026-11-02.md`.

## Verdict: Block. One Major (M1). Score 9.5/10.

## What I checked, with the results
* **Merge of `engine/runtime/filings.ts`.** I read it line by line against `origin/main` (#455) and `e291b8c7` (#478).
  * Every R2 part is kept: the table as data, `FEE_BASES`, `soundLine`, `rulesFrom`, sources from the table, `ageCheck` in the source's words, basis-aware `familyFee` words, `ageWords`, and the basis that names its table.
  * Every C11.12 part is kept: `filingPlan`, `FeeLine.person`, `fees_worked_out`/`fees_why`, null totals, co-filing, and the split rule.
  * Pricing per basis over the plan is right. I probed it (`probe.ts`):
    * `per_application` is charged once per filing and covers the people applying on it.
    * Per-role lines charge only their roles, including people on the principal's application.
    * A declared-only person never gets a line.
    * The family maximum is applied per group.
    * Fee lines add up to the group total in every probe without a waiting line.
* **Shipped money path, unchanged.** Visitor visa: 1, 2, 5 and 6 people give CAD 100/85, 200/170, 500/170 and 500/170. Through the API, a spouse On the principal's application plus a child filing their own gives 2 filings, visa CAD 300, and biometrics waiting for dates of birth (G15). The spouse stops travelling: declared only, no line, CAD 200.
* **Restated #455 tests (r4, r5, B16).** They keep the money guarantees. Mutation tests, run in a scratch copy:
  * "per_application charged per person" fails 3 checks: r1, "stays on it", "covers".
  * "Groups priced together" fails r4 and r5.
  * Removing the BR-2 or mode guard fails 2 checks.
  * Dropping the role filter fails the `fs.spouse` check.
  * B16's "never guessed" is now "no filing, no fee, each person says why", and that check holds.
  * Two gaps are Minor (m2).
* **9f9bf553 (break M1, m1–m3, m6).** Correct, and each of the 14 new checks fails on 86f72c09. `check_r2_fee_table` 63/63.
* **M2 as handled.** Right for the table path, and right that Visitor visa with a release-added sponsor still prices the visa lines (PR 2 break m3). It is not closed, though: see M1.
* **c0211908.** Correct. `filing_not_set` goes through `line()`, so a new combination's row and all its missing lines name "Find forms".
  * Before it, I reproduced `check_screen01_api` item 1 failing (134/135).
  * With `FILING_NOT_SET_BLOCKS = false` in a scratch copy it passed 135/135, so the cause was PR 3's blocking line.
  * Now 135/135.
* **Main's newer code with C11.12.** All of these work:
  * `case-prepare.ts`: imports `FEE_TABLE`/`rulesFrom`, biometrics ages from the table, the split words.
  * `case-checklist.ts` `DERIVED_FOR` from the table.
  * `case.ts` `hasChildrenOf`: a declared-only child still counts.
  * `fill-case.ts` trials, `programs.ts`/`studio.ts` Demo release, `runtime.ts` representative answers.
  * The automatic merges of `case-prepare.ts`, `programs.ts`, `runtime.ts`, `studio.ts`, `contracts/runtime.ts` and `check_vv_prepare.ts` are clean, and the suites below cover them.
  * The `fs.outside` sample now has one Sponsor (86f72c09).
* **Suites on c0211908:**
  * Pure: `check_r2_fee_table` 63/63, `check_vv_filings` 55/55, `check_vv_prepare` 32/32, `check_c1112_modes` 42/42, `check_engine` 43/43.
  * API: `check_c1112_prepare_api` 30/30, `check_vv_prepare_store_api` 35/35, `check_screen01_api` 135/135, `check_setup_checklist` 63/63, `setup_visitor_visa` 13/13.
  * Browser: `check_c1112_filing_browser` 17/17, with screenshots sent to scratch.
  * `graph.mjs --check` exits 0.
  * `tsc` (api): 13 errors, all in test files #500 does not touch, as the PR says.

## Issues

**M1 (Major, Must): break M2 is still reachable through the release's modes.**
* **Where:** `filings.ts:101`, `:255–258`.
* **The cause:** the refusal looks only at the table's own `modes`. A table combination with a sponsorship line whose table modes leave out the sponsor is still priced. R2's own example in `check_r2_fee_table.ts:51` has exactly that shape: principal and child only.
* **What happens:** the release then brings the co-filing sponsor. The shipped `fs.outside` sample release does this (`sponsor: co_files`). The result:
  * The **sponsored** principal is charged CAD 1,260 "Spouse or partner sponsorship fee".
  * The sponsorship filing has no line.
  * `fees_why` still says "The sponsorship's fees are not worked out yet … The other lines are worked out."
* **Probe:** `scratchpad/x/…/studio/probe_m2.ts`. It prints the case total `[144000]` with that `fees_why`.
* **Latent:** it needs a table edit; nothing shipped is affected. But "another combination is a data edit" is R2's promise, so the edit is expected.
* **Fix:** decide on the modes the case actually uses (release over table), not the table's alone, so a sponsorship-priced line is never charged to the sponsored person. Add a failing test with the probe's inputs.
  * Option (a): any co-filing role in the case's modes makes the combination's table fees "not worked out". This reverses break m3 for Visitor visa with a sponsor; get the tech lead's OK.
  * Option (b): refuse only the per-role lines the co-filer should pay. Today the table cannot say which lines those are.
* **Also:** put the underlying conflict to the founder. `fee-table.json` `spouse_sponsorship.roles: ["principal"]` (principal = sponsor) and `programs.json fs.outside` (principal = sponsored spouse; sponsor co-files) disagree on who "principal" is in a sponsorship (AGENTS rule 2: do not settle it in code).

**Minors (Should; may go in the PR body):**
* **m1. The one-next-step rule is guarded only by a quarantined suite.** The only check that fails without c0211908 is `check_screen01_api` item 1, and that suite is on run-suites.sh's quarantine list (`run-suites.sh:55`), so PR checks skip it. `check_c1112_modes.ts:68–69` builds the missing list with no setup state, so it passes either way. Fix: add a pure check to `check_c1112_modes.ts`: `missingItems` with a waiting setup step gives `filing_not_set.step` equal to that step.
* **m2. Two pricing paths are untested.** A `per_application` line limited to roles, and the "covering the N people" count with a declared-only person on the filing. Mutants that ignore the role, or count declared-only people, pass all suites (`filings.ts:217`, `:219`). Add one check each.
* **m3. Carried, not new to the merge:**
  * Break m4: a waiting line keeps its 8500, so the lines do not add up once the cap is reached (from main/R2).
  * Break m5: a principal set not travelling by SQL reads "No principal applicant on this case yet".
  * Break m7: the preview uses the default mode for a "Filing not set" row.
  * `why` reads "Nobody on this case is applying" when the principal is away but children on their application travel.

## D1–D20 (merge and fixes; the screen itself as approved on #478)
* D1 concept fit 5: BR-1/2/4/6/10 hold over the plan. D2 words 5.
* D3 states 5: fees not worked out are null, never CAD 0.
* D4 BRs 4 (M1).
* D5 keyboard 5: J1 by keyboard. D6 a11y 5: axe clean.
* D7 sizes 5: 400, 1024 and 1440 px with no sideways scroll.
* D8 feedback 5.
* D9 data 4 (M1, latent).
* D10 errors 5: a bad table edit is not derived (63/63).
* D11 conflict 5: 409 on a stale split (`check_c1112_prepare_api`).
* D12 roles 5: approver PATCH 403; author on prepare 403.
* D13 speed 5: prepare 121–138 ms; Forms card 1.6–1.8 s cold. D14 look 5.
* D15 code 4 (M1).
* D16 tests 4 (m1, m2).
* D18 trust/Sample 5: the basis names the table, its date and Sample.
* D19 retrofit 5 (`build-notes.md`).
* D17 and D20 simulated only.

## Could not check
* An intended user's unaided walk (D17, D20).
* A real screen reader.
* CI on c0211908: shards were still running when I checked.
* `per_application` through the API: no shipped line uses it.
* The web bundle served was the shared `web/dist`; I did not rebuild it.

**Verdict: Block.** To fix: **M1** (M2 reachable through the release's modes), with a failing test, plus the founder question on who "principal" is in a sponsorship. m1–m3 may go in the PR body.

## Round 2 · 07aa599e (diff from c0211908, pure suites, the M1 probe)
* **M1 is closed.** It is fixed with option (a): with any co-filed filing on the case, no table line is charged. `total_cents` is null, `fees_worked_out` is false, and `fees_why` says "who pays the sponsorship's fees is not built".
  * My probe (R2's spouse table, with the release bringing a co-filing sponsor) now gives no fee line, a null total and those words. It was a CAD 1,260 charge on the sponsored principal.
  * The failing check is paired with a passing one: the same table with no sponsor still prices CAD 1,260 from data.
  * This reverses PR 2's break m3 for Visitor visa with a sponsor (`check_vv_filings` was restated to match). It is open to the tech lead as a PR question, as it should be. The founder question on who "principal" is in a sponsorship still stands.
* **m1 is closed.** `check_c1112_modes` checks the waiting-step line and its own-step line: 44/44.
* **m2 is closed.** Two new checks in `check_r2_fee_table` cover the per-application line limited to roles and the covering count without declared-only people: 67/67.
* **Pure suites on 07aa599e:** `check_r2_fee_table` 67/67, `check_vv_filings` 55/55, `check_vv_prepare` 32/32, `check_c1112_modes` 44/44, `check_engine` 43/43. I did not re-run the API suites (the builder reports 30/30, 35/35, 37/37).
* **New Minor m4 (Should, PR body):** with a co-filing Sponsor line, the screen and the split refusal still speak of fees the case no longer charges.
  * "What a case gets" (`previewFilings`, `engine/filing-modes.ts:120`) still says "Fees for 1 person on this filing (Sample amounts…)" on the own filings, while the case now says none are worked out.
  * The split refusal (`api/src/case-prepare.ts:230`) still names the family maximum the split would lose.
  * Fix: use the case's rule in both places (a co-filed filing → `notWorkedOut`).
* m3 (carried) is unchanged.

**Verdict round 2: Approve** on **07aa599e**. No Blocker or Major is open. m3 and m4 go in the PR body. Journey score: **10/10**. Trust and sources rises to 1 because M1 is closed. The journeys were not re-walked: no journey has a sponsor, so 07aa599e does not change their path.

**Round 3 · 228c765d (merge of origin/main f215b06c, QA-82 #469): Approve.**
* The merge carries both sides' hunks in the four shared files unchanged. Main's QA-82 hunks (`asked` in `contracts/workspace.ts`, `engine/render.ts`, `engine/runtime/questionnaires.ts`, the "No question written yet" note in `questionnaires.tsx`) are line-for-line equal to its own diff from the merge base. C11.12's Filing column hunks are equal to theirs.
* Re-checked here: `tsc` web 0 errors and api 13 (unchanged, untouched test files); `check_c1112_modes` 44/44, `check_r2_fee_table` 67/67.
* The money path did not change, so my round-2 Approve and 10/10 journey score carry to 228c765d.
