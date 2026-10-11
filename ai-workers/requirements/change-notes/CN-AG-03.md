# CN-AG-03: change note to AG-03 Pathway Assessment

| Field | Value |
|---|---|
| Module changed | AG-03 Pathway Assessment — Qualifiers & Calculators |
| Version and file | v1.4 of 7 Oct 2026, `02-functional-requirements/agent/AG-03-pathway-assessment_v1.4_2026-10-07.md` (Drive snapshot of 11 Oct 2026, `sources/drive-snapshot-2026-10-11/`, unchanged since 9 Oct; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 (fix round after review S3c) |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-3-42 (highest AG-3-41, L398); BR-19 (highest BR-18, L421) |
| Companion files | CN-AG-02 (the nurture nudge); CN-AG-11 item 4 (the assessment event as a trigger); CN-AG-12 item 1 (the eligibility mark on templates); CN-SA-01 (SA-1-66, the rehearsal report); AW-01 v0.1 (the Intake assistant, AW-1-88, AW-1-90) |

**In plain words.** The founder decided on 11 Oct that, for the pilot, nobody's assessment runs by itself: a person runs it, and an assistant may only suggest the task. He also decided that eligibility (a score, a band, "likely", a lever) never goes to a lead in an automatic or AI-drafted message: it reaches a lead only when a consultant shares the assessment. This note records both, names the event an assessment emits, and brings the publish rule in line with the founder's decision to attach a rehearsal report rather than keep a blocking test.

**Terms used.** *Standard Conductor envelope*: the fixed wrapper every trigger event uses (module, event type, record, firm, time). *Idempotent*: delivering the same event twice has the effect of delivering it once.

---

## 1. Auto-assess: no automatic run until the founder revisits it after the pilot

1. **Where.** §13 item 10 (L668).
2. **Current words.**
   > L668: "10. **Auto-assess trigger.** Should an assessment auto-run on profile-complete (so the rep always has a fresh result), or only on explicit "Assess"? *(Affects AG-3-1 runType `AUTO` and lead-score freshness.)*"
3. **Proposed words.** Add: "**Answered (the founder, 11 Oct 2026 — AIW-D40):** no automatic run. An assessment SHALL run only on a person's explicit "Assess" (AG-3-28); the run type `AUTO` SHALL NOT be used until the founder revisits this question after the pilot. An AI assistant MAY propose a task to run it and SHALL NOT run it itself (AW-1-88)."
4. **Why.** AIW-D40 (the founder: "No for the pilot … The Intake assistant never runs the eligibility assessment by itself; a person runs it and the assistant proposes the task. Revisit with AG-03 §13 Q10 after the pilot"); `intake-assistant.md` §9 GI-20. The product rule is stated without a "pilot" state the product cannot see (review S3c m-10); "pilot" stays only in the reason.
5. **Knock-ons.** No AG-11 action runs the Qualifier (CN-AG-11 item 3 adds none).

## 2. Eligibility reaches a lead only through the consultant's share

1. **Where.** §5; new rule **BR-19**; relates to AG-3-38 (L393) and BR-16 (L419).
2. **Current words.**
   > L419: "**BR-16 (Review gate, configurable).** A client-facing artifact may require consultant review/sign-off before sharing (configurable; default SME/founder, §13); an unreviewed auto-assessment is not silently published as advice."
3. **Proposed words.**
   > **BR-19 (Eligibility reaches a lead only through the consultant).** No automatic message and no AI-drafted message to a lead SHALL contain an eligibility outcome, a score, a band, the word "likely" about eligibility, or a recommendation lever (AG-3-22 to AG-3-24). A template marked as carrying status or eligibility content (AG-12-38 as proposed in CN-AG-12) SHALL NOT be sent to a lead by an automation, an AI assistant or a person, whoever approves it. Eligibility SHALL reach a lead only through the consultant's audited share of the client-facing artifact (AG-3-38), under the disclaimer (AG-3-32) and the review gate (BR-16). An AI assistant MAY read a stored result to choose its own next step by rule (AW-01); it SHALL NOT quote it to the lead. A message a person writes by hand is not machine-checked for advice, which AG11-D1 says cannot be detected; the firm stays responsible for it.
4. **Why.** AIW-D41 (the founder, 11 Oct: "Never; consultant shares it … No eligibility content (score, band, *likely*, levers) in any automatic or AI-drafted message to a lead; eligibility reaches a lead only through the consultant's audited share (AG-3-38)"); `00-step3-plan.md` "Eligibility to leads (AIW-D41, review S3c B-1)"; the coordinator's fix-round instruction (a person's hand-send of a marked template to a lead is also blocked); `proposals.md` row of 10 Oct (Intake assistant, eligibility in lead messages). The founder's decision is wider than that row (it covers automatic template messages too) and wins (README §0 rule 11). Behaviour: AW-1-90; `intake-assistant.md` §9 GI-10.
5. **Knock-ons.** AG-02 §3.10 nudge dropped (CN-AG-02 item 1); AG-12-38 and BR-15 say the same (CN-AG-12 item 1); the engine refuses such a send (CN-AG-11 item 9 (g)); counsel reads any nurture template that mentions eligibility (`intake-assistant.md` §7).

