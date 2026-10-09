# AI Workers — how this workstream runs

**Owner:** Ranjan Singh (founder). **Maker / lead:** Claude. **Started:** 8 Oct 2026.
**Resume point:** [`NEXT.md`](NEXT.md), always read it first. The project-wide rules in `../AGENTS.md` still apply here.

## 0. Mandatory rules (read first, every session and every agent)

1. **Two workstreams (Ranjan, 9 Oct 2026, AIW-D14).** Workstream 1 is the non-AI product the team builds. **Workstream 2 is ours: everything AI.** That means AI Workers, AI Doers (Reader, Sorter, Drafter, Checker), every Doer, the Conductor, agents and automation. The product does not go live without Workstream 2.
2. **Carve out, then improve.** The Drive requirement documents mix AI and non-AI. Read them in full (newest snapshot), carve out every requirement that belongs to Workstream 2, wherever it sits (AG, SA, CP, Doc 1–4, decisions log), then challenge it, fix gaps and improve it. Existing wording is evidence, not gospel. Treat it as our own product. Ratified founder decisions (FD-n) still change only with Ranjan's yes.
3. **No duplicate source of truth (AIW-D22).** If a requirement already exists in the Drive documents, cite it (ID, file, version) and build on it. Never restate or re-author it. Workstream 2 files contain only references, gaps, improvements and the AI Worker layer. The register in `design/ws2-baseline/` is a reference index with quotes, not a second copy of the requirements.
3a. **Assume it is built (AIW-D21).** Everything in the documents is treated as built or to be built; timelines and team capacity are not Workstream 2's concern. Design the best product.
3b. **Agents improve the rules and the plan (AIW-D23, D30).** Found something that should be a rule, a decision or a change to the plan? Append it to `proposals.md` (type Rule / Decision / Plan). The Lead merges rules and plan changes into `README.md` §0 and `PROGRESS.md` and tells Ranjan; Ranjan ratifies decisions. Nobody follows the plan blindly.
4a. **Local only.** All Workstream 2 work lives in this folder. Nothing is written to Drive, any repository, the mailbox or anything shared (AIW-D10, enforced in settings).
4b. **Write like a person.** Chat updates are short and plain, in small chunks. Documents are plain English with no jargon (explain any unavoidable term where it appears), complete and in depth (AIW-D15).
5. **Investor-grade.** Every claim has a source or is labelled Proposal, Assumption or Unknown. Ranjan's reputation and the raise depend on it (AIW-D9).
6. **Report after every step, unasked (AIW-D20).** One outcome per step, no side artefacts (AIW-D28). When a step finishes, the Lead tells Ranjan in a few plain lines what changed, what it means, what is needed from him, and where to look. Nothing waits for him to ask.
7. **Bookkeeping (9 Oct, merged after the audit).** `PROGRESS.md` is the one-page plan and log: every agent appends a line when it starts, at milestones and when it finishes. The Lead commits to the local git repository (no remote) at the end of every step. `REPORT-CARD.md` holds the story, honest ratings and audits; a short audit at session start, not at end. The simulator was retired on 9 Oct (AIW-D30); any prototype is a standalone page in `prototype/`, every screen traced to a requirement.
8. **Coach, and never follow blindly (AIW-D6, D20).** Challenge Ranjan's asks and our own earlier decisions; say plainly when something is weak; challenges and their outcomes are recorded in `decisions.md`.

## 1. The idea in one paragraph (Ranjan, 8 Oct 2026, in his words, paraphrased)

Whatever a person does in Expat Ready by hand, an **AI Worker** does the same thing **by operating Expat Ready itself**. It works through the product's own screens, rules, country packs, Doers, permissions and audit trail. It does not invent answers outside the product. Because the product fixes the method, the AI cannot freelance. The same input gives the same result, and every step is checked and recorded. Planning assumption, labelled as such: the product is treated as **ready**, even though it is still being built.


