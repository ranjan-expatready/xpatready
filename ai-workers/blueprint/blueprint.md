# Expat Ready AI layer: the blueprint

*Workstream 2, Step R deliverable (AIW-D86, D88). Maker's draft, 13 Oct 2026. It goes to the adversarial checker, then the Lead, then the founder.*

**What this is.** This is the single entry point for the AI layer. It consolidates and traces the decisions already made; it redesigns nothing. The detail stays in each topic's one home, and this file points there. It restates no team requirement: those are cited by ID and version from `sources/drive-snapshot-2026-10-11/` (README §0 rule 3, AIW-D22). It names no person, only roles (AIW-D35).

**The files of this blueprint:**
- this file;
- `traceability.csv`: one row per journey step, 84 rows, with user stories, register IDs and simulation results;
- `run-next.md`: what each test needs before it can run;
- `simulation-run-2026-10-13.csv`: the prototype run of the bucket (a) tests. It is simulation evidence only, never "Executed".

**Specifications cited:** AW-01 v0.8 and AW-02 v1.0 (document control, 13 Oct 2026).

**Decisions it rests on:** AIW-D81 to D117, with the AIW-D98 and AIW-D106 notes (`decisions.md`), and the Lead's rulings in `proposals.md` (rows of 12 Oct).

---

## 0. Status and labels

Every statement in this blueprint carries one of four evidence levels. They are never mixed.

| Label | Meaning | Where the proof is |
|---|---|---|
| **Specified** | Written in a team requirement (Drive snapshot of 11 Oct) or in our build specifications: AW-01 v0.8, AW-02 v1.0 and the change notes | The cited ID |
| **Simulated** | Shown in the clickable prototype, `prototype/index.html` (updated 13 Oct for AIW-D107 and D117; made-up data; no rules engine runs and no AI model is called) | The screen named; the result in `simulation-run-2026-10-13.csv` |
| **Implemented** (or **Partly implemented**) | Found in the 10 Oct code copy, `code/ERv2-sanitized@042be70-2026-10-10/`. "Partly" names what is missing. | The file cited |
| **Executed** | A test was actually run and has a recorded result | The test result |

**Where we stand today (13 Oct 2026):**
- **Executed: nothing.** The test file has 500 rows: 492 Not run and 8 Withdrawn (`run-next.md`).
- **Implemented: none of the AI layer.** Two journey steps are **partly implemented** in Workstream 1 code:
  - step 3.4, the assessment engine, which has no run type (AG-3-25);
  - step 2.4, clean-only serving of documents, with a fake scanner.

  The rule-based Filler and an event bus also exist (§5; `run-next.md` (b)).
- **Simulated:** 40 of the 84 journey steps, some only in part. 27 tests were played on the prototype: 23 passed and 4 failed **in simulation** (`simulation-run-2026-10-13.csv`).
- **Specified:** the other 42 steps.

**Assumption, labelled (AIW-D98, extending AIW-A1).** Workstream 2 is designed against a Workstream 1 product that is complete and tested, including the rules engine and the packs. **This is assumed, not verified.** Rule correctness belongs to Workstream 1; AI quality belongs to Workstream 2. Three facts sit against the assumption:
- no Canada pack is authored;
- the team's SA1B-D18 lets pack rules publish untested (flagged for the team);
- the code copy holds none of the firm-side approval machinery (AG-11 Needs you, approval items, AI run log).

**Legal readings** anywhere in our files are the Lead's guidance, "Unconfirmed: no counsel (AIW-D94)".

---

## 1. Product map: the team's modules with the AI layer on top

The one home for every capability's class (rules only / AI explains / AI language / person only) is `design/rules-ai-classification-2026-10-12.md` (Tables A and B). The one home for the skills is `handbook/ai-team-profiles.md` §4; skill numbers [n] below refer to it. Product AI (it runs for every firm, whatever teammate is on) is marked **PAI**. "—" means no AI on that module.

### Firm side (Agent console, AG-01 to AG-18)

