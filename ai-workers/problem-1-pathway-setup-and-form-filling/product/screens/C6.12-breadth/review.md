# Review: C6.12-22 engine part, spouse sponsorship priced from the fee table (PR #1074)

Commit reviewed: **e2b458813** (base ffcfb45c8). Reviewer: an independent Opus session that did not build it, 5 Nov 2026.
In scope: `engine/runtime/filings.ts`, `samples/fee-table.json`, `tests/check_r2_fee_table.ts` and `build-notes.md`.
* The -25 concept (`concept-draft.md`, `challenge.md`) is with the tech lead, so it is not reviewed here as a build.
* This is not a screen change, so the screen-review checks are applied as far as they reach.

Note: commit 73b3be71d ("breaker fixes …") landed on this branch, in this clone, while I was reviewing. I did not review it.
To be sure of what I tested, I re-ran the probes and the pure checks on an extracted copy of e2b458813.

**Verdict: Block** on e2b458813 (two open Majors, M1 and M2). Once they are fixed, the rest is Minor and does not hold the PR.

## Findings
**M1 Major: the studio's fee words for Spouse or common-law partner now change, and are wrong or contradictory.**
The PR says "the studio's 'What a case gets' preview and C11.12 are unchanged". They are not:
* With `fs.spouse` in the table, `hasFeeRules("fs.spouse")` is true (`api/src/workspace.ts:140`), and `defaultModeOf` gives defaults to the principal and the child (`:151-152`).
* Seen on my copy (:4436, six loaded, as the author, at 1440, 1024 and 400 px):
  * The principal's row: "Pays their own fees; family maximums apply within one submission (Sample amounts)" (`engine/filing-modes.ts:72`).
  * The preview: "Fees for 2 people on this filing (Sample amounts; family maximums within one submission)" (`:120`).
  * `fs.spouse` has no `family_maximum` line, so both sentences name a cap that does not exist. P-247 and the outside check on #455 say a basis with no cap never names one.
  * The sponsor's row and the preview's sponsorship filing still say "Fees not worked out yet" (`:70`, `:120`).
  * The case, though, now prices that sponsorship (no fee of its own; the CAD 1,260 is on the sponsored person's filing). Preview and case now disagree, which C11.12 m4 forbids ("so the two never disagree").
  * Before this PR, every fee cell said "not worked out", which matched the case ("not derived yet").
* **Failing scenario:** Immigration programs › Spouse or common-law partner › Forms › Who can be in this application › Show and edit.
* **No test** reads `fs.spouse` through `filingWords` or `previewFilings`. `tests/check_c1112_modes.ts` uses only `vv.single` and `pnp.express_entry`.
* **Fix** (with a pass test and a fail test), one of:
  * Make the words follow the table: say "family maximums" only when the combination has a `family_maximum` line. Where `co_filed_fees` is set, say that the co-filed filing has no fee of its own and that its fees are on the principal's application (Sample).
  * Or keep "not worked out" for `fs.spouse` until -25.
  * Either way, correct the "unchanged" claim in the PR body and the build notes.

**M2 Major: "only the sponsor co-files" is enforced on the table, not on the release path.**
* The `CO_FILING_ROLES` check sits in `rulesFrom` (`filings.ts:118`). `deriveFilings` prices any co-filed filing once the table has `co_filed_fees` (`:237-239`).
* `releaseModes` (`engine/filing-modes.ts:140`) keeps `co_files` on any line that is not the principal's and not marked as applying. It returned `child` and `representative` co-files in my probe.
* Failing scenarios, at e2b458813:
  * **A child co-filing through the release, with the sponsor co-filing:** the child's own co-filed filing has no line, and the child's CAD 180 is never charged. Total CAD 1,260, `fees_worked_out: true`: an undercharge shown as complete.
  * **A representative co-filing through the release:** the sponsorship bundle is priced as if they were the sponsor.
* Before this PR, both cases were unpriced (the safeguard from the review on #500 M1, break M2 "through the release"). The test at `tests/check_r2_fee_table.ts:173` checks only the table.
* **Fix:** apply the sponsor-only rule where `coPriced` is decided, from the co-filed filings' owner roles, and add a test for each release scenario. The title of 73b3be71d suggests it does this; that commit is not reviewed here.

**m1 Minor: the bundle is charged with no sponsorship filed** (`filings.ts:237-239`).
* When the release does not co-file the sponsor, or gives no modes at all (this was "not derived" before the PR), the whole table is priced.
* Principal, one child and the sponsor gives one filing: CAD 1,260 "Spouse or partner sponsorship fee" plus CAD 180, `fees_worked_out: true`. The sponsor files nothing, and the basis loses the table's words on where the fees go.
* `check_r2_fee_table.ts:167-168` checks the filings only. PR question 4 (B79b sets the sponsor to co-files) lowers the risk.
* **Fix:** pin it with a test, and either do not price it ("the sponsorship is not filed on this case") or record why the bundle stands (Sample).

**m2 Minor: the wrong reason when the sponsored person is not applying** (`filings.ts:289`).
* It says "who pays the sponsorship's fees is not built". For `fs.spouse` the table now says who pays; the real reason is that there is no sponsored person's application to charge.
* `:169-170` checks only `fees_worked_out` and the totals.
* **Fix:** give this case its own sentence, with a test on the words.

**m3 Minor: silent zero for a role no line names.**
* A release that puts `spouse_or_partner` "On the principal's application" on `fs.spouse` makes that person applying with no line and no reason, yet `fees_worked_out: true`.
* This is unlikely, because the principal is the sponsored spouse.
* **Fix:** test it; refuse it or say why.

**m4 Minor (record): the reasons -22 is red are incomplete** (`build-notes.md:18-20`).
* `acceptance/C6.12-breadth.test.ts:25` also requires a `pr_` line, which this table rightly does not have (rows.md C6.12 Q1: `pr_adult` would overcharge).
* So -22 stays red after B79b unless the pack is amended (PR question 3). The build notes should say so.

## What held (probed on the pure engine and the shipped table at e2b458813)
* **No double charge.** With one or two sponsors co-filing, there is one CAD 1,260 line, on the PR filing. The sponsorship filing has no applicants and so no lines; `per_application` skips co-filed filings.
* **Payer and children.** The principal pays CAD 1,260. Each travelling child pays CAD 180 on the PR filing, so 2 children make CAD 1,620. A declared-only child has no line.
* **Splits.** A child who files their own application and is split out pays CAD 180 alone; the bundle never moves. The sponsorship and PR pair cannot be split (`splittable: false`; `case-prepare.ts:415`).
* **No principal.** Then no line, `total_cents` is null and `fees_worked_out` is false. Without `!!principal`, `:170` fails (total 0, "worked out" true).
* **Table defaults.** `tableDefault` never gives `co_files` (`:168` fails without it). An unsound `co_filed_fees` is refused (`:172`). `vv.single` with a co-filing sponsor charges nothing (`:174`).
* **The other readers:**
  * `DERIVED_FOR`: no checklist for `fs.spouse`.
  * `case-prepare.ts:109`: no biometrics line.
  * `case-prepare.ts:403`: no capped line in the split words.
  * `api/src/source-register.ts` `feeLinesOf`: two fee numbers, both fully cited (`fee_table`), so no new gate problem.
  * `workspace.ts`: see M1.
* **Sources and code rules.**
  * CAD 1,260 is in IRCC's words, with page and dates. CAD 180 is labelled Sample with a summary quote, and the `co_filed_fees` words say Sample.
  * No form or combination number in code; the only key is the role `sponsor`, as BR-4.
  * No hot file touched. No explicit `any` added. No migration.
* **Re-run on e2b458813, all exit 0:** `check_r2_fee_table` 91/91, `check_vv_filings` 55/55, `check_c1112_modes` 44/44, `check_vv_prepare` 32/32. `check_g1_source_register` (53/53) and `check_who_can_be_qa` (9/9) passed on the working tree before 73b3be71d landed.

## D1-D20 (non-screen change; only the dimensions it touches)
| Dimension | Score | Evidence |
|---|---|---|
| D1 | 4/5 | -22's engine "Done when" is met: two filings, one group, the bundle once on the sponsored person's filing |
| D2 | 3/5 | M2 undercharge, m1 |
| D4 | 4/5 | an unsound table is refused |
| D10 | 2/5 | M1 |
| D16 | 3/5 | a pass and a fail test per table rule, but not the release path (M2), the studio reader (M1) or the words (m2) |
| D18 | 4/5 | the basis carries the table's words and Sample |

D17 and D20 are simulated only. The rest do not apply.

## Journey test (reviewer, 5 Nov)
Run on isolated copy `rvfs` on :4436, six loaded, live AI off, US$0; the copy is stopped.
* **J1.** The author checks what a spouse sponsorship case gets: Immigration programs › Spouse or common-law partner › Forms › Show and edit.
  * Done by click at 1440, 1024 and 400 px, and by keyboard (Tab to Show and edit, then Enter).
  * The API underneath (`GET …/workspace?tab=forms`) gives `feesKnown: true` and defaults `{principal: files_own, child: on_principal}`, the same as the screen.
* **J2.** The case officer sees the case's fees. This could not be walked: `fs.spouse` has no release (B79b), so it was checked on the pure engine instead.
* **J3.** Break it: no principal, two sponsors, a declared-only child, a split, an unsound table, co-filing through the release (M2).

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | J1 shows the two filings. J2 cannot be reached until B79b |
| Next step obvious | 1 | "2 filings sent together … cannot be split" |
| Plain words | ½ | M1: "family maximums" for a combination with none |
| Feedback and state | 1 | the card behaves as before; no console errors |
| Correct data | ½ | M1 (the preview contradicts the case), M2 (the child's CAD 180 is dropped) |
| Error recovery | 1 | an unsound table is refused; with no principal nothing is priced |
| Accessibility and screen sizes | 1 | axe WCAG 2.2 A/AA on the card: 0 violations. No sideways scroll at 400, 1024 or 1440 px. Reachable by keyboard |
| Speed | 1 | the card opens in about 0.3 s |
| Visual quality | 1 | the team's card, unchanged |
| Trust and sources | ½ | the case's basis cites IRCC and says Sample; the studio does not say where the sponsorship's fees go |

**Journey score: 7.5/10, below the pass of 8 (no criterion at 0).** The fixes worth most: M1 (raises plain words, correct data and trust), then M2.

**Not checked:**
* the case page and `/prepare` on a released `fs.spouse` (B79b);
* the C11.12 and C6.12 acceptance packs (the builder's run);
* `graph.mjs` (not run, to keep my writes to this file);
* 200 % zoom;
* a real screen reader;
* an intended user's unaided walk (D17 and D20 stay with the founder).

## Round 2 (diff only, 7890073b3)
Re-reviewed `git diff e2b458813..7890073b3` (commits 73b3be71d and 7890073b3), checked against the round 1 findings above and
`break-report.md`. Probes ran on an extracted copy of 7890073b3, and isolated copy `rvfs2` ran on :4437 (six loaded; now stopped).

**Verdict: Approve** on 7890073b3. No Blocker or Major is open.

| Round 1 finding | Status at 7890073b3 | Evidence |
|---|---|---|
| M1 studio words | Fixed (option b) | Studio words are back to round 0: `hasFeeRules("fs.spouse")` is false (`filings.ts:142`), and the table no longer defaults the child. Seen on :4437 as the author: every fee cell and both preview filings say "Fees not worked out yet", and no family maximum is named at 1440, 1024 or 400 px. Keyboard reaches the card, axe finds 0 violations, nothing scrolls sideways. The case-vs-studio difference is recorded as a follow-up row (build notes, "Left as Minors") |
| M2 co-filing through the release | Fixed | `coMissing` (`filings.ts:245-251`) prices only one co-filed filing, owned by the sponsor. A child co-filing, a representative co-filing, and two sponsors now get no lines, `fees_worked_out: false` and a reason |
| m1 bundle with no sponsorship | Fixed | No modes, no sponsor mode, or no sponsor person now give no lines and the reason "no sponsorship is filed on this case yet (add the sponsor …)" |
| m2 reason with no principal | Fixed | The reason is now "no sponsored person's application is on this case", and its test checks the words |
| m3 free applicant | Fixed | A spouse on the principal's application blocks pricing and is named in the words |
| m4 build notes | Fixed | `build-notes.md` "Why -22 stays red after B79b" |
| Breaker m6, m3 split | Fixed | A table with `co_filed_fees` but no `co_files` mode is refused. A split-out submission gets no price |

Mutation check (on my copy; each rule removed in turn, then restored):
* Each of these makes its own new test fail (98/99):
  * the `hasFeeRules` guard;
  * the one-sponsorship check;
  * the sponsor-owner check;
  * the split check;
  * the free-applicant check;
  * the m6 guard;
  * the no-principal check.
* With every rule in place, `check_r2_fee_table` passes 99/99. On 7890073b3, `check_vv_filings` 55/55, `check_c1112_modes` 44/44 and `check_vv_prepare` 32/32 also pass.

What still holds:
* Base case: CAD 1,260 plus CAD 180 per travelling child, all on the PR filing. Two children make CAD 1,620; a declared-only child pays nothing.
* `vv.single` is unchanged: CAD 370 for a family of two.
* A family wholly in one separate group is still priced once.
* No hot file is touched, no explicit `any` is added, and no other reader of `hasFeeRules` exists (only `api/src/workspace.ts`).

New findings (both Minor; neither holds the PR):
* **r2-m1, plain words.** The `coMissing` sentence (`filings.ts:247`) reads "Fees not worked out yet for …: its fees are worked out with the sponsor's sponsorship filed beside …", which sounds as if they are worked out. Fix: "its fees are worked out only when the sponsor's sponsorship is filed beside …".
* **r2-m2, untested path.** A release that co-files the sponsor but sets no child mode now gives the child no filing, explained in `not_filing`, and prices CAD 1,260 as worked out. The table's child default is gone, so this follows. The release check (`FILING_NOT_SET_BLOCKS`, BR-7) refuses a new release without the child's mode, so only a pinned older release could reach it, and no `fs.spouse` release exists yet. Fix: a test that pins it.

**Journey score, round 2: 8.5/10 (pass, no criterion at 0).** J1 was re-walked on 7890073b3.
* Plain words ½ (r2-m1).
* Correct data 1 (M1 and M2 fixed).
* Trust and sources ½ (the studio does not yet say where a sponsorship's fees go: the follow-up row).
* Task completed ½ (J2 needs B79b).
* Every other criterion as in round 1.

Not checked: the case page and `/prepare` on a released `fs.spouse` (B79b); the acceptance packs.
