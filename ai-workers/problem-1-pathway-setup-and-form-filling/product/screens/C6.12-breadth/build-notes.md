# C6.12 breadth: filings and fees derived from the case (runtime lane, 5 Nov)

## Before: the pack on a fresh configured checkpoint (main ffcfb45c8, live AI off, US$0)
Copy `rtcp` on :4431: Demo › Reset, then Demo › Load the configured checkpoint as the author (80 s). Released: Visitor visa,
Study permit › Outside Canada, Employer-specific work permit › With an LMIA – inside Canada. Row 10 partial: Express Entry
(219 problems) and Spouse or common-law partner (93 problems: IMM 5604, IMM 1344 form fields with no decision) are not
released; High-wage position has no form.

* `acceptance/C6.12.test.ts` 4431 xr_studio_rtcp: exit 0, **24/24**.
* `acceptance/C6.12-breadth.test.ts` 4431 xr_studio_rtcp: exit 1, **1/4**.
  * C6.12-22 sponsorship: FAIL `{"released":0,"feeTable":"no fs.spouse entry in samples/fee-table.json (only vv.single today)"}`.
  * C6.12-23 child study question: FAIL `{"releasesWithTheQuestion":0}`.
  * C6.12-24 other combinations: PASS.
  * C6.12-25 the screen: FAIL "no fee or CAD on the case page".
* Gate B on its fixture (`GATE_B_DATA=checkpoint`, both packs have setup steps, so "fixture only"): breadth 1/4, main 24/24.

## Why each red part is red, and who it waits for
* **-22**: (a) `fs.spouse` is not released on the checkpoint: Family sponsorship's release on the checkpoint is B79b (#1052,
  `api/src/demo.ts`, off-limits to this lane). (b) The fee table refuses a co-filing combination and a co-filed case is
  charged nothing (`engine/runtime/filings.ts` `rulesFrom`, `deriveFilings`): runtime, built here.
* **-23**: nothing built; no student or worker combination on the six has an accompanying child; no concept covers a filing
  that depends on a case officer's answer (rows.md C6.12 §1).
* **-25**: the case page never reads `/runtime/cases/:id/prepare`. Designed as the fee block (BR-7) of the Prepare
  application tab (`screens/M3-design-2026-11-04/prepare-tab/`, r2 after its challenge; no approval recorded).

## Built on this branch: -22's engine part (no screen)
* `samples/fee-table.json` `fs.spouse`: lines `spouse_sponsorship` (CAD 1,260, IRCC's words, page date 2026-09-21) and
  `spouse_dependent_child` (CAD 180, Sample); modes principal files own, sponsor co-files (no child default: a release sets
  it); `co_filed_fees` places the sponsorship's fees on the sponsored person's application (Sample: who pays is the
  expert's).
* `engine/runtime/filings.ts`: priced only when the case carries one sponsorship filed by the sponsor, beside the sponsored
  person's application, in one submission, and every person applying is charged by a line; otherwise nothing is charged
  and `fees_why` names what is missing. A table's `co_files` is never a default. `hasFeeRules` stays false for such a
  combination, so the studio's "Who can be in this application" words and preview are as before (review M1); the studio's
  words for a priced sponsorship are a follow-up row.
* Reviews: `break-report.md` (2 Majors, 7 Minors on e2b458813), `review.md` (Block on e2b458813: 2 Majors, 4 Minors); fixed
  in 73b3be71d and the commit after it, each with a fail test in `tests/check_r2_fee_table.ts` (99/99).

## Why -22 stays red after B79b (review m4)
* `acceptance/C6.12-breadth.test.ts:25` also wants a fee line starting `pr_` in `fs.spouse`. The cited CAD 1,260 already
  bundles processing and the right of permanent residence fee, and `pr_adult` (CAD 1,590) is the economic class, so adding it
  would charge CAD 2,850 (break M2). The pack is the tech lead's to amend (rows.md C6.12 Q1; PR question 3).
* The checkpoint's release of Spouse or common-law partner must set the sponsor's line to co-file (B79b, #1052; question 4).

## Left as Minors (in the PR)
* Studio words for a priced sponsorship (review M1's first fix option): a follow-up row, recommended after -25.
* `cad()` writes "CAD 1260" without a thousands separator (break m7), and the line's payer is the sponsored person while who
  pays is Sample (break m7).
* A release mode that disagrees with the table is not flagged on save (break m3; `filingWarnings` covers `vv.single` only).
