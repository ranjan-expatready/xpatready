# Form-mapping solution check: is "canonical fields + AI-drafted, approved connections + rules fill" the right design?

Version 1.1 · 17 Oct 2026 · Lead (Claude Code, AIW-D204). Asked by the founder on 17 Oct: "we are not normalizing the data… if there are 65 forms and form X is required on the agent screen, how will forms be mapped and shown?… I don't want to find later that my recommendation was bad." Sources are the team's requirement snapshot of 13 Oct 2026 (Unverified after that date, AIW-D207) and the team's code capture `ERv2-sanitized@b48e4ce` (15 Oct). The Lead re-checked the three load-bearing code facts by hand (box address, single-person fill, XFA refusal). Sections 1 to 6 report sources. Section 7 is the Lead's assessment. Nothing here changes a founder decision.

## 1. The answer in one line

**The data is already normalised.** The team's design has one global library of canonical fields, and every answer is stored once per person. Government form boxes are mapped onto those fields. That is the "normalise, create canonical fields and sections, then map the government forms" option, and it is the chosen design. AI changes **who drafts** the fields and connections. It does not change **whether** we normalise. **Each applicant gets their own copy of the forms that IRCC asks each person to complete** (correction 1.1, from the founder): the principal applicant, the spouse or common-law partner (accompanying or not) and each dependent child aged 18 or over each complete IMM 5406 and IMM 5669, while IMM 0008 is one per application, filled by the principal and listing up to five dependants (more on IMM 0008DEP). Sources: [IMM 5406](https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm5406.html), [IMM 5669](https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm5669.html), [IMM 0008DEP](https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm0008-dep.html), checked 17 Oct 2026; program checklists differ on edge cases (for example children already permanent residents or citizens), so the specialist confirms each rule (D50). The team's design already assigns forms per person by role, and the filler fills one person's copy at a time. **The real weakness is narrower:** a box inside a copy that describes *another* person (a dependant on IMM 0008; a parent, sibling or child on IMM 5406) and extra history rows cannot be addressed today.

## 2. The team's canonical model (sources)

| Element | What it is | Source |
|---|---|---|
| CanonicalField | "the single owned, GLOBAL, versioned, country-neutral vocabulary": key, type (string, number, boolean, date, list, composite), validation, scope (client or case), whose fact (principal, spouse, dependant, organisation), re-confirm rule, privacy flag | Doc-1 §5.3; code `packages/contracts/src/schemas/pack-domain-bodies.ts` (`CanonicalFieldBodySchema`) |
| One library | One per country plus neutral rows, shared by every combination; not one per pack | code `pack-domain-registry.ts` (`canonical-fields`, `countryScoping: DIRECT`) |
| Stored answers | `ClientCanonicalAnswer`: one row per firm, person and field; append-only; source, DECLARED or VERIFIED, verified by | Doc-1 §5.3; `client-spine.prisma` |
| Repeating facts | `ClientFactRecord` / `ClientFactValue`: employment history, prior addresses, family members | Doc-1 §5.3 |
| Case-only difference | `CaseAnswerOverride` | Doc-1 §5.3 |
| What forms read | `CanonicalAnswerProjection`: a derived view over current answers, not a table | Doc-3; AG-8-17; ADR C2-D4 |
| Sections | `LogicalSection` → `SectionQuestion` bound to a field key (built). Field groups, placements and "purposes" specified, not built | Doc-1 §5.5; SA-1B-6 to SA-1B-12; SA-01B §12 |
| Missing from the field record | Plain meaning, approved label aliases, tier flags | `CanonicalFieldBodySchema` (D170 asks for meaning and labels) |

## 3. PQR, SQR and the lead form over the same fields

- **Specified:** a tier flag per field: lead, prospect or case (SA-1B-2). One PQR per country, made of blocks (SA-1B-77). SQR is "everything that applies to the filing" (SA-1B-82). "Each tier pre-fills the next, and no question is asked twice" (SA-1B-83).
- **Built:** the PQR is a subset list of SQR field keys (`spine-masters.ts`, `SqrSectionSelection.pqrCanonicalFieldKeys`). "Ask only what is missing" is a self-declared thin slice (`capture-once-resolver.service.ts`). There are no prospect tiers yet (SA-01B §12).
- **Conditions:** one rule language (equals, not equals, in, comparisons, exists, and, or, not), scoped by whose fact it is and checked at publish (Doc-1 §5.13.1; `predicate.ts`).
- **Stale team text:** AG-08 v1.7 still describes a firm questionnaire builder. Doc-3 overrides it.