## 3. Creating an assessment emits a first-class event

1. **Where.** §3.10 data flow (L318); AG-3-36 (L391); new requirement **AG-3-42**.
2. **Current words.**
   > L318: "Assessment current-pointer + recommended pathway → published to AG-2 lead score/NBA (event/read)"
3. **Proposed words.**
   > **AG-3-42 (assessment event).** Creating an Assessment SHALL emit a first-class event in the standard Conductor envelope (proposed name `assessment.created`; the team names it), idempotent per Assessment, carrying the lead or client, the `assessmentId`, the pack version and the run type. Emitting it SHALL NOT send anything to a lead (BR-19).
4. **Why.** `proposals.md` row of 10 Oct (Intake assistant, item (1): "**no assessment event** … AG-03 §3.10's data flow says the outcome is "published to AG-2 lead score/NBA (event/read)" without naming one"); with a person running the assessment (AIW-D40), this event is what wakes the assistant's next step; `intake-assistant.md` §9 GI-1.
5. **Knock-ons.** AG-11-110(d) (CN-AG-11 item 4); AG-02 NBA may read the same event.

## 4. Before publish: a rehearsal report on synthetic sample clients, not a blocking test

1. **Where.** §3.5 (L220); BR-18 (L421); `PackVersion.conformancePassed` (L472); §9 edge case (L554); §12 (L633).
2. **Current words.**
   > L220: "The existing calculator unit tests (verbatim-grid fixtures) become **pack-conformance tests**: a published pack must reproduce known reference profiles' scores, so a data-entry error in a grid is caught before publish."
   >
   > L421: "**BR-18 (Conformance before publish).** A pack version must pass **conformance tests** (known reference profiles reproduce expected scores/outcomes) before it can be published — a grid data-entry error cannot reach production assessments."
   >
   > L472: "`conformancePassed` (bool, BR-18)"
3. **Proposed words.** BR-18: "**BR-18 (Rehearsal report before publish).** A pack version submitted for production SHALL carry the report of the product's rehearsal on synthetic sample clients (SA-1-66 as proposed in CN-SA-01; SA-1-52), and the second person SHALL read it before approving (two-person publishing, SA-01 §3.12). There is no separate blocking test gate in version 1." L220: "The existing calculator unit tests (verbatim-grid fixtures) become **rehearsal fixtures**: a production submission carries the report of the pack reproducing known synthetic reference profiles' scores, which the approver reads before publish." `PackVersion.conformancePassed` becomes a reference to the rehearsal report (field name to assign). §9 L554 and §12 L633 follow.
4. **Why.** AIW-D49 (the founder, 11 Oct: "Attach a rehearsal report … Every production pack submission carries the report of the product's rehearsal on sample clients; the second person reads it before approving. No new blocking test gate"). AG-03 v1.4 (7 Oct) is later than SA-01B v1.2 (5 Oct), so README rule 11 alone would keep AG-03's blocking gate against SA1B-D18's "no test run at publish"; it is the founder's answer to exactly that question (`00-step2-decisions.md` §2 item 12, decided as AIW-D49) that removes it (review S3c m-2). "Synthetic": the `proposals.md` rule row of 10 Oct (a sample client "is always synthetic and marked so"), applied by CN-SA-01 (SA-1-66).
5. **Knock-ons.** SA-01 (SA-1-66) and SA-01B (SA1B-D18, SA-1B-38) in the Super Admin half; AW-02 (the Pack author's assistant drafts nothing into the pack, AIW-D54).
