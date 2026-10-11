# CN-AG-03: change note to AG-03 Pathway Assessment

| Field | Value |
|---|---|
| Module changed | AG-03 Pathway Assessment — Qualifiers & Calculators |
| Version and file | v1.4 of 7 Oct 2026, `02-functional-requirements/agent/AG-03-pathway-assessment_v1.4_2026-10-07.md` (Drive snapshot of 9 Oct 2026; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-3-42 (highest AG-3-41, L398); BR-19 (highest BR-18, L421) |
| Companion files | CN-AG-02 (the nurture nudge); CN-AG-11 (the assessment event as a trigger); CN-AG-12 (the eligibility mark on templates); AW-01 (the Intake assistant) |

**In plain words.** The founder decided on 11 Oct that, for the pilot, nobody's assessment runs by itself: a person runs it, and an assistant may only suggest the task. He also decided that eligibility (a score, a band, "likely", a lever) never goes to a lead in an automatic or AI-drafted message: it reaches a lead only when a consultant shares the assessment. This note records both, names the event an assessment emits, and brings the publish rule in line with the founder's decision to attach a rehearsal report rather than add a new blocking test.

---

## 1. Auto-assess: answered "no" for the pilot

1. **Where.** §13 item 10 (L668).
2. **Current words.**
   > L668: "10. **Auto-assess trigger.** Should an assessment auto-run on profile-complete (so the rep always has a fresh result), or only on explicit "Assess"? *(Affects AG-3-1 runType `AUTO` and lead-score freshness.)*"
3. **Proposed words.** Add: "**Answered for the pilot (the founder, 11 Oct 2026 — AIW-D40):** no automatic run. A person runs the assessment with an explicit "Assess" (AG-3-28). An AI assistant MAY propose a task to run it and SHALL NOT run it itself. Revisit after the pilot."
4. **Why.** AIW-D40 (the founder: "No for the pilot … The Intake assistant never runs the eligibility assessment by itself; a person runs it and the assistant proposes the task. Revisit with AG-03 §13 Q10 after the pilot"); `intake-assistant.md` §9 GI-20.
5. **Knock-ons.** No AG-11 action runs the Qualifier (CN-AG-11 item 3 adds none); AG-3-25 run type `AUTO` stays unused in the pilot.

## 2. Eligibility reaches a lead only through the consultant's share

1. **Where.** §5; new rule **BR-19**; relates to AG-3-38 (L393) and BR-16 (L419).
2. **Current words.**
   > L419: "**BR-16 (Review gate, configurable).** A client-facing artifact may require consultant review/sign-off before sharing (configurable; default SME/founder, §13); an unreviewed auto-assessment is not silently published as advice."
3. **Proposed words.**
   > **BR-19 (Eligibility reaches a lead only through the consultant).** No automatic message and no AI-drafted message to a lead SHALL contain an eligibility outcome, a score, a band, the word "likely" about eligibility, or a recommendation lever (AG-3-22 to AG-3-24). Eligibility SHALL reach a lead only through the consultant's audited share of the client-facing artifact (AG-3-38), under the disclaimer (AG-3-32) and the review gate (BR-16). An AI assistant MAY read a stored result to choose its own next step by rule (AW-01); it SHALL NOT quote it to the lead.
4. **Why.** AIW-D41 (the founder, 11 Oct: "Never; consultant shares it … No eligibility content (score, band, *likely*, levers) in any automatic or AI-drafted message to a lead; eligibility reaches a lead only through the consultant's audited share (AG-3-38)"); `proposals.md` row of 10 Oct (Intake assistant, eligibility in lead messages). The founder's decision is wider than that row (it covers automatic template messages too) and wins (README §0 rule 11). Behaviour: `intake-assistant.md` §9 GI-10.
5. **Knock-ons.** AG-02 §3.10 nudge dropped (CN-AG-02 item 1); AG-12 mark on templates with eligibility content (CN-AG-12 item 1); counsel reads any nurture template that mentions eligibility (`intake-assistant.md` §7).

## 3. Creating an assessment emits a first-class event

1. **Where.** §3.10 data flow (L318); AG-3-36 (L391); new requirement **AG-3-42**.
2. **Current words.**
   > L318: "Assessment current-pointer + recommended pathway → published to AG-2 lead score/NBA (event/read)"
3. **Proposed words.**
   > **AG-3-42 (assessment event).** Creating an Assessment SHALL emit a first-class event in the standard Conductor envelope (proposed name `assessment.created`; the team names it), idempotent per Assessment, carrying the lead or client, the `assessmentId`, the pack version and the run type. Emitting it SHALL NOT send anything to a lead (BR-19).
4. **Why.** `proposals.md` row of 10 Oct (Intake assistant, item (1): "**no assessment event** … AG-03 §3.10's data flow says the outcome is "published to AG-2 lead score/NBA (event/read)" without naming one"); with a person running the assessment (AIW-D40), this event is what wakes the assistant's next step; `intake-assistant.md` §9 GI-1.
5. **Knock-ons.** AG-11-110(d) (CN-AG-11 item 4); AG-02 NBA may read the same event.

## 4. Before publish: a rehearsal report, not a new blocking test

1. **Where.** BR-18 (L421); `PackVersion.conformancePassed` (L472); §9 edge case (L554); §12 (L633).
2. **Current words.**
   > L421: "**BR-18 (Conformance before publish).** A pack version must pass **conformance tests** (known reference profiles reproduce expected scores/outcomes) before it can be published — a grid data-entry error cannot reach production assessments."
   >
   > L472: "`conformancePassed` (bool, BR-18)"
3. **Proposed words.** "**BR-18 (Rehearsal report before publish).** A pack version submitted for production SHALL carry the report of the product's rehearsal on sample clients (SA-1-52), and the second person SHALL read it before approving (two-person publishing, SA-01 §3.12). There is no separate blocking test gate in version 1." `PackVersion.conformancePassed` becomes a reference to the rehearsal report (field name to assign). §9 L554 and §12 L633 follow.
4. **Why.** AIW-D49 (the founder, 11 Oct: "Attach a rehearsal report … Every production pack submission carries the report of the product's rehearsal on sample clients; the second person reads it before approving. No new blocking test gate"); `proposals.md` row of 10 Oct (Pack author's assistant, the test gate). Without this change AG-03 BR-18 would add the blocking gate the founder declined.
5. **Knock-ons.** SA-01 and SA-01B (SA1B-D18, SA-1B-38) in the Super Admin half; AW-02 (the Pack author's assistant drafts nothing into the pack, AIW-D54).
