# Scope boundary — chunk by chunk (decided by the founder 29 Oct: P-166, P-167, P-169; blocks P-168)

**Status: decided 29 Oct.** Drafted by a read-only research session (rev 2), checked by the Lead against the sources, answered by the founder one chunk at a time. Each chunk below carries its **Decided** line; "Recommendation" lines are kept as the record of what was proposed. Rules: P-166 (the founder decides chunk by chunk) as amended by **P-167: a chunk we own at least half of, by what we have scoped, we build production grade; below half we reuse the team's module** (a stand-in to its shape where the demo needs it, P-165); an unclear share goes to the founder. Every "Recommendation" is *recommendation, not decided*.
**How the share is estimated (rough, my judgment, not a count):** "scoped" = what we have in capabilities (C rows), WAVE-1, BACKLOG (everything in the team's SA-1B scope is in our POC, P-70) and the M3 concept, set against what the team's documents describe for the same chunk. I give two figures where they differ: **scoped** (decides under P-167) and **built** (works today). A share within about 10 points of half is marked **unclear → question**.
**Sources:** ours: `qa/CAPABILITIES.md`, `WAVE-1.md`, `BACKLOG.md`, `STAND-INS.md`, M3 concept r5b. Team's (read only, newest `sources/drive-snapshot-2026-10-19-1233`): Docs 1–4, agent Overview and Scope Index, SA-01 / SA-01B in detail, AG-07 ch.5, module indexes of AG-08 / 09 / 11 / 15, SA-02…SA-12 headers. **Not every requirement was read**; where only an index line was seen I say so. "SA-1B-n" = Super Admin content-pack requirements; "AG-n" = Agent console; "CP-n" = Client Portal.

## Already decided (listed, not asked)
- **Ours:** PQR, SQR, client portal (P-166). **Not ours, reused from the team:** billing and payments (AG-06), communication (AG-10), e-sign (by whichever slice needs a signature) (P-167).
- M3 stand-ins SI-1…SI-10 (P-164/165): eligibility (AG-03), AI form review on the Visitor visa only (AG-11), firm/users/case team Sample minimum (AG-01, AG-07), employer link (AG-17).
- Follows for the portal (D4): CP-5 payments, CP-6 signing, CP-7 messaging are therefore the team's; the fill, documents and sign-in parts are ours.

## No overlap found (plainly ours — about 100%)
Demo reset and sample loading (C10.1–10.2, C11.7, B35) · workspace snapshots (B48) · second-person source check of uploaded IRCC files (C2.3) · test and build tooling (B31–B33, B36, B32) · "Ask" panel (B47; AG-10's Writer is a different thing).

## A. Super Admin configuration and its backend
**A1 Programs and combinations** — *Ours:* five-level structure, combination cards, Start setup, "Who can be in this application" (C1.1–1.5, C11.3, C11.10, C11.12, C11.16–17; B7, B10, B15). *Team:* SA-1B §4–7 (SA1B-D2–D10, SA-1B-50–76), SA-1 tree (SA-1-11/60). *Overlap:* same Pathway › Program › Category › Sub-category rows and person roles. **Our share: about 85% scoped, 65% built.**
**Question (not needed under P-167):** confirm "ours, production grade". **Recommendation, not decided:** yes.
**Decided:** ours, production grade (share above half, P-167).

**A2 Draft, review, release, roll-back** — *Ours:* submit → expert ticks → different person approves, one To review page (C5.1–5.3, C11.9; B9, B48). *Team:* SA-1 container (draft → review → publish, rollback, firm pinning and adoption), SA-6 roles. *Overlap:* same lifecycle; theirs adds firm-side adoption and roll-back. **Our share: about 50% — unclear → question.**
**Question:** ours end to end, or ours for the author side and the team's container for firm adoption and roll-back? **Recommendation, not decided:** the split — the author side is built and works.
**Decided (P-169):** split. Ours: the author side (draft, review, approve, release, snapshots). The team's SA-1 container: firm adoption of a release and platform roll-back; our release pin is shaped to SA-1 (stand-in SI-11).

**A3 Form library and editions** — *Ours:* Forms page, intake checks, IRCC accepts per edition, finder download (C2.1–2.4, C3.12, C11.2, C11.11, C11.15, C11.18). *Team:* SA-1B §3.5 master forms, SA-1-75 mappings, AG-7 "Form library and editions". **Our share: about 80% scoped, 75% built.** **Recommendation, not decided:** ours; no question.
**Decided:** ours.

**A4 Shared library (fields, sections, document types, answer lists)** — *Ours:* aliases, merge, retire, rename, lists (C3.5–3.7, C3.13–3.15, C11.13–14). *Team:* SA-1B §3.1–3.4 (SA-1B-1–5, 11), SA-1-17, and the 17 content areas of SA-1-64. *Overlap:* same catalogue. **Our share: about 70% scoped, 45% built.**
**Recommendation, not decided:** ours, no question (scoped share is above half).
**Decided:** ours.

**A5 Rules, gates, reference tables, government steps, fees, regulator setup, country notes** — *Ours:* validator and checks (C3.8, C3.14), Sample gates (C6.9); planned B14, B16–B19, B38–B46. *Team:* SA-1B §3.6–3.10, SA-1-68–74 (letters, holidays, deficiency library). **Our share: about 65% scoped (everything in SA-1B scope, P-70), 25% built.**
**Question:** letters, holidays and the deficiency library are SA-1 pack content outside SA-1B: ours or the team's? **Recommendation, not decided:** the team's; the rest ours.
**Decided (P-169):** ours, except letter templates, holiday calendars and the deficiency library, which are the team's (SI-12, Deferred).

## B. AI (finder, drafting, document reading, review)
**B1 AI proposals for setup** — *Ours:* form finder (canada.ca only), AI field maps, drafting of sections, documents, rules, PQR picks, draft + checker round (C2.12, C3.1–3.4, C4.7, C4.11, C11.2, C11.13–14; B37, B45). *Team:* AG-11 lists a "Finder" among its executors (index line only; card not read); SA-1 / SA-1B give authoring tools, no AI drafting of pack content found. **Our share: about 85%; Finder part unclear → question.**
**Question:** does the team's Finder do the same job? **Recommendation, not decided:** ours; ask the team first.
**Decided:** ours. **Lead correction:** the team's "Finder" is their universal search module (Architecture Decision Record C4-D4, Doc 1), not a form finder; no overlap, no question.

**B2 Reading uploaded documents (Reader)** — *Ours:* passport lines by rules, printed pages by Textract, letters by AI vision, staff verify (C6.5; M3-2, M3-10; P-133, P-142). *Team:* AG11-D4 Reader (identity, IRCC letters, language tests, ECA reports, classification), AG-9, AG-18 bulk. *Overlap:* direct. **Our share: about 45% — unclear → question** (we have no language-test or ECA readers, no bulk).
**Question:** ours production grade, or the team's Reader behind a stand-in? **Recommendation, not decided:** the team's Reader, our stand-in shaped like AG11-D4 output (value, provenance, confidence).
**Decided (P-169):** ours, production grade, built to AG11-D4's output shape (value, where it came from, confidence) so the team can call it; language tests, ECA reports, classification and bulk come later.

**B3 AI review of a filled form (Checker)** — decided stand-in SI-6. **Our share: about 30%.** Question: none.
**Decided:** stand-in SI-6 (P-164).

**B4 AI controls and cost** — *Ours:* live steps, progress, Stop, cost logged, run cap (C11.8, P-139). *Team:* AG11-D13 / D15 (AI off until provider terms, Canada only), AG16-33/34 (switch, plan gating), SA-3, SA-8. **Our share: about 35%** (the run screen). **Recommendation, not decided:** reuse the team's switch and provider rules; keep our run screen.
**Decided (P-167, below half):** the team's AI switch, provider terms and plan gating are reused (SI-13); our run screen (steps, cost first, Stop, caps) stays ours.

## C. Forms filling and validation
**C1 Channel, signature and form lines** — *Ours:* four channels, signature value, copies, minimum age, signer (C1.6, C1.8, C11.6; P-143). *Team:* SA-1B-102 (who completes, copies, people, age, condition, country variant, `signedBy`, `signatureMethod`), AG-7-21. **Our share: about 70%.** **Recommendation, not decided:** ours; map to SA-1B-102 names. No question.
**Decided:** ours; names mapped to SA-1B-102.

**C2 Filling (PDF engine, answer sheet, online fill)** — *Ours:* append-only PDF writer with read-back and Adobe validate (C7.1–7.2), portal-order answer sheet (C7.3, P-113), extension parked. *Team:* AG-7 ch.5 — Filler engine built; launch output is an answer sheet, direct PDF fill only after a form passes a trial (AG07-D17, SA-1-75); XFA refused. *Overlap:* the heaviest. **Our share: about 65%.** **Recommendation, not decided:** ours, no question under P-167; we also give the answer sheet so both agree.
**Decided:** ours.

**C3 Ready to file, approval, stale items** — *Ours:* only the form's Validate and missing facts block; signed items go stale (C7.6, C9.2, B6; P-71, P-136, P-144). *Team:* AG-7 ch.5–7 (approval `agent/case:form-approve`, readiness, deficiencies); rule "warn, never block" (BR-19/26). **Our share: about 55% — unclear → question, plus a policy conflict.**
**Question:** keep our blocks, or follow "warn and pass with a reason"? **Recommendation, not decided:** founder decides the policy first.
**Decided (P-168):** our four blocks stay hard blocks; everything else is a warning passed with a reason, as AG-07 BR-26 says.

**C4 New editions and form health** — *Ours:* held for impact review (C2.4; C9.1 not built; B28). *Team:* AG-7-23a edition check, SA-1 versions. **Our share: about 60%.** **Recommendation, not decided:** ours.
**Decided:** ours.

## D. Questionnaires and client portal
**D1 Questions and person facts (SQR)** — *Ours:* source per fact, who fills, renderer, person-role questionnaires, verified facts, reuse (C4.1, C4.3–4.4, C4.9–4.10, C6.2, C6.10; B1, B2, B13). *Team:* AG-8, SA-1B §3.2–3.3, AG-7 ch.1 / X-2. **Decided ours (P-166); share about 70%.** Note: AG-8-49 asks one questionnaire per filing.
**Decided:** ours (P-166).

**D2 Document checklist per person** — *Ours:* documents that supply facts, checklist, substitutes, validity (C4.5, C6.4; B3, B4, B38). *Team:* AG-9 (requests, categories, versions, scan, storage), AG-7 ch.4, SA-1B §3.4, CP-4. **Our share: about 45% — unclear → question.**
**Question:** rules ours, storage and status AG-9's? **Recommendation, not decided:** yes, the split.
**Decided (P-169):** split. Ours: the checklist rules and the reader. AG-09's: requesting, storing, versioning, scanning and each file's status (SI-14, a thin stand-in for the demo).

**D3 Pre-qualification (PQR)** — *Ours:* picks, AI draft, prospect answers (C4.2, C4.7–4.8, C6.7–6.8; B29–B30). *Team:* SA-1B §8 (SA-1B-77–84), AG-2 lead form, AG-3, CP-3. **Decided ours (P-166); share about 65%.**
**Decided:** ours (P-166).

**D4 Client portal** — *Ours:* family link, save and resume, adult privacy (C6.2; B8). *Team:* Doc 4 CP-1–CP-9, AG-15. **Decided ours (P-166)** — except payments, signing and messaging (decided reused, above). Our share of Doc 4's nine modules: about 40% (CP-1…CP-4, CP-8 part).
**Decided:** ours (P-166), except payments, signing and messaging (P-167).

## E. Case and filing (M3)
**E1 Case, people, filings** — *Ours:* case on a release, filings, groups, stages, family on different combinations (C6.1, C11.12; M3-0/1/5; B7, B10). *Team:* AG-7 ch.1–3 (client list, cases, team, filings, rules pins AG07-D2/D18). **Our share: about 40% — below half, but the release pin lives with us → question.** **Recommendation, not decided:** reuse AG-7's case and client shell with a stand-in; ours the filing and pin logic.
**Decided (P-169):** split. AG-07's: client list, case shell, team and stages (SI-15, thin stand-in). Ours, production grade: filings, groups, waits and the release pin.

**E2 Case officer's view** — *Ours:* agent view, confirm by section, conflicts (C6.3, C6.6; M3-3/4). *Team:* AG-7 screens, AG-8 §3.11. **Our share: about 50% — unclear → question.** **Recommendation, not decided:** ours for fact confirmation; team's for the rest of the case screen.
**Decided (P-169):** split. Ours: everything from facts to filing (the M3 case view tabs). AG-07's: the case page frame and its other tabs (SI-16); our tabs plug into it.

**E3 Submission, government steps, deadlines** — *Ours:* signed-PDF states, filing record, UCI (C8.1–8.2, M3-6); B11–B12 planned. *Team:* AG-7 ch.7–9, AG-11 Minder, SA-1B §3.8. **Our share: about 35%.** **Recommendation, not decided:** record ours; deadlines the Minder's.
**Decided (P-167, below half):** the filing record is ours; deadlines and reminders are the team's Minder (SI-17).

## F. Firm, users, money, messaging and everything else
**F1 Money** — billing and payments: decided not ours (AG-06). Fee tables as pack data (B19, B40; SA-1B-52): **share about 60% — question only if the founder wants the tables moved.**
**F2 Messages, tasks, templates** — messaging decided not ours (AG-10); tasks / templates (AG-12, AG-13, SA-5): **about 5%** (a "please check" notice, an after-filing task, P-142). Reuse.
**F3 Platform console** — SA-2 firms, SA-3 plans, SA-4 billing, SA-6 roles, SA-7 users, SA-8 integrations, SA-9 analytics, SA-10 support, SA-11 audit, SA-12 flags. **About 5%** (studio roles and our approval trail). Reuse.
**F4 Everything else** — AG-2 CRM, AG-4 booking, AG-14 reports, AG-18 import, AG-17 corporate (link decided). **About 0%.** Reuse.

## Questions for the founder
All answered 29 Oct (seven questions: C3 policy, A2, B2, D2, E1, E2, A5; B1 dropped after the Lead's check).
