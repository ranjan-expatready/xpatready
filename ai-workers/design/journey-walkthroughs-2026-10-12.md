# Journey walkthroughs: four journeys, end to end, with what can go wrong

*Expat Ready, Workstream 2. Maker's draft, 12 Oct 2026. Goes to the adversarial checker, then the Lead, then the founder. Nothing here is ratified.*

**What this is.** A paper walk through four journeys, step by step: who or what acts (rules, AI, a person) and which existing control makes it safe. Then seven ways each journey can fail, the expected behaviour, and the requirement or decision that covers it, or **GAP** where nothing does. Each step is then mapped to the existing test cases and to the prototype.

**What this is not.** It restates no requirement (README §0 rule 3, AIW-D22): every control is cited by ID, file and version. It designs no non-AI product mechanics (memory `ws2-step3-scope-lesson`): where the team's product would need a change, the need is stated as a question for the team. A new mechanism is proposed only where a requirement cannot be met otherwise (§6).

**Design assumption, labelled (AIW-D98, extending AIW-A1).** Workstream 1, the team's non-AI product including the rules engine and the packs, is treated as **complete and tested**. Every team behaviour cited below is marked **[WS1 assumed]**. That is an assumption, not a verified fact. No Canada pack is authored yet and pack rules may publish untested (SA1B-D18; `design/rules-ai-classification-2026-10-12.md` summary item 7).

---

## 0. Gaps first (short summary)

Nineteen gaps were found (8 major: they block a journey or break a founder decision; 11 minor), plus one bookkeeping item (G-20). Nothing in this document has been executed. **All 435 live test cases in `requirements/tests/AW-test-cases.csv` have status "Not run"** (one more, TC-AW2-029, is Withdrawn). The prototype predates the 12 Oct decisions (its About page says it was "Built from AW-01 Firm AI assistants v0.5"). So every journey below is a **paper walkthrough**, and no item is proven by a test or by the prototype.

