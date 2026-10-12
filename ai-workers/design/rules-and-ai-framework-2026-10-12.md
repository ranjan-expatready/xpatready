# Rules and AI: the framework for Expat Ready

*Version 2, 12 Oct 2026, by the Lead. It replaces version 1 (the draft checked in review R5), whose questions F1 to F8 the founder has now answered in AIW-D92 to D105. Revised after review R7. **Status:** the decisions cited are ratified; the build mechanisms in §3 and §4 are Proposals (labelled); four founder questions stay open (§9). Direction for this pass: AIW-D106. It is the one place that ties the AI layer together. The detail lives in the files it points to; this file does not restate them.*

**Points to (one home each):**
- **Every capability by class:** `design/rules-ai-classification-2026-10-12.md`.
- **Tools, autonomy, approvals and the toggle grid:** `design/ai-autonomy-model-2026-10-12.md` (revision 5).
- **Journeys and failure cases:** `design/journey-walkthroughs-2026-10-12.md` (paper only).
- **Accuracy and repeatability:** `research/ai-accuracy-and-determinism-2026-10.md`.
- **Selling:** `research/rules-and-ai-positioning-2026-10.md`. The pitch text is in `research/ai-moat-and-positioning-2026-10.md` §4–5.
- **Value, price, cost and measurement:** `commercial/ai-value-map-2026-10-12.md`.
- **The AI teammates and skills:** `handbook/ai-team-profiles.md`.
- **Decisions:** `decisions.md`. Lead rulings and working rules: `proposals.md`, 12 Oct rows.

**Design assumption (AIW-D98), labelled:** Workstream 2 is designed against a Workstream 1 product that is complete and tested, including the rules engine and the packs. This is assumed, not verified. Rule correctness belongs to Workstream 1; AI quality belongs to Workstream 2.

---

## 1. The framework on one page

1. **Rules decide, AI does the work around them, people approve what matters** (AIW-D84, D92).
2. **Every capability is in one of four classes**, and every output carries its class label (AIW-D92):
   - rules only;
   - AI explains rule results;
   - AI language;
   - person only.