## 4. How a government form is connected today

- **Entities:** `GovFormDef` → `FormEdition`, which holds the parsed box inventory → `FormFieldMap`, whose entries are `{canonicalFieldKey, formFieldId}` (Doc-1 §5.7).
- **Format changes:** only date, decimal, code list and joined text (`FieldTransformSchema`, verified). A code-list miss refuses rather than guessing.
- **Specified but not in code:** each box points at "purpose plus field" with a value map and "overflow handling" (SA-1B-27). The code has no purpose, no person or row selector, no split, no letter case and no overflow.
- **Box inventory:** reads name, type, required, maximum length and options for each box (`pdf-acroform-inventory.ts`).
- **XFA (IRCC barcode forms):** both the inventory reader and the filler refuse them (`pdf-acroform-inventory.ts`; `pdf-form.adapter.ts` returns UNSUPPORTED_TEMPLATE). FD-5 promises a "FormFieldMap visual editor" and a flattened-overlay fill, and Doc-2 has `fillMode ACROFORM | FLATTENED_OVERLAY | XFA_DEFERRED`. **The code has neither `fillMode` nor an overlay (0 hits, verified).**
- **Forms per person:** person roles are pack content (principal applicant, spouse or partner, dependent child, sponsor, co-signer, employer; SA-1B-72), and a person's items are their row's lines filtered by their role (SA1B-D10). In family cases each applicant carries their own documents and forms (AG-07 family cases; AG-7-4).
- **Filling one person's copy:** the filler renders from one person's snapshot (`pack-filler-bridge.service.ts`, single `partyId`, verified) and rejects a duplicate field key. That fits per-person copies. **It cannot yet fill boxes about another person inside a copy (IMM 0008 dependants; IMM 5406 relatives) or extra history rows.**
- **Who authors maps:** "the SME supplies the mappings as pack content" (AG-07 §3.5). AI may draft a box map for a person to approve (SA-1B-33), but box maps, filling, the editor and SA-1B-33 are parked because "mapping now means mapping twice" (SA1B-D28).

## 5. How "form X" reaches the agent screen

- **Specified:** a "form review view (fields with mapped values + provenance, override inline…)" (AG-07 §3.5). Each box shows filled, needs review or unmapped (SA-1B-29). Only verified values fill a box; an unverified one shows "unverified — verify to use".
- **Frontend today:** a mock list of boxes with value, source and a per-box override (`form-review-page.tsx`: "Mock UI: generating makes no real PDF").
- **Neither shows the form's own layout or a PDF preview.**

## 6. Scale, risks and conflicts with our decisions

**Scale.**
- **No form count is meaningful yet.** The founder confirmed that any figure (65 or 165) was arbitrary: there may be any number of government forms. The design must work for n forms; setup effort grows only with boxes not seen before, never with the number of cases. No canonical-field estimate exists.
- Which forms are mapped for Release 1 is open (SA-01B P2).
- The only reuse statement is qualitative: values are "drawn once and reused across every form" (AG-07).

**Team-recorded risks.**
- Nothing can start while maps are parked (COMPLEXITY-REGISTER).
- A new PDF edition missing mapped fields cannot publish until it is remapped (SA-01-04).
- Still open: the unmapped-value warning (SA1B-Q6), how filled forms reach staff given XFA (P1), and the Filler's release scope (AG-07 §13 item 22).

**Where the team design and our decisions disagree**

| # | Our decision | Team design or code | Goes to |
|---|---|---|---|
| 1 | AI drafts connections, nobody maps by hand (D169, D197) | SME supplies maps; a visual editor promised (FD-5); AI drafting parked (SA1B-D28) | The team (SA-01B message) |
| 2 | Fix the shared fact, never the box (D181) | Per-box or form-level override (AG-7-23; frontend) | The founder and the team |
| 3 | Agent view laid out like the form (D181) | A list of fields (AG-07; frontend) | The team, M2 |
| 4 | A rare form can be filled on first use with box-by-box review (D174) | Every form needs a current edition to start (SA-1B-90); code raises `FormMasterUnavailableError` without a pinned map | The founder and the team |
| 5 | A fourth "staff only" tier (D180) | Three tiers (SA-1B-2); our change is still a proposal (CN-SA-01B change 9) | The team |
| 6 | Plain meaning, approved label aliases, dated lists on each field (D170) | Not in `CanonicalFieldBodySchema`; purposes not built | The team, M2 |
| 7 | SQR asks the fewest questions (D177) | SQR is "everything that applies" (SA-1B-82) | The team |
| 8 | Household facts linked to both spouses (D184) | No household subject in `AnswerSubject` | The team, M2 |
| 9 | Portal screens connected like PDFs (D186, D197) | No portal-screen master; `FormEdition` is PDF-only | The team |
| 10 | AI reads the form's own show/hide logic (D183) | XFA refused at upload; overlay (FD-5) and SA-01B P1 disagree | The team (XFA route) |

