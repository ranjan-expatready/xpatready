# Claude Code delivery workflow: research and project choice

19 October 2026 · Official sources read online for the founder's request. This supports an operating method; it does not prove the prototype works or establish product acceptance. No software installed or permission settings changed.

## Findings

| Primary source | Finding and project application |
|---|---|
| [Claude Code: Best practices](https://code.claude.com/docs/en/best-practices) | Give the agent explicit completion checks, relevant context and a plan proportionate to the task. Include actual visual verification for UI work. Our application is an outcome with checks and a self-correction loop. The project already has planning and reviews; more permission pauses at every internal step add little value. The documentation also warns against endless exploration and finding-driven over-engineering. |
| [Claude Code: Project memory](https://code.claude.com/docs/en/memory) | Keep persistent instructions concise and consistent; CLAUDE.md is context rather than enforced configuration. Our application is a short root pointer to the operating procedure and saved project state, with specific source/decision reads as needed. Auto memory is not the authority for requirements. Written instructions cannot guarantee compliance or zero hallucinations. |
| [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) | The published experiment uses incremental features, saved progress and end-to-end checks to address premature completion and poor continuity between contexts. We reuse NEXT, PROGRESS, existing coverage/check records and preserved versions. We do not adopt its commits because this project prohibits them. The article describes one experimental approach, not evidence that every product should use a new SDK or many agents. |
| [Anthropic: Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) | Start with the simplest adequate approach and add complexity when a demonstrated need justifies it. Our choice is the existing Claude Code maker and separate reviewer workflow, with explicit checks. A new agent platform is unnecessary for this setup. This is a project judgment, not a universal ranking of frameworks. |

## Concrete problems found locally

The pre-change files are preserved in `archive/ai-workers/autonomous-delivery-2026-10-19-before-d248/`, with a SHA-256 manifest.

| File and section, before correction | Exact stale instruction | Effect and correction |
|---|---|---|
| `playbook/README.md` §4 | “The session stops at each gate for the founder.” | Conflicts with the founder's request for independent execution. Internal steps now continue within the authorised outcome. Actual decisions and existing reserved approvals still go to the founder. |
| Problem 1 `CLAUDE.md`, session steps 1–2 | “Founder says go.”; “covering the meeting digest, the v6 document and the team design” | Repeated permission and an obsolete audit target. Use the current next outcome and evidence relevant to the change; no automatic new general audit. |
| Problem 1 `CLAUDE.md`, context items 4–5 | `drive-snapshot-2026-10-13-1535`; `ERv2-sanitized@b48e4ce-2026-10-15` | Hard-coded older inputs could override the current source register. Resolve current captures through delivery control and the source index, with the existing freshness check before reliance. This setup makes no new live-source freshness claim. |
| Root `CLAUDE.md`, Every session | “a separate Claude session is the checker” | Superseded by D247's Claude Code or Codex choice. Current assignment and role boundaries point to the Workstream README. |
| `playbook/solution-delivery.md` §3 | “Solution 1 keeps D229/D232” followed by the old artifact order | D246 explicitly amended that order. Point to D246 and NEXT so the maker follows the working-prototype sequence. |

## Choice and limits

Applied under D248: [autonomous delivery procedure](../../playbook/autonomous-delivery.md). Claude Code remains maker; Codex coordinates review. No new mandatory peer, tool, status register or framework. The original one-pager and its authoring sources remain unchanged. Product conflicts and baseline acceptance are not settled by this workflow change.

Verification of this setup covers instruction consistency, references, preserved history and the original HTML hash. Its effect on actual Claude Code behaviour remains unverified until the first run. The procedure is an evidence-informed starting point; adjust it only when observed failures justify a change. The latest clarification rejects both automatic “newest wins” and blind obedience to earlier assumptions.

