# Deliver an agreed outcome with Claude Code

Version 1 · 19 October 2026 · Founder-requested operating procedure (AIW-D248). Research and limits: [evidence note](../ai-workers/research/claude-code-autonomy-2026-10-19.md). Access and decision authority stay in [AGENTS.md](../AGENTS.md); review roles stay in [Workstream README §1](../ai-workers/README.md).

## 1. Give an outcome and evidence of completion

Work on the one outcome in `ai-workers/NEXT.md`. It may contain several implementation steps. Read the applicable context and current delivery control, then state a short plan with the user-visible result, necessary steps, observable acceptance checks and genuine unresolved decisions. Use existing plans and coverage records; do not create a parallel backlog or re-plan settled work.

For substantial new work, settle the consequential behaviour before implementing the dependent part. Planning continues as evidence emerges; an initial plan cannot remove every unknown. Choose routine, reversible implementation details yourself. Challenge a requested approach or your own assumption when evidence shows it harms the intended outcome; explain the consequence and a better option briefly.

## 2. Continue through the work

Within the authorised outcome: inspect → plan → implement → run relevant checks → inspect the result → fix meaningful failures → hand off. These are working steps, not separate founder approvals. Do not stop after a plan or an intermediate file if the authorised outcome can still be completed. Provide short progress updates at meaningful changes, without asking for permission to continue routine work.

Pause dependent work only for a behaviour-changing contradiction or missing decision, an action with an existing explicit approval requirement, a blocker that needs outside input, or the milestone review/context checkpoint. Continue useful independent work while a question is pending. The approved artifact order and formal review still apply. No permission bypass, scheduled runner, new framework or automatic remote session is implied.

## 3. Keep current intent without losing requirements

Use the current solution as the organising document and retain valid earlier needs. Read only the decision rows and evidence relevant to the work. Follow explicit amendments; a newer date alone does not settle a contradiction. Never silently drop a requirement, treat a proposal as agreed, or import a team's redesign merely because it is newer.

Revalidate claims such as “existing”, “supported” or “already implemented” before depending on them, following the freshness rules. Search the relevant local files, connected read-only sources and official documentation when needed; do not ask the founder where routine evidence can be found. Keep discovery focused. Mark unavailable evidence Unverified and avoid dependent claims.

For an unresolved material conflict, ask one selectable question: exact competing rules, effect on the user's journey, recommendation and one example. Record the answer once, then change only affected specification content, implementation and checks. Preserve the original one-pager and authoring files; corrections belong in the separate prototype working edition under D246. All agreed capabilities remain tracked; a first demonstration is not completion of the whole solution.

## 4. Make quality observable

Use the existing [seven lenses](../ai-workers/illustrations/actor-handoff-demo/evaluation-framework-2026-10-17.md), adapted to the delivered artifact. Avoid a second scorecard. For a working prototype, include:

- **Solution and coverage:** show the agreed configuration-to-questionnaires-to-staff-to-form journey, AI versus human duties, important alternatives and field/rule coverage. Do not replace difficult requirements with an undisclosed simulation.
- **UX and UI:** operate the actual screens and inspect screenshots. Check clear next actions, information hierarchy, readable layout, keyboard/focus, relevant narrow/wide widths, and meaningful empty, loading, review and error states. A screenshot alone does not prove interaction works; green tests alone do not prove good UI.
- **Reliability and growth:** test relevant invalid inputs, repeated actions, failure/recovery and version consistency. Check that adding another combination uses shared configuration rather than duplicating the journey. Reuse existing product mechanisms where verified and suitable. State actual performance measurements and conditions; scalability and production reliability remain unproven without relevant evidence.
- **Honesty:** distinguish real AI runs, deterministic processing, fixtures, simulation, inspected design and untested integration. Compare AI results with independently prepared expected answers under D246. Record missing evidence and limits without inflating scores.

Choose checks for the actual risk and impact. Fix defects that affect the stated outcome. Do not weaken checks to make them pass, create an architecture for hypothetical needs, repeat passing suites without a reason, or chase a reviewer's optional style preferences as blockers.

## 5. Save and hand off

Keep agreed behaviour in its existing authoritative home. Delivery control holds artifact versions/status and coverage links; NEXT holds the one next outcome; PROGRESS records milestone events; decisions records founder choices. Use existing records rather than maintaining another memory system. Checkpoint before losing reliable context, following the Workstream rule; save completed work, unresolved items, exact revision, checks and next action before starting a fresh session.

At handoff, provide the exact revision/hash, how to open/run the artifact, a short demonstration, evidence, unresolved limits and a bounded reviewer prompt. Codex coordinates review for now; the founder relays prompts. The maker's checks are self-verification, not independent review. A reviewer must not formally approve a revision it authored. A formal PASS and founder acceptance remain separate.

Every handoff says: **Completed · Evidence and limits · Next owner and action · Decision needed, if any.** The review coordinator requests a fresh reviewer session when context is unreliable, the checkpoint is due, or independence requires it. Do not invent a context-usage percentage or claim a new session ran without evidence.

## Reusable maker prompt

> Continue Workstream 2 from ai-workers/NEXT.md. Work only on its next outcome. Read the current project instructions, the solution's delivery control and playbook/autonomous-delivery.md. State the outcome and a short plan, then complete the authorised work through verification and meaningful fixes. Decide routine implementation details yourself. Raise only consequential unresolved decisions or approvals already reserved to the founder. Preserve valid requirements and revalidate stale assumptions. Keep specification, prototype and checks aligned. End with the saved revision, evidence and limits, a reviewer handoff, and the next owner/action. Do not claim founder acceptance or independent review yourself.