| Team module (version) | AI layer on it | Main AW items |
|---|---|---|
| AG-01 Firm setup v1.18 | Delegation set-up and acceptance; the licensed-user fact is shown, never checked | AW-1-5 to AW-1-12 |
| AG-02 Leads v1.9 | Intake AI: lead chat topic sorting (AIW-D107), answer extractor [8], lead fact request [22b], stage-move proposals [21] | AW-1-87, 89 to 94, 138, 145 |
| AG-03 Assessment v1.4 | Assessment run started by the AI, calculated by rules [22c] (AIW-D96, D117); staff explanation (AIW-D98) | AW-1-131, 132, 133 |
| AG-04 Booking v1.5 | Booking through the Scheduler from the chat; consultation summary [3] | AW-1-95, 138(b) |
| AG-05 Retainer v1.9 | Signature workflow prepared, never signed (AIW-D103) | AW-1-42, 144 |
| AG-06 Billing v1.7 | Billing AI: invoice and trust-entry preparation [21], payment-notice reading, reminder [1], money note [4] | AW-1-96 to 103, 139 to 141, 146 |
| AG-07 Case core v2.7 | Case Officer's AI: upload and readiness check [19], form preparation [7], letters [2], end-of-job review, portal filling (AIW-D113), prepared-file count | AW-1-69 to 75, 83, 84, 134, 135, 147 |
| AG-08 Questionnaire v1.7 | Answer extractor [8] | AW-1-94 |
| AG-09 Documents v1.8 | **PAI** Reader (type, values, letter dates); verdicts [19]; filing labels (earned Auto) | AW-1-15, 76 to 80, 136 |
| AG-10 Communication v1.10 | **PAI** Sorter; message hand-off [20]; client drafts [1] | AW-1-79, 82 |
| AG-11 Automation v1.12 | The Conductor runs every step; approvals, presets and grid, end-of-job review, earned Auto, template sends, AI run log | AW-1-1, 2, 16 to 36, 127 to 137 |
| AG-12 Templates v1.2 | Rule-chosen templates as automatic sends and as chat answers (AIW-D105, D107) | AW-1-46, 137, 138 |
| AG-13 Tasks and audit v1.12 | DELEGATED audit entries; Resolve tasks [22] | AW-1-21, 66, 70 |
| AG-14 Reporting v1.11 | Practice answers (a product feature) plus the summary line [P]; AI measures | AW-1-109 to 121 |
| AG-15 Client portal management v1.7 | — | — |
| AG-16 Firm settings v1.13 | Teammate switches, stricter safeguard values, settings changes prepared (AIW-D103) | AW-1-125, 143 |
| AG-17 Corporate and LMIA v0.6 | Job-duties comparer [5]; LMIA reader [6] (whose AI call: to be confirmed by the team) | AW-1-85 |
| AG-18 Import v1.2 | Firm field mapper [10]; old-note date reader [9] | AW-1-106 |

### Platform side (Super Admin, SA-01 to SA-12)

| Team module (version) | AI layer on it | Main AW items |
|---|---|---|
| SA-01 v2.2 and SA-01B v1.2 Packs | Pack author's AI [11 to 15, 23] | AW-2-42 to 58 |
| SA-02 Tenants v2.21; SA-10 Support v2.5 | Support AI [16 to 18, 21b]; cross-firm aggregates only (AIW-D110) | AW-2-61 to 73, 79 |
| SA-03 v2.17 and SA-04 v2.17 Plans and billing | Workflow pricing: needs team changes T1 to T18 (`commercial/workflow-pricing-2026-10-12.md` §3.3) | AW-1-75 |
| SA-06 RBAC v3.3 | Keys that can be lent to an AI teammate | CN-SA-06 |
| SA-08 Rails v2.4 | AI provider record (Canada, passed test call); government page rail | CN-SA-08 |
| SA-09 Analytics v2.2; SA-11 Audit v2.7; SA-12 Flags v2.7 | Aggregated AI measures; privacy-request drafts; kill switches, spend caps, recall | AW-1-56, AW-2-27 to 29, 76 |

**Client portal (CP-1 to CP-9).** No AI, as the team specifies it (classification §4.3).

**Visual.** The coded prototype's screen 1 shows the AI team page (AIW-D85). A separate picture of this map is not produced here: one outcome per step (AIW-D28).

---

## 2. Product requirements (PRD)

### 2.1 Goals

1. **Every firm job a person does in Expat Ready, an AI teammate can prepare the same governed way.** The product's rules decide; the AI prepares language; a named person approves what matters (AIW-D84, D92, D95).
2. **Fewer interruptions without blind autonomy.** Approvals are grouped at checkpoints. Consequential acts are bound to the exact preview (AIW-D100, D101, D103).
3. **Sellable honestly.** The story is "An AI team for your immigration practice" (AIW-D99). The moat is the combination (AIW-D97). Rules are never called AI (AIW-D92). Repeatability is worded as the founder worded it (AIW-D109; framework §1 item 8).

### 2.2 Users

**At the firm:**
- the Owner, Admin, Case Manager, Case Officer and Billing / Finance roles;
- a custom intake role;
- the licensed consultant who approves;
- **first buyer:** "Solo and small RCIC practices, 1–5 people" (FD-19).

**At Expat Ready (never sold):**
- the content author;
- support staff and the account manager;
- the Platform Owner.

**Leads and clients** are reached only through approved templates, through approved drafts, or through a person.

