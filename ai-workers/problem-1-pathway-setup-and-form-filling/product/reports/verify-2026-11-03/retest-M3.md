# M3 independent re-test, main 40cebae7 (3 Nov 2026)

Verifier V2 (P-291 (1), second task). Every M3 row of `qa/CAPABILITIES.md` at `40cebae7`. The M3 packs ran through their own runner, `zsh studio/acceptance/lib/run_pack4.sh 4478`: one fresh isolated copy, release 1 (`setup_visitor_visa.ts`), release 2 (`acceptance/lib/setup_vv_m3.ts`), then each test in its order, and C10.2 on a second fresh copy. `C6.12-breadth.test.ts` ran on its own fresh copy (port 4470, both setups). Two runtime suites that `run-suites.sh` never runs (case team, employer link) ran on port 4474. Live AI off, US$0. Exit 0 = every check passes; the runner prints pass counts, and a test with fewer passes than checks exits 1.

## Summary

* **M3 rows scored Works: 2 (C6.11, C6.9). Confirmed: 1 (C6.9, 15/15).** C6.11's pack is 23 of 25 on main, as it was on 877acf66 this morning, so it is not confirmed. Its two failures are representative facts from IMM 5476 and the new IMM 5476 when the representative changes. Its runtime suite `check_c611_team.ts` is green (59/59), but CI never runs that suite.
* **Partial rows: 9.** Five of them have a green pack (C6.12, C11.6, C6.4, C7.7, C7.3). Their packs cover only the Visitor visa part, and their Partial is for breadth beyond it (other combinations, other form families), which the evidence column says in each case. Not a disagreement. C7.6 (4/23), C8.1 (13/14) and C8.2 (0/12) are red, as Partial says. C11.5 has no pack; its runtime suite is green (20/20) and is not run by CI.
* **Not built: 6** (C1.3, C3.16, C6.5, C7.5, C9.2, C10.2). Their packs are red (C6.5 1/22, C7.5 0/16, C9.2 3/11, C10.2 0/11) or absent (C1.3, C3.16), as scored.
* The shared release-2 setup passes 44 of 46 steps. "S7a … Visitor visa fee lines saved as a dated fee table: Cannot PUT /api/library/fees" and "S2w … a form line with no signer set is named by the release check before release" fail on every run. The qa record calls these "check drift". They are worth one row: a setup step that fails on every run hides a real break the day one happens.

## Capability by capability

| Capability | Scored | What ran on 40cebae7, exit code | Reading |
|---|---|---|---|
| C6.9 Staff eligibility page | Works | pack 4 `C6.9.test.ts` 15/15, exit 0 | **confirmed Works** (the build review on 1a79dbf9: 2/15) |
| C6.11 Firm, users, case team | Works | pack 4 `C6.11.test.ts` 23/25, exit 1; `tests/runtime/check_c611_team.ts` 59/59, exit 0 | **not confirmed: pack red.** Fails: "C6.11-16c pass: the questionnaire shows IMM 5476's representative facts (membership ID) from the representative of record, source 'Firm', not typed per case"; "C6.11-17a pass: the new IMM 5476 is To do naming the new representative; a signed earlier one goes Out of date (C9.2-6)" (the second leans on C9.2, not built) |
| C6.12 Filings, groups, fees | Partial | pack 4 `C6.12.test.ts` 24/24, exit 0; `C6.12-breadth.test.ts` 0/4, exit 1 | agrees: the Visitor visa part works, the breadth part is red |
| C11.6 Channel per case item | Partial | pack 4 `C11.6.test.ts` 14/14, exit 0 | pack green; Partial for the permanent-residence portal-only forms (breadth), per its evidence |
| C6.4 Document storage | Partial | pack 4 `C6.4.test.ts` 30/30, exit 0 | pack green; Partial per its evidence (stand-in SI-14 storage) |
| C7.7 Deliverables list | Partial | pack 4 `C7.7.test.ts` 26/26, exit 0 (18 checks this morning; the pack grew with #680) | pack green; Partial for Paper lines, waiting filings and our-format copies (breadth) |
| C7.3 Portal answer sheet | Partial | pack 4 `C7.3.test.ts` 13/13, exit 0 | pack green; Partial for other portal-only forms (breadth) |
| C7.6 Ready to file | Partial | pack 4 `C7.6.test.ts` 4/23, exit 1 | agrees (and L-SA3 held under P-251: see V2 contradiction 2.1) |
| C8.1 Signing | Partial | pack 4 `C8.1.test.ts` 13/14, exit 1 | agrees: "C8.1-13 pass: after Ready to file, 'Uploaded to IRCC' is ticked; the item is Done" gets 409 because nothing reaches Ready to file yet (C7.6) |
| C8.2 Filing record | Partial | pack 4 `C8.2.test.ts` 0/12, exit 1 | agrees |
| C11.5 Retail and Corporate apart, employer link | Partial | no pack; `tests/runtime/check_c115_employer.ts` 20/20, exit 0 | built part green; not run by CI |
| C6.5 Document reader | Not built | pack 4 `C6.5.test.ts` 1/22, exit 1 | agrees |
| C7.5 Independent AI review | Not built | pack 4 `C7.5.test.ts` 0/16, exit 1 | agrees |
| C9.2 A changed fact marks signed items stale | Not built | pack 4 `C9.2.test.ts` 3/11, exit 1 | agrees |
| C10.2 Demo: the finished story | Not built | pack 4 `C10.2.test.ts` 0/11 (second fresh copy), exit 1 | agrees |
| C1.3 Relies on employer case | Not built | no pack | agrees (nothing to run) |
| C3.16 Field scope | Not built | no pack | agrees (nothing to run) |

## Compared with this morning (877acf66, same runner, port 4478)

Same results except C7.7 (18/18 → 26/26, pack extended by #680). The setup steps that fail (S2w, S7a) and C6.11's two failures are unchanged.
