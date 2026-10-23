# Functional language, requirement quality and solution quality

18 October 2026 · Review method and findings for Solution 1. This supplements the existing seventh lens and seven-dimension scorecard; it is not a new product specification or another scoring framework.

## 1. Guidance checked and how it is used

| Primary guidance | Application to this artifact |
|---|---|
| [Canada.ca Content Style Guide](https://design.canada.ca/style-guide/), writing principles / plain language / content structure | Organise around the reader's task; use familiar, concrete terms and useful headings. Preserve the information needed to act. Adapt this method to our readers, not government branding |
| [GOV.UK: Writing for user interfaces](https://www.gov.uk/service-manual/design/writing-for-user-interfaces), short/direct copy / headings / tone | Put important words first; write helpful, formal copy; use labels that identify the content or action. Do not rely on colour or position alone |
| [NASA: How to Write a Good Requirement](https://www.nasa.gov/reference/appendix-c-how-to-write-a-good-requirement/), C.2 / C.4 | Check clarity, one obligation per statement, consistency, traceability, completeness and verifiability. Make the responsible actor/product explicit. Preserve unresolved values as unresolved; do not invent them to make prose look complete |
| [SEI: Active Reviews for Intermediate Design](https://www.sei.cmu.edu/library/active-reviews-for-intermediate-design-arid/) | Use realistic reader tasks to expose missing design detail before a full specification exists |
| [SEI: Architecture Tradeoff Analysis Method](https://www.sei.cmu.edu/library/architecture-tradeoff-analysis-method-collection/) | Relate solution choices to business needs, failure scenarios and tradeoffs; identify risks and evidence needed |

These references support the **review technique only**. They are not sources of Expat Ready behaviour. This is not a formal ATAM engagement, an ISO certification or proof of best-in-class superiority. NASA's distinction between product requirements and operational tasks is respected: this artifact intentionally includes a process/solution explanation, so actor activities are appropriate; later product requirements are written separately at their proper level.

## 2. Preserve business meaning before improving words

For each meaningful rewrite compare the old and new statements on:

**Actor → trigger/condition → action → data/person/form/version → obligation/authority → result/next owner → exception/hold/recovery.**

Every applicable element must retain its meaning. Avoid a mechanical sentence template where elements do not apply. Use the source requirement/decision as the comparison, not only the old wording: the old wording may already be wrong.

- Label accepted requirements, founder decisions, proposals and unknowns accurately. Do not turn “may” into “must”, a proposal into an agreed rule, or a warning into a block.
- Distinguish clearer wording from a changed requirement. A semantic correction must cite the source/amendment; a new business choice must be presented as such.
- Record before → after → reason → source → affected summaries/details/examples/tests for meaningful changes in the existing content ledger. String counts and percentage word overlap are not semantic proof.
- The founder permits missing requirements/scenarios/components to be raised. Add what an existing agreed need necessarily entails with its trace; label a genuinely new choice as Proposal, explain the concrete gap, and do not silently make it an accepted requirement. No unnecessary component just to make the solution sound sophisticated.
- Outside guidance supplies no immigration condition, data-access rule, role, approval or product feature. Source authority stays the recorded team masters/code and founder decisions. Do not claim a separate OneDrive master was checked unless its identity and content have actually been verified; the project's current indexed masters are on connected Google Drive.

## 3. Eight functional-content checks

| Check | Question applied to every content unit |
|---|---|
| Reader purpose | Does the heading identify the activity, record, rule or decision the reader needs, rather than describe our diagram machinery? |
| Actor and action | Is it clear who does what? Use an explicit actor in the sentence where needed; a short verb/object title can sit under an unambiguous actor label |
| Concrete object/context | Which government source, person, filing, form edition, field, profile or version does the statement mean? Avoid vague “material”, “it”, “them” and “ready” where different interpretations matter |
| Obligation/state | Is required/optional/proposed/unknown explicit? Are Blocked, Held, Warning, Advisory, verified and approved kept distinct? |
| Result and handoff | What observable output/state is produced, and who acts next? Do not describe a record as if it were an actor |
| Exception and recovery | When a check fails, what is held, who resolves it and what unaffected work continues? |
| Cross-level agreement | Do title, summary, diagram branch, panel rule, example and expected result express the same condition and outcome? |
| Comprehension and economy | Does necessary detail remain, with explained domain terms and no duplicated filler? Can two readers derive the same behaviour without the chat? |

Review units include headings, introductory text, card labels, actor descriptions, triggers, inputs/outputs, rules, examples, table captions/headers/cells, button/link text, tooltips, diagram labels, status messages, source/evidence explanations and footer. Do not limit the pass to canonical terminology or panel headings.

Examples of acceptable labels: **Purpose; Responsible roles; Start conditions and inputs; Processing steps; Output and next owner; Business rules; Exceptions and recovery; Worked example; Acceptance checks; Source evidence.** These are candidate labels, not mandatory empty fields on every reference panel.

## 4. Case initiation: the founder's 4A/4B suggestion

The underlying understanding is right: a new case can concern a new or existing client. “Two ways in” describes the drawing, not the business process. Use a parent heading **“Start a new case”** with two clearly labelled routes:

| Display route | Meaning preserved |
|---|---|
| **4A · New client: review the enquiry and establish the client record** | Lead form/PQR, duplicate candidates, staff identity decision and the firm's decision to take the case. A rejected enquiry stops before a case opens. A known person who happens to use this enquiry route is linked to their existing record; never create a duplicate merely because the heading says new client |
| **4B · Existing client: start another service** | Select the existing client record; open a new case without repeating lead/PQR; ask only the new service's missing eligibility/re-confirmation information |
| **Shared case creation** | Apply the selected combination, people/roles and pinned version, then reuse facts and collect gaps |

4A/4B are **presentation references to existing paths**, not new backend process IDs or permission rules. Keep the current stable stage/activity anchors and links, or maintain an explicit alias. Do not renumber 41 activities or confuse a navigation label with a new formal use-case identifier.

A heading alone must not imply a case exists before the firm takes it. This is the important qualification to the proposed simplification.

## 5. Concrete wording examples, anchored to current behaviour

| Current phrase | Proposed presentation | Preservation check |
|---|---|---|
| Gather the official material | **Attach the government forms and instructions for the selected combination** | First sentence names the content publisher and the base forms, document checklist, guide and eligibility sources. Conditional forms are still discovered by AI rules; do not make people manually select every conditional form |
| Two ways in / Way in A / Way in B | **Start a new case / 4A New client / 4B Existing client** | Preserve intake/identity/accept-or-close before common case creation |
| AI drafts the configuration | **AI prepares the draft combination setup** | Define setup by its actual outputs: field matches/maps, sections, document requirements, conditions, gates and views. Platform still assembles views by rules |
| Good to know | **Key rules** or **Important conditions**, according to content | Do not relabel process frequency as a business rule or make a proposal mandatory |
| Runs / Side by side | **Processing frequency / Parallel activities** | Clarify what repeats and what may proceed concurrently |
| Reuse verified information | **Pre-fill the case from each person's verified facts** | Same-person/context/date/permission and no “copy latest case” policy retained |
| Collect and verify the gaps | **Collect missing information and verify proposed values** | Existing verified facts are not reviewed again without a change/re-confirmation need |
| Check the form's meaning | **Check person and field selection** | Explain the proposed AI comparison; it flags, never approves or edits; separate it from read-back |
| Read it back | **Read-back: compare written values with expected values** | Expected value is after the approved transform, not necessarily the raw stored fact |
| What follows a decision? / End | **Continue in After decision** | Keep next-level route continuation and separate eventual case closure condition |
| Real read | **Official-form inventory and matching assessment** | Does not suddenly include XFA writing/Validate, portal execution or production proof |
| Published package / pathway version | Use the team's exact country-pack/version/row/item distinctions | Verify against the data model; do not solve the language issue by creating a new entity |

For the Canadian example, name **Immigration, Refugees and Citizenship Canada (IRCC)** on first use. IRCC is the government department; the representative/consultant is a separate actor. Elsewhere use the specific authority supported by that example's sources rather than assuming all product work is IRCC-only. [IRCC department page](https://www.canada.ca/en/immigration-refugees-citizenship.html).

Do not add “must” to every card. Use it for an actual requirement; a proposal and an illustrative process explanation must remain labelled accordingly.

## 6. Requirements-quality assessment

| Quality check | Current evidence / gap | Seven-lens home |
|---|---|---|
| Necessary and source-grounded | Strong links to source definitions and decisions; D245 hold timing still wrong | Solution; honesty; completeness |
| Correct level of detail | High/medium contracts and examples are useful. Final API/schema/story thresholds belong later; no arbitrary word cap | Completeness; readability |
| Unambiguous and consistent | Person/purpose/version distinctions improved; default-gateway and Held-state conflicts remain material | Completeness; language |
| Complete happy/alternative journeys | Setup, new/existing clients, family/corporate, zero/one/multiple prior cases, filing/change/adoption described | Completeness |
| Exceptions and boundary conditions | Missing facts/docs, staff-only fields, conflicts, no-map/urgent route, signing, timed-out submission and guide-only change present; suspicion interval and parallel readiness need correction | Completeness; solution |
| Authority and permissions | AI drafts/flags, staff verifies, separate publishing, permission-based form approval/submission; keep these distinct while rewriting | Solution; completeness |
| Observable/testable outcomes | Many local acceptance examples exist; text-presence tests missed contradictory conditions. Add scenario-specific expected outcomes | Completeness; feasibility |
| Traceability and change impact | Shared sources and delivery control exist; summaries, reading layer and examples still drift after local edits | Completeness; honesty |
| Feasible dependencies | Build gaps are named. Barcode/portal/final-file and AI performance need bounded evidence; do not imply these ran | Feasibility; honesty |
| Relevant quality attributes | Data/privacy/permission/version/retention/operations controls need their traced detail in the later pack. Do not invent numbers or add irrelevant checklists | Feasibility; completeness |
| Examples representative enough | Useful family and interaction cases; no numerical coverage claim. Ten-combination set still requires the agreed inputs | Completeness; readability |
| Understandable without chat | Medium-level explanation is substantial; vague headings and desktop composition still increase interpretation effort | Readability; usability; language |

Coverage is assessed against the declared needs, not by counting sections or claiming all imaginable edge cases exist. For each required journey verify entry, actor/authority, input/state, happy result, alternate/recovery, final state and observable acceptance example. Mark Not verified when evidence is absent.

## 7. Solution-quality assessment using scenario reasoning

Adapt the SEI approaches to this intermediate artifact, without importing their meeting bureaucracy. For each major choice ask: **need → chosen mechanism → simpler alternative → failure scenario → recovery → evidence/remaining risk**.

| Choice | Assessment |
|---|---|
| Shared canonical facts and separate person binding | Fits capture-once/family needs; repeat purpose/subject resolution is a concrete build gap, not a reason to introduce another AI agent |
| AI-assisted setup + reusable mappings + deterministic filling | Coherent chosen route. Compare manual authoring on the same library/control baseline; AI's benefit is unmeasured |
| AI meaning checker in addition to read-back | Plausible additional semantic control, still proposed. Evaluate incremental errors caught, false flags, human effort and cost; repeated model agreement is not proof |
| Explicit review/publishing and local holds | Reuses existing approvals. Fix suspicion-time hold and preserve unaffected work; no new central approval engine justified |
| New/existing-client entry and per-fact reuse | Sound. Simplify presentation under 4A/4B without removing duplicate/eligibility decisions |
| Adoption on existing cases | Correct deliberate version policy, guide-only dependencies and immutability. The pinned-case version answers next-filing version by current team rules; keep staff-closure ambiguity distinct |
| Desktop information layers | Useful overview → technical flow → local details. Improve layout/content hierarchy rather than replacing the approach |

Use reader tasks to test the design: trace a partner's date of birth; create a new case for a client with several histories; keep one filing moving while another lacks a fact; hold a suspected mapping error before triage; process a document-only adoption; recover an unmatched signed file. These expose design suitability; actual user comprehension remains unmeasured until someone tries them without coaching.

No “BCSO/Bosco” framework is used: the founder clarified it was a transcription typo. Keep the seven primary dimensions. The tests above enrich their evidence rather than adding a second scorecard.