The six AI teammates are in `handbook/ai-team-profiles.md` §1 (AIW-D90).

### 2.3 Scope: the full agreed scope in Release 1 (AIW-D82, D106)

**Six teammates and their skills** (handbook §4: 26 teammate skills plus the summary line).

**Added on 12 and 13 Oct,** each specified in AW-01 v0.8 or AW-02 v1.0 (handbook skills 24 to 29 since 13 Oct):
- **Lead chat with AI topic sorting** (AIW-D107). AW-1-138.
- **AI-started assessment** (AIW-D96, as amended by AIW-D117). AW-1-131, AW-1-132.
- **Staff explanation of a stored result** (AIW-D98). AW-1-133.
- **Preparing consequential acts** (AIW-D103): invoices, proposed trust entries and returns, exports, deletion requests, settings changes, signature workflows. AW-1-140 to AW-1-144, plus AW-2-78 on the platform side.
- **Reading a payment notice.** AW-1-146.
- **Assisted government-portal filling** (AIW-D113). AW-1-147.
- **Presets, grid, end-of-job review, correction refresh, earned Auto, template sends inside a job** (AIW-D100, D101, D104, D105). AW-1-128, AW-1-134 to AW-1-137.
- **Workflow pricing count** (AIW-D111, D114 to D116). AW-1-75.
- **Support AI cross-firm aggregates** (AIW-D110). AW-2-79.

**Named exclusions: only those the founder decided.**

| Exclusion | Decision |
|---|---|
| Free typed questions to Practice answers, and questions over documents and messages: version 2 | AIW-D39; AIW-D106 point 1 |
| Widening Practice answers' sources, and consultation recording: after the pilot | AIW-D62 |
| Any automatic AI-written reply to a lead: needs a separate decision with the team | AIW-D102, D107 |
| Credit notes: never in version 1 | FD-11 |
| French labels from the Pack author's AI: dropped | AIW-D79 |
| Support AI reading across firms' client records | AIW-D110 |
| Pricing per teammate: the AI team is priced by workflow pricing | AIW-D111, D115 |
| Team-phase dependencies: only the per-teammate emergency switches and the data-residency declaration were pulled into Release 1. Everything else stays in the team's phase, and the AI step that depends on it waits and works without it (for example, pin totals shown as unavailable) | AIW-D78 |
| Form filling until the team's FD-5 route exists: the pilot runs without form filling and says so; the form duty stays specified | AIW-D43 |

WhatsApp from a teammate waits on the team's SA8-X1. That is a team dependency, not a founder exclusion.

### 2.4 Non-goals: limits the founder fixed

These are never designed, sold or tested as possible:
- **The AI decides nothing.** It gives no advice and makes no eligibility, pathway or outcome decision (FD-16).
- **The AI never tells a lead or client their eligibility,** including "possibly eligible" (AIW-D41, D117).
- **The AI never signs, never submits to or pays a government authority, and never presses a declaration** (AG-11-54 preserved by AIW-D113).
- **The platform never moves money** (FD-12).
- **The AI never grants itself permissions and never bypasses product controls** (AIW-D103 point 5). The list of settings it may never change (roles, delegations, switches, safeguards, presets, the grid) is our AW-1-143.
- **No claim that the AI detects wrong rules** (AIW-D98).
- **No "AI-assisted" label** on assessments, scoring or any rules-only capability (AIW-D92).
- **No time or accuracy figure until measured** (AIW-D99; proposals.md 12 Oct).

### 2.5 Success measures (measurable from the product's own records)

The one home is `commercial/ai-value-map-2026-10-12.md` §c. **No target numbers are set:** they are set from pilot firm one's measured baseline (AIW-D112). Until then every figure is Unknown.

| Measure | Records | Gap |
|---|---|---|
| Elapsed days from new case to a file ready for review | Run start (AW-1-69); readiness item times (AG-11-112, as proposed in CN-AG-11 change 6) | Needs register TC-87 |
| Person acts per file, with and without a teammate | Audit modes (AG-13-68, as proposed in CN-AG-13 change 2); step counts (AW-1-28) | Needs register TC-20 |
| Approval visits per file, by preset | Approval items (AG-14-39, as proposed in CN-AG-14 change 2; the number collides with an older Doc 3 ID) | Needs register TC-101 |
| Share of items approved unchanged, edited or rejected, per skill | `ApprovalItem` status and edits (AG-11 §7) | — |
| Findings per accepted file; stops per 100 runs, by reason | Reviewer findings (AG-07 §3.6); `AiRunLog` outcomes | — |
| Hours from client message to reply; age of items in Needs you; deadline items decided in time | AG-10 §7; AG-14-39 (as proposed); AG-11-100 | Needs register TC-101 for the AG-14-39 part |
| Model cost per prepared file, per skill | `AiRunLog` cost fields (CN-AG-11 change 14, closing G1) | — |
| Review minutes per file | Time an item is first and last opened | **G2, a team need** |
| Per skill: driving-test accuracy, pass^k, shadow agreement, health light | AW-1-119, AW-1-120; AIW-D83 | — |

