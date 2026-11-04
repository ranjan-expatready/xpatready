# Review: C6.12 breadth step 24 — fee lines for study permit, work permit, open work permit holder, visitor extension

The reviewer agent wrote this on 4 Nov 2026 at 00:01 IST. Branch `claude/runtime-fees`, head **0653641a9**. Diff: `git diff origin/main...0653641a9`, which changes only `samples/fee-table.json` and `tests/check_r2_fee_table.ts`.

The first commit, 4899c6c62, also added FEE-R01…R04 to `product/compliance-trace.md`. 0653641a9 takes them out again, because that file belongs to the tech lead and this copy's stop guard refuses edits to it. The rows now go to the tech lead in the PR body. I judged their text from `git show 4899c6c62`. The two commits have the same diff for samples and tests (I compared the diff hashes).

This is a runtime data row, not a screen: it adds no route and no UI, and it cost US$0. I started no server and did not touch :4400 or :4430–4439. The tech lead runs the breadth pack on :4436.

## Runs
* `tests/check_r2_fee_table.ts` at 0653641a9: **81/81** in 0.25 s. It contains 14 C6.12-24 checks (3 for each line and 2 across all four).
* `tests/check_g1_source_register.ts` (reads FEE_TABLE): **53/53**. Pure `tests/runtime/check_vv_filings.ts`: **55/55**.
* `tsc -p api/tsconfig.json --noEmit`: no errors in filings.ts, the fee table or the test.
* **Step 24 predicate**, using the code of `acceptance/C6.12-breadth.test.ts:31-33` on the shipped FEE_TABLE without a server: **true**. It finds study_permit, work_permit, open_work_permit_holder and visitor_extension, none with a cap or the family_maximum basis. On main the same check is red, because main has no line that matches study, work or extension.
* **Mutations** on a throwaway copy (scratchpad, the shipped file is untouched). There were 21 edits: for each line, amount +1, line removed, quote changed, family_maximum basis with a cap, child role dropped; plus vv.single using study_permit. **The suite exited 1 on all 21.** Each line's own C6.12-24 checks caught the edit, and the cross-line check caught the vv.single edit.
* **Live source.** I fetched https://ircc.canada.ca/english/information/fees/fees.asp on 4 Nov 2026 (page "Date modified: 2026-09-21"). Its rows match the four quotes word for word, en dashes included:
  * "Study permit (including extensions) – per person" 150.00
  * "Work permit (including extensions) – per person" 155.00
  * "Open work permit holder" 100.00 ("Open work permit" is a link there)
  * "Extend your stay as a visitor – per person" 100.00

  The builder's text copy (`scratchpad/fees/fees.txt` lines 60–102) says the same.

## Focus points
* **Amounts and quotes.** Exact. Each quote is the row's words followed by the amount column, the same pattern as the existing visitor visa lines. `status` follows the enforced pattern `Researched (IRCC fee list, 2026-11-03): may change`.
* **Basis and roles.** `per_person_by_role` for principal, spouse or partner and child, with no cap, is a faithful reading of "per person". The page's only caps are:
  * the visitor visa family maximum (CAD 500), which the visitor extension line rightly leaves out;
  * the group maximum for 3 or more performing artists (CAD 465), which the work permit line says it does not model.
* **Open work permit holder.** Keeping the line is right: the fee list prices it separately. The row gives no "per person", and both the line (`checked`) and draft FEE-R03 label the per-holder reading **Sample**. A test pins that label (the last C6.12-24 check). Listing "child" among its roles is part of that Sample reading, and each combination's modes will narrow it.
* **Sample labelling (AGENTS.md rule 4).** Every amount is on IRCC's own page and is marked Sample until the immigration expert confirms (P-171). One claim is not from the fee list: see m1.
* **No existing total changes.** vv.single keeps `["visitor_visa","biometrics"]` (tested). The Visitor visa totals checks (CAD 185 / 200+170 / 500+170) pass. No combination names the new lines, and `api/src/source-register.ts:19` only reads a combination's own lines, so G1 sees no new published numbers.
* **filings.ts unchanged.** This meets the row. The R2 header at `engine/runtime/filings.ts:21-23`, and the about line in `fee-table.json`, say a fee change is an edit to the table with its test. The breadth pack reads `FEE_TABLE.lines`. The four files the row said not to touch (validate.ts, programs.ts, proposals.ts, resolver.ts) are untouched. CI runs every `tests/check_*.ts` (`product/tools/run-suites.sh:136`).
* **A passing and a failing test per line.** Each line has three checks:
  * "pass": one person pays 1×, six people pay 6×;
  * "fail": a cap written onto the line by mistake is not applied;
  * a pin on amount, quote, URL, date, basis and roles.

  The mutations show each line's checks fail when its data is wrong.
