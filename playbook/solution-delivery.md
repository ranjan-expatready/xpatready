# Repeatable solution delivery

Version 1.1 · 19 October 2026 · Set up at the founder's request for Solution 1 and reuse on later solutions. This is a local working process, not product acceptance or a change of maker. Access, source authority, decision and version rules remain in [AGENTS.md](../AGENTS.md). Execute an authorised outcome using [autonomous-delivery.md](autonomous-delivery.md); the numbered steps below are not separate founder approval rounds.

## 1. One solution, several explanations

**Current sources and recorded decisions → shared solution content → accepted overview → detailed explanations, screens and tests.**

The team's requirements describe required product behaviour; code shows what exists; decisions record agreed direction. A proposed improvement can go beyond today's code. Record a conflict with team requirements for the founder rather than silently choosing a winner. Meeting notes and chat are evidence of intent, not automatically accepted requirements. Label proposed, assumed and unknown behaviour.

The one-pager is the agreed high/medium-level spine, not a replacement for original sources. Later artifacts use **both** the accepted spine and the applicable original requirements, code, decisions and meeting inputs. New detail may expose a missing business decision; resolve it and update the spine if its meaning changes.

Write shared behaviour once in the existing solution data/model where practical. Generate views from it; manually maintained documents are acceptable. Never maintain independently editable copies of the same business rule without a named authoritative home and references. Do not create a synchronisation service or new document platform.

## 2. A small folder that can be repeated

Use [solution-template/](solution-template/) when starting a new problem, or add its missing parts to an existing problem folder. Keep the existing folder and filenames when they work.

| Item | Purpose |
|---|---|
| `README.md` | Entry point: problem, current deliverable and link to its control page |
| `CLAUDE.md` | Exact context to read, scope and current working instructions |
| `delivery-control.md` | Current versions, source pointers, need coverage, open changes, audit and acceptance |
| Existing solution sources and generated artifacts | The deliverables; do not copy them into the control page |
| `inputs/` and existing shared source folders | Raw material and read-only snapshots |
| Existing `checks/` and `archive/` | Review evidence and retained earlier versions |

The control page is the single home for artifact status and acceptance, not another requirements specification. Shared `NEXT.md` names the one next action and links to it; `PROGRESS.md` records events. Decisions stay in the existing decision register. Link existing trace/test/change records instead of duplicating their rows. Start with one table row per meaningful need or behaviour cluster, splitting only where different sources, outcomes or tests require it.

**Reuse the method; choose the presentation.** Select diagram notation, detail-card format and outputs for the new problem's readers and decisions. BPMN, seven phase views, eye icons and a seven-slide limit are not universal defaults. Reuse useful styles and components after checking fit. After Solution 1 succeeds, capture the few proven patterns and pitfalls here; do not declare its current layout a proven standard in advance. Create an automation or agent skill only when repeated work demonstrates a concrete benefit.

Solution 2 remains parked until the founder starts it. Reuse its existing folder rather than replacing it with a template. Future Solution 3 and later can use the same pattern; starting one never carries over Solution 1's acceptance, domain rules or evidence.

## 3. Build and elaborate

1. **Frame and ground:** establish problem, users, outcome, boundaries, applicable sources and freshness. Use the existing freshness procedure. Record the check time and exact versions; mark failed checks Unverified and avoid dependent claims.
2. **Design the spine:** describe the end-to-end happy path, important alternatives, actors, authority, records and recovery. For each handoff give enough trigger/input/action/rule/output/next-owner detail to make behaviour testable. Omit inapplicable headings rather than filling a rigid template with empty text. Add small examples where they remove ambiguity.
3. **Review and accept:** maker checks the sources and challenges the design; independent review checks the saved revision; founder accepts it for its stated purpose after material issues close. Existing founder approvals count: do not re-ask settled decisions.
4. **Elaborate agreed artifacts:** derive the walkthrough, detailed requirements/workbook, sketches and expected-behaviour prototype from the same accepted revision plus original sources. Preserve stable activity/rule/requirement IDs. Sketches and prototype explain the intended interaction; clearly label simulated behaviour. Add implementation detail in its proper home, with tests linked back to behaviour.
5. **Review the package:** reconcile all outputs against the source baseline, accepted spine and each other. Deliver a coherent handover with remaining dependencies and evidence limits.

This is a reusable pattern, not permission to reorder an approved plan. **Solution 1 follows D246's explicit amendment to D229/D232, D247's review clarification and the current NEXT:** refreshed sources/conflict table → targeted 4.3 recheck → founder acceptance → consequential conflict decisions before dependent work → preserved baseline → working, configuration-driven prototype. The walkthrough and detailed pack/workbook stay planned; the earlier expected-behaviour prototype is replaced for the combinations covered by the working prototype. Full agreed capabilities remain tracked. Production implementation and pilot proof are separate from document acceptance. Do not infer acceptance or restart completed gates from this summary.

## 4. Changes without drift

For a source update, feedback or newly discovered gap:

1. Record the changed need once, its source, proposed correction and affected existing IDs.
2. List affected artifacts; mark them **Update required**. An old accepted revision remains historical evidence, not the current answer to the changed need.
3. Change the authoritative solution item or record a new founder decision where required. Preserve earlier versions under existing rules. Do not edit raw inputs, code captures or source snapshots.
4. Regenerate or manually update the affected artifacts and references. Reconcile summaries, examples, screens and expected tests; do not silently edit only the overview.
5. Run checks appropriate to the impact. Recheck material fixes and dependent behaviour; repeat a full audit for a substantial flow/source/authority change, not every wording edit. Record evidence, reviewer disposition and the new coherent revision.

Unchanged artifacts may remain current if an explicit impact check finds no effect. There is no need to rebuild every artifact for every change. Keep a closed change row or link to its existing change record so future sessions can see why versions still align.