---

## 3. AI team and skills

**The one home is the handbook,** `handbook/ai-team-profiles.md`:
- §1: the six teammates;
- §2: three kinds of AI-related capability, never mixed;
- §4: the skill catalogue, which **already holds the reuse map** (the "Used by" column, and "Most reused: skill 1 (four teammates); skills 3, 4, 21 and 22 (three each)");
- §5: how a skill earns its place.

No second reuse table is added here.

**Catalogue updated 13 Oct.** The handbook now carries skills 24 to 29:
- 24: chat topic sorter (AW-1-138(b));
- 25: stored-result explainer (AW-1-133);
- 26: payment-notice reader (AW-1-146);
- 27: assisted portal filling (AW-1-147);
- 28: export and deletion request preparation (AW-1-142);
- 29: signature workflow preparation (AW-1-144).

Skill 22c is reworded for AIW-D117. This blueprint assigns no skill numbers of its own.

---

## 4. The agreed journeys

Each journey below is summarised in numbered steps. For every step, `traceability.csv` holds its class, the team IDs, our IDs, the team change, one acceptance criterion, the tests and the evidence level. The full failure analysis of journeys 1 to 4 (seven failure kinds each) is in `design/journey-walkthroughs-2026-10-12.md` §2 to §5. That paper predates AIW-D107, D113 and D117, so read its steps through this section. Journeys 5 and 6 have no walkthrough there; their edge cases are listed here, taken from AW-1-147 and AW-1-128 and the autonomy model.

### Journey 1: intake and booking, with the conversational AI for leads (AIW-D102 as amended by AIW-D107)

**Steps:**
1. **1.1–1.2** An enquiry arrives. A thank-you template and a call task follow, by rules.
2. **1.3** The Intake AI's run opens.
3. **1.4** Guided intake questions go out from rule-chosen templates.
4. **1.5** In the lead chat, the Sorter maps a typed question to one approved topic, and a rule picks the published answer.
5. **1.6** Eligibility, status, legal, no-topic and low-confidence questions are handed to a person.
6. **1.7** With AI off, the chat keeps its menu and hands everything else to a person.
7. **1.8** The Reader proposes answers from the lead's reply; a person accepts them as unverified.
8. **1.9** The AI starts the assessment (journey 3).
9. **1.10** One fixed rule picks the next move.
10. **1.11** A consultation offer goes from a template.
11. **1.12** Where no template fits, a drafted reply waits for licensed approval.
12. **1.13** A stage move is proposed for the rep.
13. **1.14** The lead books through the Scheduler.
14. **1.15** A consultation summary is drafted.
15. **1.16** Eligibility, including "possibly eligible", reaches the lead only through the consultant's share.
16. **1.17** The retainer and signing.

**Edge cases:**
- **Contradicting answer:** it needs its own check and blocks the assessment on that field (AW-1-145).
- **Provider down:** templates still go out, and drafts become one batched task (AG-11-71).
- **Permission lost mid-job:** the action is refused. Re-routing is team need G-6.
- **Duplicate lead:** offered as link or merge (AG-2-15).
- **Marked template to a lead:** refused at the send step (AG-11-115).
- **A lead as "client" under AG-11-53:** a team question (AIW-D107).

### Journey 2: documents and file preparation, with the end-of-job review (AIW-D100)

**Steps:**
1. **2.1–2.2** The case opens, the onboarding list goes once, and the run opens.
2. **2.3** Template chases go out inside the job, after the four checks (AIW-D105).
3. **2.4** Upload and virus scan.
4. **2.5** The Reader proposes values with their sources.
5. **2.6–2.7** Verdicts by rule. A rejection the client must act on is asked now.
6. **2.8** Clean values wait, provisional.
7. **2.9** Checker findings become Resolve tasks.
8. **2.10** Earned Auto for notes, tasks and labels.
9. **2.11** Government-letter dates are approved now and registered.
10. **2.12** Client replies, with licensed approval.
11. **2.13** Form drafts by the rule-based Filler.
12. **2.14** Letters with a facts-used list.
13. **2.15** The end-of-job review: values first; explicit checks for identity, consequential and conflicting values; skipped steps listed.
14. **2.16** A correction refreshes every dependent draft (M-3).
15. **2.17** Ready for review, by rule.
16. **2.18** Readiness report; its acceptance is the submission for internal review and the prepared-file count.