* **Draft trace rows (from 4899c6c62).** They follow the C6.12 section's own conventions: the "Sourced" status, the fee-list link, the quote, the page date and the date read, and test IDs C6.12-24. Two small fixes are in m1 and m3.

## Blockers
None.

## Majors
None.

## Minors
* **m1: one claim has no cited source.** The open work permit holder line's `checked` note and draft FEE-R03 both say "paid with the work permit fee for an open work permit". That is not on the fee list. The source is IRCC Help Centre answer qnum=176 (https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=176&top=17, "Date modified: 2026-11-03", read 4 Nov 2026): "In most cases, you will have to pay the open work permit holder fee at the same time that you pay the work permit fee." **Fix:** cite that quote in the line's note and in FEE-R03, or label the sentence Sample. "In most cases" also backs the Sample label.
* **m2: the basis words would show the wrong read date.** The table-level `"read": "2026-11-02"` was not updated, but the new lines were read on 2026-11-03. `filings.ts:263` prints the table's read date in the case's basis words ("fee table as of …, read …"). The first combination that uses these lines will therefore say "read 2026-11-02" for them. Nothing visible changes today, so the fix can wait for that combination's release: print each line's own read date, or update the table's read date.
* **m3: draft FEE-R02 does not match its siblings.** Its Status column leaves out "amount Sample until the immigration expert confirms (P-171)", which FEE-R01 and FEE-R04 carry and the JSON line also says. Add it when the tech lead lands the rows.
* **m4: the trace rows are not in the file yet.** The row's "Done when … the trace rows cited" now depends on the tech lead adding FEE-R01…R04 to `product/compliance-trace.md` under C6.12, from the PR body. Until then the test's comment ("compliance-trace FEE-R01…R04", `tests/check_r2_fee_table.ts:59`) points at rows that do not exist. This is not the builder's defect, because the file belongs to the tech lead. **The tech lead should land the rows, with the m1 and m3 changes, in the same window as the merge.**

## Journey test (reviewer, one score for this check)
No screen or route exists, so no persona can see these lines. The people involved are the content publisher, who changes a fee by editing the data (P-230 (7)), and the case officer later on. I ran the journeys as scripted data checks:

* **J1, main path.** The publisher adds four cited lines and CI confirms them: 81/81.
* **J2, error.** A wrong amount, quote or role fails loudly: 21/21 mutations caught.
* **J3, wrong cap.** A cap on a per-person line is never applied: tested for each line.
* **J4, boundary.** Using a line in a shipped combination before its release is flagged.
* **J5, regression.** The Visitor visa totals are unchanged.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Four lines, step-24 predicate true, 81/81 |
| Next step obvious | 1 | The `about` line and the test say a fee is a data edit with its test, and each line comes with its combination's release |
| Plain words | 1 | Labels such as "Study permit fee (including extensions)"; notes in plain words |
| Feedback and state | ½ | No person-facing state; feedback is CI output only (fails print the actual values) |
| Correct data | 1 | Matches the live IRCC page word for word; vv.single unchanged |
| Error recovery | 1 | 21/21 mutations fail the suite |
| Accessibility and screen sizes | ½ | No screen: not testable |
| Speed | 1 | Pure suite in 0.25 s |
| Visual quality | ½ | No screen |
| Trust and sources | ½ | Page, quote and date on every line, and the OWP reading is labelled Sample; one claim has no source (m1) |

**Score: 8/10, pass** (no criterion at 0).

## Could not check
* The breadth pack on a server. The tech lead runs it on :4436; I checked its step-24 predicate without a server.
* The graph step (P-86). `graph.mjs` rewrites `qa/GRAPH.md`, and this review may edit no other file. The row has no page and no route.
* D1–D20 per screen do not apply: there is no screen.
* An intended user's walk (D17/D20) and the immigration expert's confirmation of the amounts.

**Verdict: Approve** — commit 0653641a9 (same samples/tests diff as 4899c6c62). There are no Blockers or Majors. Minors m1–m3 are for the builder or the tech lead. m4 is the tech lead's: land FEE-R01…R04 with the merge.
