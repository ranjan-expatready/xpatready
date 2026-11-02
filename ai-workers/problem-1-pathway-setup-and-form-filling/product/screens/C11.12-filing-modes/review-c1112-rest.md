# C11.12 rest — review of 5183f052 · reviewer · 2 Nov

**Verdict: Approve on 5183f052.** The pack now checks P-209 as written; no founder question is needed. One Minor and one record note.

* **Is relaxing the pack right?** Yes, and it is not a weakening of the decision.
  * P-209 (`DECISIONS.md:66`) says "the sample renames 'Applicant' to 'Principal applicant' and keeps '(travelling)'". It renames the bare label. It does not require every principal to read "Principal applicant".
  * The rename commit (c24af0b1) changed the one bare "Applicant" in `wave1.json`. The other principal labels were typed on purpose before P-209 and are kept per L7: "Student", "Worker", "Employer (applicant)", "Sponsored spouse or partner".
  * The old line-90 check was stricter than the decision. The new check matches it: no bare "Applicant" anywhere, and "Principal applicant" present, with a fail pair.
  * Both samples hold: `wave1.json` and `programs.json` have 0 bare "Applicant" labels, and each has a principal "Principal applicant".
* **Ran on an isolated copy (:4471, since stopped and dropped):** `acceptance/C11.12.test.ts` 20/20, all three P-209 lines passing.
* **The row's other items need no build:**
  * The three filing modes (plus co-files) are on main from #500: `contracts/workspace.ts:60` `LINE_MODES`, `check_c1112_modes`.
  * QA-91 is on main in code: `api/src/people-ai.ts:66` and `:151` (the run card and Stop), with `check_qa91_who_can_be_run.ts` and `_browser.cjs`.
* **Minor (Should):** `principalNamed` matches any line labelled "Principal applicant", whatever its role (`acceptance/C11.12.test.ts:92`), while the comment says "the Visitor visa principal". Tie it to the role: `/"role":"principal","label":"Principal applicant"/`. That is the QA-143 point.
* **Record note (for qa, not this PR):** `product/qa/BUGS.md:60` still lists QA-91 as Open. The fix is on main, so qa should verify it and close the row.
* `qa/built/C11.12.md` matches what is built. Its remaining items match the review of #500 (S7a fees and who pays a sponsorship's fees; forms for declared-only people). The rounds 5–6 records are as I wrote them.
