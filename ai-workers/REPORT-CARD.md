# Workstream 2 report card

*Audited by the Lead at the start of every session. Ratings are the Lead's honest judgement, out of 10, with the evidence. Replace, don't append; git keeps history.*

**Last audit:** 9 Oct 2026, 16:30 IST. Full five-step audit (setup, freshness, quotes, drift, over-engineering) on Ranjan's instruction (`PROMPTS.md` §1a).

## 1. The story so far (so a new session knows how we got here)

| When | What happened |
|---|---|
| 8 Oct | Ranjan's voice brief: build an "AI Workers" layer on Expat Ready, study VisaFlo, pricing, business plan, investor story, visual map, resumable workflow. Setup created (README, agents, resume skill). He paused W1 to review. |
| 9 Oct morning | Honest admission: the requirement documents had only been searched, not read. Automatic resume hook, decisions log, assumptions, prompts added. Ranjan gave full authority; W1 ran: fresh Drive snapshot (46 files), code copies, 7 readers read every file in full, VisaFlo and 40-competitor studies, email evidence, founders' June Doer specs. Hostile review found 3 blocking items; fixed. |
| 9 Oct midday | Ranjan's decisions: everything AI is **Workstream 2** (ours); firms only; keep FD-16 (AI acts on behalf of a named person); File Builder wedge + Deadline Guardian hook; find every use case; four shapes (task, journey, role twin, expert co-pilot). |
| 9 Oct afternoon | W2: reference index of 1,300+ AI/Doer/Conductor requirements, 28-worker catalogue, 41 improvements, hostile review (2 blocking); all fixed. Challenge review of every decision; Ranjan answered: assume everything is built, timelines not our concern, approval = human per the firm's role settings, co-pilot answers only, report after every step. |
| 9 Oct evening | Direction review; verification pass (code and Drive current, Charter quotes verified); local git history; W2 page published with 28 workers, product map and 22 decisions. |
| 9 Oct, 16:30 | **Full audit (this card, §5).** Setup sound. Drive moved again (team document re-copied; a new team test-case sheet noted). 39 quotes and 5 competitor URLs checked, 0 wrong, 1 citation gap. Drift found: commercial deliverables unstarted while requirements work grew; process over-built; two of Ranjan's decisions contradict each other on timelines. Scores lowered where earned. |

## 2. Ratings