**The goal, in Ranjan's framing (9 Oct, AIW-D19).** Workstream 1 is a best-in-class product built for people: it guardrails them and automates their work across pathways, scoring, forms, documents, CRM and follow-up. Workstream 2 builds the best-in-class **AI layer** on top: whatever a person does in the product, an AI version can do it the same governed way. The AI layer has four shapes, and the catalogue must cover all of them:

| Shape | What it is | Example |
|---|---|---|
| **Task worker** | Does one job, very well | Follow-up chaser; document reader |
| **Journey worker** | Runs a whole journey end to end, stopping at approvals | File Builder (retainer signed → ready for review) |
| **Role twin** | An AI version of a human role, with that role's permissions | AI case officer; AI intake clerk |
| **Expert co-pilot** | Knows the whole system, the immigration rules in the packs and the firm's case files; answers any question, in context, with sources | "Which of my files are at risk this week, and why?" |

Some work needs two kinds at once: a task worker that acts, and the expert that advises. Many versions and avatars are expected. All shapes obey the same rules: on behalf of a named licensed person (AIW-D13); output approved by a named person, whoever the firm's settings allow for that role, licensed by default (AIW-D26); the expert co-pilot answers only and never acts (AIW-D25); firms only (AIW-D11).

**In plain words — Doer:** your specifications already define "Doers". These are in-house tools, each doing one job (Mailer sends email, Scheduler books consultations, Biller invoices, Signer collects signatures, Drafter writes documents, Qualifier assesses, Minder chases deadlines, and others). The "Conductor" engine runs them. An AI Worker uses the same Doers; it does not replace them. Per FD-16 and decision AIW-D13, it is **not its own user**: it acts **on behalf of a named licensed person**, with only that person's permissions, and nothing takes effect until a human approves it.

## 2. What we will produce

| # | Deliverable | Who it is for | Form |
|---|---|---|---|
| D1 | Competitor study: VisaFlo first, then the wider immigration-software and AI-agent field | Ranjan, investors | Report with sources |
| D2 | Product component map: every plane and module (Admin SA-1…12, Firm AG-1…17, Client portal CP-1…9, Foundation, Doers) on one picture | Ranjan, team, investors | Visual (web page) |
| D3 | AI Worker catalogue and mapping: which worker handles which component, its guardrails, and who signs off | Ranjan, investors, team | Visual + detailed report |
| D4 | Proposition and pricing for AI Workers, reconciled with the current price (CAD 199/seat published) and the open per-firm vs per-seat decision | Ranjan | Section added to `../commercial/plan.md` and `model.xlsx`, **not** a competing plan |
| D5 | Investor material: a high-level story plus the detailed working-level report (D3) | Investors, only when Ranjan says so | Deck/page, published only on Ranjan's yes |

## 2a. Two phases: concept first, then requirements (Ranjan, 9 Oct 2026)

| Phase | Waves | What Ranjan gets | Where it lives |
|---|---|---|---|
| **A. Concept** | W1 Evidence (fresh sources, full read of every requirement document, VisaFlo study) → W2 AI Worker concept (component map, worker catalogue, guardrail model) → W3 Commercial concept (proposition, pricing, investor story) | Understand and approve the idea at business level | `ai-workers/` |
| **B. Requirements** | Steps 2–3 of the plan (`PROGRESS.md`) | Behaviour documents, then build specifications developers can build from, with worked examples and generated test cases | `design/behaviours/`, `requirements/` (same document format as the Drive FR documents, until Ranjan places them on Drive) |

Gaps in the product requirements: we **assume they will be filled**, record each assumption in [`assumptions.md`](assumptions.md) with its effect, and never present an assumption as a fact.

## 2b. One source of truth: where each thing lives (nothing is kept twice)

