# Expected answers (answer key) for the working prototype

19 October 2026 · Claude Code (the Lead) · AIW-D246 (4), prototype-only exception to D50. Every value here is labelled exactly **"Lead-verified from official sources (prototype only); not specialist-confirmed"**. Production values still need the specialist. Legal: Unconfirmed: no counsel (AIW-D94).

## Independence rules (D246; proposal §8)

1. Prepared only from the official files in `../../official-sources/ircc/` (hashes in its `manifest.json`), never from a draft configuration, an AI drafting run or the prototype's output.
2. **The drafting run never reads this folder.** The P2 run uses an explicit input list of official files, and this folder is never on it. The P2 evidence must show that input list.
3. A change needs a new official citation, a recorded reason and the independent reviewer's check.
4. `../tests/check_expected_citations.py` verifies every citation. The cited file must match the manifest hash, and every quoted part must occur in that file's text. Result on 19 Oct: **23 of 23 citations found**.

## What P0 contains, and what it does not

| File | Contents |
|---|---|
| `combination-1.json` | Work permit, outside Canada. Client A, a common-law partner and a child aged 9; country of residence India (New Delhi visa office). Per person: which forms apply and under what condition, documents, and the employment-history rule. Variants: V1 married, V2 no child, V3 a background "yes" |
| `combination-2.json` | Visitor visa, outside Canada, for Client A's mother. Forms, documents, the history rule ("Do not leave gaps"), and the reuse expected from combination 1 |
| `source-text/` | Text derived from the official files (XFA template text, or pdftotext), each headed with its source hash. Derived evidence for reading, not official files |

**Not yet here:** field-level expected values. They need P1's field inventory of each form edition, and each will cite its form field. **Open items** are listed inside each file. Examples: whether IMM 5476 is one per applicant or one per application; the partner's and child's permit types are scenario settings, not eligibility findings.

## Corrections recorded

- IMM 5645 is **not** an older edition of IMM 5707. It is a separate family-information form that some country packages list instead (for example Algeria's instructions, per a search result not downloaded). For India, both New Delhi files read on 19 Oct require **IMM 5707**: IMM 5905 E (03-2026) for work permits and IMM 5881 E (05-2026) for visitor visas. The approval request's earlier wording is corrected in its own file.

## Corrected keys v2 (20 October 2026, after the P2 live runs)

The originals above are **unchanged** and still score the original results (`tests/score_p2.v1.ts`). The corrections the independent reviewer accepted (Codex, 08:23:05Z) are in **new, versioned files**, built by `../tests/make_keys_v2.py`. The script rebuilds each file from v1 and checks every quoted passage against the hash-verified official file, using the PDF's raw XFA template with scripts kept, or the web page's visible text. These are **evaluation corrections**, recorded separately from model output. Each file lists its `changes` with reason, acceptance, citation and before/after. The label is unchanged: "Lead-verified from official sources (prototype only); not specialist-confirmed".

| File | Change |
|---|---|
| `slice-1-field-map.v2.json` | **D11:** the IMM 1295 marriage date is the visible `DateOfMarriage` input, a YYYY-MM-DD date. Its exit script fills the three invisible `MarriageDate.From*` helpers, which are kept as form-calculated boxes. The date is one relationship fact of the couple. Every entry also carries an exact expected transformation (`expect`; P2-M1) |
| `combination-1.v2.json` | **D19:** IMM 5707 applies to those aged 18 or older or a minor travelling alone; eight cases, and an explicit not-alone setting for the child. **D20:** IMM 1295 is filled by each person applying for a work permit from outside Canada; `scenario.applications` names Client A and the partner |
| `fact-aliases-c1.json` | Which draft field definitions mean each key fact, decided from each definition's own words, never from the boxes it fills (P2-M1). Built by `../tests/make_fact_aliases.py`. An unlisted definition never counts as correct |

**D12** is resolved as metadata, not a key change. The configuration keeps the package edition (09-2023, from the manifest), the form's internal identifier (`IMM1295_06-2018`) and the SHA-256 as separate facts (`p2/assemble.ts` v2). Rule 3 applies to every v2 change: the independent reviewer checks it.
