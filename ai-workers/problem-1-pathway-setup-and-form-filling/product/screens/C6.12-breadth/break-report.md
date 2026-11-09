# C6.12-22 break report: spouse sponsorship priced from the fee table (PR #1074 at e2b458813)

**By:** an independent breaker, 5 Nov. **Base:** origin/main ffcfb45c8. **Scope:** the money change only (`engine/runtime/filings.ts`,
`samples/fee-table.json`, `tests/check_r2_fee_table.ts`). No screen changes, so keyboard, zoom, uploads and budgets are not in
scope. Live AI off, US$0. `check_r2_fee_table.ts` passes 91/91.

**How it was reached.**
* Engine: `deriveFilings` and `rulesFrom` with edited tables and release modes (scratch probe, as the test does).
* API: isolated copy `brk1074` on :4438 (`isolated.sh` + `setup_visitor_visa.ts`, 15/15).
* `fs.spouse` cannot be released there (its forms are unfinished, build-notes:11). On that copy's own database only, I re-keyed
  the released `wp.family` to `fs.spouse` with wave1's participants (principal files_own, sponsor co_files 1..1, child
  on_principal 0..4, representative) and recomputed `snapshotHash`. Its forms are still work-permit forms, so only filings and
  fees were judged. The copy was stopped and its database dropped.

## Breaks

**M1 (Major): a spouse-sponsorship case is priced as complete with no sponsorship filing.**
* Steps (API): open a `fs.spouse` case with only the principal, `GET /runtime/cases/:id/prepare`, then add a child.
* Expected: CAD 1,260 bundles the sponsorship fee, so it is "worked out" only once the sponsorship filing is on the case.
  Otherwise not priced, or words saying the sponsorship is missing (the reverse of the PR's "never priced without the
  principal's application").
* Actual:
  * One filing (the PR application), `fees_worked_out: true`, total 126000; 144000 after the child.
  * The basis lacks the table's co-filing words.
  * The sponsorship filing appears only once a sponsor is added; every new case passes through this state.
  * Engine, release with no sponsor mode: `not_filing` says "no filing is set for a sponsor", yet CAD 1,620 is worked out.
* Where: `filings.ts:238-239` (`priced = fees0` when `!coFiling`, though the rules carry `coFiledFees`). The test `noRelease`
  in `check_r2_fee_table.ts` checks filings only, not fees.

**M2 (Major): the acceptance pack's C6.12-22 check cannot pass with this table; making it pass double-charges.**
* `acceptance/C6.12-breadth.test.ts:25` requires a `/^pr_/` line in `fs.spouse.lines`.
* The PR has only `spouse_sponsorship` and `spouse_dependent_child`. That is right if CAD 1,260 already bundles processing and
  the right of permanent residence fee (the PR's own `why`).
* With `pr_adult` added, a sponsored person alone costs 285000 (CAD 1,260 + 1,590): the RPRF is charged twice.
* So -22 stays red even after release, and the obvious "fix" overcharges. `build-notes.md` does not record the conflict; under
  AGENTS rule 2 it goes to the Lead or founder.

**m1 (Minor): the studio preview contradicts the case** (`GET /combinations/:id/workspace?tab=forms`, `feesKnown: true`).
* The sponsor line and the preview's sponsorship filing both say "Fees not worked out yet for Spouse or common-law partner"
  (`engine/filing-modes.ts:70`, `:120`).
* The principal's filing says "family maximums within one submission", but `fs.spouse` has no family-maximum line.
* The case prices the pair, with no fee on the sponsorship. The preview and the case disagree (`filing-modes.ts:113` promise).

**m2 (Minor): wrong reason when there is no sponsored person's application** (engine: principal not travelling, sponsor co-filing).
* `fees_why` says "who pays the sponsorship's fees is not built" (`filings.ts:289`). Untrue now: the reason is no principal's
  application.
* The test "…words say why" checks only `fees_worked_out`. Through the API the principal cannot be untravelled (404).

**m3 (Minor): a release mode that disagrees with the table is unflagged; a child's sponsorship fee can be sent alone.**
* Steps (API, child released `files_own`): the child's own filing sits in the sponsorship group with `splittable: true`; split it
  with `POST /runtime/groups/:gid/split` (200).
* Actual: a separate group with only "Dependent child fee (sponsorship)" CAD 180 and no sponsorship. Its words cite "family
  maximums" that `fs.spouse` lacks (`filings.ts:279`).
* The table says `child: on_principal`; `filingWarnings` warns only for `vv.single` (`filing-modes.ts:37`).

**m4 (Minor): an applicant role no line charges files free, still "worked out".**
* Engine: a release with `spouse_or_partner` files_own or on_principal on `fs.spouse` gives an applying person no fee line, a
  total that leaves them out, `fees_worked_out: true` and no words. Needs an author's mistake.

**m5 (Minor): "only the sponsor co-files" is enforced on table modes only.**
* Engine: release modes `representative: co_files` or `child: co_files` pass `releaseModes` (`filing-modes.ts:140`).
* The case is priced, and the basis says "the sponsorship filing carries no fee of its own" for that filing.
* `deriveFilings` never checks `CO_FILING_ROLES` (`filings.ts:238`). The studio's save refuses this (BR-4, `engine/people.ts:44-48`),
  so it is reachable only through a release stored before BR-4.

**m6 (Minor): `co_filed_fees` is accepted on a combination that never co-files.**
* Engine: `vv.single` given `co_filed_fees` plus a release with a co-filing sponsor charges the visitor and biometrics fees
  beside a sponsorship, with the stray `why` in the basis.
* `rulesFrom` (`filings.ts:116-118`) does not require a `co_files` mode, so one copy-paste turns off Visitor visa's old guard.

**m7 (Minor): the payer is named although the table says who pays is unconfirmed.**
* The CAD 1,260 line's `payer` is the sponsored person ("CAD 1260 for Sample Sponsored A."), while the table's `why` says "who
  pays is the immigration expert's to confirm".
* `cad()` writes "CAD 1260", not "$1,260.00" (challenge.md:140).

## What held
* The shipped case, through the API:
  * CAD 1,260 once, on the PR filing; CAD 180 per travelling child; nothing on the sponsorship filing.
  * The sum of lines equals the group total (144000, 162000), and `…/prepare` agrees with `…/filings`.
* A child added as not travelling is declared only, with no fee; marked travelling it costs CAD 180 (1,440 → 1,620).
* Double charges:
  * A second sponsor gets 422. Two sponsors forced in through the engine make two co-filed filings, still one CAD 1,260.
  * The sponsor is never charged. Sponsor marked travelling: 422. Principal marked not travelling: 404.
* Splitting the sponsorship or the principal's filing out of the pair: 409.
* Wrong-role reads: client `user-P` and the author 403; unknown actor or none 401; representative of record 200 (intended).
* Junk table shapes are refused: `co_filed_fees` null, array, `false`, `0` or `""`; a numeric `why`; `on: "PRINCIPAL"`; an own
  `__proto__` key; `co_files` without `co_filed_fees`; sponsor `on_principal`; representative or child `co_files` in the table.
* The table's `co_files` never files a sponsorship by itself; the people view's `defaults` leave out the sponsor.
* Shipped Visitor visa with a co-filing sponsor still charges nothing; a sponsorship with no principal's application is not
  priced.
