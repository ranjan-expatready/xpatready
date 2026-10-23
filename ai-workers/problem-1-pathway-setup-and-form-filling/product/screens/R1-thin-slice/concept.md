# R1 — Thin end-to-end slice (runtime lane, P-67) · Lead concept, 23 Oct

**Job:** prove early that a released configuration drives a real case: people, answers asked once, the shared questionnaire renderer, the agent view and one checked PDF. Decisions: P-18, P-45 (as corrected by P-65), P-47, P-62 §6, P-65, P-67. Journey steps 6–7 (audit `history/AUDIT-2026-10-23.md`, capabilities C4.4, C6.1–C6.3, C7.1–C7.2 in `qa/CAPABILITIES.md`).

**Combination:** Individual › Visitors › Visitor visa, released on main (IMM 5257 is the proven form: 44/44 written and read back). Household: Sample principal applicant, spouse, one child.

## What gets built (needed for the proof)
1. **Data, mirroring the team's client spine** (`code/ERv2-sanitized@<newest>/apps/api/prisma/models/client-spine.prisma`): case pinned to one release (PackWorkPin), parties and relationships (Party, PartyRelationship), one answer per fact per person (AnswerSubject, ClientCanonicalAnswer with source, status, who, when), form instances per person and form (FormInstance). Team names; an adapter note where ours differs. Sample profiles stay scaffolding.
2. **Renderer, one component (P-47):** SQR mode (client, phone first, one group per screen, save and resume) and agent-view mode (officer, all sections, each fact with its source and the form fields it fills). Question types the visitor-visa SQR needs (text, date as day/month/year, yes/no, single choice, country, name group, address group, one repeating group); field and section validation tiers with plain messages on the field; rules as data from the release (show/hide, required, per person).
3. **Facts once:** a fact answered for a person fills every form field mapped to it; editing in the agent view updates every draft output with a message.
4. **Fill:** IMM 5257 for the principal applicant from the case's answers through the existing append-only writer; read back equal; signatures intact. Adobe Validate and barcode comparison come from the evidence lane's fill trial (P-65 gate); until IMM 5257 passes it, the output is labelled "answer sheet only".
5. **Never overwrite (P-65):** form instances have Draft · Generated · Signed · Uploaded; a changed fact regenerates Draft and Generated, and marks Signed or Uploaded "stale", never changing them. One pass and one fail test.

## Not built here
PQR (owner open: per country vs per combination) · client family link email · document upload and AI reading of documents · portal sheet and extension · submission tracking · other combinations · polish beyond the renderer's own states. All stay scheduled in M3.

## Ownership
The runtime lane owns new runtime models (migration after forms slice 1 is merged), `api/src/runtime/`, `engine/runtime/`, `web/src/runtime/` (renderer and case pages, new routes only). It does not edit Screen 01–04 pages or the forms lane's files; shared-file needs go through the Lead.

## Tests and acceptance
Each rule: one pass and one fail. Journeys: officer opens the case → client answers on a phone width → officer reviews in the agent view → fills IMM 5257 → changes a date → draft regenerates, a signed copy goes stale. The qa lane tests it like a person after merge; the founder walks it once (product-visible). No paid AI.

## Questions for the founder (≤3)
None now. The PQR owner question waits for M3 (team conflict 4 in the audit).
