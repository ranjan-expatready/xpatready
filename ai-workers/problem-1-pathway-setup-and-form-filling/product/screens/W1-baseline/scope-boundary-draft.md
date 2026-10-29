# Scope boundary — draft for the founder, chunk by chunk (29 Oct, research only)

**Status: a draft that proposes and asks. Nothing here is decided.** Rule (P-166): every chunk is **ours, built production grade, until the founder decides otherwise**. Every "Recommendation" below is marked *recommendation, not decided*. Founder's own words for the target: a mid-level boundary, decided chunk by chunk, then recorded by the Lead.
**How it was made:** our side from `qa/CAPABILITIES.md` (C rows), `WAVE-1.md`, `BACKLOG.md` (B items), `STAND-INS.md` (branch `origin/lead/2026-10-29-m3r5`), M3 concept r5b. The team's side from `sources/drive-snapshot-2026-10-19-1233` (read only): Docs 1–4, the agent Overview and Scope Index, SA-01 / SA-01B in detail, AG-07 ch.5, AG-08 / 09 / 11 / 15 module indexes, SA-02…SA-12 headers. **Not every requirement was read**; where I saw only an index line I say so. "SA-1B-n" = the team's Super Admin content-pack requirements; "AG-n" = Agent console modules; "CP-n" = Client Portal modules.
**Already decided, not asked again:** PQR, SQR, client portal are ours (P-166); M3 stand-ins SI-1…SI-10 (P-164/165): eligibility (AG-03), AI form review on the Visitor visa only (AG-11), firm/users/case team Sample minimum (AG-01, AG-07), employer link (AG-17).

## Chunks with no overlap found (plainly ours — nothing to decide)
- Demo: reset, load the sample (6 combinations), finished story (C10.1–10.2, C11.7, B35); workspace snapshots (B48, P-160).
- Second-person check that an uploaded IRCC file really comes from canada.ca, with the approved-checksum list (C2.3, P-80) — no equivalent found in the files read.
- Test and build tooling, coverage floor, plain-words error map (B31–B33, B36, B32); one "Ask" panel that explains and finds (B47, P-159) — AG-10's Writer is a different thing (client messages).

## A. Super Admin configuration and its backend
**A1 Programs and combinations** — *Ours:* five-level structure, combination cards, Start setup, "Who can be in this application", roles/filing mode (C1.1–1.5, C11.3, C11.10, C11.12, C11.16–17; W1 S1–S3, S5). *Team:* SA-1B §4–7 (SA1B-D2–D10, SA-1B-50–76), SA-1 §3 (tree, SA-1-11/60). *Overlap:* the team specifies the same Pathway › Program › Category › Sub-category rows, one-row-per-combination lines and person roles; SA-1B is largely "not built" in their code.
**Question:** keep ours production grade, consume the team's configurator, or defer? **Recommendation, not decided:** keep ours — it is the thing this POC exists to prove, and it already follows SA-1B's shape.

**A2 Draft, review, release, roll-back** — *Ours:* submit → expert ticks → different person approves; one To review page; Retire/Undo (C5.1–5.3, C11.9; B9 adopt-an-update, B48 snapshots). *Team:* SA-1 container (draft → review → approve → publish, rollback, firm pinning and adoption, §3.12 second person); SA-6 roles (Content publisher). *Overlap:* the same maker/checker and publishing lifecycle; theirs also has firm-side adoption and roll-back.
**Question:** keep ours / consume their container with a stand-in / defer roll-back and adoption? **Recommendation, not decided:** keep ours for author-side review (built, works); defer firm adoption and roll-back to the team's container, with a stand-in chip — those are the firm-facing half.

**A3 Form library and editions** — *Ours:* Forms page, upload checked on number + edition + checksum, IRCC accepts per edition, retire (C2.1–2.4, C3.12, C11.2, C11.11, C11.15, C11.18; S4). *Team:* SA-1B §3.5 master forms and editions; SA-1-75 form mappings at launch; AG-7 ch.5 "Form library and editions (admin)". *Overlap:* one library of government forms with editions, described in both places.
**Question:** keep ours, or consume the team's form library? **Recommendation, not decided:** keep ours — editions and channels are the base of every form feature we already built.