| Thing | Only home | Rule |
|---|---|---|
| Where we are, what's next | `PROGRESS.md` (plan and log) and `NEXT.md` (handoff); `REPORT-CARD.md` holds story, ratings and audits | Replaced each session; `PROGRESS.md` and `NEXT.md` are loaded **automatically** at session start by the hook in `../.claude/settings.json` |
| Ranjan's decisions for this workstream | [`decisions.md`](decisions.md) | Append only, dated, with his exact words |
| Assumptions filling product gaps | [`assumptions.md`](assumptions.md) | Each one has an ID, its effect, and who can confirm it |
| Product facts | newest `../sources/drive-snapshot-*` | Never the archive; never a copy older than Drive |
| Concept outputs | `research/`, `design/`, `commercial/` | Superseded versions move to `archive/`, never kept side by side |
| Detailed requirements (Step 3) | `requirements/` in the Drive FR document format | Concept files link to them; text is not duplicated |
| Review findings | `checks/` | One file per review |

## 3. Roles (sub-agents in `../.claude/agents/`)

| Role | Does | Writes only to |
|---|---|---|
| **Lead and coach (Claude, main session)** | Plans waves, writes every shared file, integrates. **Coaches Ranjan (his request, 9 Oct):** sharpens or corrects his asks before acting, says plainly when an idea is weak or a claim would not survive an investor or regulator, and ends each wave with the questions he must answer | everything in `ai-workers/` |
| `competitor-analyst` | Researches competitors from their own sites, LinkedIn, reviews, press; separates fact from claim | `research/` |
| `requirements-cartographer` | Reads the requirement documents module by module; builds the component inventory with exact citations | `design/inventory/` |
| `ai-worker-designer` | Proposes AI Workers per component: task, inputs, Doers used, guardrails, human sign-off | `design/workers/` |
| `commercial-strategist` | Proposition, pricing, business case, investor story, built on the existing commercial plan | `commercial/` (drafts; Lead merges into `../commercial/`) |
| `adversarial-reviewer` | Independent hostile check before anything reaches Ranjan: invented facts, missing citations, regulatory overreach, copying competitors | `checks/` |

One writer of shared files: only the Lead edits this README, `NEXT.md`, the wave briefs and anything outside `ai-workers/`.

## 4. How a step runs

1. **Freshness first.** The hook runs `tools/freshness.sh`; the Lead searches Drive for files modified after the newest snapshot. If any master is newer than our copy, the Lead takes a new dated snapshot (`../sources/README.md`, "How to refresh") **before** reading requirements. Never read the archive as current.
2. **Step brief → Ranjan's yes** (one outcome, which agents, what is out), given in chat and recorded in `PROGRESS.md`.
3. Agents work in parallel, each in its own folder.
4. Adversarial review → findings fixed or recorded in `checks/`.
5. Ranjan reviews. Lead updates `PROGRESS.md` and `NEXT.md` (replace, don't append) and commits.

## 5. Guardrails for this workstream

- **Read everything, change nothing outside this folder** (Sanjay and Ranjan, co-founders, 9 Oct 2026). Shared accesses: Drive, email, GitHub (company and personal), calendar. No writes to any repository, Drive or mailbox. Enforced in `../.claude/settings.json`.

- **Nothing invented.** Every product fact cites file, version, section and exact words from the newest snapshot. Every competitor fact cites a URL and date. Anything else is labelled *Proposal*, *Assumption* or *Unknown*.
- **Don't copy competitors.** We cover what they do *by our own approach* and say where we go further. We never reuse their wording, screens or names.
- **Regulated work.** In Canada only a licensed person (RCIC or lawyer) may represent a client. Every AI Worker that touches advice or filing ends at a **named human sign-off**. Approval is by a named person, as the firm's settings allow for that role, licensed by default (AIW-D26). Never claim product-enforced licensed sign-off. The exact limits get the label *confirm with counsel / RCIC*.
- **Scope (Ranjan, 8 Oct 2026, decision AIW-D1):** *"all ai features, ai workers and doesr will be part of scope of this excercise and project"*. The Program Charter on Drive still lists them as "NOT IN RELEASE 1". Updating the Charter is Ranjan's job; we never edit Drive. Each wave shows what the AI scope means for the March 2027 launch date.
- **Small context, fresh facts.** Agents read the inventory and their own module files, not everything. Summaries are written to files so a new session starts from `NEXT.md` and needs nothing from chat history.
- Publishing, outreach, investor sending: only on Ranjan's explicit yes.