## 7. Assessment (Lead judgement, not a source)

### Four ways compared

| | **Chosen:** canonical fields, AI-drafted and approved connections, rules fill | **Hand-built:** normalise and map everything by hand | **Per form:** store answers per form, no canonical layer | **AI fresh:** AI fills each form at each fill |
|---|---|---|---|---|
| Quality | High: the same output every time, traceable per box | Same at runtime; human slips at setup | The same fact drifts between forms | Not reproducible; values not traceable |
| Setup effort | AI drafts; people check only new or unsure matches | Highest: every box of every form by hand | Low at first, grows with every form | None up front |
| Cost per case | About zero (no AI call to fill) | About zero | Staff re-key the same facts | AI calls and full review on every fill |
| Effectiveness | Asked once, filled everywhere; a new edition re-matches only changed boxes | Same, slower to change | "Ask once" fails | Different answers on different days |
| Verdict | **Keep** | Same data model, more labour | Reject | Reject (D197) |

### Where it can still fail, and the fix

| Failure | Status | Fix (Proposal for M2) |
|---|---|---|
| Same label, different meaning (home versus mailing address) | Purposes specified, not built | Bind boxes to field plus purpose. A known label is reused only in the same form context; otherwise a person checks it |
| Which applicant completes which form | Sound in design: forms per person by role (SA1B-D10, SA-1B-72); one person's copy per fill | Add a "who completes it" rule per form line (age, accompanying, already PR or citizen); values from the specialist (D50) |
| A box about another person inside a copy (IMM 0008 dependants; IMM 5406 parents, siblings, children) | **Not supported in code: the biggest gap** | Give every connection a relationship to the copy owner plus a number: spouse, child 2, mother |
| More history rows than the form has | Specified, not built | A row index on each connection, plus an overflow rule: continuation sheet or flag, never cut silently |
| Code lists ("South Korea" versus "Korea, South") | Sound: the code-list format refuses a miss | AI pre-matches values from the box's own option list; a person approves once |
| A box with a split format (year, month, day) or a letter case | Not in code | Add split and letter-case formats |
| New form edition | Sound: pinning, advisory and successor maps | AI lists only changed boxes (SA-1B-33) |
| XFA barcode forms | **Decides whether launch fills anything** | The team picks a route (XFA data packet, data-file import or overlay) and a date. The connections stay reusable whichever route wins |

### The proposed box address

`copy owner (one applicant, or the application) × whose fact relative to the owner (self, spouse, child 2, mother) × field (or group.field) × purpose × row number × format × overflow rule`, plus a "staff enters" source for boxes no client fact supplies.

With that address, **"form X on the agent screen" is a rendering job:**
1. Rules decide which copies exist: one per applicant who must complete the form, or one per application.
2. Read the edition's box inventory in its own order.
3. Resolve each box through its connection to one confirmed fact about the right person.
4. Show each applicant's copy as its own tab: value, source, status and the fact to fix.

A fix on the fact re-fills every form that uses it (D181).

### Recommendation

**Keep the chosen design.** Before M2 sizes the work:
1. Add the box address and the purpose layer to the team's schema.
2. Settle the XFA route (P1).
3. Add a "who completes it" rule to every form line, and count real boxes and unique facts for the first combination before quoting any form or field count.

## Change log

- 17 Oct 2026, v1.1: corrected after the founder's challenge. Forms are completed per applicant (canada.ca sources added); the gap is boxes about other people inside a copy, not per-person filling. Form counts treated as n.

- 17 Oct 2026: first version, from a read-only check of the 13 Oct snapshot and the 15 Oct code capture, with three code facts re-verified by the Lead.
