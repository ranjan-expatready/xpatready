# Start here — the founder's handover (21 Oct 2026)

## What this is
ExpatReady's AI layer, first capability: **Pathway Configurator**. A content publisher sets up each immigration combination once — AI drafts it from IRCC forms and checklists, people review and release it — and from that setup every case gets the right questions, documents and forms, facts are asked once, and forms fill themselves. We build it as a **production-grade local reference**; your development team retrofits it into ERv2.

## The final outcome
1. **Milestone 2 (Super Admin):** seven working screens — Programs, AI work and proposal review, combination workspace with preview, shared library (Fields, Sections, Document types, Forms, Checks), rules map, releases, activity — each with a handover pack for the team.
2. **Milestone 3 (case officer) and 4 (client):** open a case, family link, document reading into confirmed facts, form review, checked PDF.
3. **End-to-end demo:** configure a combination with AI → open a case → client answers and uploads → officer confirms → PDF filled and checked.

## Who does what
| Who | Where | Does |
|---|---|---|
| You (founder, and RCIC reviewer for now) | This Project's chat + Claude Code terminal | Decide (≤3 questions per screen), agree concepts, type `/next`, paste blocks, walk each built screen as an RCIC |
| Lead (Claude chat) | New chat in this Project, Xpatready folder connected; type `/lead` | Designs screens, checks Claude Code's work, holds decisions and the journal (LEAD.md) |
| Builder (Claude Code) | Terminal opened at the Xpatready folder; type `/next` | Builds, tests, self-reviews with a fresh subagent, fixes, writes handovers |

## The loop
`/next` in Claude Code → it does one stage → ends with "Paste to Lead" → paste it to the Lead → Lead checks/decides/designs → `/next` again. Stages per screen: concept → agreed → build → self-review → fix → lead check → RCIC check (you) → handover.

## Files (all in this folder)
PRODUCT.md (rules, menu, words, decisions) · STATE.md (where we are) · SCREENS.md (all screens and stages) · LEAD.md (Lead journal) · REQUESTS.md (everything you've asked) · PATTERNS.md (one way to build everything) · RULES-MODEL.md, TAXONOMY.md, MASTERS.md (how the data and rules work) · UX-RULES.md, QUALITY.md, STANDARDS.md (how work is judged) · WORKFLOW.md · decisions/ · screens/NN/ (concept, build notes, review, handover).