**Edge cases:**
- **Rejected provisional value:** flags its drafts (AW-1-135).
- **A value already sent:** creates a task for the file owner (G-12, in AW-1-135).
- **Split approvers:** values are approved first (G-11).
- **Provider outage:** skipped steps are listed (G-15).
- **Drafts from provisional values:** team question E14. The prototype assumes "yes".
- **Holding state:** team need E4.

### Journey 3: assessment and review (AIW-D96, D98 as amended by AIW-D117)

**Steps:**
1. **3.1** Trigger: no current assessment, an input changed, or the person asks.
2. **3.2** Pre-run check (AIW-D117):
   - **expected missing inputs never stop the rules engine.** It records an incomplete result with explicit gaps and invents no value;
   - **unreliable evidence stops the affected run and flags a person:** conflicting evidence, or stale evidence the assessment needs;
   - **unrelated work is never stopped.**
3. **3.3** The run starts automatically under the person's `agent/assessment:run`.
4. **3.4** The Qualifier calculates and stamps the result (**Implemented** in the code copy).
5. **3.5** The label: "Run by [AI teammate] for [person]; calculated by the rules, pack v[n]".
6. **3.6** The staff explanation, with sources and the pack version; every number is code-checked. **While the result is incomplete, explanations and actions that need a complete result pause,** and the AI keeps collecting the missing facts through approved questions or templates.
7. **3.7** Licensed review.
8. **3.8** Shared only by the consultant (AIW-D41).
9. **3.9** A newer pack version makes the assessment out of date and **triggers a re-run, not a stop** (AIW-D117 point 2).
10. **3.10–3.11** Internal review; a person submits.

**Edge cases:**
- **Repeated runs:** one run per change of input (G-14).
- **Correction to a shared assessment:** not flagged stale (team need G-13).
- **Pack version changes between approval and run:** the run pins the version it loaded (M-4).
- **Qualifier failure:** retried, then dead-lettered (AG-11-26, AG-11-27).

**AIW-D117 supersedes** the Lead's ruling M6 and the AIW-D106 note's wording on missing inputs. AW-01 and the tests are being updated in parallel; the rows touched are marked in `traceability.csv`.

### Journey 4: billing preparation and workflow pricing (AIW-D103, D111, D114 to D116)

**Steps:**
1. **4.1** Unbilled work is listed.
2. **4.2** The invoice is prepared, and the rules calculate it. A missing designation or a currency mismatch stops it with a named failure.
3. **4.3** The preview is asked now, never in an approve-all.
4. **4.4** The approval binds to the exact preview (M-4).
5. **4.5** The platform creates and issues the invoice.
6. **4.6** Funds designation.
7. **4.7** A proposed trust entry is approved by a trust-key holder; no money moves.
8. **4.8** Linked items show each other.
9. **4.9** Payment notice: a person links it, the Reader reads it, and the person types and saves the amount.
10. **4.10** Processor events are recorded once.
11. **4.11** Personal reminder.
12. **4.12** A return of trust money is prepared; never a credit note.
13. **4.13** The money note.
14. **4.14** **One prepared file per application,** counted on acceptance of its readiness report.
15. **4.15** Usage is shown; warnings at 80% and before the first paid extra file.
16. **4.16** In Trial and on a $0 Internal plan, files are counted but never charged.
17. **4.17** Extra files are billed at the listed price; discounts apply to the plan price only.
18. **4.18** Cost fields on every AI call.

**Edge cases:**
- **Tax rate changes before issue:** the approval is voided.
- **The same line in two proposals:** refused (G-16).
- **Invoice issued but its trust entry rejected:** flagged (G-17).
- **Our-reason failures and re-runs:** never billed (ruling M1).
- **Family child cases:** count once (ruling M2).
- **The firm's own spend cap:** a step it skips does not exempt the file.
- **SA-3 and SA-4 do not fit as written:** team changes T1 to T18.

### Journey 5: assisted government-portal filling (AIW-D113; AW-1-147)

**Steps:**
1. **5.1** The Platform Owner records the portal's terms-and-behaviour check before filling is enabled.
2. **5.2** Only tested field mappings for that portal and form version are used.
3. **5.3** A planned entry is built from verified values only.
4. **5.4** A licensed person approves it, by default under `agent/case:form-approve`, bound to the field list.
5. **5.5** Filling runs only in the representative's own signed-in session.
6. **5.6** Every value is read back; a mismatch stops.
7. **5.7** An unfamiliar field, page, dialog or action stops.
8. **5.8** Signing, declarations, payment and Submit stay with the person, and the effects before Submit are listed.
9. **5.9** An unsupported portal gets a copy-ready field sheet.
10. **5.10** Every filled field gets a DELEGATED audit entry.

