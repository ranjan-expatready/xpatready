# The M3 rows on the configured checkpoint, read before merge on #891 at 6123019d (4 Nov 2026, ~17:20 IST)

This is **not a verdict**. #891 (QA-144, the IRM 0002 replay) is not merged. The verdicts on main follow its merge. It is written now because it says what the M3 rows will find on the checkpoint, so the owners can act before the merge.

* **Tester:** the independent cloud qa for M3 (Opus). It built none of this.
* **How:** a fresh isolated copy of `6123019d` (`qa891`), then Demo › Reset, then Load the configured checkpoint as the author (48 s, `cost_usd: 0`). The M3 packs ran **directly on the checkpoint's release**, with no fixture setup (`needVisitorVisa` finds `vv.single`, release 1), twice. Live AI was off; cost US$0. The copy was dropped.

## The checkpoint now releases the Visitor visa
`released: ["Visitors › Visitor visa"]`. Rows 1, 3–8 are done; row 9 waits for release 2; row 10 is partial (Study permit has 40 problems); row 11 says "Open a case on the Visitor visa's release 1"; row 12 waits (no saved IMM 5257 map).

## M3 packs on the checkpoint's release (exit · passed; the same both runs)
| Pack | On the checkpoint | On its fixture (main) | Why the difference |
|---|---|---|---|
| C6.12 | **0 · 24/24** | 0 · 24/24 | none: filings and fees work on the configured release |
| C6.4 | 1 · 6/30 | 0 · 30/30 | **the release has no document lines** (`document_requirement`: 0 rows; `GET /checklist` says `"empty_release": true`) |
| C7.7 | 1 · 12/26 | 0 · 26/26 | IMM 5476 is never listed; no document items; IMM 5707 is a PDF upload in release 1, so there is no Online line or Download PDF copy |
| C7.3 | 1 · 2/13 | 0 · 13/13 | no Online form in release 1 (row 9's channels are for release 2), so there is no answer sheet (409) |
| C7.6 | 1 · 3/23 | 1 · 4/23 | #861 not merged |

## Findings for the owners (severity is qa's proposal; the qa lane writes BUGS.md)
1. **Gap · Major · C6.4, C7.7 (checkpoint, QA-144 area): the configured Visitor visa release has no document requirements.**
   * **Steps:** load the checkpoint, open a case on Visitor visa release 1, then read `GET /runtime/cases/:id/checklist`.
   * **Actual:** `empty_release: true`, no passport line and no proof of financial support. The fixture (`setup_vv_m3`) adds these lines. The product's own steps do not.
   * **Expected:** the release carries the Visitor visa's document lines from IRCC's checklist (IMM 5484) through the product's screens, as the fixture's lines are cited.
   * **Effect:** C6.4 cannot count on the checkpoint, and C7.7's document stage is empty.
2. **Bug · Major · C7.7, C6.11 (checkpoint): IMM 5476 never applies to a represented case on the configured release.**
   * **Cause:** its form line's rule is `{"op": "exists", "field": "case.representative_form_action", "subjectKind": "CASE"}` (from #798, IMM 5484 p. 1). No question on the case asks `case.representative_form_action`: none of the 110 questions in the officer's view does.
   * **Actual:** the line is not even listed as "Cannot start yet", unlike IMM 5409 and IRM 0002, whose deciding facts are asked.
   * **Expected:** a case with a representative of record lists IMM 5476, from the case's representative or an asked fact.
   * **Same shape:** IMM 5475 (`case.release_authorization_action`).
3. **Note, not a bug: C7.3 cannot be met on the checkpoint until release 2.** That is DEMO.md row 9, IMM 5257 Online, so IMM 5645 or an Online line. Release 1 files every form as a PDF upload.

## What this means for the M3 count after #891 merges
* **C6.12:** on the checkpoint, the Visitor visa part works (24/24). The row stays Partial for its unbuilt breadth (sponsorship, the child study question, the screen).
* **C6.4, C7.7, C7.3:** not met on the checkpoint, for the reasons above.
* **C7.6:** waits for #861.