| Parameter | Score | Evidence | What would raise it |
|---|---|---|---|
| Evidence quality | 8 (was 8) | 46/46 documents read in full (agents' own report, backed by the coverage lists); 269 + 39 sampled quotes checked, 0 wrong; 24 + 5 competitor URLs opened, all confirm; one citation gap found today (`research/visaflo.md` billing row cites a page that lacks three of its items; fixed to say so) | Re-check competitor pages on the day anything goes to an investor |
| Freshness, no stale or duplicated data | 8 (was 9) | Snapshot 9 Oct from the master folders; code copies match GitHub `dev` except ERv2-frontend (moved again, copy when Phase B needs code); no stale snapshot or archive cited anywhere (grep, 0 hits). Lowered because Drive moves within hours: the team document copied at 07:16 UTC had changed by 09:18 UTC, and a new team sheet ("Super Admin Test Cases") appeared that no manifest knew | Accept that team documents change daily; re-copy only the ones a wave cites, on the day it cites them |
| Isolation from junk | 8 | `archive/` and `code/` git-ignored and ruled "never current"; agents read only the newest snapshot; every citation checked today points to it | Nothing further |
| Direction and strategy | 6 (was 8) | The wedge (File Builder, per-file price) and the "moat" (governed AI, packs, audit) are hypotheses accepted on the Lead's recommendation with no customer evidence. The brief's four commercial deliverables (pricing, proposition, business plan, investor story) are unstarted; the plan had drifted to building requirements and a demo first | Run the validation script and price card (W3b) before Phase B; VisaFlo's own AI claims re-read before any "they cannot copy" line |
| Workflow setup | 6 (was 8) | Resumable and safe (hook, deny rules, local git, decisions log all work). Over-built: three overlapping state files, 13 rules with duplicate numbers, a skill that repeats the hook, seven small process files, two indexes of the same documents (see §5.5) | Ranjan's yes to the removals in §5.5 |
| Honesty and challenge | 8 (was 9) | Two hostile reviews, challenge review, invented quote caught. Lowered: the last card said "files match Ranjan's latest instructions"; this audit found two places that still follow timelines he told us to drop (§5.4) | Keep auditing our own claims first |
| Validation with customers | 2 | None yet | 5–10 peer conversations (W3b) |
| Things built | 1 | Nothing runs; requirements and strategy only | File Builder demo in the simulator (Phase B), after W3b |
| Communication | 7 (was 8) | Short step reports; two pages. Lowered: 22 decisions put to Ranjan at once; he needs the 5 that block first | Split the 22 into "blocking now" and "later" |

## 3. Plan and waiting-on-Ranjan

Live only in `PROGRESS.md` (plan table and "Waiting on Ranjan"), since the 9 Oct audit removals. The 9 Oct audit below stays as the record.

## 5. Full audit, 9 Oct 2026 (the five steps Ranjan asked for)

### 5.1 Setup
- Hook ran: this session opened with the report card plan, the progress table, `NEXT.md` and the freshness report.
- Agents: **six** files in `.claude/agents/` (source-keeper, competitor-analyst, requirements-cartographer, ai-worker-designer, commercial-strategist, adversarial-reviewer); the seventh role is the Lead, the main session, which has no file. `PROMPTS.md` §1a said "seven agents"; corrected. All six carry the no-duplication, proposals and progress rules (checked word by word).
- `.claude/settings.json` denies `git push` (both forms), every `gh` write (pr, issue, repo, release, secret, variable, workflow, and `api` with POST/PUT/PATCH/DELETE/--method) and the five Drive write tools.
- Local git: 9 commits, no remote.

### 5.2 Freshness
- Code: all dated copies match GitHub `dev` except ERv2-frontend, which moved again on 9 Oct (b4c7702). Take a new copy only when Phase B reads code.
- Drive, files modified after the 9 Oct morning snapshot (none in the requirement folders):
  - "Expatready - SAModules" (team journey document, vaibhav@): changed at 09:18 UTC, after our 07:16 UTC copy. **Done:** re-copied as `07-team-documents/Expatready-SAModules_vaibhav_2026-10-09T0918Z.md`. The change adds SA-02 test scenarios (invoices, subscription, discounts); nothing about AI, Doers or the Conductor, so no Workstream 2 file is affected.
  - "Super Admin Test Cases" (Google Sheet, vaibhav@, 09:14 UTC): new; the team's QA test cases for the Super Admin plane. **Not copied** (not a requirement); noted in `07-team-documents/README.md`. Read it when Phase B writes generated test cases, so ours use the team's format.
  - "ExpatReady — Full Build in Two Sprints" (sheet, ak@, 03:58 UTC): already noted, a delivery plan, not copied.
- Stale citations: `drive-snapshot-2026-10-0[23]` 0 hits in `ai-workers/`; `archive/` 3 hits, all rule text, no citation.

### 5.3 Hallucination spot-check
- 20 random quotes from `design/ws2-baseline/`, `design/workers/catalogue.md` and `design/ws2-improvements.md`: 15 were source quotes, **15 match word for word** (the only differences are bold, code marks and table pipes, which are formatting, not words). 2 were the catalogue's own "why it sells" lines, labelled *Proposal wording* but written in quotation marks. 3 were not quotes at all (text between two separate quoted phrases). A second random draw of 25 citation-bearing quotes: **24 match, 1 not a quote**. Total: 39 real quotes, 0 wrong.
- One cosmetic risk: quotation marks are used for both source quotes and our own proposal lines. A reviewer can tell them apart only by the label. Rule tweak, no new file: our own wording goes in italics, never in quotation marks.
- 5 competitor claims opened live (9 Oct): Chrome extension counters (203 users, 1 rating, v1.0.6, 26 Sep 2026, non-trader) **confirmed**; homepage tagline, footer line, Claude/ChatGPT logos **confirmed** (now also listed under a "Filing & Monitor Agent" integrations list); terms (liability cap, customer indemnity) **confirmed**; billing row **partly confirmed**: PDF invoices, receipts, Stripe, balances, QuickBooks CSV are on `/crm`; milestones, reminders and invoices-to-leads are not on that page (the row also cites "changelog 2025-06" without a link). Fixed: the row now says which items come from which source and marks the three as Unknown until the changelog link is added.

### 5.4 Purpose and drift
**What Ranjan asked for on 8 Oct, in order:** a workflow that never deviates and resumes without loss; fresh data, no junk; clone the code; treat the product as ready; AI Workers that operate the product with guardrails and the same result every time; the Doer concept; pricing, proposition and a high-level business plan to raise money; a detailed visual report of innovative AI Workers; VisaFlo covered and bettered, never copied; a component map of the whole product with workers assigned; tell him what he is missing.

**Where the work went beyond the ask**
1. **Scope grew from "AI Workers on top of a ready product" to "everything AI, every Doer and the Conductor"** (his decision AIW-D14). That produced a 29-file reference index of the team's own automation requirements (`design/ws2-baseline/`, 792 quoted extracts) on top of the 14-file product inventory from W1. Two indexes of the same documents. The no-duplication rule (AIW-D22) says "cite, never restate"; the baseline is a copy in all but name. It was useful once (the catalogue was built from it); it should now be frozen, not maintained.
2. **41 improvements to the team's requirements** (delegation record, hard-limits list, Doer roster, an FD-8 amendment). The brief said AI Workers use the product; these change the product. They are good findings, but they are Workstream 1 changes that the team cannot see (local only). Ranjan must decide how they reach the team.
3. **Process:** seven roles, hook, skill, report card, progress, proposals, assumptions, brief coverage, prompts, three Lead opinion files, two wave briefs: about 900 lines of process for two days of work. The brief justifies the hook, `NEXT.md`, `decisions.md` and the deny rules; not the rest (§5.5).

**Where the work drifted from the ask**
4. **The money is unstarted.** Pricing, proposition, business plan and investor story are four of the brief's deliverables; none has begun, and the plan had put developer requirements and a demo (Phase B, my idea from the direction review) ahead of them. His words were "very easy selling", "make a lot of money", "raise". Fixed in §3: validation and the price card come before Phase B.
5. **The code was cloned and is unused.** No Workstream 2 file cites the code. Not wrong (Phase B will), but no return yet.
6. **VisaFlo was "most important"** and was studied once. Since then their homepage lists Claude and ChatGPT integrations and a filing and monitoring agent, and they sell direct to applicants (OpenVisa). Any "they cannot copy this" line is an assumption until re-checked on the day it is used.

**Where Ranjan's later decisions contradict his original ask or each other**
- **Timelines.** 8 Oct brief and AIW-D4: work back from the March 2027 launch, show the cost against the date. AIW-D21: "don't think about the timelines". Our files followed D21 but `brief-coverage.md` B20 and `PROMPTS.md` §3 still asked for the launch-date cost. Corrected to D21; he should confirm.
- **Charter.** AIW-D1/D14 say AI is in scope and the product does not go live without it; the Charter his team plans from says "NOT IN RELEASE 1". Until he edits Drive, the team is building to the opposite decision.
- **Approval.** AIW-D17 (licensed-only) was superseded by AIW-D26 (human approval per firm settings); recorded correctly. One improvement (IMP-17b) proposes an exception to D26; it is in the 22 decisions.
- **"Product is ready" (brief, A1) against "carve out and improve the product's own automation" (D14).** Both cannot hold; the improvements file is the result of the second.
- **"Concept first" (D5) against "let's start building" (D18) against "assume everything is built" (D21).** Nothing runs. "Building" here can only mean requirements and a demo.

**Assumptions that were dressed as facts (now labelled)**
- "AI WordPress" = AI Workers was marked "unconfirmed" in `founder-brief.md`; his 9 Oct words ("concept of AI work", "AI workers") confirm it. Note updated.
- The last card's "files match Ranjan's latest instructions": partly wrong (timelines, above).
- "46/46 documents read in full": the agents' own report, backed by their coverage lists. Evidence, not proof. Now worded that way.
- The wedge (File Builder, per-file price), the hook (Deadline Guardian) and the moat: the Lead's judgement, accepted by Ranjan, zero customer evidence. Direction score lowered from 8 to 6 to say so.
- "The product does not go live without Workstream 2" (README §0.1): Ranjan's decision, not the team's plan; the Charter says otherwise.
- `assumptions.md` A5 repeats A1 (both: everything is built). Merged.

### 5.5 Over-engineering: what has not earned its place (removals, for Ranjan's yes)
**Rules (README §0):** 13 rules, two numbered 4, three numbered 6. Proposed: merge 6a/6b/6c into one bookkeeping rule (progress line, commit at step end, audit at session start only, not at end); renumber. Keep the rest; each is one of his decisions.

**Files, in order of confidence that they can go:**
| # | File | Why it has not earned its place | Proposal |
|---|---|---|---|
| 1 | `ai-workers/CLAUDE.md` | Repeats README §0 and the root `CLAUDE.md`; two unique lines | Move the two lines into README §0; delete |
| 2 | `.claude/skills/ai-workers-resume/` | The hook already does its steps 1–3; `PROMPTS.md` §1 does the rest | Delete the skill and the pointer in `AGENTS.md` |
| 3 | `checks/lead-verification-2026-10-09.md` | 8 lines, already summarised in this card | Delete |
| 4 | `design/challenge-review-2026-10-09.md` | Its outcomes are decisions D21–D27 | Move to `ai-workers/archive/` |
| 5 | `design/wedge-recommendation.md` | Superseded by catalogue §3 and D18 | Move to `ai-workers/archive/` |
| 6 | `wave-brief-W1.md`, `wave-brief-W2.md` | Waves done; status is in `PROGRESS.md` | Move to `ai-workers/archive/` |
| 7 | `design/inventory/coverage-*.md` (7) + `SCHEMA.md` | Proof-of-reading lists; their value was consumed by review W1 | Merge into one `coverage.md` |
| 8 | `research/field-scan.csv`, `visaflo-capabilities.csv` | Same tables as the `.md` files; nothing reads them | Delete |
| 9 | `REPORT-CARD.md` §3–§4 | Duplicate `PROGRESS.md` (plan) and `NEXT.md` (handoff) | After this session: plan lives only in `PROGRESS.md`; this card keeps story, ratings and audits; hook loads less |
| 10 | `PROMPTS.md` §1a, §2, §4 | §1a is used once (now); §2 goes with the wave briefs; §4 (Codex) never used | Delete those three sections |
| 11 | `design/ws2-baseline/` (29 files) and `design/inventory/` (14 files) | Two indexes of the same Drive documents; the baseline is the no-duplication rule's blind spot | Cannot delete (the catalogue cites both). Freeze both: no maintenance, no third index; Phase B cites Drive files directly |
| 12 | Agent `source-keeper` | Used once; the Lead did every later freshness check in minutes; `sources/README.md` holds the procedure | Delete the agent |

Agents kept: `adversarial-reviewer` (used twice, caught real errors), `ai-worker-designer` (W2, Phase B), `commercial-strategist` (W3), `competitor-analyst` (refresh before investor use), `requirements-cartographer` (only if Drive requirements change materially).

Not touched: the deny rules, the hook, `decisions.md`, `assumptions.md`, `proposals.md` (22 rows used), `brief-coverage.md` (this audit's drift check ran on it), local git.