**Edge cases (from AW-1-147 and AIW-D113):**
- **Planned entry differs from what was approved:** the approval is voided.
- **Session expires mid-fill:** stop and hand over to the person (from (b) and (e); not separately tested).
- **Portal changes its form:** the mapping is no longer tested, so it stops.
- **Terms check not recorded:** the field sheet only.
- **Effects before Submit:** notifications and other effects are listed first.
- **The in-session filling component:** a team need.
- **AG-11-94** ("models SHALL have no tool access"): the conflict is cited, not resolved (AIW-D93).

**Outages (AIW-D87):**
- **Firm AI switch off, provider record withdrawn, or an Expat Ready stop:** the teammate is paused and no filling starts or continues. The person fills by hand or uses the field sheet (AW-1-53, AW-1-56, AW-1-11; pattern tests TC-AW1-071, -081, -209; none specific to portal filling).
- **Portal unreachable or slow mid-fill:** the step stops with a named failure and hands control to the person (AW-1-147(e), AW-1-132). No test: our reading of (e), Proposal.

**Wrong output:**
- **A value lands wrongly in the portal:** caught by the read-back, which stops the fill (TC-AW1-298).

**Misuse:**
- **Instructions planted in a client document** can never become a field value or an action (AW-1-60, AW-1-127; TC-AW1-291).
- **Entering an unverified, proposed or AI-written value** is refused (AW-1-147(a); TC-AW1-297).
- **A crafted request to submit, pay or sign** is refused on the server (AW-1-48; TC-AW1-256, -300).
- **Approval by someone without `agent/case:form-approve`** is refused (AG-11-58).

### Journey 6: AI settings: presets, grid, earned Auto, switches (AIW-D101, D104, D103)

**Steps:**
1. **6.1** The default preset is "Review each step".
2. **6.2** "Review at checkpoints".
3. **6.3** The "Customise" grid: the teammate follows the column of its delegating role, and a cell never grants access.
4. **6.4** Floors and locks cannot be lowered.
5. **6.5** Changes need `agent/automation:set-autonomy` and are audited.
6. **6.6** Plain examples are shown on the screen.
7. **6.7** Earned Auto needs the Owner's approval with evidence and a sampling rate set from evidence, and drops back automatically.
8. **6.8** The AI may prepare an ordinary settings change, approved on its preview. Protected settings are refused.
9. **6.9** Teammate switches and the firm AI switch.
10. **6.10** Stricter firm safeguard values and spend caps.

**Edge cases (autonomy model §c.2 to §c.6):**
- **A cell set beyond the person's keys:** nothing is done or prepared.
- **A deadline-linked item under "checkpoints":** still asked now.
- **A failed sample check:** back to approval.
- **A material change** to the skill, model, instructions or pack: retest.
- **A firm value looser than the platform's:** refused.
- **Grid storage and screens:** team need E9.

**Outages (AIW-D87):**
- **Firm AI switch off, provider record withdrawn, or an Expat Ready stop:** every teammate pauses whatever the preset. Rules-based automation and the manual paths carry on, and waiting items go stale on release (AW-1-53, AW-1-56, AW-1-20; TC-AW1-071, -072, -081, -084, -209).
- **A skill that has earned Auto meets a provider outage:** its step is skipped and listed with the reason in the review (AW-1-134(d)). The skill never runs without its checks.

**Wrong output:**
- **A sample check fails after Auto is earned:** the skill drops back to approval (AW-1-136; TC-AW1-279).

**Misuse:**
- **The AI prepares a change to the grid, presets, safeguards, roles or switches:** refused (AW-1-143; TC-AW1-274, -249).
- **A person without `agent/automation:set-autonomy` changes a preset:** refused (TC-AW1-310).
- **A crafted request adds a never-lendable key, or a cell is set beyond the person's keys:** refused (AW-1-9, AW-1-129; TC-AW1-007, -292).
- **A firm sets a looser safeguard or a higher spend cap than the platform allows:** refused (TC-AW1-078, -214, -215).

**Steps with no acceptance test (gap list), recounted 13 Oct.** Five gaps are now closed: TC-AW1-320 (1.7), -321 (3.7), -322 (5.2), -323 (5.10) and -324 (6.6). Six steps still have no AW test:

| Step | What has no test | Owner of the test |
|---|---|---|
| 1.1 | Lead capture and duplicates | Team (Workstream 1) |
| 1.2 | Speed-to-lead seed | Team |
| 2.4 | Upload virus scan | Team; partly in code |
| 3.4 | Stamped assessment | Team; their unit tests exist in the code copy, not run by us |
| 4.10 | Processor events once | Team |
| 4.17 | Extra files billed at the listed price; discounts on plan price only | Team, after T1 to T18 |

