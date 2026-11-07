# J7 — Visitor visa end to end: Super Admin setup → case → collection → filing → verification → application ready

Pack 4 (P-220 Day 0). The click-through a builder turns into a browser check (Playwright, the `journey-test` skill: keyboard path, axe on every state, 1440 and 1024 px), and qa walks like a person. API and data checks for each step are in the `C*.test.ts` files named in the right column. Design: M3 case view r5c (29 Oct), board `product/screens/M3-agent-view/design/draft-agent-view.html`. Every person, value, number and document is Sample or synthetic; fees and form rules are cited in `product/compliance-trace.md` (rows VV-R…); legal points are Unconfirmed: no counsel. **US$0:** AI is replay only; no step presses a priced button.

**People:** Configuration author, Content reviewer, Approver (studio); Representative (licensed), Case officer, Firm admin (the Sample firm); the Sample solo representative; Client A (principal). **Family:** Client A (40), Spouse A (38), Child A1 (10), Child A2 (15). **Start:** Stage 0 below. Until Stage 0 can be done on screens, the browser check starts from a fresh isolated copy with release 1 made by `tests/runtime/setup_visitor_visa.ts`, which is **scaffolding**: it seeds by SQL and API what a person cannot yet do on a screen (qa-1's gaps G2–G6 on #280). Those gaps are owned by their M2 capabilities (C3.4, C3.6, C3.8, C4.11, C4.1, C3.14, C11.10), not by this pack; J7 is end to end only when Stage 0 passes.

## Stage 0 — Visitor visa release 1 from the Demo menu (M2; prerequisite)
| # | Who does what | Expected result | Check |
|---|---|---|---|
| 0.1 | Founder: Demo › Reset, then Demo › Configured checkpoint (C10.1) | Visitor visa is released (release 1) from the screens' own services; no problems left: no fact asked of nobody (G5), the answer lists, option maps, the sections "Your visit" and "Previous countries of residence" and the section checks exist (G2–G4, G6) | C10.1 (pack 3) |
| 0.2 | Author walks the same setup by hand on a blank workspace | Every step has a screen: answer lists and their links (G2), option maps (G3), new sections (G4), "ask it here" from an error (G5), section checks (G6), Confirm on Official pages (G1) | C3.4, C3.8, C4.11, C3.14, C11.10 |

## Stage 1 — Super Admin setup (M2)
| # | Who does what | Expected result | Check |
|---|---|---|---|
| 1.1 | Author opens Immigration programs › Visitors › Visitor visa | The combination shows release 1, "Filed through" not set or APR Portal; the next step named | C1.4 (M2) |
| 1.2 | Forms tab: Add IMM 5476 from the library. Before setting who signs, the release check names its missing signer (G8). Then set "Each applicant", minimum age 18, signed by "The person and the representative" | Row added in the draft with the three values; Undo offered | setup S2, S2w |
| 1.3 | IMM 5707: minimum age 18, signed by the person; IMM 5257: signed by a parent for a minor | Rows show the new values | setup S3 |
| 1.4a | Forms library › IMM 5257 › What IRCC accepts: APR Portal, PDF upload and Paper, with the reason (Sample, FQ-2, FQ-3); the reviewer approves it in 1.9 | The library change waits for a second person | setup S4a |
| 1.4 | Channel per line: IMM 5257 PDF upload, typed name; IMM 5707 Online, typed name; IMM 5476 PDF upload, signed by hand and scanned. Try IMM 5476 Online | IMM 5476 Online is greyed with IRCC's line "Upload this form along with your online application"; the others save | setup S4, C11.6 |
| 1.5 | Account: APR Portal | Read-only "Filed through APR Portal" on every case later (FQ-1) | setup S1 |
| 1.6 | Who can be in this application: Principal applicant (P-209), Spouse or partner (travelling, 0–1), Child (travelling, 0–4), each **Files own application** | The filing mode shows on each row (M3-0) | setup S5 |
| 1.7 | Documents tab: Passport (each applicant), Proof of financial support (principal), Letter of authorization for a minor (child, only if travelling alone, FQ-4); place the question "Is this person travelling to Canada alone?" in Your visit. No medical exam line yet (VV-R16 needs a country-history question, FQ-11) | Each line shows whose it is and its condition in words | setup S6, S6a, C6.4 |
| 1.8 | Eligibility gates: travel document, no convictions; four officer's-judgement lines (money for the stay, good health, ties, leaving at the end) | Saved as data on the draft; Sample chip | setup S7, C6.9 |
| 1.8a | Fees: the dated Sample fee table with the Visitor visa and biometrics lines, each citing IRCC | Saved with its source and date | setup S7a |
| 1.9 | Submit → reviewer signs every change → approver (a different person) releases | Release 2 published; the release history shows who did each step; the studio and every case later name it the same way (G13, QA-140) | setup S8, C6.12-9a |

## Stage 2 — Open the case (M3-A, M3-B)
| # | Who does what | Expected result | Check |
|---|---|---|---|
| 2.1 | Case officer (the Sample firm's): Open a case on Visitor visa; choose the representative of record (one of the Sample firm's two, FQ-9) and the case officer; add Spouse A, Child A1, Child A2, each with a date of birth (a person added without one shows "biometrics waits for the date of birth", C6.12-21) | "Will be created as": 4 filings (one per person), one family submission, release 2; team chip "Representative · Case officer" with a Stand-in chip SI-9 | C6.11-7, C6.12-3/4 |
| 2.2 | Try to make the case officer the representative of record | Refused: "A representative of record needs a licence body and number" | C6.11-6 |
| 2.3 | Open the case header | Filings chip "Visitor visa · 4 filings"; "Filed through APR Portal" read-only; three cards: Get the information · Prepare the filing · Everything | C11.6-1, C6.12-3 |
| 2.4 | Fees panel (Prepare the filing) | Visitor visa CAD 100 × 4 = CAD 400; biometrics CAD 170 for the family (Child A1 under 14: none); each line cites the IRCC fee list | C6.12-7/8/9 |
| 2.4a | Mark Child A2 as not travelling, then travelling again | No filing or fee while not travelling, with the reason; the other people keep their filings (same ids) | C6.12-18/19/20 |
| 2.5 | Firm admin: reassign the case officer with the reason "Workload" | History line with who, when, from, to, reason; a case officer without the duty sees no Reassign | C6.11-9/11 |

## Stage 3 — Collection (M3-C)
| # | Who does what | Expected result | Check |
|---|---|---|---|
| 3.1 | Documents: Everyone ▾ | Each person's checklist: passports for all four, proof of financial support on Client A only; each line's reason on hover; Stand-in chip SI-14 | C6.4-1/3/4/5 |
| 3.2 | Answer "Child A1 travels alone: yes", then "no" | The letter of authorization line appears with its reason, then goes | C6.4-8/9 |
| 3.3 | Request Client A's passport; upload the synthetic passport | Line: Not requested → Requested → Received; nothing in the questionnaire changes on upload | C6.4-12/14, C6.5-2 |
| 3.4 | Passport section: "Fill this from documents" | Proposals for family name, given names, date of birth, passport number and expiry, each with "Document · passport, page 1" and a confidence; place of birth not proposed; "Accept all" leaves names, birth date, number and expiry to accept one by one | C6.5-3/4/5/9 |
| 3.5 | Client A (signed in as the client) had typed family name "SAMPLEDE" | One check on that fact: "The client typed a different value from the passport. Choose with a reason; both stay on record." Confirm section refused while open | C6.5-12/13 |
| 3.6 | Keep the document's value with a reason; mark the passport number "checked against the document" | Check closed; both values on record; the number shows Verified by the case officer | C6.5-15/17 |
| 3.7 | Spouse's passport with a damaged coded line | Passport number flagged "Could not read: type it", never guessed | C6.5-18 |
| 3.8 | Visit section: "Fill this from documents" on the uploaded letter of invitation (Replay; the saved read recorded once, FQ-10) | Contact name proposed, marked "Replayed", cost US$0; a live read is not offered without the founder's Go | C6.5-19/20 |
| 3.9 | Confirm every section for every person (about 56 clicks for a family of four, one per section: FQ-13 asks for a "Confirm all") | Stage 1 card: nothing left to confirm | C7.7-9 |

## Stage 4 — Case check from confirmed facts (M3-D; was Eligibility, P-236)
| # | Who does what | Expected result | Check |
|---|---|---|---|
| 4.1 | Case check page, Client A, before the passport and convictions are answered | "Can't tell yet — needs passport, convictions"; "No score yet (team's AG-03)"; disclaimer; Stand-in chip SI-1; four officer's-judgement lines. Builder's browser check: a fixture result in AG-03's shape (below cut-off, a score, a breakdown) shows with no page change (the SI-1 plug-in test) | C6.9-3/5/6 |
| 4.2 | Answer convictions "yes", Run again with a reason | "Can't tell yet — the representative reviews this" (P-230 (1): never Does not qualify on that rule) | C6.9-7 |
| 4.3 | Correct to "no", Run again | "Qualifies"; the earlier run kept, marked out of date | C6.9-8/9 |
| 4.4 | Override without a reason; then with a reason; Mark reviewed | Refused on the field; then saved beside the result; reviewer and time shown | C6.9-11/12/13 |

## Stage 5 — Filing: prepare each item (M3-E)
| # | Who does what | Expected result | Check |
|---|---|---|---|
| 5.1 | Prepare the filing, Everyone ▾ | Adults: IMM 5257, IMM 5707, IMM 5476; children: IMM 5257 only; biometrics step for Client A, Spouse A, Child A2 tagged "needed after filing"; documents from the checklist; one row vocabulary | C7.7-1…6 |
| 5.2 | IMM 5476 row ⋯ Change channel → Online; IMM 5257 → Online; IMM 5257 → Paper without, then with an accommodation reason | IMM 5476 refused with IRCC's line; IMM 5257 Online refused; Paper asks for the reason, then saves for that person only (FQ-3) | C11.6-6/8a/8b/9 |
| 5.3 | IMM 5707 (Online): open the answer sheet | Section A, B, C in the PDF's order; each answer with source and a Copy button; dates as YYYY-MM-DD; Section A includes the spouse | C7.3-3/5/6/7 |
| 5.4 | Tick "Entered in the portal" on Section A | Ticked with who and when; ticking again changes nothing | C7.3-9/11 |
| 5.5 | IMM 5707 ⋯ Download PDF copy | IRCC's IMM 5707 filled from the same facts, stamped "Copy, not for filing"; not counted anywhere; cannot be marked filed | C7.7-10…13 |
| 5.6 | IMM 5257 (PDF upload): fill → our check → download → Validate in Adobe → upload the validated copy. Copies without Adobe (G26) use the simulated validated copy `asValidated` in `acceptance/lib/m3.ts` (the copy with Adobe's incremental save appended, as `tests/runtime/check_runtime_r1d.ts` does) | Read back equal; the barcode block clears | C7.6-6/10/12 |
| 5.7 | IMM 5476 (signed by hand and scanned): print → signed → upload the scan | Steps in order (signed before print refused); Ready; "Uploaded to IRCC" refused until Ready to file | C8.1-3…11 |
| 5.8 | Child A1's IMM 5257 | Signer: a parent | C8.1-1 |
| 5.9 | Open the principal's IMM 5707 copy, "To write by hand" | Nothing the case holds is left to write by hand ("has any children" is filled); every line in plain words, no engine names; a line left by hand shows on the filing as a warning (G24, G25) | C7.7-16/17/18 |

## Stage 6 — Verification (M3-E)
| # | Who does what | Expected result | Check |
|---|---|---|---|
| 6.1 | Review tab: rules cross-checks | A passport that expires before the visit ends → one MAJOR "Rules" finding quoting both dates; fixed → resolves itself | C7.5-1/4 |
| 6.2 | "Run AI review" on IMM 5257 | Run card shows the cost first; Replay at US$0 runs (the saved run recorded once, FQ-10); live not offered without the founder's Go; findings marked Replayed with High or Low agreement; Stand-in chip SI-6 | C7.5-5…8 |
| 6.3 | Acknowledge a finding without a reason; then with one; try to waive a MAJOR | Refused; acknowledged; waive refused (CRITICAL only) | C7.5-10/11/12 |
| 6.4 | Readiness panel per filing | Blocks listed by who owes them, never a percentage: missing facts, barcode not validated, missing signature, representative's review; warnings: a missing document, open findings | C7.6-1…9 |
| 6.5 | Change Client A's family name after the uploads | IMM 5257 and IMM 5476 "Out of date: family name changed from SAMPLED to SAMPLEDZ on <date>"; files unchanged; Ready to file blocked; Undo restores | C9.2-3…8 |
| 6.6 | Representative of record: Review the filing | Block clears; "Prepared by · Reviewed by" shown; a case officer cannot review; solo firm: "I prepared and reviewed this filing myself" → Self-reviewed | C7.6-13/14/21 |

## Stage 7 — Application ready, then recorded (M3-E, M3-F)
| # | Who does what | Expected result | Check |
|---|---|---|---|
| 7.1 | Pass each remaining warning with a reason; press Ready to file | Each pass recorded; the filing reads "Ready to file" | C7.6-15…19 |
| 7.2 | Tick "Uploaded to IRCC" on IMM 5476 | Allowed now; the item is Done | C8.1-13 |
| 7.3 | Record the submission for the family group: missing number; date tomorrow; then complete | Refused on each field; then one action records every filing with its own number and each person's UCI; filings read-only | C8.2-3…7 |
| 7.4 | Record again; change a channel; correct a number with a reason | Refused; refused; number corrected with history | C8.2-8…11 |
| 7.5 | Change a fact after filing | "Filed with an earlier value" and a task to re-sign or tell IRCC (Unconfirmed: no counsel) | C8.2-12 |
| 7.6 | Demo menu › Finished story (on a fresh copy) | The same family case at application ready, loaded through the same services, US$0 | C10.2 |

**Pass:** every expected result above, no console error, axe clean on every state, keyboard only from 2.1 to 7.3, no sideways scroll at 1024 px. **Not in this journey (breadth, after Visitor visa):** the other five combinations, the employer case link (C1.3, C11.5), sponsorship pairs, waiting filings, Paper lines, client screens (after M3).