**A4 Shared library (fields, sections, document types, answer lists)** — *Ours:* aliases and reviewed merge, retire, rename, library lists, drawers (C3.5–3.7, C3.13–3.15, C11.13–11.14; S6). *Team:* SA-1B §3.1–3.4 (SA-1B-1–5 canonical fields, answer lists, SA-1B-11 field groups, sections, master documents), SA-1-17. *Overlap:* the same "defined once, reused everywhere" catalogue.
**Question:** keep ours / consume / defer? **Recommendation, not decided:** keep ours; it is the spine for forms and questions (the team's field catalogue is mostly not built).

**A5 Rules, gates, reference tables, government steps, fees, regulator setup, country notes** — *Ours:* checks and validator only (C3.8, C3.14); gates with Sample values pulled into M3 (C6.9); the rest planned (B16–B19, B38–B46, B14). *Team:* SA-1B §3.6–3.10 (rules, gates, scoring, reference tables, government steps with deadlines, regulator setup, country-specific requirements), SA-1-68–74 (letters, deficiency library). *Overlap:* large; we mostly have not built it.
**Question:** which parts do we build production grade, and which do we leave to the team? **Recommendation, not decided:** keep rules-as-data and reference tables ours (the engine needs them); ask separately for government steps and fees, since AG-07 ch.8 and ch.11 also read them.

## B. AI (finder, drafting, document reading, review)
**B1 AI proposals for setup** — *Ours:* form finder (canada.ca only), AI field maps, drafting of sections/documents/rules/PQR picks, draft + independent checker round (C2.12, C3.1–3.4, C4.7, C4.11, C11.2, C11.13–14; W1-06, W1-10, S6; B37, B45). *Team:* AG-11 lists a "Finder" among its executors (index line only; its card not read); AG-11 Writer and Checker are for firm messages and cross-checking documents. SA-1 / SA-1B give authoring tools, not AI drafting of pack content (none found). *Overlap:* little; possible overlap with the Finder.
**Question:** keep ours production grade? **Recommendation, not decided:** keep ours; before building more, ask the team what their Finder does.

**B2 Reading uploaded documents (Reader)** — *Ours:* passport lines by rules, printed pages by Textract, letters by AI vision, staff verify (C6.5; M3-2, M3-10; P-133, P-142). *Team:* AG-11 AG11-D4 Reader (identity, IRCC letters, language tests, ECA reports; proposals with provenance), AG-9 classification, AG-18 import. *Overlap:* direct — same job, same "proposed until a person confirms" rule.
**Question:** keep ours / consume the Reader with a stand-in / defer? **Recommendation, not decided:** keep ours on Sample documents, shaped like AG11-D4's output (value, provenance, confidence) so theirs can replace it.

**B3 AI review of a filled form (Checker)** — *Ours:* C7.5, M3-9, rules cross-checks everywhere, AI live on the Visitor visa. *Team:* AG-11 Checker (cross-checks name, dates, numbers; findings as warnings); AG-7 ch.6 deficiencies. *Overlap:* direct. **Decided:** SI-6 (stand-in). **Question:** how far beyond the Visitor visa forms do we take the AI review ourselves? **Recommendation, not decided:** one form family at a time, as SI-6 says.

**B4 AI controls and cost** — *Ours:* live steps, progress, Stop, cost shown and logged, cap (C11.8, P-139, W1-07). *Team:* AG11-D13 / D15 (AI off until provider terms; Canada only), AG16-33/34 (AI switch, plan-gated), SA-3 entitlements, SA-8 providers. *Overlap:* they own the firm-wide switch and provider rules; we own per-run experience.
**Question:** keep ours for the run screen and consume their switch? **Recommendation, not decided:** yes — ours shows the run, theirs gates it (a stand-in chip until then).

## C. Forms filling and validation
**C1 Channel, signature and form lines** — *Ours:* PDF · Online · Paper · Not needed, signature value, copies, minimum age, signer (C1.6, C1.8, C11.6; P-143). *Team:* SA-1B-102 on the form line (who completes, copies, people, minimum age, condition, country variant, `signedBy`, `signatureMethod`; AG07-D26(7), D27(5)); AG-7-21. *Overlap:* the same fields; our channel set is wider.
**Question:** keep ours / align names with SA-1B-102? **Recommendation, not decided:** keep ours and map to their field names so AG-7 can read it.

**C2 Filling (PDF engine, answer sheet, online fill)** — *Ours:* append-only PDF writer with read-back and Adobe validate (C7.1–7.2), portal-order answer sheet (C7.3, P-113), extension parked (C7.4). *Team:* AG-7 ch.5 — Filler engine built (`filler.service.ts`); launch output is an **answer sheet**, direct PDF fill only after a form passes a trial (AG07-D17, SA-1-75); it refuses IRCC's XFA forms. *Overlap:* heaviest overlap in the product; our PDF fill goes beyond their launch plan.
**Question:** keep ours production grade, or follow the team's answer-sheet-first plan? **Recommendation, not decided:** keep ours — the PDF fill is our proof; give it the answer sheet beside it so the two agree.

**C3 Ready to file, approval, stale items** — *Ours:* only the form's Validate and missing facts block; signed items go stale; approval stamped with a fingerprint (C7.6, C9.2, B6; P-71, P-136, P-144). *Team:* AG-7 ch.5–7 (approval `agent/case:form-approve`, AG-7-59, readiness, deficiencies); their rule is "warn, never block" (BR-19/26). *Overlap:* the same step, with a **different rule** about blocking.
**Question:** keep our blocks, or follow the team's "warn and pass with a reason"? **Recommendation, not decided:** put this to the founder first; it is a product-policy conflict, not a build choice.

**C4 New editions and form health** — *Ours:* held for impact review, field-by-field comparison (C9.1 not built, C2.4); mapping problem report (B28). *Team:* AG-7-23a edition check on open and submit; SA-1 versions. *Overlap:* partial.
**Question:** keep ours? **Recommendation, not decided:** keep ours; it follows from A3.

## D. Questionnaires and client portal
**D1 Questions and person facts (SQR)** — *Ours:* one source per fact, who fills, renderer with three-tier checks, person-role questionnaires, verified facts per person, returning-client reuse (C4.1, C4.3–4.4, C4.9–4.10, C6.2, C6.10; B1, B2, B13). *Team:* AG-8 (builder, branching, single-source model, multi-applicant, AG-8-28, AG-8-49 per filing), SA-1B §3.2–3.3, AG-7 ch.1 and X-2 (one record per person). *Overlap:* direct. **Decided:** the SQR is ours (P-166).
**Question:** how closely do we copy AG-8's data model? **Recommendation, not decided:** keep ours, borrow AG-8's "definition → assignment → response → profile" naming.

**D2 Document checklist per person** — *Ours:* documents that supply facts, checklist, substitute sets, validity (C4.5, C6.4; B3, B4, B38). *Team:* AG-9 (request from client, categories, versions), AG-7 ch.4, SA-1B §3.4 (SA-1B-18–25), CP-4. *Overlap:* the checklist; AG-9 owns document status.
**Question:** keep ours / use AG-9 for status? **Recommendation, not decided:** keep ours for the rules; leave storage, versions and virus scan to AG-9 with a stand-in.

**D3 Pre-qualification questions (PQR)** — *Ours:* picks per combination, AI-drafted, prospect answers, "please confirm" in the SQR (C4.2, C4.7–4.8, C6.7–6.8; B29–B30). *Team:* SA-1B §8 (SA-1B-77–84), AG-2 lead form, AG-3, CP-3. *Overlap:* direct. **Decided:** ours (P-166). **Question:** how does it meet AG-2's lead form? **Recommendation, not decided:** ours, with the lead-form fields as a named subset.

**D4 Client portal** — *Ours:* family link, save and resume, adult privacy and "Send to" (C6.2; B8; W5 after M3). *Team:* Doc 4 CP-1–CP-9 (access, dashboard, questionnaire, documents, invoices, e-sign, messaging, profile, corporate), AG-15. *Overlap:* the team describes the whole portal; we plan the fill part. **Decided:** ours (P-166).
**Question:** which of CP-5 payment, CP-6 signing and CP-7 messaging do we build? **Recommendation, not decided:** fill, documents, sign-in ours; payments and messaging left out of the first cut.

## E. Case and filing (M3)
**E1 Case, people, filings** — *Ours:* open a case on a release, filings, groups, stages, family on different combinations (C6.1, C11.12; M3-0, M3-1, M3-5; B7, B10, B15). *Team:* AG-7 ch.1–3 (clients, cases, filings, rules pins AG07-D2/D18), SA-1B §6–7. *Overlap:* direct.
**Question:** keep ours / consume AG-7 with a stand-in? **Recommendation, not decided:** keep ours — nothing else holds the release pin our forms need.

**E2 Case officer's view** — *Ours:* agent view, confirm by section, conflicts, drawers (C6.3, C6.6; M3-3, M3-4). *Team:* AG-7 case screens, AG-8 §3.11 review and lock. *Overlap:* direct; **Question/Recommendation, not decided:** same as E1 (keep ours).

**E3 Submission, government steps, deadlines** — *Ours:* signed-PDF states, filing record and UCI (C8.1–8.2, M3-6); steps and deadlines planned (B11–B12, B39, B41). *Team:* AG-7 ch.7–9, AG-11 Minder (deadlines), SA-1B §3.8. *Overlap:* strong; theirs is more complete.
**Question:** keep ours for the record only, and leave deadlines to the Minder? **Recommendation, not decided:** yes, with a stand-in chip.

## F. Firm, users, money, messaging and everything else
**F1 Money** — *Ours:* fee lines, amounts Sample (M3-5; B19, B40). *Team:* AG-5, AG-6, AG-7 ch.11, SA-4 (firm pays platform). *Overlap:* fees on the filing. **Question:** fees ours / theirs? **Recommendation, not decided:** fee rules ours as data; quotes, invoices and payment theirs.
**F2 Messages, tasks, templates** — *Ours:* "please check" notice, after-filing task (P-142). *Team:* AG-10, AG-11, AG-12, AG-13, SA-5. *Overlap:* small. **Question:** leave all to the team? **Recommendation, not decided:** yes, with stand-ins.
**F3 Platform console** — *Ours:* nothing beyond studio roles. *Team:* SA-2 firms, SA-3 plans, SA-4 billing, SA-6 roles, SA-7 platform users, SA-8 integrations, SA-9 analytics, SA-10 support, SA-11 audit, SA-12 flags. **Question:** any piece ours? **Recommendation, not decided:** none for the POC, except the roles and audit trail our approvals need.
**F4 Everything else** — AG-2 CRM, AG-4 booking, AG-14 reports, AG-18 import, AG-17 corporate cases (link decided, SI-10); we have no row. **Question:** confirm none are ours now? **Recommendation, not decided:** leave to the team.
