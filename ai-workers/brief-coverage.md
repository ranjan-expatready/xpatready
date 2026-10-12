# Brief coverage — every ask in `founder-brief.md`, where it is handled, and its status

*The adversarial reviewer checks this table at the end of every wave. An ask may not disappear; it can only be done, scheduled, or explicitly parked by the founder.*

| # | The founder asked for | Handled by | Status (dated per row; last full pass 11 Oct) |
|---|---|---|---|
| B1 | A workflow that never deviates: roles, sub-agents, skills, tools, project file | README §3–5, `.claude/agents/` (6 roles), skill `ai-workers-resume`, `AGENTS.md` pointer, this table | Done |
| B2 | No junk data; always the most up-to-date data | `tools/freshness.sh` + Drive check at every session start (hook); archive never current; new dated snapshot when stale | Done (mechanism); refresh itself is in W1 |
| B3 | Use Drive, email and GitHub | Drive: snapshots. GitHub: new dated code copies. **Email: read-only search for competitor, customer and investor threads, only after the founder's yes (privacy)** | Done: email searched, personal repos read (E4–E6), Drive snapshot 9 Oct, code copies 9 Oct |
| B4 | Clone the most recent code | source-keeper takes `code/<repo>@<sha>` from GitHub `dev` | Done 9 Oct |
| B5 | Treat the product as ready | Assumption AIW-A1 | Done |
| B6 | AI Worker concept: AI uses the product the way a person does; guardrails; same result every time | README §1; ai-worker-designer rules; guardrail model | 11 Oct: Steps 1–2 done (`design/ai-organisation.md`, seven behaviour documents, AIW-D36 to D72); Step 3 build specification in re-check |
| B7 | Include the Doer concept | Inventory of every Doer + Conductor; AI Workers act through Doers | W1 inventory, W2 design |
| B8 | Pricing strategy | commercial-strategist, reconciled with CAD 199/seat and per-firm question | 11 Oct: `commercial/price-card.md` (Step 1); options (a) and (b) lead the ten conversations (AIW-D60); full pricing in Step 5 |
| B9 | Proposition | commercial-strategist | Step 5–6 (9 Oct plan: W3) |
| B10 | High-level complete business plan, ready to sell | Extends `../commercial/plan.md` + `model.xlsx` (no competing plan) | Step 5–6 (9 Oct plan: W3) |
| B11 | Investor material (high level) | commercial-strategist; published only on the founder's yes | Step 5–6 (9 Oct plan: W3) |
| B12 | Detailed working-level visual report of innovative AI Workers | ai-worker-designer catalogue + visual report | 11 Oct: catalogue (`design/workers/`) and pages `visual/w2-workers.html`, `visual/ai-organisation.html` done; prototype (Step 3 item E) pending |
| B13 | VisaFlo study (website, LinkedIn); confirm identity; don't copy; cover all they do; show where we are better (guardrails, scale) | competitor-analyst (a); "they do → we cover → we go further → they lead" table | Done: visaflo.md incl. §16 comparison (20 areas) |
| B14 | Competitors in the wider workflow / AI space | competitor-analyst (b) | Done: field-scan.md v2 (rebased 9 Oct) |
| B15 | Read **all** requirements, module by module | 3 requirements-cartographers + `coverage.md` proving every file read in full | Done: 46/46 files read in full, 7 slices, coverage lists |
| B16 | Where AI can be used and how it is delivered | Inventory → worker design | Done: inventory + catalogue (28 workers) + module map |
| B17 | Visual: whole product by component, mapped to AI Worker X, Y… | Component map web page with worker mapping | 9 Oct: W2; see `PROGRESS.md` |
| B18 | Claude takes the lead and asks for what it needs | Lead role; decisions asked in chat and logged in `decisions.md` | Ongoing |
| B19 | Resume in new sessions with no loss and no context overload | SessionStart hook loads `NEXT.md` + freshness; files are the memory; agents read only their slice | Done |
| B20 | Tell me what I'm missing; work back to the target | "Missing" list each wave. Target date dropped by AIW-D21 (contradicts AIW-D4; the founder to confirm, audit 9 Oct §5.4) | Ongoing |
| B21 | Concept first, then detailed requirements developers can build | Steps 1–3 (`PROGRESS.md`); Step 3 = AW-01, AW-02, change notes, test cases, prototype (`requirements/`) | 11 Oct: concept done (Steps 1–2); build specification in its last re-checks; test cases and prototype next |
| B22 | Assume gaps are filled, labelled | `assumptions.md` | Done: AIW-A1..A9 registered (9 Oct) |
| B23 | Write the prompts for me | `PROMPTS.md` | Done |
| B24 | Be brutally honest; grill me | Honest status in `NEXT.md`; open questions each wave | Ongoing |
| B25 | Step by step, three layers (business organisation → behaviours → build spec), no over-engineering, one outcome per step (AIW-D28) | `PROGRESS.md` plan table rebuilt on 9 Oct | 11 Oct: Step 1 done, Step 2 done and decided, Step 3 in re-check |
| B26 | Step R rethink (11 Oct): role AI teammates with skills, driving test per skill, platform as the guardrail, blueprint and coded prototype, moat on the deterministic platform (AIW-D81 to D91) | `rethink-plan.md`; `handbook/ai-team-profiles.md`; research files of 11 Oct; `direction-review-2026-10-11.md` | 12 Oct: handbook part 1 re-checked (R1-b pass with fixes, held for the framework); blueprint and prototype not started |
| B27 | Deep research on AI accuracy: can AI results be deterministic, reflect the product's rules, be repeatable and consistent (12 Oct) | `research/ai-accuracy-and-determinism-2026-10.md` | 12 Oct: Done (passed R2 and R2-b) |
| B28 | One framework: what is rules only, AI with rule tools, AI language, person only; how to sell it ("rules under the flavour of AI"); path to a multi-million product (12 Oct) | `design/rules-ai-classification-2026-10-12.md`; `research/rules-and-ai-positioning-2026-10.md`; then `design/rules-and-ai-framework-2026-10-12.md` | 12 Oct: classification in check R4; positioning failed R3, fix round running; framework document not started |