3. **The AI teammates can do what a person does in the product** (AIW-D93, D95):
   - They use the product's own screens and tools, under the delegated person's permission.
   - They can read; draft; run the eligibility assessment automatically once the stop check passes (D96; Lead's reading in the AIW-D106 note); and prepare invoices, proposed trust entries, exports, deletion requests, settings changes and signature workflows (D103).
4. **Nothing consequential takes effect until an authorised person approves it.** The approval binds to the exact action shown (FD-16; D93, D103).
5. **Approvals are few and placed where they matter** (D95, D100, D101):
   - The default preset is **"Review each step"**.
   - Under **"Review at checkpoints"**, a whole job runs and is reviewed in one sitting at the end.
   - Anything linked to a deadline, or that a later step depends on, is asked earlier.
   - The safety floors are locked.
   - The grid never grants access.
6. **Autonomy is earned** for routine, reversible internal work (D104). Published templates picked by a rule go out on their own (D105).
7. **The AI uses only approved rule results.** It cites its sources and the pack version, stops when evidence is missing, out of date or conflicting, and its explanations stay subject to licensed-person review (D98).
8. **Repeatability, as the founder worded it (AIW-D109):** "The rules engine produces the same calculated result from the same verified facts and rule version. AI-generated outputs may vary between fresh calls; they are recorded, can be replayed, and are tested for accuracy and consistency." Storing and replaying an AI output does not establish its correctness. **Exact repeatability comes from the platform, not the model.** Rule results are stamped with the pack version (AG-03 v1.4 §1, team specification); storing and replaying AI answers is a Proposal for the build (accuracy research R2).
9. **We sell an AI team on top of rules that can be defended** (D99, D97):
   - **Headline:** "An AI team for your immigration practice."
   - **Proof:** the rules, measured AI performance and the approval record.
   - **The moat:** the combination of reviewed and dated packs, accuracy measured per skill, the record of every file, and being the firm's system of record.

---

## 2. The four classes (AIW-D92)

| Class | What happens | Called "AI" to buyers? | Share of the 122 capability rows |
|---|---|---|---|
| **Rules only** | The rules engine, the Conductor and the rule-based Doers compute: the same calculated result from the same verified facts and rule version (AIW-D109). | Never | 80 |
| **AI explains rule results** | The rules compute. The AI may fetch results with read tools (D93) and words or explains them, with sources and the pack version; explanations stay subject to licensed-person review (D98). | Yes, for the wording | 6 (see the classification for which are decided: the assessment explainer by the AIW-D98 note, Practice answers for version 2 by AIW-D39) |
| **AI language** | The AI reads, sorts, drafts and summarises. Its quality is measured, not guaranteed. | Yes, always disclosed | 11 (one, the future conversational AI, is not live at launch) |
| **Person only** | Advice, telling a lead or client about eligibility (AIW-D41), signing and submitting | Never | 25 |

**These counts are table rows, not shares of work** (an Assumption). The AI teammates use rules-only capabilities as tools, so "rules only" doesn't mean "no AI nearby". It means the result comes from the rules. "AI-assisted" is not used for assessments, scoring or any rules-only capability (D92, narrowing FD-16).

---

## 3. How the AI acts: tools, autonomy, approvals

**Decided:** AIW-D93, D95, D96, D100 to D105. **The mechanics are in the autonomy model**, revision 5:
- §c.1: the safety rule;
- §c.2: the action table, presets and examples;
- §c.4: who approves the bundle;
- §c.6: earned Auto;
- §c.7: visibility.

**Reuse, not new systems.** The model builds on the team's existing controls rather than adding new ones:
- **Auto / Approve / Off** on every action, and the **Needs you** inbox (AG11-D1, AG11-D2);
- the permission checks (AG-11-58);
- the sending workflow and its checks;
- the run records and health lights (AIW-D83, D85);
- the AI switches (AIW-D78).

**What is new (all in Workstream 2's own layer; Proposals for the build, ruled by the Lead in `proposals.md` 12 Oct):**
- "ask now" or "ask at the checkpoint";
- the end-of-job review sitting;
- three mechanisms from the journey walkthroughs (Lead rulings, `proposals.md` 12 Oct):
  - **M-2:** a stop check before any assessment the AI starts;
  - **M-3:** each AI draft records which value versions it used, so a correction refreshes it;
  - **M-4:** each consequential approval is bound to the fields shown in its preview.

Each of the three answers a decision that couldn't otherwise be met (D98, D100 point 5, D103).

**Honest effect (an Assumption, not measured):**
- Under "Review at checkpoints", separate approval visits per file fall from about 29 to about 14. With two approvers it's about 15.
- The number of decisions a person makes stays about the same; they're grouped, not removed.
- Under the default "Review each step", nothing changes. Firms choose.

---

## 4. Accuracy, repeatability and fidelity to the rules

These are **Proposals for the build**, recommendations R1 to R13 of the accuracy research. They're carried into the AW-01 v0.7 update. None is measured yet.

| What | Mechanism | Research |
|---|---|---|
| Repeatable | Store each AI answer with a fingerprint of its inputs and replay it. A re-run happens only on a change, and becomes a new record. | R2 |
| True to our rules | The rules compute and the AI explains. Code checks every number, date and rule ID against the engine's output; a mismatch stops with `explanation_mismatch`. The AI stops on missing, stale or conflicting evidence (D98, M-2). | R7 |
| Accurate reading | Every value carries its source words, checked by code. Choices are taken from the pack. Calls are small. | R5, R8 |
| Consistent | The driving test runs each case several times and reports consistency. For a few high-stakes fields, the value is read more than once and must agree. | R6, R11 |
| Trusted signals | We never use the model's own confidence; we use our own signals. A person approves every value (D100). | R9 |
| Shown to buyers | An accuracy sheet per skill version, published only once measured (D99) | R12 |

**What can't be promised:**
- that a fresh AI call gives exactly the same answer twice;
- that the AI detects a wrong rule (D98).

**Our accuracy is unknown** until our own test sets run.

---

## 5. Selling

**Decided (D92, D97, D99):**
- **Lead headline:** "An AI team for your immigration practice."
- **Supporting line:** "Prepare files, organise documents and draft communications—with maintained rules underneath and your team in control."
- **Supporting message:** "Rules you can defend. AI that does the legwork."
- **Order of the story:** the customer benefit first, then the proof.

**Working rules (`proposals.md`, 12 Oct):**
- No hours, minutes, "faster" or accuracy figure until measured on our own records.
- Rules are never called AI.
- The say and never-say list has one home: the positioning file §(c)2, read with `research/ai-in-regulated-work-2026-10.md` §7 (AIW-D106 note).

**Legal readings are unconfirmed.** Counsel is not engaged (AIW-D94), so the legal readings in the positioning file are the Lead's guidance only. The risk sits with the founder.

---

## 6. Commercial connection

The value map (`commercial/ai-value-map-2026-10-12.md`) has the detail. The material points:

- **There's no customer evidence yet.** Problems come from the requirements; savings and willingness to pay are Assumptions.
- **Pricing is decided: workflow pricing.** Every plan includes the AI team with a prepared-file allowance and clearly priced extra prepared files (AIW-D111, D115); one prepared file per application (AIW-D114); discounts on the plan price only (AIW-D116); CAD 25 to 40 stays illustrative. The unit, usage, warnings, the SA-3/SA-4 check and how the numbers are set: `commercial/workflow-pricing-2026-10-12.md`. The other firm teammates ride inside the plan.
- **Cost to serve** for a typical file is about CAD 1.72 in model cost [I].
  - About CAD 1.54 of it is the product's own reading of uploads, which sits in the base plan (AW-1-15).
  - About CAD 0.18 is the teammates' own calls.
- **Break-even arithmetic, not a claim:** at an illustrative CAD 30 a file, a firm needs about 52 minutes of assistant time saved per file, or about 34 minutes of consultant time. That's the number the pilot must measure.
- **Measurement uses records the product already specifies.** There are two gaps:
  - **G1:** cost fields on the AI call record. This is our own change, in the CN-AG-11 update.
  - **G2:** times when an approval item is opened. This is a team need.
- **The multi-million path** is unchanged from version 1: a faster sales engine, measured time saved, being the system of record, AI revenue that grows with caseload, and a second segment or country (positioning file §(c)4; moat file §1.3, §4.5).

---

## 7. Journeys (paper walkthroughs only)

`design/journey-walkthroughs-2026-10-12.md` walks four journeys:
1. intake and booking;
2. documents and file preparation;
3. assessment and review;
4. billing preparation.

Each covers the normal path and the failures:
- missing or conflicting facts;
- corrections;
- outages;
- permission changes;
- repeats;
- split approvers;
- a preview that doesn't match.

It found 19 gaps. The Lead's rulings and the mechanisms M-2 to M-4 close the AI-layer gaps (`proposals.md`). G-6 (permission changes mid-job) and G-13 (a stale assessment after a correction) go to the team.

**Our own update, not the team's:** the trust-key wording AG-6-46/47 is our proposed text in CN-AG-06 change 6; we amend it for AIW-D103 ourselves (review R8 JW-M3).

**Not proven:**
- nothing has been executed; all 435 live test cases are "Not run";
- the prototype is a simulation;
- a paper walkthrough doesn't prove a test, and a simulation doesn't prove the product.

---

## 8. Dependencies and conflicts for the team (stated, not resolved)

| Item | What we need | Team document |
|---|---|---|
| Tool access | Models may call tools under the person's permission, with effects approved first (AIW-D93) | AG-11-94 |
| Upload values in the bundle | Reader values may wait for the end-of-job review sitting (AIW-D100) | AG-11-60 |
| Untested pack rules | Packs complete and tested before publishing (AIW-D98 dependency) | SA1B-D18 |
| AI runs the assessment | Knock-ons from AIW-D96 | AW-1-88 (ours); AG-03 automatic-run question |
| Permission change mid-job | Re-routing pending items (G-6) | AG-11 / AG-01 |
| Stale assessment after a correction | Assessments marked stale when an input changes (G-13) | AG-03 |
| Review effort | Opened-time on approval items (G2) | AG-11 |
| Grid storage and screens | The toggle grid (AIW-D101) | AG-16 / AG-11 |
| Holding state for "ask at the checkpoint" | Items held for the end-of-job sitting (AIW-D101; autonomy E4) | AG11-D2, AG-11-55, AG-11-60 |
| Drafts from provisional values | May the Filler draft from provisional values and re-render after verification (AIW-D100 point 5; autonomy E14) | AG-07; AG-11-97 |
| Workflow pricing in plans and billing | A fifth, metered plan quantity (prepared files per month), an extra-file price on each plan, usage records, notices, invoice line and terms: team changes T1 to T18 (AIW-D111, D114 to D116), listed in `commercial/workflow-pricing-2026-10-12.md` §3.3 | SA-03 v2.17; SA-04 v2.17 (SA-4-44, SA-4-1) |

---

## 9. Founder questions

**Answered since version 2 was written:** the conversational AI for leads is in Release 1, Option A (AIW-D107); the AIW-D57 safeguards are final (AIW-D108); the repeatability promise is worded by the founder (AIW-D109).

**Answered since:** Support AI reading across firms, aggregates only (AIW-D110); the price unit, workflow pricing (AIW-D111); pilot firm one, the founder-consultant's practice after tests and shadow (AIW-D112); assisted portal filling (AIW-D113); one prepared file per application (AIW-D114); the AI team on every plan (AIW-D115); discounts on the plan price only (AIW-D116).

**No founder questions open.**
