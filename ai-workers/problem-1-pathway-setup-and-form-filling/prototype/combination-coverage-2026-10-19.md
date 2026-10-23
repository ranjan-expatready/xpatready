# Working prototype: which two combinations (coverage comparison)

19 October 2026 · Claude Code (the Lead) · P0, under AIW-D246 (4): the Lead chooses the two combinations that cover the most behaviour, scored in a coverage table. **Status: choice made (P0), 19 Oct.** All the chosen forms were confirmed as XFA (barcode) forms by `pdfinfo` on the downloaded files; whether they can be filled and read back is still P1's test. Cells marked "P1" remain expectations until that read. Country of residence for the made-up family: **India (New Delhi visa office)**, a scenario setting. Production values still need the specialist (D50). Legal: Unconfirmed: no counsel (AIW-D94).

## Official facts this rests on (read 19 Oct 2026, canada.ca)

| Fact | Source (page details date) |
|---|---|
| Work permit from outside Canada: all applicants include IMM 1295; the kit also lists IMM 5488 (checklist), IMM 5707, IMM 5409 "if it applies", IMM 5476 "if it applies", IMM 5475 "if it applies" | Guide 5487 (2026-10-06); forms and documents page (2026-07-17) |
| Online work permit applications go through the IRCC secure account; paper only for three listed situations | Work permit, submit your application (2026-08-28) |
| IMM 5257 is needed "in the IRCC secure account or on paper", **not** "in the IRCC Portal" | IMM 5257 page (2026-10-06) |
| IMM 5707 "must be filled out by each person, 18 years of age or older" applying for a visitor visa, or a study or work permit from outside Canada | IMM 5707 page (2024-06-21) |
| The visitor visa guide asks for "the Family Information form (IMM 5707 or IMM 5645)" listed "in the application package for your country"; the work permit guide lists IMM 5707. **IMM 5645 is a separate form, not an older edition of IMM 5707** (corrected 19 Oct, D257). For India: IMM 5905 E (03-2026) and IMM 5881 E (05-2026) both require IMM 5707 | Guide 5256 (2026-03-31); Guide 5487; New Delhi files in `../official-sources/ircc/` |
| Spousal sponsorship: IMM 0008, IMM 5669 and IMM 5406 are completed in the online portal; IMM 1344 and IMM 5532 are PDFs | Guide 5289 search result, not yet read in full |

**So conflict row 14 is settled for the prototype:** the family-information form is **IMM 5707** (Lead-verified from official sources (prototype only); not specialist-confirmed). **New limitation found:** applicants on the IRCC Portal fill web forms, not these PDFs. The prototype demonstrates the secure-account and paper route only; the portal route stays the spine's 1.2 path, "Not in this demonstration".

## Candidates and behaviour covered

1 = covered · 0 = not covered · P1 = expected, confirm when the form is read · n/d = not demonstrable in this prototype.

| Behaviour the prototype must show (§5.1, §11, case-types table) | A. Work permit, outside Canada: Client A, common-law partner, child aged 9 | B. Visitor visa (IMM 5257) for Client A's mother, after A | C. Study permit, outside Canada, for the partner, after A | D. Spousal sponsorship from outside Canada (family class) | E. Express Entry (points-based, stages) |
|---|---|---|---|---|---|
| Several people, roles and relationships on one case | 1 | 0 (one applicant) | 0 | 1 (sponsor + applicant) | 1 |
| Fields about others: the right person and relationship | 1 (IMM 5707: partner, child, parents) | 1 (IMM 5707 about her own spouse and children, including Client A) | 1 | 1 | n/d |
| Repeated rows in order | 1 (children; IMM 1295 history: P1) | 1 (children; employment "past 10 years", Guide 5256) | 1 | 1 | n/d |
| Conditional form or document | 1 (IMM 5409 if common-law; 5476/5475 if they apply) | P1 (checklist conditions) | 1 | 1 | n/d |
| One form per person who must complete it | 1 (IMM 5707 per adult) | 1 | 1 | 1 | n/d |
| Barcode (XFA) PDF filled and read back | P1 | P1 | P1 | P1 (IMM 1344, 5532; the rest are portal forms) | 0 (portal only) |
| **Reuse:** form editions and maps reused unchanged; no second review of unchanged items (D233) | n/a (first) | 1 (IMM 5707, 5476 reused) | 1 (IMM 5707, 5476) | Partial (IMM 5409, 5476; different family) | 0 |
| **Reuse per fact:** a fact verified once is not asked again | n/a | 1 (Client A's and the children's facts; the mother's facts first recorded as "fields about others") | 1 (partner's facts) | 0 (different family unless contrived) | 0 |
| A new person created from facts already held about her, with a duplicate check | n/a | **1 (only B)** | 0 | 0 | 0 |
| History rule to check (D253) | P1 (IMM 1295 history section) | 1 (Guide 5256: employment past 10 years) | P1 | 1 (IMM 5669, but a portal form) | n/d |
| Second party (sponsor or employer) | 0 (no LMIA forms in the kit) | 0 | 0 | 1 | 0 |
| Needs the scoring engine or stages, not in the spine (conflict row 16) | No | No | No | No | **Yes: excluded** |
| Fully demonstrable with PDFs the prototype can fill | Yes (P1) | Yes (P1) | Yes (P1) | **No**: three of five forms are portal web forms | No |

## Choice

**Combination 1: A.** It covers the most on its own: several people, fields about others, a conditional form, one form per adult, and the D229 forms. Two family variants test the conditions: common-law versus married, and with versus without a child.

**Combination 2: B, the visitor visa for Client A's mother.** Of the pairs with A, **A + B** adds the most behaviour the prototype can actually run:

- reuse of form editions and maps;
- reuse per fact;
- the one case no other pair covers, a new person built from facts already held about her, with a duplicate check;
- a history rule stated in an official guide.

**A + C** mostly repeats A. **A + D** adds a second party and two-party signing, but three of its five forms are portal web forms the prototype cannot fill or read back, so its extra coverage would be simulated. D stays a strong candidate for a later demonstration and for the ten-combination set (D222). E stays excluded until the scoring engine and stages exist (row 16).

This keeps the proposal's §5.3 choice but changes its person: the applicant becomes Client A's **mother**, not "a member of the same family" already on case A. That adds the new-person test. Final after P1 confirms the "P1" cells.
