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