| # | Gap | Journey | Size | Fix proposed (built on) | Who decides |
|---|---|---|---|---|---|
| G-1 | **No requirement anywhere for the launch chat interface** that AIW-D102 allows ("an interactive chat interface using that approved content"). The team's lead capture is a web form (AG-2-5, AG-02 v1.9) and the client portal has no AI (Doc 4 v1.3; classification §3.4). | 1 | Major | §6 M-1: a chat surface where a rule picks every answer from published templates (AG-12; AG11-D12; AW-1-46) | The team (the surface); the Lead (the AW requirement) |
| G-2 | **The autonomy model says the AI may start an assessment "on verified values only; otherwise it stops"** (autonomy model c.2 row 4). But a lead's answers are stored **unverified by design** (AW-1-94; CN-AG-08 change 1). So the Intake AI could never run a lead's assessment, which empties AIW-D96 for intake. AIW-D98's own words are "missing, stale or conflicting evidence", not "unverified". | 1, 3 | Major | Reword row 4 to AIW-D98's test (missing, stale, conflicting). Lead facts are usable but marked as self-reported on the result (AG-3-25 stamp) | The Lead (the autonomy model is ours) |
| G-3 | **No requirement defines "conflicting evidence" before an assessment.** AG-03 resolves conflicting profile edits by "last-write-wins" (AG-03 v1.4 §9). Nothing stops the Qualifier while an open Checker conflict (AG11-D4) or a still-proposed value touches a gate input. | 3 | Major | §6 M-2: a pre-run rule check over existing Checker findings and PROPOSED values | The Lead (AW requirement); the team is told |
| G-4 | **AIW-D98 says the AI explains results "with sources and the pack version", subject to licensed review. No AW requirement does this.** The explainer is still a Proposal (classification A21). | 3 | Major | New AW requirement: a T-class explainer reusing the summary line's number check (AW-1-113) and the AI-written marker (AW-1-25) | The Lead |
| G-5 | **A correction does not reach every dependent draft.** AIW-D100 point 5 needs it. AG-11-61 re-renders only "when the record changes", but provisional values are not yet in the record. A provisional value that is **rejected** changes nothing, so drafts built on it are never flagged. The Filler's rule for provisional values is also open (autonomy model E14). | 2 | Major | §6 M-3: a per-draft list of the value versions it used, built on existing provenance (AG-11-56; AW-1-23; AW-1-84 facts-used footer) and on AG-11-61 | The Lead (AW); the team (E14) |
| G-6 | **Waiting items when a person's permissions change mid-job.** Approval is refused (AG-11-58; AW-1-10), but the item stays with someone who can no longer decide it. AG-11-55 re-routes only on suspension, deactivation or overdue. A delegation is tied to the delegating role (AW-1-12), and no rule says what happens when the person **moves to another role**. | all | Major | Re-route on lost permission through AG-11-55's existing "unassigned" path (team question). The Lead rules on a delegation whose delegating role no longer applies | The team (routing); the Lead (delegation) |
| G-7 | **AIW-D103 actions are not defined precisely enough to bind an approval to "the exact action previewed".** For an invoice it is unclear whether the approval covers creating the DRAFT (AG-6-6) or issuing it (AG-6-5, number at issue). Tax is "computed at issue and frozen" (AG-6-4), so the issued figure can differ from the preview. Who sets the funds designation is unclear: AW-1-101 says the person, but AIW-D103 lets the AI propose trust entries. | 4 | Major | §6 M-4: binding = the action's idempotency key (AG-11-25) plus the rendering version (AG-11-61) over a named list of bound fields | The Lead (list of fields); the team (E16 trust keys) |
| G-8 | **The test set and the prototype contradict the 12 Oct decisions.** They test or show the opposite of AIW-D96 (TC-AW1-124) and AIW-D103 (TC-AW1-047, -048, -049, -143, -144, -147, -246 to -250). Nothing tests or shows the chat, template sends inside a job, an AI-run assessment, the end-of-job bundle, the presets or grid, invoice or trust-entry preparation, or earned Auto. | all | Major | Lead's knock-on list (§7.3) | The Lead |
| G-9 | **Earned Auto (AIW-D104) is not yet in the autonomy model.** Its §c.6 still limits it to internal notes with a fixed "1 in 20" sample, which AIW-D104 rejects. There is no AW requirement and no test. "Filing labels" sits against AW-1-78 (every document type to a person until a threshold is published). | 2 | Minor | Autonomy model revision 4 build-in (already on the Lead's list, NEXT.md) | The Lead |
| G-10 | **Template sends inside a job (AIW-D105) are not yet in AW-1-46.** That includes AI text put into a merge field needing approval, and the four send checks (recipient, consent, case status, duplicates). The autonomy model still lists the question as open (D7). | 1, 2 | Minor | Knock-on edit to AW-1-46 and autonomy model c.2 row 5 | The Lead |
| G-11 | **Values-first is not enforced in a split bundle.** The autonomy model c.4 says "two sittings, values first", but nothing stops the consultant approving a letter while the values it used are still provisional. | 2 | Minor | Covered by M-3: a line whose inputs are still provisional cannot be approved | The Lead |
| G-12 | **A sent output that used a since-corrected value.** A template send or approved message that used a verified value that is later corrected cannot be recalled, and nothing tells anyone. AG-9-15 resets only the document. | 2 | Minor | One internal task "Sent with a value since corrected", on the AW-1-70 task pattern (Proposal) | The Lead |
| G-13 | **A shared or saved assessment does not go stale when a gate input is corrected.** AG-3-29 flags stale only on a newer pack version. AW-1-88 tasks a re-run only for leads. | 3 | Minor | Ask the team to extend AG-3-29's stale flag to "a gate input changed" (team question) | The team |
| G-14 | **No limit on AI re-runs of the assessment.** Each re-run is a new immutable record (AG-3-1, AG-3-28), and AIW-D96 sets no trigger rule. | 1, 3 | Minor | Re-run only when AW-1-88's two conditions hold (no current assessment, or the profile changed) | The Lead |
| G-15 | **A provider outage mid-job is not shown in the bundle.** AW-1-53 skips the model step and adds a batched task, but the bundle screen (autonomy model c.4) does not list skipped steps. | 2 | Minor | Add "skipped, and why" to c.4 item 6 | The Lead |
| G-16 | **The same unbilled line can sit in two pending invoice proposals.** AW-1-98 excludes lines already invoiced, not lines already proposed. The double-run key parts (AG-11-114(d), CN-AG-11 change 9) do not cover the newly allowed acts. | 4 | Minor | Key the double-run check on the source line (reuse AG-11-114(d)) | The Lead (CN-AG-11 is ours) |
| G-17 | **Linked items are approved by different people with no link between them.** For example, an issued invoice whose proposed trust entry is rejected, or a lead moved to Consult while the consultation-offer draft is rejected. | 1, 4 | Minor | Show the linked item and its state on each approval item (reuse AG-11-56 "why") | The Lead |
| G-18 | **No named stop for billing preparation.** AIW-D98's stop is defined for evidence only. A missing designation source (CN-AG-06 §13 item 10) or a currency mismatch has no named failure. | 4 | Minor | Apply the row-10 stop pattern to rows 12 to 14 of the autonomy model | The Lead |
| G-19 | **A contradiction between a lead's new answer and a stored answer is not flagged.** The Checker (AG11-D4) compares documents, profile and forms; whether it reads lead answers is Unknown. | 1 | Minor | Team question: may the Checker compare a proposed lead answer with the stored one? | The team |
| G-20 | **No progress-log line for this task.** The caller allowed one output file only, so the "Agent log" lines in `PROGRESS.md` could not be appended. | — | Bookkeeping | The Lead appends them | The Lead |

**Main finding.** Most failures are already covered by the team's product controls: idempotency (AG-11-25), stale rendering refused (AG-11-61), execute once (AG-11-57), the permission re-check (AG-11-58, AW-1-10), never on a timer (AG-11-59), the manual fallback (AG-11-71), the double-run check (AW-1-18) and pause and stale on release (AW-1-20). These cover the **old** design, where every effect was approved one at a time. The 12 Oct decisions (the bundle, earned Auto, template sends inside a job, the AI running the assessment, AI-prepared money actions) add new paths. The controls reach those paths only partly. G-1 to G-7 are where the reach stops.

---

## 1. How to read this document

**Who acts.** **Rules** = the product's fixed rules, the Conductor or a Doer; same input, same result. **AI** = a model call (Reader, Sorter, Writer, Checker) whose output varies and is checked. **Person** = a named person acting with their own permission.

**Evidence labels**, never mixed:
- **P** = paper walkthrough (this document). It proves nothing by itself.
- **S** = simulated in the prototype (`prototype/index.html`, 6 screens, made-up data). A click-through, not the product.
- **E** = executed test. **There are none.** Every mapped test is "Not run".

A mapped test means the test case **exists** and would check the step if run. It does not mean the step works.

**Status words in the failure tables.** **Covered** = an existing requirement or decision gives the expected behaviour. **Partly** = it covers part of the case; the rest is named. **GAP** = nothing covers it (cross-referenced to §0).

**Autonomy terms** (from `design/ai-autonomy-model-2026-10-12.md`, which is still a Proposal; its file header reads revision 3 and does not yet build in AIW-D104 or D105). "Ask now" = an approval item at once. "At checkpoint" = held for the end-of-job bundle, under the preset "Review at checkpoints" (AIW-D101). "Auto" = runs without a click.

---

## 2. Journey 1: intake and booking

**Scope at launch (AIW-D102).** Approved templates and guided intake questions run automatically. A chat interface may serve that approved content. Newly AI-written replies need approval before sending. Eligibility is shared only by the consultant (AIW-D41). The future conversational AI is out of scope until a separate decision with the team.

### 2.1 The ordinary path

| # | Step | Who or what acts | Control that enforces it | Tests (all Not run) | Prototype |
|---|---|---|---|---|---|
| 1.1 | An enquiry arrives: web form, inbound API or public booking page | Rules [WS1 assumed] | AG-2-5, AG-2-6, AG-2-10 (AG-02 v1.9); `source` mandatory AG-2-11; duplicates matched on email and phone AG-2-14, AG-2-15 ("never silently create a duplicate or silently merge") | no test (WS1) | Not shown |
| 1.2 | Speed-to-lead: thank-you to the lead and a call task for the owner | Rules: seeded recipe, a template message at AUTO once the firm confirmed its standard messages | AG-2-35; AG11-D1, AG11-D12 (AG-11 v1.12); AW-1-15 (stays a firm automation) | no test | Not shown |
| 1.3 | The Intake AI's run opens on the lead | Rules: the delegation must be accepted and active, and the switches on | AW-1-87; AW-1-6, AW-1-11, AW-1-125; AW-1-52 (AI switch locked until a provider record exists) | TC-AW1-002, -003 (case assistant pattern); none for intake | S: screen 2 (delegation set-up, accept, pause) |
| 1.4 | Guided intake questions: the facts the programs need, asked through a template whose merge field lists them | Rules pick the facts (union of the assessment's missing inputs, AG-3-3, AG-3-12) and the template (AW-1-46 "chosen by a rule, never by a model") | AW-1-93; AIW-D102; AIW-D105 (template send inside a job = approved by the firm's template approval) | TC-AW1-131 | Not shown |
| 1.5 | The lead uses a chat on the firm's site and gets approved answers | **Nothing specified.** Autonomy model c.2 assumes a rule picks each answer (E15) | AIW-D102 only. **GAP G-1** | no test | Not shown |
| 1.6 | The lead replies with facts; the Reader reads the message and proposes answers | AI (Reader `read_text`), then Person (accepts each, stored unverified) | AW-1-94; AW-1-61 (unverified sender → ask first only); AW-1-33 (approve-all safeguards) | TC-AW1-132, -230, -087, -088 | Not shown |
| 1.7 | The eligibility assessment runs | Rules calculate (Qualifier, AG-3-39 "deterministic pure function", stamped AG-3-25). **Who starts it:** by AIW-D96 the Intake AI may, under `agent/assessment:run`, "Ask now" (autonomy row 4, the Lead's reading) | AIW-D96, D98; AG-3-1, AG-3-25, AG-3-26 (AG-03 v1.4). AW-1-88 still says the AI "SHALL NOT run" it (a knock-on of D96, not yet edited). **GAP G-2** on "verified values only" | TC-AW1-124 **contradicts AIW-D96** | Not shown |
| 1.8 | The next move is picked by one fixed rule (offer a consultation / ask for missing facts / propose Nurture) | Rules | AW-1-89 (still reads "Only on a new assessment a person ran": knock-on of D96, G-8) | TC-AW1-125 | Not shown |
| 1.9 | Consultation offer sent from a firm template; nothing about eligibility | Rules (template at AUTO under AIW-D105); the send step refuses a marked template to a lead | AW-1-90, AW-1-91; AG-11-115 (CN-AG-11 change 13); consent class AG-2-33 | TC-AW1-126, -127, -058, -128, -129, -135, -136 | Not shown |
| 1.10 | Where no template fits, the Writer drafts a reply; a licensed person approves before it is sent | AI drafts; Person approves | AG-11-53 floor; AW-1-46; AW-1-31; AG-16-46 ("licensed users only (default)"); AIW-D102 | TC-AW1-059, -011, -030, -031 | Not shown |
| 1.11 | Stage move proposed (Qualified, Consult, Retainer Sent, Nurture); the rep approves | AI proposes by rule; Person approves under `agent/prospect:edit` | AW-1-92, AW-1-44 | TC-AW1-055, -130, -054, -252 | Not shown |
| 1.12 | The lead books through the Scheduler link | Rules [WS1 assumed]: slot re-checked at write time, concurrent bookings locked | AG-4-25, AG-4-26 (AG-04 v1.5); Scheduler messages are the product's (AW-1-87) | no test (WS1) | Not shown |
| 1.13 | After the consultation, a summary of the host's own typed notes | AI drafts an internal note; Person (host) accepts | AW-1-95; AG-4-56 (CN-AG-04 change 1) | TC-AW1-133, -134 | Not shown |
| 1.14 | Eligibility shared with the lead, if at all | **Person only**: the consultant's audited share | AG-3-38; AG-03 BR-16 (unreviewed share blocked when review is required); AIW-D41 | TC-AW1-126 (no eligibility in AI messages) | Not shown |
| 1.15 | Retainer generated, approved for send, signed | Person and Rules (Signer, with the email passcode) | AW-1-42 (no AI text, no signing); AW1-D9, D16; AG-5-54 | TC-AW1-052, -250 | Not shown |

### 2.2 What can go wrong

| Failure | Expected behaviour | Covered by | Status |
|---|---|---|---|
| **Missing facts** | The assessment returns POSSIBLY_ELIGIBLE with the missing inputs named, never a false NOT_ELIGIBLE. The next-move rule asks for the missing facts by name only, never a passport or bank number in free text. | AG-3-12; AG-03 §9 "Empty / near-empty profile"; AW-1-89 branch 4; AW-1-93 | Covered [WS1 assumed for AG-03] |
| **Contradictory facts** (web form says one thing, the lead's reply another) | The proposed answer shows its source message (AW-1-94 provenance) and a person accepts or rejects it. Nothing flags that it contradicts the stored answer. | AW-1-94 (provenance only) | **Partly. GAP G-19** |
| **Correction after drafts exist** (the lead corrects a fact while a consultation offer or a drafted reply waits) | A waiting draft re-renders stale on open, and approval of the old rendering is refused. If the change voids the reason for the item, it is cancelled. The assessment is re-run (a new immutable record, AG-3-28). The next-move rule runs again. | AG-11-61; AW-1-88 (profile changed → re-run); AG-3-28 | **Partly.** Whether a waiting draft from the old branch is cancelled depends on the recipe re-checking its condition (AG-11-61 "the condition stopped matching"); not stated for persona recipes. A shared assessment does not go stale on a profile change (**G-13**) |
| **Tool or provider unavailable** | Templates are still picked by rule and sent. Free drafts are skipped, recorded, and put in one batched task per day (AG-11-71). A chat that only serves rule-picked approved content keeps working with AI off (if built as M-1). Scheduler or other action failure: retried, then dead-lettered with a manager notification (AG-11-26, AG-11-27); other actions carry on (AG-11-28). | AG-11-71; AW-1-53; AG-11-26 to AG-11-28 | Covered for templates and drafts. The chat: **GAP G-1** |
| **The delegating person's permissions change mid-job** (the rep loses `agent/prospect:edit`) | The next action needing the key is refused and recorded; the run carries on with other steps (AW-1-10; AW-01 §9 first edge case). Approving a STAGE_MOVE item is refused (AG-11-58). The waiting item stays with the rep, who can no longer decide it. | AW-1-10, AG-11-58 | **Partly. GAP G-6** |
| **The same job or step runs twice** | A duplicate lead is offered as link or merge (AG-2-15). A redelivered `prospect.created` never double-fires (AG-11-25). The seed's acknowledgement and the teammate's own act are matched on `actGuardKey` (AW-1-18). Restarting continues the same run (AW-1-17). Two bookings on one slot: the loser gets a refusal and refreshed slots (AG-4-26). An AI-started re-assessment creates a new record each time, with no limit. | AG-2-15; AG-11-25; AW-1-17, AW-1-18; AG-4-26; AG-3-1 | Covered, except re-runs: **G-14** |
| **Different people approve different parts** (the rep approves the stage move; a licensed person approves the drafted reply; the consultant shares eligibility) | Each approves under their own key: stage move `agent/prospect:edit`; AI-written text the licensed approver plus the send key (AW-1-31); eligibility only through the consultant's share (AG-3-38). Nothing links the stage move to the reply: a lead can move to Consult while the offer was rejected. | AW-1-31, AW-1-92; AG-3-38 | **Partly. GAP G-17** |
| **The approved action differs from its preview** | Approval carries the rendering version; the server refuses it if the record or the rendering changed (AG-11-61). An edited draft runs as edited, recorded with the diff (AG-11-57, AG-11-62). At send time the rails still apply after approval: consent (AG-2-33), rate caps (AG-11-38), a marked template refused to a lead (AG-11-115), a paused client refused (AG-11-101). The send is then skipped and recorded, never changed. | AG-11-57, AG-11-61, AG-11-62; AG-11-115; AG-11-101 | Covered |

**Regulatory flags (the Lead's unconfirmed guidance; counsel is not engaged, AIW-D94).** A chat that answers leads, even from approved content, is client-facing communication before a retainer. The rule "a template marked as carrying status or eligibility content is refused for a lead" (AW-1-46, AG-11-115) must also hold inside the chat. Whether a lead's facts may be asked before a retainer is CQ2 in the counsel pack (now unconfirmed).

---

## 3. Journey 2: document collection and file preparation

**Scope.** The Case Officer's AI runs the file from a signed retainer to ready-for-review. Values read from uploads wait, provisional, for one review sitting (AIW-D100). Published template sends inside the job count as approved (AIW-D105). Routine, reversible internal work may earn Auto (AIW-D104).

### 3.1 The ordinary path

| # | Step | Who or what acts | Control that enforces it | Tests (all Not run) | Prototype |
|---|---|---|---|---|---|
| 2.1 | A person opens the case; the onboarding list goes once (portal invite, questionnaire link, welcome, first document request) | Person opens; Rules send | AW-1-69; CN-AG-07 change 8; CN-AG-11 change 10 | TC-AW1-095 | Not shown |
| 2.2 | The Case Officer's AI run opens | Rules: delegation active, client not quiet | AW-1-69, AW-1-16, AW-1-17 | TC-AW1-002, -022 | S: screen 2 |
| 2.3 | Document chases from the firm's published templates | Rules: seed chase at AUTO, plus any chase the teammate's recipe makes (AIW-D105). Merge fields only from verified values, otherwise it drops to "Ask me first" (AG-11-97) | AG11-D1, AG11-D12; AIW-D105; AW-1-18 (no repeat of the seed's chase) | TC-AW1-019, -020, -021 | Not shown |
| 2.4 | The client uploads; virus scan | Rules [WS1 assumed] | AG-9-20, AG-9-21; every upload is a new version (AG-9-14, AG-9-15) | no test (WS1) | Not shown |
| 2.5 | The Reader proposes the document type and values, each with source region and confidence | **Product AI** (not the teammate's) | AG-9-42, AG-9-43, AG-9-45; AG-9-46 (unreadable → flagged, never guessed); AW-1-15, AW-1-59 | TC-AW1-085, -086, -034 | S: screen 1 (values with source and confidence) |
| 2.6 | One verdict per upload against the pack's acceptable-form rules | Rules check; reason picked by rule from firm templates; the Writer drafts only when none fits | AW-1-76, AW-1-77 | TC-AW1-103, -104, -105, -228 | Not shown |
| 2.7 | A rejected upload the client must re-send is **asked now**; the rejection reason goes from a firm template | Person decides now (dependent action); Rules send | AIW-D100 point 4; autonomy c.2 locked rule; AG-9-27 (reason required) | TC-AW1-104, -105 | Not shown |
| 2.8 | Clean upload values wait **provisional** for the bundle sitting | Rules hold (under "Review at checkpoints"); under the default preset they are asked now as today | AIW-D100; autonomy c.2 row 11. Team need: AG-11-60 asked to change (E13); holding state (E4) | **no test** | Not shown |
| 2.9 | Checker findings become "Resolve" tasks for the file owner | Rules (internal action at AUTO) | AW-1-70, AW-1-66 (no completing link); AG11-D1 internal = AUTO | TC-AW1-096, -090 | Not shown |
| 2.10 | Internal notes, ordinary tasks, filing labels: **earned Auto** once the skill passed its tests, checked examples from real use exist, and the Owner approved | AI drafts; Rules apply; sampled checks; drops back to approval when quality falls | AIW-D104; AW-1-119, AW-1-120; AIW-D83. Not yet in the autonomy model or AW-01 (**G-9**) | **no test** | Not shown |
| 2.11 | A government letter: dates proposed, milestone line, client notice, response plan | Product AI proposes dates; Person approves each **now (locked)**; Rules register with the Minder; AI drafts the notice (licensed approval) and an internal plan | AW-1-80, AW-1-81; AG-9-51; AG-11-100, AG-11-108; autonomy row 9 | TC-AW1-111 to -115, -091 | Not shown |
| 2.12 | Client questions answered | AI drafts; licensed Person approves **now** | AW-1-82; AW-1-46, AW-1-31; autonomy row 6 | TC-AW1-059, -114, -116 | Not shown |
| 2.13 | Government form drafts | Rules (the Filler) once the values are verified; the Checker cross-checks; Person approves (consultant approval = AG-07's approval) | AW-1-83; AG11-D8; four-eyes AG11-D9; preparer = delegating person AW-1-35. **Disabled until the team's form route exists** (FD-5, AW1-D17) | TC-AW1-118, -119, -042, -043, -227 | Not shown |
| 2.14 | Application letters with a facts-used footer | AI drafts from the verified profile; unverified facts listed as such; Person (licensed, with the generate key) approves | AW-1-84; AW-1-31 | TC-AW1-120, -032, -033 | Not shown |
| 2.15 | **End-of-job bundle**: values first (explicit checks for identity, consequential values and conflicts), then forms and letters, per-line approve, edit or reject | Person(s) | Autonomy model c.4 (Proposal); AIW-D100, D101; AW-1-33 approve-all safeguards (AIW-D57) | **no test** for the bundle; TC-AW1-035 to -037, -224, -225 for approve-all | S, partly: screen 1 shows approve-all on the readiness report (uncertain values opened first, one value held out, private alarm). There is no bundle screen |
| 2.16 | Ready-for-review decided by rule | Rules | AW-1-71 | TC-AW1-097, -098 | Not shown |
| 2.17 | Readiness report, built by rule with one AI paragraph; the officer's acceptance = submission for internal review | Rules build; AI one paragraph; Person accepts | AW-1-72 to AW-1-75; AG-7-93 (CN-AG-07 change 3) | TC-AW1-099 to -102, -222, -223 | S: screen 1 (accept, reject with reason, audit lines) |

### 3.2 What can go wrong

| Failure | Expected behaviour | Covered by | Status |
|---|---|---|---|
| **Missing evidence** (a required document never arrives; a field unreadable) | Chases continue on the template schedule. An unreadable field is flagged, never guessed (AG-9-46). The file cannot reach ready-for-review while a required document is below Received or a value is still proposed (AW-1-71). A deadline-linked need is asked now (AG-11-100). | AG-9-46; AW-1-71; AG-11-100 | Covered |
| **Contradictory evidence** (the passport date of birth differs from the form or another document) | The Checker raises a finding (AG11-D4: "findings feed the Deficiency Library as warnings, never a lock"), which becomes a Resolve task (AW-1-70). In the bundle, any conflict needs its own explicit check and cannot pass through "approve all" (AIW-D100 point 3; autonomy c.4 item 2). The AI stops the job with a named failure (AIW-D98; autonomy row 10). | AG11-D4; AW-1-70; AIW-D100, D98 | Covered by decision. The stop is not yet an AW requirement (knock-on) |
| **Correction after drafts exist** (in the bundle the officer corrects a date that two forms and a letter used) | Every dependent form, letter and message re-renders before any can be approved (AIW-D100 point 5; autonomy c.4 item 3). AG-11-61 re-renders on a record change. A **rejected** provisional value, or a correction outside the bundle, has no rule that finds the drafts that used it. A message already **sent** with the old verified value cannot be recalled and nobody is told. | AIW-D100 point 5; AG-11-61; AG-9-15 (a new document version resets verification) | **Partly. GAP G-5** (dependency record), **G-11** (values first), **G-12** (already sent); E14 (Filler from provisional values) is a team question |
| **Tool or provider unavailable** | The model step is skipped and recorded; the rule steps carry on; work for a person goes to one batched task per day (AW-1-53, AG-11-71). The readiness report arrives without its AI paragraph (AW-01 §9). A per-run cap parks the run (AW-1-54). A failed action is retried, then dead-lettered (AG-11-26, AG-11-27). A withdrawn provider record pauses the delegations, and waiting items go stale on release (AW-1-11, AW-1-20). The bundle does not show which steps were skipped. | AW-1-53, AW-1-54, AW-1-11, AW-1-20; AG-11-26, AG-11-27, AG-11-71 | **Partly. GAP G-15** |
| **The delegating person's permissions change mid-job** | The next action needing the lost key is refused and recorded, and the run continues (AW-1-10). Approval needs the same permission as the act by hand, re-checked at approval (AG-11-58; AG-11 §11). If the person is deactivated or suspended, the delegation **ends** and its waiting items are cancelled (AW-1-11(b), AW-1-50). A role edit or a move to another role leaves bundle lines routed to someone who cannot approve them. | AW-1-10, AW-1-11, AW-1-50; AG-11-58 | **Partly. GAP G-6** |
| **The same job or step runs twice** | `document.extracted` is idempotent per document version, so no duplicate proposals (AG-9-44). A date is registered once per file and date (AG-9-51). Seed and teammate on the same upload: one acknowledgement, one review task (AW-01 §9). Approve or edit-then-approve executes once under the action's key (AG-11-57). Restart continues the same run (AW-1-17). Two officers on one case: the double-run check stops the second act (AW-01 §9). | AG-9-44, AG-9-51; AG-11-25, AG-11-57; AW-1-17, AW-1-18 | Covered |
| **Different people approve different parts** (an officer verifies values; a consultant approves forms and letters) | Each line goes to the approver its rule names: values to a verify-key holder; AI text to the AI-text approver; each form to every form approver, first to decide closes it (autonomy c.4; AG-11-89; AW-1-30, AW-1-31). Four-eyes keeps the preparer off their own form when it applies (AG11-D9; AW-1-35). Nothing enforces "values first". | AW-1-30, AW-1-31, AW-1-35; AG11-D9; AG-11-89 | **Partly. GAP G-11** |
| **The approved action differs from its preview** | Approving a stale rendering is refused (AG-11-61; AW-01 §9 stale readiness line). Edits run as edited and are recorded (AG-11-57, AG-11-62). A paused client: approval refused (AG-11-101). After a pause, waiting items re-render stale (AW-1-20(a)). A template send whose merge field is not verified drops to approval instead of sending a placeholder (AG-11-97). | AG-11-57, AG-11-61, AG-11-62, AG-11-97, AG-11-101; AW-1-20 | Covered |

**Regulatory flags (unconfirmed, AIW-D94).** A response plan for the representative may be advice (AW-1-81, flag R-CQ2). The value-review sitting must remain a real check, not a rubber stamp: AIW-D57's safeguards are still "provisional" and the founder's D9 question is pending (NEXT.md).

---

## 4. Journey 3: assessment and review

**Scope.** The AI may run the eligibility assessment when the facts are ready or a person asks (AIW-D96). The rules engine calculates every result; the AI uses only approved engine results, cites sources and the pack version, and **stops** on missing, stale or conflicting evidence. Explanations stay subject to licensed review, and no claim is made that the AI detects wrong rules (AIW-D98). Telling a lead or client the result stays with a licensed person (AIW-D41).

### 4.1 The ordinary path

| # | Step | Who or what acts | Control that enforces it | Tests (all Not run) | Prototype |
|---|---|---|---|---|---|
| 3.1 | Trigger: the facts are ready (rule) or a person asks inline | Rules or Person | AIW-D96; AW-1-124 (inline ask); AW-1-88's two conditions as the readiness rule (proposed, **G-14**) | no test | Not shown |
| 3.2 | Pre-run check: missing, stale or conflicting evidence → **stop**, named failure, to a person | Rules | AIW-D98 point 3; autonomy row 10 (locked "ask now"). **No AW requirement defines the check** (**G-3**) | no test | Not shown |
| 3.3 | The run is asked now (autonomy row 4, the Lead's reading), approved by a holder of `agent/assessment:run` | Person approves; Rules then run | AIW-D93 (an action with an effect is a proposal), D96; AG-11-58 | no test | Not shown |
| 3.4 | The Qualifier runs and saves an immutable, stamped assessment (pack id and version, rules-as-of date, input snapshot, actor, run type) | Rules [WS1 assumed] | AG-3-1, AG-3-25, AG-3-26, AG-3-39 (AG-03 v1.4) | no test (WS1) | Not shown |
| 3.5 | Label: "Run by [AI teammate] for [person]; calculated by the rules, pack v[n]"; the result is never called AI | Rules render the label | AIW-D96, D92 | no test | Not shown |
| 3.6 | The AI explains the breakdown with sources and the pack version (staff only) | AI words a rule result (T class); Rules check every number | AIW-D98 points 3 and 4. **No AW requirement** (**G-4**). Nearest checks: AW-1-113 (number match, forbidden words), AW-1-25 (AI-written marker) | nearest: TC-AW1-162 (summary-line number check) | S, nearest only: screen 4 (Practice answers, rule-built, optional AI summary line) |
| 3.7 | A licensed person reviews; may override an outcome with a documented reason | Person | AG-3-33 (override kept beside the engine result); AIW-D98 point 4 | no test (WS1) | Not shown |
| 3.8 | Shared with the lead or client only by the consultant, audited; blocked if review is required and not done | Person | AG-3-38; AG-03 BR-16; AIW-D41 | TC-AW1-126, -127 (no eligibility in AI messages) | Not shown |
| 3.9 | On a case: the readiness report accepted = submitted for internal review; the reviewer approves separately; the Checker runs inside the Reviewer | Person; Rules; Product AI (Checker) | AW-1-74; AG-7-93; AG-7-61; AW-1-15 | TC-AW1-100, -222, -223 | S: screen 1 |
| 3.10 | A person submits to the government; the product never does | Person | AG-11-54; AW-1-48 | TC-AW1-062, -256 | Not shown |

### 4.2 What can go wrong

| Failure | Expected behaviour | Covered by | Status |
|---|---|---|---|
| **Missing evidence** | The engine returns POSSIBLY_ELIGIBLE with the missing inputs named (AG-3-12). An ambiguous input is treated as missing for that gate, never scored zero (AG-03 §9). No active pack: the assessment is blocked with a clear message (AG-03 §9; BR-2). The AI stops with a named failure (AIW-D98). | AG-3-12; AG-03 §9; AIW-D98 | Covered by decision; the stop is not yet an AW requirement |
| **Stale evidence** | A newer pack version flags the assessment stale (AG-3-29). A lead whose profile changed gets a re-run task (AW-1-88). A case assessment whose gate input was corrected is **not** flagged stale. An expired document resets on a new version (AG-9-15), but nothing ties that to the assessment. | AG-3-29; AW-1-88; AG-9-15 | **Partly. GAP G-13** |
| **Conflicting evidence** | Expected (AIW-D98): stop before the run. Today the profile is "last-write-wins" (AG-03 §9), and Checker findings are "warnings, never a lock" (AG11-D4). Nothing joins them to the Qualifier. | AIW-D98 (decision only) | **GAP G-3** |
| **"Verified only" against lead facts** | Autonomy row 4 would stop every lead assessment, because lead answers are unverified by design (AW-1-94). | — | **GAP G-2** |
| **Correction after drafts exist** (an explanation, a readiness report or a shared artifact exists, then a gate input is corrected) | Re-running is explicit and creates a new immutable assessment with a reason (AG-3-28). An override stays with the old assessment (AG-03 §9). A waiting explanation or readiness line re-renders stale (AG-11-61). An artifact already shared with the client is not flagged. | AG-3-28; AG-11-61 | **Partly. GAP G-13** |
| **Tool or provider unavailable** | The calculation is rules only and keeps working with AI off (AG-11-71). Only the explanation is skipped, recorded and turned into a task (AW-1-53). If the Qualifier itself fails, the action is retried, then dead-lettered (AG-11-26, AG-11-27). | AG-11-71; AW-1-53; AG-11-26, AG-11-27 | Covered |
| **The delegating person's permissions change mid-job** (loses `agent/assessment:run`) | The run is refused at the next action and recorded (AW-1-10); a waiting "run assessment" item cannot be approved by someone without the key (AG-11-58). Routing as G-6. | AW-1-10; AG-11-58 | **Partly. G-6** |
| **The same job or step runs twice** | Each re-run is a new immutable record with a reason (AG-3-1, AG-3-28): no data harm, but no limit on AI-started re-runs. An identical result shows "no change" (AG-03 §9). Accepting a readiness report submits once (TC-AW1-100). | AG-3-1, AG-3-28; AG-11-57 | Covered for data. **G-14** for re-run noise |
| **Different people approve different parts** (one person approves the run; a licensed person reviews the explanation; the consultant shares; the officer accepts the report; the reviewer approves) | Each act is a separate, audited decision under its own key (AG-3-33, AG-3-38; AW-1-74; AG-11-62). Share is blocked until review when review is required (BR-16). | AG-3-33, AG-3-38, BR-16; AW-1-74 | Covered |
| **The approved action differs from its preview** | The assessment re-derives the identical result from its stamped snapshot and pack version (AG-3-26), so the result cannot drift after approval. If the pack version changes between approval and run, the run pins the version it loaded (AG-03 §9) and stamps it. The approver approved "run on pack v[n]", so a different version should void the approval. That binding is not stated. | AG-3-26; AG-03 §9 | **Partly.** Covered by M-4 (bind the pack version into the rendering) |

**Regulatory flags (unconfirmed, AIW-D94).** An AI explanation of eligibility read by staff is close to advice. AIW-D98 keeps it subject to licensed review, and it must never reach a lead or client except through the consultant's share (AIW-D41). The "AI-assisted" phrase is not used for assessments (AIW-D92).

---

## 5. Journey 4: billing-related preparation

**Scope (AIW-D103).** Through the existing product, the AI may **prepare** invoices and proposed trust entries. The rules engine does every calculation. An authorised person approves each consequential action before it executes; the approval binds to the exact preview, and any change voids it. Signatures stay with the signer. The AI cannot grant itself permissions or bypass controls. FD-12 (the platform never moves money) and FD-17's four parts stand. AIW-D44 is superseded; AIW-D55, D72 and D77 are amended.

**Read first.** AW-1-37 to AW-1-51, AW-1-101, AW-1-103, CN-AG-06 changes 4 and 6, and many tests still describe the **old** ban. The knock-ons are the Lead's (autonomy model E16) and are listed in §7.3. Below, the ordinary path follows AIW-D103 and marks where AW-01 still says otherwise.

### 5.1 The ordinary path

| # | Step | Who or what acts | Control that enforces it | Tests (all Not run) | Prototype |
|---|---|---|---|---|---|
| 4.1 | Work not yet billed is listed every Monday and on a milestone or payment | Rules | AW-1-98 (excludes unsigned retainers "cannot be invoiced yet", no fee schedule "bill manually", paused clients) | TC-AW1-140 | Not shown |
| 4.2 | The Billing AI prepares an invoice: party per the case's Bill to, currency, terms, typed lines with source references | Rules assemble and calculate (lines, tax preview, totals) | AIW-D103 points 1 and 2; AG-6-2, AG-6-3, AG-6-8 (AG-06 v1.7). AW-1-101 still says "Approval opens the builder pre-filled and saves nothing" (knock-on) | TC-AW1-029; TC-AW1-047, -144 **contradict AIW-D103** | Not shown |
| 4.3 | The preview is shown as one approval item, **asked now** in both presets, never in an approve-all | Rules render | Autonomy c.2 row 12; c.4 ("Rows 12 to 14 are always asked one by one"); (f) item 5a | no test | Not shown |
| 4.4 | An authorised person approves; the approval binds to the exact preview | Person (holds `agent/invoice:create`, and `agent/invoice:issue` if issuing) | AIW-D103 point 3; AG-11-58; AG-11-61 (rendering version); AG-11-57 (execute once). Which act is approved (create the DRAFT, or issue) is undefined: **G-7** | no test | Not shown |
| 4.5 | The platform creates and, where approved, issues the invoice; the number is assigned at issue; tax is frozen at issue | Rules [WS1 assumed] | AG-6-4, AG-6-5, AG-6-6 | no test (WS1) | Not shown |
| 4.6 | Funds designation (TRUST or OPERATING) on every client-money record | Person, or Rules where an automatic line's source is set (CN-AG-06 §13 item 10 open). Whether the AI may propose it is unclear (**G-7**) | FD-17 (a); AW-1-101 (person sets it, old design) | TC-AW1-144 (old design) | S: screen 5 (Record payment needs a designation chosen by the person) |
| 4.7 | A proposed trust entry is prepared for a holder of the trust key to approve | AI prepares; Rules calculate; Person approves | AIW-D103 (AIW-D72 amended). Conflicts with AG-6-46 and AG-6-47 ("never lendable"; "No AI assistant SHALL post a trust entry") as CN-AG-06 change 6 states them: team question E16 | TC-AW1-048, -049, -143, -247 **contradict AIW-D103** | Not shown |
| 4.8 | A payment notice is linked by a person; candidates listed; the person types the amount; the person saves the payment | Person links; Rules list; Person records | AW-1-96, AW-1-97; AG-6-19, AG-6-20, AG-6-21 (no overpayment) | TC-AW1-137, -138, -139, -229, -233 | S: screen 5 (Payment match, Record payment modal) |
| 4.9 | Online payments are recorded once per processor event | Rules [WS1 assumed] | AG-06 v1.7 §3.3 ("each event is processed exactly once") | no test (WS1) | Not shown |
| 4.10 | A personal reminder once the reminder sequence has run out | AI drafts; a licensed colleague or the Owner approves (the Billing role cannot send) | AW-1-99; AW1-D20 | TC-AW1-141 | Not shown |
| 4.11 | Refunds: "prepares, a person approves" (AIW-D77 as amended by D103); no credit note in version 1 (FD-11) | AI prepares; Person approves | AIW-D103; AW-1-103 still says "never propose a refund" (knock-on) | TC-AW1-147 (old design) | Not shown |
| 4.12 | Weekly money note quoting only figures the Reporter computed | AI words; Rules compute | AW-1-102 | TC-AW1-146 | Not shown |

### 5.2 What can go wrong

| Failure | Expected behaviour | Covered by | Status |
|---|---|---|---|
| **Missing facts** (no signed retainer; no fee schedule; no source for a line's designation) | Unsigned retainer: refused, "cannot be invoiced yet". No fee schedule: "bill manually" (AW-1-98, AW-1-101). Missing designation source: no named stop (CN-AG-06 §13 item 10 is open). | AW-1-98, AW-1-101 | **Partly. GAP G-18** |
| **Contradictory facts** (party currency differs from a line's currency; a time entry billed in two places) | An invoice is in one currency (AG-6-2). Other contradictions have no named stop. | AG-6-2 | **Partly. GAP G-18** |
| **Correction after drafts exist** (a time entry or fee changes while the invoice preview waits; or after issue) | Before approval: the item re-renders stale and the old rendering cannot be approved (AG-11-61). After issue: the invoice is immutable; corrections go by a new invoice or refund (AG-6-6), and credit notes are out in version 1 (FD-11). A waiting payment match is cancelled when the invoice is paid by hand (AW-01 §9). | AG-11-61; AG-6-6; FD-11; AW-01 §9 | Covered |
| **Tool or provider unavailable** | Invoice and trust-entry preparation is rules only and needs no model. Only the reminder draft and the money note are skipped, recorded and tasked (AW-1-53). The Biller or the processor failing: retried, then dead-lettered (AG-11-26, AG-11-27); webhooks retried and idempotent (AG-06 §3.3). | AW-1-53; AG-11-26, AG-11-27 | Covered |
| **The delegating person's permissions change mid-job** (the bookkeeper loses `agent/invoice:create`) | Preparing needs the key in the subset and held now, otherwise it is refused (AW-1-10). Approval needs the same permission as the act by hand (AG-11-58). A suspended bookkeeper's run never starts (TC-AW1-066). A waiting proposal stays with someone who cannot decide it. | AW-1-10; AG-11-58; AW-1-50 | **Partly. GAP G-6** |
| **The same job or step runs twice** | The double-run check, with the installment's own status (AW-1-18; AG-6-9). Execute once under the item's key (AG-11-57). Processor events processed exactly once (AG-06 §3.3). The same unbilled line can sit in two pending proposals, and the double-run key parts are not defined for the newly allowed acts. | AW-1-18; AG-11-25, AG-11-57; AG-06 §3.3 | **Partly. GAP G-16** |
| **Different people approve different parts** (the bookkeeper approves the invoice; a trust-key holder approves the trust entry; a licensed colleague approves the reminder) | Each under its own key (AW1-D20; AG-6-46 for trust). Nothing links them: an invoice can be issued while its trust entry is rejected, leaving FD-17's mandatory designation unsupported by a ledger entry. | AW1-D20; AG-6-46 | **Partly. GAP G-17**; E16 team question |
| **The approved action differs from its preview** | AIW-D103: any change voids the approval. AG-11-61 refuses an approval whose rendering changed. Two parts are undefined. First, which fields are bound: the invoice number is assigned only at issue (AG-6-5), so it cannot be in the preview. Second, tax is computed and frozen at issue (AG-6-4), so a rate change between approval and issue changes the total. | AIW-D103 point 3; AG-11-61 | **Partly. GAP G-7** |

**Regulatory flags (unconfirmed, AIW-D94).** Trust money is the most regulated area in the journey. FD-17's machinery resolves from the Practice Pack. What a regulated firm may let software prepare in its trust records is Unknown; the counsel-pack question CQ9 is now unconfirmed. The team's own rules keep the trust keys "never lendable" (AG-6-46), so AIW-D103's "proposed trust entries" cannot work until the team answers E16.

---

## 6. New mechanisms proposed (only where a requirement cannot otherwise be met)

Each is *Proposal — not approved*. Each reuses existing controls; none designs the team's product mechanics.

**M-1. A rule-driven lead chat (closes G-1).**
- *Customer problem.* AIW-D102 promises a chat at launch, but no requirement says what it is. A lead on a firm's site expects quick answers outside office hours, and the firm cannot let a model talk to leads freely (FD-16; AIW-D41; classification §3.4).
- *Built on.* Published firm templates (AG-12; AG11-D12) as the only answers. Selection by a rule: the guided intake flow, a menu or a keyword (AW-1-46 "chosen by a rule, never by a model"). The facts-needed list of AW-1-93. The send-step refusal of marked templates to leads (AG-11-115). Lead creation and dedup (AG-2-5, AG-2-14, AG-2-15). Hand-off to a person through a task (AG11-D1 internal action).
- *Not included.* A model choosing among approved answers (E15) and any AI-written reply sent automatically. Both need the separate decision AIW-D102 names.
- *How verified.* Tests that every chat answer is a published template version chosen by a rule, that a marked template is refused to a lead, that the chat works with AI off, and that an unknown question hands off to a person. The surface itself is the team's to build (a need, not our design).

**M-2. A pre-run evidence check before any AI-started assessment (closes G-3, with G-2).**
- *Customer problem.* A firm must never be shown an assessment computed over facts the file itself contradicts. AIW-D98 orders a stop, but nothing defines when.
- *Built on.* The Qualifier's own missing-input list (AG-3-12). The stale flag (AG-3-29). Open Checker findings on gate inputs (AG11-D4; the Deficiency Library, AG-07). Values still PROPOSED on gate inputs (AG-9-45). The stop is the locked row 10 of the autonomy model. Lead facts that are self-reported are **not** a stop; they are named on the result (AG-3-25 stamp).
- *How verified.* Tests that the run stops with a named failure when (a) a gate input has an open Checker conflict, (b) a gate input is still proposed, or (c) the pack is newer; and that a lead with complete self-reported facts is assessed and labelled as such.

**M-3. A per-draft record of the value versions it used (closes G-5 and G-11, and helps G-12).**
- *Customer problem.* AIW-D100 promises that a correction refreshes every affected draft before approval. Without knowing which drafts used which value, a corrected or rejected value can survive in a letter or form.
- *Built on.* The provenance every approval item already shows (AG-11-56). The provenance view (AW-1-23). The facts-used footer (AW-1-84). The stale and cancel rule (AG-11-61), widened from "the record changed" to "an input value changed status or was corrected". AW-1-71's rule that a still-proposed value blocks ready-for-review.
- *How verified.* Correct one value in the bundle: every draft that listed it re-renders and the old renderings cannot be approved. Reject one provisional value: every draft that used it is flagged and cannot be approved until re-rendered. A line whose inputs are still provisional cannot be approved (values first). The team's answer on E14 (the Filler and provisional values) is needed first.

**M-4. Bind each consequential approval to named fields (closes G-7; also the assessment row in §4.2).**
- *Customer problem.* AIW-D103 says the approval binds to "the exact action previewed". Without a named list of bound fields, a total recomputed at issue or a different pack version could run under an old approval.
- *Built on.* The action's idempotency key carried on the item (AG-11-25, AG-11-57). The rendering version the server checks (AG-11-61). The engine's preview endpoints (AG-6-8). The pack version stamp (AG-3-25).
- *Fields (Proposal, for the Lead and the team).* Invoice: party, currency, every line (kind, quantity, unit price, discount, tax treatment), tax and totals as previewed, designation per line, and whether the act is "create draft" or "issue". The invoice number is excluded (assigned at issue, AG-6-5). Trust entry: client, amount, direction, the linked invoice or milestone (FD-17 (b)). Assessment: profile snapshot and pack version.
- *How verified.* Change any bound field, or let a tax rate change between approval and execution: execution is refused and a fresh preview is raised. Change an unbound field (the number): execution proceeds.

---

## 7. Test and prototype coverage

### 7.1 Coverage by journey (counts of journey steps; P = paper, S = prototype, E = executed)

| Journey | Steps | Steps with at least one existing test case | Steps whose tests contradict a 12 Oct decision | Steps shown in the prototype (S) | Steps executed (E) |
|---|---|---|---|---|---|
| 1 Intake and booking | 15 | 11 | 1 (1.7: TC-AW1-124) | 1 (1.3, delegation only) | 0 |
| 2 Documents and file preparation | 17 | 14 | 0 | 4 (2.2, 2.5, 2.15 partly, 2.17) | 0 |
| 3 Assessment and review | 10 | 4 (3.6 nearest only) | 0 directly; TC-AW1-124 contradicts the decision behind 3.3 | 1 (3.9), plus 3.6 nearest only | 0 |
| 4 Billing preparation | 12 | 8 | 4 (4.2, 4.6, 4.7, 4.11) | 2 (4.6, 4.8) | 0 |

### 7.2 What the prototype actually demonstrates (S)

Built on AW-01 v0.5 and AW-02 v0.6 (its About page), before AIW-D92 to D105. Six screens:
1. **Needs you**: a readiness report with approve-all gates (uncertain values opened first, one value held out and typed, a private agreement alarm), accept or reject with a reason, and a paused item that goes stale on release.
2. **Delegation**: set up, accept, decline, withdraw, switch off (paused) and on (stale), end (waiting item cancelled).
3. **AI provenance** on one case.
4. **Practice answers** (rule-built, optional AI summary line, AI off, untested pack).
5. **Payment match** and the product's Record payment screen (the person picks method and designation).
6. **AI switch**: provider record, AI switch lock, assistant switches, safeguard values, spend caps.

**Not demonstrated:** intake, the lead chat, template sends, the AI running an assessment, explanations, the end-of-job bundle, the presets and the role-by-action grid, earned Auto, invoice or trust-entry preparation, binding to a preview, correction propagation, duplicates, permission changes mid-job. The prototype shows the old ban on drafts and trust entries in its tags.

### 7.3 Tests that now contradict a ratified decision (for the Lead's knock-on list)

| Test | What it asserts | Decision it contradicts |
|---|---|---|
| TC-AW1-124 | "the assistant never runs the assessment and tasks the lead's owner instead" | AIW-D96 |
| TC-AW1-047, -144 | Approving a proposed invoice creates no invoice record; the builder opens with no designation | AIW-D103 point 1 (AIW-D44 superseded) |
| TC-AW1-048, -247 | Any assistant money or trust entry is refused | AIW-D103 (prepare, a person approves) |
| TC-AW1-049, -143 | No assistant output carries a trust list or figure | AIW-D103 (AIW-D72 amended: proposed trust entries) |
| TC-AW1-147 | No refund is proposed | AIW-D103 (AIW-D77 amended) |
| TC-AW1-246, -248, -249, -250 | The server refuses deleting, export, settings changes, signature-flow acts | AIW-D103 (deletion requests, exports, settings changes and signature workflows may be prepared) |

The AW requirements behind them (AW-1-37 to AW-1-51, AW-1-88, AW-1-89, AW-1-101, AW-1-103) need the same knock-on pass. AIW-D96 lists AW-1-88 but not **AW-1-89**, whose first words, "Only on a new assessment a person ran", also contradict it.

---

## 8. For the Lead

**Proposed rules or decisions (for `proposals.md`; this maker could write only this file).**
1. *Rule:* every 12 Oct decision that adds a new path for effects (the bundle, earned Auto, template sends in a job, AI-run assessment, AI-prepared consequential actions) gets a failure walkthrough like this one before it is built in, because the old one-item-at-a-time controls do not reach it automatically.
2. *Decision (the Lead's, on our autonomy model):* reword row 4 from "verified values only" to AIW-D98's "missing, stale or conflicting evidence" (G-2).
3. *Decision:* adopt M-3 and M-4 as AW requirements (Proposal).
4. *Team questions to add to the list:* re-routing on lost permission (G-6); AG-3-29 stale on input change (G-13); whether the Checker compares lead answers (G-19); the chat surface (G-1); E14 and E16 (already open).

**Open questions.**
- Does the founder's "maximum autonomy" (AIW-D95) accept that a split bundle (officer and consultant) needs a strict values-first order (G-11)? This adds one wait in two-person firms.
- For an invoice, should one approval cover create **and** issue (fewer clicks), or should issuing be a second bound approval because it reaches the client? Recommendation: one approval if the preview shows the issued form; otherwise two.
- PROGRESS.md "Agent log" lines for this task could not be appended (G-20).

**Sources used (all local; nothing written outside this file).** `README.md` §0 and §5; `NEXT.md`; `decisions.md` AIW-D81 to D105; `design/ai-autonomy-model-2026-10-12.md` (latest file; header reads revision 3); `design/rules-ai-classification-2026-10-12.md`; `handbook/ai-team-profiles.md`; `requirements/AW-01-firm-ai-assistants_v0.1.md` (document v0.6); `requirements/tests/AW-test-cases.csv` (436 rows); `requirements/change-notes/CN-AG-06.md`; `prototype/index.html`. Team files from `sources/drive-snapshot-2026-10-11/02-functional-requirements/agent/`: AG-11 v1.12, AG-03 v1.4, AG-09 v1.8, AG-06 v1.7, AG-02 v1.9, AG-04 v1.5. AG-07 was not read in full for this walkthrough; where AG-07 is cited, it is through AW-01's citations.