**Partial coverage, also noted in the CSV:**
- 1.3: no test opens an Intake run directly. Owner: us.
- 4.3: no test checks that an invoice is excluded from approve-all. Owner: us.
- 4.8: AW-1-139 has no AW-01 user story. Owner: us.

---

## 5. Technical design summary

The detail stays where it is. Main pointers:

**Entities.**
- AW-01 §7: `Delegation`, `PersonaRun`, `ExpertQuestionRecord`, `HoldoutCheck`, and the fields added to team entities, listed by pointer.
- AW-02 §7: the platform entities.

**How a step runs.**
- A teammate is a bundle of recipes run by the team's Conductor under one person's delegation (AW-1-1; BR-42 in CN-AG-11 change 9).
- Model calls are AI Doer calls: Reader, Sorter, Writer, Checker.
- Read tools and action tools run under the person's own keys, and every effect is approved first (AW-1-127; AIW-D93). This conflicts with the team's AG-11-94, which is the team's to resolve.

**Controls added by the 12 Oct decisions:**
- binding to the exact preview, M-4 (AW-1-130; CN-AG-11 change 16);
- correction refresh, M-3 (AW-1-135);
- the stop check, M-2 (AW-1-132, as amended by AIW-D117);
- the end-of-job review (AW-1-134);
- presets and grid (AW-1-128);
- earned Auto (AW-1-136; CN-AG-11 change 17);
- cost fields on every AI call (CN-AG-11 change 14).

**Provider and switches.**
- AI unlocks only on a published provider record, in Canada, with a passed test call (CN-SA-08 change 2; AIW-D52, D69).
- Kill switches, spend caps and recall: SA-12 (CN-SA-12).
- Lendable keys: CN-SA-06 changes 1 and 8.

**All change notes:** `requirements/change-notes/` (33 files). **The team change list** (workflow pricing T1 to T18, and E4, E9, E14, E16, G-6, G-13, G2, AG-11-94, AG-11-60, SA1B-D18) is in framework §8 and in `commercial/workflow-pricing-2026-10-12.md` §3.3. `team-change-register-2026-10-13.csv` did not exist when this was written, so `traceability.csv` cites change-note IDs. The Lead swaps in register IDs when the register lands.

**What exists in the 10 Oct code copy.** None of the AI layer. Workstream 1 pieces it depends on (**Implemented**, not run by us):
- the pack assessment engine (`apps/api/src/spine/pack-assessment-*.ts`, `pack-policy-interpreter.ts`; model `PackAssessment` with input hash, result hash, engine version and pack version);
- the rule-based Filler (`apps/api/src/spine/filler.service.ts`);
- an event bus named Conductor (`apps/api/src/events/conductor-bus.ts`);
- the document virus-scan status (`apps/api/src/documents/document-av-status.schema.ts`; the scanner is a fake for now).

**What our search did not find** (detail in `run-next.md` (b)):
- an AI provider client;
- `AiRunLog`;
- approval items;
- AI delegations;
- firm-to-client invoicing;
- lead capture.

---

## 6. Evaluation and driving tests

| What | Rule | Home |
|---|---|---|
| Driving test per AI skill | A test set of made-up cases written by the immigration specialist and graded by a licensed expert. The skill switches on only above its bar, then spends 2 to 4 weeks in **shadow** (it prepares on real files, nobody sees it, accuracy is measured), then goes **live** with approval. The health light drops it back automatically. A failing skill stays off without holding the others. | AIW-D83; handbook §5; AW-1-119, AW-1-120; AW-2-39 |
| Rules-only skills | Tested like any product feature; they keep a health light | rethink-plan "Lead's calls" |
| Evaluation sets | E-1 to E-13 (firm), EV-1 to EV-12 (platform); E-11 planted instructions apply to every skill that reads client or firm text | handbook §7; AW-01 §11; AW-02 |
| Spread, not one run | Each case run k = 5 times (Proposal); report field accuracy, correct "not found" rate, **pass^k** and error rates per bucket | Accuracy research R11 |
| Fidelity to rules | Code checks every number, date, outcome word and rule ID against the engine's result; failure code `explanation_mismatch` | R7; AW-1-113, AW-1-133 |
| Repeatability | Fingerprint and replay each AI answer; a re-run is a new record. Wording per AIW-D109. Storing and replaying an AI output does not prove it correct. | R2; AIW-D109 |
| Reading | Exact source words checked by code (R5); vote only on a few high-stakes fields, kept only if measured to help (R6); confidence from our own signals, never the model's (R9) | Accuracy research §c |
| Published proof | An accuracy sheet per skill version, shown only once measured | R12; AIW-D99 |
| Test data | Made-up and versioned (R13). Use of real files with names removed: see §9 | R13; handbook §5 |
| Pilot firm one | The founder-consultant's practice, only after each skill passes its driving test and its shadow period. Clients are told in plain words; licensed review of every output; measures from product records. | AIW-D112; value map §c |

