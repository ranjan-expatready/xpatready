# Token efficiency: why our workflow burns the weekly plan, and the saving plan (2 Nov 2026)

Asked by the founder (2 Nov ~15:50 UTC): "I have completed 100% of another account in 2 days using this workflow … how are people in industry doing it?" Research by a fresh agent on a cheaper model, from Anthropic's Claude Code documentation and engineering posts plus marked third-party sources. **Shares are estimates** to be checked by measurement (step 0).

## What we measured
Weekly plan 0% → 26% in about 5 hours (`get_usage`). Tech lead chat: 654k tokens of context, woken many times an hour. 11 cloud Opus builders + qa + a local paid runner. Per PR: builder tests, a fresh reviewer agent, a breaker for screens/money/schema, the Devin bot, a qa subagent on the PR head, and a full re-review after any push. About 70k tokens of tools, instructions and memory in every session before any work.

## Why (ranked; nesting itself is not the multiplier: cost is every request of every agent, each re-sending that agent's whole context)
| # | Cause | Est. share | Source |
|---|---|---|---|
| 1 | The tech lead's 654k context re-sent on every wake (scheduled checks, cross-session messages, background events) | 20–30% | code.claude.com/docs/en/costs ("Why usage climbs in a long session") |
| 2 | 11 Opus builders in long multi-row sessions: each turn re-reads every earlier row | 25–35% | costs doc (agent team costs) |
| 3 | Review fan-out per PR, redone after each push; each fresh agent pays a cold start, 5-minute cache by default | 15–25% | docs/en/prompt-caching ("Subagents and the cache"); anthropic.com/engineering/multi-agent-research-system |
| 4 | Opus (and effort) everywhere, including read-only reviews and searches | 10–20% | Claude Enterprise consumption guide; docs/en/model-config |
| 5 | Fixed startup load (~70k: tools, MCP definitions, skills, memory, process docs) in every session and subagent | 5–10% | costs doc |
| 6 | Large files read whole (backlog, decisions, capabilities) stay in context and are re-sent each turn | 5–10% | docs/en/context-window |
| 7 | Cache misses and rebuilds (model switches, gaps over the cache lifetime, different folders) | 3–8% | prompt-caching doc |
Normal, for comparison (Anthropic): about US$13 per developer per active day, under US$30 for 90% of users; agent teams about 7× a single session; multi-agent research about 15× a chat. Our design (a lead + 12 Opus agents + per-PR review fan-out) is far beyond one developer's usage, so the burn follows from the design.

## Saving plan (best ratio of tokens saved to quality lost first; combined estimate 50–65% at the same quality)
0. **Measure first:** `/usage` breakdown on the Mac sessions; telemetry for cloud builders if available; re-measure after each change.
1. **Small tech lead (no quality loss, est. 15–25%):** restart from STATE.md; hand over under about 150k; auto-compact at about 200k; detail lives in files read by line range or grep (P-276 already hands over).
2. **Events, not polling (none, est. 8–15%):** no recurring 20-minute prompt; a Monitor script or a CI/PR webhook wakes the lead only on a state change; builders report by PR label or comment, not by messaging the lead.
3. **One row per builder session (none, est. 10–20% of builder spend):** a fresh session (or `/clear`) per row, with the state in BACKLOG/STATE.
4. **Cheaper reviews, same strength (low, est. 8–15%):** re-review only the diff since the last reviewed commit; no re-review for a conflict-free merge of main; reviewer with read-only tools and a fixed checklist; breaker only for money, schema, permissions and new screens. *Founder decision:* qa per merge batch or milestone instead of every PR head, keeping a full pass on high-risk rows.
5. **Model tiers (medium risk, pilot against qa scores, est. 10–20%):** Sonnet for subagents and ordinary rows (`CLAUDE_CODE_SUBAGENT_MODEL=sonnet`), Haiku for read-only searches, Opus for schema, money, AI drafting and design. *Founder decision.*
6. **Lighter startup (none, est. 4–8%):** disable unused MCP servers and check tool search is on; split DECISIONS and CAPABILITIES into an index plus detail files (nothing deleted, P-188).
7. **Builders matched to merge capacity (est. 5–10%):** six (P-276).

## Sources
code.claude.com/docs/en/costs · /prompt-caching · /scheduled-tasks · /cross-session-messaging · /sub-agents · /agents · /model-config · /context-window · /best-practices · /channels · anthropic.com/engineering/multi-agent-research-system · claude.dev/blog/lessons-from-building-claude-code-prompt-caching-is-everything · support.claude.com articles 11145838 and 14782391 · third party (estimates): cloudzero.com/blog/claude-code-agents, developersdigest.tech/blog/what-parallel-claude-agents-actually-cost, alexcloudstar.com/blog/claude-code-usage-limits-2026.
