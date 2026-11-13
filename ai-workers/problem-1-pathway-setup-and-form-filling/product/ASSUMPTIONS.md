# Assumptions register — immigration values we build on until they are finalized (P-170, P-171)

Owner: the Lead. **One list of every immigration value the product uses that is not yet final**, with its basis, a confidence score and what changes if it is wrong. The founder (and the immigration expert through the founder) finalizes rows in batches: send the row numbers with "confirmed" or the correction; the Lead updates the row, the decision and the code owner in one pass. Every `/lead` reads this file at a Lead check and adds a row the same day any new Sample value is decided.

**Confidence** = how likely the rule is right as built, judged on the source: **95** official page opened and quoted by the Lead · **85** official page opened by research, not yet re-opened by the Lead · **70–90** founder's rule where IRCC is silent, scored on the logic and how safe the default is · **≤65** inference or conflicting signals. **Impact if wrong:** Low = data change only · Medium = a rule or screen changes · High = a filing could be rejected.

## Score today: 83 / 100 (weighted by impact: High 3, Medium 2, Low 1)
Sourced facts 90 (12 rows) · founder rules where IRCC is silent 82 (6 rows) · older Sample values from setup 69 (7 rows). (Was 81 before B6 was corrected from the Express Entry completeness check.) The weakest rows (B3, B6, C3, C6) are cheap to change (data or one rule); none blocks building.

## A. Sourced facts (sources: `screens/W1-baseline/immigration-facts-2026-10-29.md`)
| # | Rule in the product | Basis | Conf. | Impact if wrong |
|---|---|---|---|---|
| A1 | Visitor visa schedule is IMM 5257 SCH1, edition 09-2023 | Form PDF, Lead-checked | 95 | Low |
| A2 | Spouse or partner sponsorship: online in the PR Portal; principal applicant submits both applications; paper only as an accommodation | Apply page, Lead-checked | 95 | Medium |
| A3 | Always Validate barcode forms; online: e-signature by name + security question, never print; paper: sign in pen, barcode page on top | Help Centre 1523, Lead-checked | 95 | High |
| A4 | Police certificate for the current country no older than 6 months at submission | Police certificates page, Lead-checked | 95 | High |
| A5 | Visitor visa CAD 100 per person, family maximum CAD 500 (5 or more, same time and place); biometrics CAD 85, CAD 170 for 2 or more; no family cap on extensions, study or work permits | IRCC fee list, Lead-checked (fees change: re-check yearly) | 90 | Medium |
| A6 | Express Entry: police certificates and medical exams for the spouse and dependants 18+, **including non-accompanying**; missing = rejected as incomplete | EE completeness-check bulletin, Lead-checked 29 Oct | 95 | High |
| A7 | Channels: visitor visa, study permit, work permit inside Canada and Express Entry online; paper only for named exceptions; LMIA through LMIA Online | Apply pages (research) | 85 | Medium |
| A8 | Citizenship: a representative completing and submitting means paper; a family's paper applications go in one envelope, all returned if one is incomplete | Citizenship how-to page (research) | 85 | Medium |
| A9 | Visitor visa: each person completes IMM 5257; IMM 5707 for each person 18+, covering spouse and all children | IMM 5707 page (research) | 85 | Medium |
| A10 | Spouse in Canada: open work permit applied for after the AOR, separately, not in the PR Portal | Open work permit page (research) | 85 | Medium |
| A11 | Provincial nomination is a separate step with the province before the PR application; nomination listed as a document | Nomination and EE documents pages (research) | 85 | Medium |
| A12 | Translations by a certified translator (affidavit only when none can), with the original | Help Centre 039 (research) | 85 | Low |

## B. Founder's rules where IRCC is silent (P-171)
| # | Rule in the product | Why it is safe | Conf. | Impact if wrong |
|---|---|---|---|---|
| B1 | Validate last; any change after it marks the validated copy out of date and asks again | The barcode encodes the values; a change makes it stale. Never wrong, at worst one extra click | 90 | Low |
| B2 | IMM 5409: oath place, date and commissioner's part stay blank | Filled by hand at the declaration; leaving blank is never rejected | 85 | Low |
| B3 | Provincial nominee, Express Entry: IMM 5669 and IMM 5406 are Online lines (answer sheet, no PDF) | Signals conflict: the EE page lists them nowhere as PDFs, and a guide says EE built them into its questionnaires; not confirmed on an official page | 55 | Medium (one combination, two lines; data change) |
| B4 | Sponsorship and PR are two filings in one submission group, each with its own number box | IRCC calls them two applications; an empty second box costs nothing | 90 | Low |
| B5 | Accompanying child of a student or worker: "will this child study 6 months or more?" decides a study permit filing; no age rule | Mirrors IRCC's 6-month rule exactly; avoids an invented age threshold | 85 | Medium |
| B6 | Non-accompanying member 18+: police certificate (and medical) **required, not waivable, for Express Entry** (a hard block, P-172); waivable with a reason for other PR programs until their pages are checked | A6 for Express Entry; other programs unchecked | 90 | High |

