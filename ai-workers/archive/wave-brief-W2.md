# Wave brief W2: carve out Workstream 2, challenge it, and design the AI Workers

**Date:** 9 Oct 2026 · **Lead:** Claude · **Authority:** Ranjan's standing approval (AIW-D7) and his Workstream 2 direction (AIW-D14). Started on that basis; Ranjan can stop or redirect at any point.

## Why
Ranjan's direction: Workstream 2 is everything AI (AI Workers, AI Doers, all Doers, the Conductor, agents, automation). The Drive documents mix it with the non-AI product. We pull it out into one place, check it, improve it, and design the AI Workers on top. Without one clean baseline, every later document (pricing, investor story, developer requirements) would rest on scattered and conflicting text.

## Work

| Step | Agent | Output | Done when |
|---|---|---|---|
| 1. Carve out | `requirements-cartographer` × 2: **(A)** the engine and AI: Conductor/automation, the four AI Doers, Needs you, autonomy and floors, AI switch and provider, AI logging, FD-16/FD-20, related SA rules (SA-03, SA-06, SA-08, SA-11, SA-12) and the founders' autopilot spec; **(B)** every other Doer (Signer, Scheduler, Biller, Qualifier, Filler, Binder, Reviewer, Minder, Reminder, Tasker, Mailer, Messenger, Dialer, Reporter, Finder, Clocker, future Doers) wherever it appears in AG, SA, CP and Doc 1–4 | `design/ws2-baseline/` with one file per capability. For each requirement: ID, exact words, source file and version, release label as written, and conflicts with other sources | Every AI, Doer or Conductor requirement found in the W1 inventory is either in the baseline or listed as deliberately left out, with the reason |
| 2. Challenge and improve | `ai-worker-designer` | `design/ws2-improvements.md`: for each capability, what is weak, missing or contradictory, and the proposed fix, labelled **Proposal**, with the reason and the risk if not fixed | Covers at minimum the review W1 gaps: acting on behalf of a person, one audit record for "AI prepared / person approved", AI provider and Canada-only processing, licensed sign-off (B-3), Reader auto-classify, AI metrics, form auto-fill |
| 3. AI Worker design | `ai-worker-designer` | `design/workers/`: the AI Worker catalogue (job, modules covered, manual work replaced, Doers and recipes used, guardrails, who approves, value, cost-to-run drivers, dependencies) and the mapping of every product module to a worker | Every module on the W1 product map is either assigned to a worker or marked "no worker, and why" |
| 4. Review | `adversarial-reviewer` | `checks/review-W2-<date>.md` | No open blocking findings |
| 5. Visual | Lead | Updated page: product map with AI Workers on it, the Workstream 2 baseline, improvements, decisions | Ranjan can read it without the files |

## Rules for this wave
- Carve-out is faithful: exact words, no rewording. Improvement is separate and labelled.
- Ratified founder decisions (FD-n) are not changed; a proposal may recommend Ranjan change one.
- Legal, regulatory and immigration values: "confirm with counsel / RCIC".
- Plain English (AIW-D15). Local only (AIW-D10).

## Out of this wave
Pricing, business plan and investor story (W3). Developer-level requirements in the `product/requirements` format (Phase B).

## Budget
About 6 million tokens of new work (4 agents plus the review).

## Open with Ranjan
- **B-3 closed (AIW-D26):** approval by a named person per the firm's role settings, licensed by default. Licensed-only was rejected.