## 5. Evidence-backed evaluation

Use the existing [seven-lens framework](../ai-workers/illustrations/actor-handoff-demo/evaluation-framework-2026-10-17.md) as the rubric (six lenses until the founder added the seventh, functional language and consistency, on 18 October 2026, AIW-D244); its source references, reader tasks and the lens 7 checks remain in that one home. Adapt scenario coverage to each new problem. Do not create a competing scorecard with further categories.

| Lens | Essential evidence |
|---|---|
| Solution quality | Solves the actual need; necessary components, alternatives and failure recovery |
| Completeness and precision | Need-to-behaviour-to-test coverage; consistent actors, authority, dependencies and terminology |
| Readability | Readers can explain the journey and examples; useful detail is not penalised just for length |
| Usability | Actual panel/navigation/keyboard/phone checks and a visual inspection of layout, type, spacing, colour and contrast |
| Honesty and transparency | Source, proposal, implementation, simulation and measurement clearly distinguished |
| Implementation feasibility | Reuse, concrete gaps, dependencies, operation and technical uncertainty supported by evidence |
| Functional language and consistency | Precise actor/action/object/condition/result statements; one term per thing; consistent obligation and certainty; overview, diagrams, panels, rules, examples, exceptions and acceptance checks agree. Test: could two reasonable readers derive materially different behaviour? |

Non-ambiguity, traceability, testability, accessibility, security/privacy, AI controls and maintainability are checks within these lenses, wherever relevant. Do not force irrelevant requirements into every solution. Keep the three headline summaries: solution, communication and high/medium requirements.

For each lens record **score / evidence / remaining gap / smallest next action**. Use Pass, Partial, Fail or Not verified alongside scores. The founder's aspiration is at least **9/10 in every lens**. A score is an explained judgment, not a success percentage; never raise it to satisfy a target. If evidence prevents 9, report the limit and its owner. If the founder chooses to proceed below target, record the explicit exception within the existing acceptance decision; this is not another approval round. Never use an average score to conceal a material defect.

## 6. Final audit and acceptance gate

Run the final integrated audit **after all in-flight content, detail-panel and visual changes and material fixes have landed**. A verdict on an earlier hash does not approve later edits.

- Freeze the exact output and relevant source files, with version/hash manifest and source-freshness evidence. Archive as existing rules require.
- Review the original needs and applicable requirements/code/decisions/meeting inputs, not only the maker's summary or preservation ledger. Reconcile source conflicts and unsupported claims explicitly.
- Read every detail panel and the full journey. Check actors, inputs, rules, state changes, handoffs and receiving conditions; derive acceptance outcomes without inventing business behaviour.
- Walk meaningful happy, failure and boundary scenarios. For Solution 1 include new/returning clients with zero/one/multiple prior cases, per-fact currency/conflicts, family/representative identity, document and mapping gaps, partial holds, change adoption, signing mismatches and filing boundaries. Record what was inspected versus executed.
- Check all current artifacts for mutual agreement. At the one-pager gate, future artifacts can be Planned; an old prototype or workbook must not be presented as aligned with the new spine.
- Perform browser interaction **and** screenshot inspection at relevant desktop/tablet/phone widths and light/dark themes. Inspect all icon details, examples, focus/return, table overflow, label collisions, typography, spacing and meaningful colour. A green automated suite does not replace this pass.
- Maker/product reviewer responds to findings with evidence; the independent reviewer challenges the response and rechecks material corrections on the final revision. Preserve the project's formal checker role and writing boundaries. A single reviewer's role-based reasoning is not evidence of several independent people agreeing.
- Publish the seven-lens scorecard, material/minor findings, unresolved evidence, precise purpose verdict and acceptance record. Record human comprehension as Not verified until actual readers try it; use existing founder/team feedback, without inventing a new review committee.

**Ready to ask for one-pager acceptance:** every necessary need has a trace or explicit unresolved disposition; no open material contradiction, handoff/authority gap or inaccessible essential detail; applicable source checks and targeted fix rechecks are recorded; scores and evidence limits are honest. If the agreed score target is unmet, continue justified fixes or record the founder's explicit below-target choice in that same acceptance decision. Acceptance is for high/medium solution alignment, not detailed build readiness or proven production performance.

**Ready to start the next artifact:** founder acceptance identifies the exact spine revision, purpose and accepted limitations; the next artifact's inputs and intended depth are named; required earlier steps in the approved sequence are complete or an explicit change is recorded. Never infer acceptance from a passing build, a score or an unfinished checker report.

## 7. Starting the next solution

The founder can say: **“Start Solution N on [problem]. Reuse the solution-delivery playbook, propose only the artifacts and format this problem needs, and keep it separate from earlier solutions.”**

The Lead fills the template's problem, source list, deliverable choices and next action; reuses shared records and components; then follows the same evidence, change and acceptance loop. One next outcome at a time. No new folders for deliverables the problem does not need.

Change log: 18 October 2026 — initial process and template requested by the founder; Solution 1 final audit remains pending. This setup does not accept any product artifact or start another solution.

Change log: 18 October 2026, audit close — Solution 1 integrated audit completed; correction and acceptance remain pending in its delivery control. Clarified that a below-target choice is recorded within existing founder acceptance, not a new approval stage.

Change log: 18 October 2026, cohesion pass — the founder added a seventh lens, functional language and consistency (AIW-D244). Earlier six-lens scores stay as historical assessments for their own revision; no seventh score is given retrospectively.

Change log: 19 October 2026 (D248) — link autonomous execution within an authorised outcome and correct the stale D229/D232-only sequence to D246's working-prototype amendment. No artifact accepted or product behaviour changed. Prior version preserved with the instruction snapshot.