## C. Older Sample values from setup (decided before 29 Oct; to verify the same way)
| # | Rule in the product | Basis | Conf. | Impact if wrong |
|---|---|---|---|---|
| C1 | Filing mode per role for the 6 combinations (who files their own application) | P-135, Lead from IRCC filing units research | 65 | Medium |
| C2 | Structure names for the 6 combinations | P-112, from IRCC naming | 85 | Low |
| C3 | Document rules per combination: copies, translation, validity window | Sample on the checklists (board v2) | 55 | Medium |
| C4 | Forms per combination (official files saved 27 Oct, 28 of 29) | canada.ca checklists | 85 | Medium |
| C5 | Fee lines per role and mode (whose filing, who pays) | P-135, Sample | 65 | Medium |
| C6 | Eligibility gates per combination | Sample; stand-in SI-1 until AG-03 | 50 | Low (stand-in) |
| C7 | Sponsor is a person on the same case as the applicant | TAXONOMY row 10; A2 supports it | 75 | Medium |
| C8 | Eligibility disclaimer default wording (C6.9 BR-6): "Indicative only. This check compares the answers on file with this application's rules as at the date shown. It is not a guarantee of approval: an IRCC officer decides, including on money, health, ties and leaving Canada." | Sample (AG-03 §13 Q5 leaves the wording to the SME); Unconfirmed: no counsel | 60 | Low (text on the release) |
| C9 | Visitor visa gates: travel document = passport number and expiry answered; convictions = IMM 5257's criminal-history question answered no; money, health, ties, leaving are the officer's judgement (C6.9, setup S7) | VV-R01 list quoted in `compliance-trace.md` (page date 2026-08-28); canada.ca not reachable from the cloud session on 2 Nov, not re-opened; conditions Sample | 65 | Medium (a gate reads wrong). **Over-reach risk (C6.9 challenge M4):** "Has a valid travel document" is met by an expired passport on file (no expiry check; the page shows the date); "no convictions" reads IMM 5257's wider question (committed, arrested, charged or convicted), so an arrest with no conviction reads Not eligible; IRCC may still decide on criminality (rehabilitation, permits). Unconfirmed: no counsel; for the immigration expert |
| C10 | Facts a checklist's document conditions read, proposed with the lines (B82, QA-233): person.biometrics_required, person.holds_valid_us_nonimmigrant_visa, person.residence_differs_from_citizenship (and, for the visa-office lines a person decides, person.is_minor, person.travel_companions): their names, meanings and answer types, and "residence differs" being answered by a person rather than worked out from two countries | Sample: the saved AI reading of IMM 5484 (05-2026), each resting on the checklist's own words for its line; a person checks and a second person approves. Unconfirmed: expert | 55 | Medium: a wrong meaning shows the wrong document to a client; no release carries one unapproved |
| C11 | Facts a document read by AI vision proposes (QA-352, P-437; library data `prototype/studio/samples/document-supplies-read.json`, PR #1444): proof of financial support → the funds for the stay (`case.funds_available_cad`, read for the application); marriage certificate copy → the date of the marriage or union (`relationship.union_start_date`, about the holder). A minor's birth certificate stays read by a person (P-134 identity list) | Sample: IMM 5484 (05-2026) page 1 asks for each document in its own words (quoted in the file, read 2026-11-09). That the document shows each fact is our reading, not IRCC's words. The sample loader proposes each set as the author, and a second person approves it. Unconfirmed: expert | 70 | Low: a value read is only a proposal. Staff tick it and confirm it per document (P-242, P-243), and a typed answer that differs opens a check |
| C12 | The Study permit's Sample case (BK-12, P-448; `prototype/studio/samples/sample-cases.json` `sp.outside`, answers `samples/sample-student-answers.json`): one made-up student applying from outside Canada (Student A, Sample), with made-up school, dates, costs, funds, passport and birth details. Opened only by Demo's `POST /api/demo/sample-case`, never filed | Made up for the demo (11 Nov); no value is an IRCC value; every name is labelled Sample | 95 | Low (demo data only; a wrong value shows on a Sample case, never on a client's) |

## How a change comes in
The founder sends: row numbers + "confirmed" or the correction (and its source if one exists). The Lead updates the row (basis, score), records a decision when a rule changes, routes the code change to the owning lane, and re-scores the top line.
