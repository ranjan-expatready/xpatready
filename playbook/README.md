# The working method: documents with AI, without drift or invention

Entry page for every workspace (requirements, solution design, later go-to-market). Written 17 Oct 2026 (AIW-D216); execution revised 19 Oct 2026 (D248). Prior instructions preserved in `../archive/ai-workers/autonomous-delivery-2026-10-19-before-d248/`.

## 1. Files are the memory, not the chat

| File | Job | Rule |
|---|---|---|
| `CLAUDE.md` in the folder | Scope, the exact files to read, the files never to read, the gates, the writing standard | Under 200 lines. Loads by itself when Claude touches the folder |
| `README.md` | One-screen status: the document, inputs, decided, open | Updated at each checkpoint |
| The agreed solution | One authoritative solution, with the explanations its readers need | One per problem; derived artifacts stay aligned through delivery control. Preserve earlier versions under the archive rules |
| `inputs/` | Raw material (minutes, exports) | Never edited |
| Workstream `NEXT.md`, `PROGRESS.md`, `decisions.md` | Handoff, log, decisions | NEXT replaced at checkpoints; the others append only |

## 2. Start from the named context; discover only what the outcome needs

- A folder's `CLAUDE.md` names the starting files and boundaries. Focused discovery in relevant local files, connected read-only sources and official documentation is allowed. Ask the founder for missing intent or authority; find routine evidence yourself. Do not search unrelated workspaces or replay history without a concrete need.
- **Always open Claude at the project root (`Xpatready`).** Opened in a subfolder, the project's hooks (resume, never-lose, bookkeeping) do not run.
- Start every session with one line that names the folder: `Continue Workstream 2 from ai-workers/NEXT.md. Work only on its next outcome.`

## 3. Truth before writing

- Order of truth: team documents → team code → founder decisions → official pages → named practice → reasoning.
- Every claim is labelled **Source · Decision · Official · Practice · Assumption · Unknown**. Unlabelled claims are cut.
- Conflicts are shown and go to the founder; nothing is settled silently.

## 4. Complete the authorised outcome

**Plan → verify relevant evidence → resolve consequential decisions → build → check and fix → hand off.** Continue through internal steps without a founder stop at each one. Follow [autonomous-delivery.md](autonomous-delivery.md); raise genuine unresolved decisions one at a time with a recommendation and consequence. Existing reserved approvals, independent review, founder acceptance and the approved artifact order still apply. Use [solution-delivery.md](solution-delivery.md) for cross-artifact consistency.

## 5. Two sessions, two roles

The **maker** owns the working files; the **formal checker** reviews the saved revision in a context started separately from the maker. The maker supplies the exact revision, review scope, evidence and a copyable prompt; the founder relays it to the assigned independent reviewer or opens a fresh Claude Code/Codex session (or authorises fresh delegation) when needed under D248. One formal check is required, not a mandatory peer-plus-checker pair. The reviewer's recorded identity, exact revision, evidence and verdict establish that review happened; the maker cannot self-certify or grant founder acceptance. Current role/write boundaries and bootstrap prompts have their home in `../ai-workers/README.md` §1 and `../AGENTS.md` (D247, continued-review clarification D248).

## 6. Writing standard

- The main path reads in 15 minutes; detail goes in appendices.
- A picture before prose.
- Every sentence carries a fact, a decision, a number or a consequence.
- Pros, cons and challenges as tables, with owners.
- One name per thing.

## 7. Versions

Access and version rules have their authoritative home in `../AGENTS.md`. Follow those current rules, including the current prohibition on commits; do not infer permission to commit from this playbook's earlier D213 wording. Preserve prior major versions and record the change; the never-lose hook is a safeguard, not acceptance evidence.

## 8. Starting a new workspace (e.g. go-to-market)

Copy `workspace-template/` to `<workspace>/`, fill in its `CLAUDE.md` (problem, aim, context list, out of scope), and add one line to the root `CLAUDE.md` workspace map. Rules that apply everywhere stay in this file and `AGENTS.md`; never copy them into the workspace.

## 9. Repeating a solution without document drift

For a solution with several related artifacts, follow [solution-delivery.md](solution-delivery.md) and use [solution-template/](solution-template/). One small control page links sources, agreed behaviour, artifact versions, changes, audit and acceptance. Reuse the method while choosing the format for each problem. Solution 1 is the first application; Solution 2 remains parked until started by the founder.

Change log, 18 October 2026: founder-requested reusable solution delivery and audit process added; version/access guidance points back to AGENTS.md instead of repeating conflicting commit instructions. No change of Lead or product acceptance.

Change log, 19 October 2026: D247 clarifies the separate formal-review session, tool-neutral assignment, explicit handoff and recorded review evidence. No mandatory third peer review; no change to product scope or acceptance.

Change log, 19 October 2026 (D248): mandatory founder stops at each internal phase and approval to discover routine evidence are replaced by outcome-driven execution. Evidence, meaningful checks and review remain required; prior instructions preserved. Research and reusable maker prompt are linked from the operating procedure.