**Still Unknown:**
- the pass bars and floors (set with the immigration specialist);
- the named licensed reviewer (a founder action, AIW-D83).

---

## 7. What can run next

The detail is in `run-next.md`.

| Bucket | Count |
|---|---|
| (a) Prototype simulation, now | 25 |
| (b) The 10 Oct code copy | 0 |
| (c) Driving-test harness after the provider test | 20 |
| (d) Workstream 1 build | 440 |
| (e) Pilot | 1 |
| **Total Not run** | **486** |

The first 20 to run are all in bucket (a) and give simulation evidence only. Three are expected to fail and make up the prototype update list:
- AIW-D117: missing inputs do not stop the run;
- AIW-D107: the conversational AI is in Release 1;
- an eligibility question is handed off, not answered.

---

## 8. Superseded files and where they now point (for the Lead to archive; nothing has been moved)

| File | Becomes | Pointer it should carry |
|---|---|---|
| `design/rules-and-ai-framework-2026-10-12.md` (v2) | Superseded as "the one place that ties the AI layer together" | "Superseded by `blueprint/blueprint.md` (13 Oct 2026). §8's team list moves to the team change register." |
| `design/journey-walkthroughs-2026-10-12.md` | Keep as the failure-analysis appendix; its step tables are superseded | Header note: "Steps and test mapping now in `blueprint/traceability.csv`; read through AIW-D107, D113, D117." |
| `design/ai-carve-out-register-2026-10-11.md` | Superseded (built from the 9–11 Oct state) | "Team AI requirements by class: `design/rules-ai-classification-2026-10-12.md` Table A; step-level trace: `blueprint/traceability.csv`." |
| `design/ai-organisation.md` (Step 1 personas) | Superseded by AIW-D81, D89, D90 | "See `handbook/ai-team-profiles.md`." |
| `design/workers/catalogue.md`, `module-map.md` (W-nn) | Superseded by AIW-D89 (retired terms) | "Skills: handbook §4; product map: `blueprint/blueprint.md` §1." |
| `design/inventory/` | Superseded as a working file (9 Oct snapshot) | "Capabilities by module: classification Table A." |
| `design/ws2-baseline/` | Superseded as a working file (9 Oct snapshot) | "Reference index only; current trace: classification and `blueprint/traceability.csv`." |
| `design/ws2-improvements.md` | Superseded (9 Oct; its proposals are built into AW-01/AW-02 or decided) | "See AW-01 v0.7, AW-02 v0.9 and `decisions.md`." |
| `design/direction-review-2026-10-09.md` | History | "History. See `rethink-plan.md` and this blueprint." |
| `design/behaviours/` (Step 2) | **Keep for now.** AW-01 and AW-02 cite them as "[Spec: CA §…]" and moving them breaks those citations | Archive only with a path note in AW-01/AW-02 |
| `design/ai-autonomy-model-2026-10-12.md` (rev 5) | **Keep:** the one home for rows, presets and the grid | Needs an AIW-D117 note on row 10 and row 4 |
| `design/rules-ai-classification-2026-10-12.md` | **Keep:** the one home for classes | Summary items 4 and 5 still say the conversational AI is "later"; needs an AIW-D107 update |
| `handbook/ai-team-profiles.md` | **Keep:** the one home for teammates and skills | Needs the catalogue update in §3 |
| `prototype/index.html` | **Keep:** the simulation | Needs the three updates in §7 |

---

## 9. Open items found while consolidating

**Founder decisions.**
- **No founder question blocks the blueprint.**
- **One latent founder decision:** whether real client files with names removed may ever be used in skill test sets. The handbook §5 says "only on the founder's decision", and no decision records it. AIW-D112 covers real files only in the pilot, after tests on made-up cases. It is not needed until test sets are built.
- **One external founder decision:** FD-18, per-firm or per-seat pricing, due 30 Oct. It sets the plan price that workflow pricing sits on.

**Lead items:**
- the handbook catalogue update (§3);
- notes on the autonomy model and classification (§8);
- the prototype update list (§7);
- four tests to add (§4 gap list);
- the spend-cap ruling K6, which is open with the Lead.

**Team items:**
- the team change register; this blueprint uses change-note IDs until it exists;
- E4, E9, E14, E16, G-6, G-13, G2;
- AG-11-94, AG-11-60, SA1B-D18;
- T1 to T18;
- the in-session portal component;
- whether a lead is a "client" under AG-11-53.
