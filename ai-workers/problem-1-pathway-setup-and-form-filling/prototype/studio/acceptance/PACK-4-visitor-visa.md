# Pack 4 — Visitor visa (`vv.single`) M3 path (P-220 Day 0)

From a case to the application ready to file, on the agreed design M3 case view r5c (29 Oct; `product/screens/M3-agent-view/`, `M3-prepare-application/`; BACKLOG L1; features M3-A to M3-F). Run: `zsh studio/acceptance/lib/run_pack4.sh [port]` (its own isolated copy, US$0, no live AI). The routes and names the tests assume: `M3-CONTRACT.md`. The click-through: `journeys/J7-visitor-visa-end-to-end.md`. The IRCC rules: `product/compliance-trace.md`, section "Pack 4" (VV-R01…VV-R21).

## Tests (each fails today; a builder moves it into the suites in the PR that makes it pass)
| Feature | Capability | Test | What it proves for Visitor visa |
|---|---|---|---|
| M3-A | C6.11 | `C6.11.test.ts` | Sample firm and solo firm (SI-9); representative of record with licence; assign and reassign with history; IMM 5476 from the representative; a change asks for a new one |
| M3-B | C6.12 | `C6.12.test.ts` | one filing per person, one family group; CAD 100 per person, CAD 500 for 5+; biometrics CAD 85 / CAD 170, none under 14 or over 79; split with a reason |
| M3-B | C11.6 | `C11.6.test.ts` | the line's channel as each item's default; IRCC's accepted channels per edition × account; refusal with IRCC's line; portal read-only |
| M3-C | C6.4 | `C6.4.test.ts` | checklist per person from release × role × conditions; recomputed; team states; the document is the person's |
| M3-C | C6.5 | `C6.5.test.ts` | passport read by rules (synthetic PDF, `lib/fixtures.ts`); proposals with provenance; field by field; typed versus document check; unreadable flagged; a letter replayed at US$0 |
| M3-D | C6.9 | `C6.9.test.ts` | AG-03's shape from our gates (SI-1); three outcomes, no score; frozen snapshots; override and review |
| M3-E | C7.7 | `C7.7.test.ts` | deliverables per person (forms by age, documents, biometrics step); stage 1 counts; PDF copy not for filing |
| M3-E | C7.6 | `C7.6.test.ts` | the blocks (facts, barcode, signature, review, accepted-until) and the warnings passed with a reason; Ready to file; Self-reviewed |
| M3-E | C7.5 | `C7.5.test.ts` | rules cross-checks; AI review replayed only, cost first; team words and states; never blocks |
| M3-E | C7.3 | `C7.3.test.ts` | answer sheet in the PDF twin's order; copy text; Entered ticks frozen; out of date after a change |
| M3-F | C8.1 | `C8.1.test.ts` | who signs; print → signed → scan → uploaded to IRCC, in order, upload only after Ready to file |
| M3-F | C8.2 | `C8.2.test.ts` | record per group; numbers, dates, UCI; read-only; second record refused; correction history |
| M3-F | C9.2 | `C9.2.test.ts` | out of date on the case's items with words, block, Undo, scope; files unchanged |
| M3-F | C10.2 | `C10.2.test.ts` | Finished story checkpoint (Visitor visa part), US$0 |
| setup | — | `lib/setup_vv_m3.ts` | release 2 of Visitor visa: account, IMM 5476, who signs, channels, filing modes (M3-0), document lines, gates (M3-8) |

## Breadth, after Visitor visa
* **C1.3** (employer case link) and **C11.5** (Retail and Corporate apart, case link to an employer case): no employer facts on a visitor visa. Test with the Corporate Sample and the work permit (DEMO combination B).
* Inside the Visitor visa tests, named in each file's header: C6.12 sponsorship + PR pair and the "study 6 months or more?" question; C6.4 police certificates and the PR / Express Entry rules (P-171 (6), P-172); C6.5 printed-text and table reading (STANDARDS §1 gate); C6.9 score grids (SI-2); C7.5 other form families (SI-6); C7.3 the live portal order (W6); C7.7 and C8.1 Paper lines, waiting filings, client e-sign; C8.2 sponsorship and citizenship groups; C9.2 the employer-case change; C10.2 combination B (row 18) and row 13 (W6, parked).

## Founder questions (no design choice was made for these; the tests use the recommendation and say so)
1. **FQ-1 Which IRCC account files a represented visitor visa?** canada.ca lists "visitor visa" under the APR portal and "temporary resident visas" under the IRCC portal for representatives on the same page (VV-R12). **Recommend the APR Portal** (DEMO.md P-98, r5c BR-10); the expert confirms.
2. **FQ-2 Channels of the three Visitor visa forms on that account.** Recommend IMM 5257 PDF upload with a typed name, IMM 5707 Online with a typed name, IMM 5476 PDF upload signed by hand and scanned (r5c BR-10; concept M3-prepare-application §8 conflict 1 still open for the expert).
3. **FQ-3 Paper as an accommodation.** IRCC: online unless you cannot (VV-R02). Recommend offering Paper on a visitor visa line only with a written accommodation reason, never as a default.
4. **FQ-4 The minor's letter of authorization.** IRCC asks for it when a minor travels alone *or with one parent* (VV-R08); the library has only "travelling alone". Recommend one Sample question per child, "Travels with both parents or legal guardians?", the line shown when the answer is no.
5. **FQ-5 Officer's-judgement items on the eligibility page** (ties, leaving at the end). Recommend listing them as "Officer's judgement, not checked by rules" beside the gates, never as gates, so no outcome pretends to judge them.
6. **FQ-6 Does an entered Online section that went out of date block "Ready to file"?** P-136 says "a signed, uploaded or entered item" blocks; P-168 and r5c BR-9 name only signed or uploaded items and say an entered Online section warns. Recommend **warn** (P-168 is the later decision; the portal shows the officer what was entered); the tests follow that (C7.3-13).
7. **FQ-7 On which date is age counted** (biometrics under 14 or over 79, IMM 5707 at 18, a parent signing under 18)? Recommend the submission date: shown "as at today" until the group is recorded, then frozen.
8. **FQ-8 Biometrics given in the last 10 years** (VV-R19). Recommend a per-person fact "biometrics given on" (date): no biometrics fee or step while it is under 10 years old; after the Visitor visa path is green.
