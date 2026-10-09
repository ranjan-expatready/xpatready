> **SUPERSEDED 8 Oct 2026.** Historical draft kept for reference. The current plan is [plan.md](plan.md) / plan.docx and the current model is model.xlsx. Do not use this file's funding figures.

# Review of Codex's company-planning workflow

**Claude, 7 Oct 2026.** I reviewed:
- `company-planning/START-HERE.md`, `WORKFLOW.md` v1, `COVERAGE.md`, `HANDOFF.md`, `SOURCE-REGISTER.md`, `.claude/skills/saas-company-planning/SKILL.md`;
- `company-planning/research/ai-tools-2026-10-07.md`.

I compared them with the commercial work already under way: `commercial/README.md`, `00-evidence-baseline.md`, the draft workbook, and research R1–R6. This is a reviewer's view for Ranjan and Codex, not a change to either file set.

## Recommendation in one paragraph

Adopt four things from Codex's workflow:
- the coverage checklist, as a floor;
- the CP-gates;
- the eight challenge cases;
- the financial-model rules.

Remove the parts that restate the artifact outlines. Fix three gaps before the next batch:
1. The decision rights must reflect Ranjan's 7 Oct delegation of pricing and other open choices.
2. A cash-critical-path rule. The founder capital may run out before launch revenue, so funding cannot wait for "regular customers".
3. A counsel-procurement step. Several actions are blocked on legal review, and nothing in the workflow obtains it.

Keep one review cycle per batch. Do not open a second Claude session while this one is writing. On AI tools: buy nothing. Run the sample test only if a specific output from the current workflow is shown to be deficient.

## What adds value (adopt)

| Item | Why it helps | How I am using it |
|---|---|---|
| `COVERAGE.md`, 44 IDs | A floor that exposes gaps. Rows C22–C26 (product feedback, release, security operations, content updates, monitoring) were thin in my outline | `coverage-map.md` maps every ID |
| CP-G0 to CP-G4 gates | Evidence to advance, kept separate from product gates G1–G5 | Adopted; my timing tags now map onto them (see "Duplicates") |
| Eight challenge cases | Concrete stress tests: audience fraction, slow onboarding, slips, refunds, no investment, simulated features, lawyer versus consultant rules, decision conflicts | Run in the workbook and the artifacts before handoff |
| Financial-model rules: deferred revenue, cohorts, CAC counted once, no lifetime-value claim without retention evidence, a cash identity | Prevent common model errors | My draft workbook passes the cash identity and annual-prepay rules. It lacks a deferred-revenue line and true cohort tables; to be fixed in the next version |
| Source register, item 1 | Caught a real error: I had assigned the consultant licence to Ranjan from an ambiguous statement | Corrected in baseline RAN-2 and K-5 |
| Reward-programme checklist (duplicate leads, payout timing, fraud, disputes, no multi-level schemes) | More complete than my outline | Folded into Artifact 2 |
| Trackers as workbook tabs, no paid CRM needed | Keeps tool spending at zero until there is a pipeline | Adopted |
| One writer; reviewers write findings only | Same rule as the product method | Already in force |

## What duplicates existing work (trim or merge)

| Duplication | Risk | Suggested change |
|---|---|---|
| WORKFLOW §3 restates the contents of each artifact, which `commercial/README.md` already specifies | Two specifications drift apart; authors satisfy one and miss the other | WORKFLOW §3 keeps only quality rules (model rules, reward checklist) and points to `commercial/README.md` for structure |
| CP-gates vs my P/C/F/L/R timing tags | Two vocabularies for the same thing | Map them: P = CP-G0; C and F = CP-G1; L = CP-G2 and CP-G3; R = CP-G4. Use the gate labels in the plans |
| SOURCE-REGISTER vs the baseline | Facts held in two places | Acceptable as written: the register selects sources and the baseline holds facts. Keep it that way |
| START-HERE launch prompt vs the HANDOFF prompts | Three copies of similar instructions | Keep the prompt only in HANDOFF |
| START-HERE says to start a fresh Claude session in `company-planning/` | Two Claude sessions writing `commercial/` would break the one-writer rule | Continue in the current session. Start a fresh one only after this one stops writing |

## What is missing or should be challenged

| # | Gap or challenge | Evidence | Proposed change |
|---|---|---|---|
| 1 | **Decision rights are out of date.** The workflow says "Ranjan decides material unresolved choices". On 7 Oct he delegated pricing, plan names and the other open questions to Claude ("take a stand… pros and cons") | Baseline RAN-13, RAN-14 | Add a "decided on Ranjan's behalf" class: labelled, overturnable, listed in the decision summary. External actions (contact, spend, publish, equity) still need his explicit yes |
| 2 | **No cash-critical path.** The workflow treats funding as something that "may occur before any launch gate" | Workbook draft: with the placeholder product cost of CAD 25,000 a month, no-raise cash turns negative in month 9 (June 2027) in M1/M2 and month 7 in the higher-capacity models. That is before meaningful revenue (baseline RAN-10) | Add a rule: the actual product-team cost is the first input. If runway at launch is under 9 months, a funding process starts at CP-G1 on founding-firm evidence, not after launch |
| 3 | **No step to obtain legal advice.** "Confirm with counsel" appears often, but nothing hires counsel or budgets for it. The founding terms, referral rewards, website claims, terms of service and investment documents are all blocked on it | WORKFLOW §3; OBS-4 (terms are an unreviewed draft) | Add a dated action: shortlist and engage Canadian counsel for a fixed-scope review (Artifact 4). It needs Ranjan's authorization to spend |
| 4 | **The live website is a present risk, not just a reconciliation item.** It promises SMS, SSO, 99.9% uptime and more today | Baseline K-10 | Add an immediate action, with an owner, to correct or label the claims. It needs Ranjan's authorization because it is a public change. No referral or promotion until done |
| 5 | **Customer evidence is under-weighted.** The workflow has six research lanes, but the critical path is founder conversations (CP-G1), which no model can run | Baseline section F: hypotheses HYP-1 to HYP-7 are untestable from documents | Make "founder discovery calls per week" the first metric in the weekly review. Cap research lanes once a decision is supported, as WORKFLOW §2 already says |
| 6 | **Rules for prospect data are missing.** C16 covers referral disclosures but not building prospect lists from the CICC public register, or anti-spam consent for cold email | Research R3 (in progress) | Add a coverage row: prospect-data sourcing and consent (privacy rules on publicly available information; anti-spam implied consent); confirm with counsel |
| 7 | **The ideal-customer profile and demographics Ranjan asked for are not explicit** | Ranjan's chat of 7 Oct (RAN-9) | Add to C03/C06: licensee population, location, practice structure and languages from published aggregates only. No inference of individual gender or ethnicity |
| 8 | **The investor story needs a market beyond Canada.** Ranjan's ambition is to raise as much as possible (RAN-12). A Canada-only, practice-software market may limit how much investors will commit; this needs evidence | Market counts in R2/R6 (pending) | Add a deferred research row: comparable practitioner populations in the UK, Australia and the US for the expansion narrative (FD-22 already designs for multiple countries) |
| 9 | **Founder equity and roles.** Investors will ask who owns what. Sanjay owns the company; other founders' equity is unknown | RAN-11, K-5 | C01/C30 should require a founders' agreement (roles, equity, vesting) as a funding-readiness item |
| 10 | **The team's plan of 9 Oct is not an explicit input** | product/NEXT.md | Add it: launch month and onboarding tooling in the workbook are updated from it |
| 11 | **Process weight.** Five process files plus reviews before any plan exists. On 6 Oct Ranjan warned against heavy machinery that wastes work (lean-simulator lesson) | Claude memory: lean-simulator-scope | Hold to "one review, then only affected checks". No new process files without a stated decision they serve |

## Challenge to Codex's AI-tool research

- **Agreed:**
  - buy nothing now;
  - a planning app does not prove a better model;
  - a claim of being "fine-tuned" is a claim until substantiated.
- **Challenged:**
  - **Value of the question.** Which AI tool to use is not on Expat Ready's commercial critical path. The binding constraints are customer evidence, cash and legal review. A second full pass, as I was asked to make, should therefore stay small (R6, running).
  - **The sample test.** It costs founder time and money: accounts, three outputs per tool and blind scoring. The rubric weights (25/20/20/15/10/10) are reasonable but arbitrary, as Codex itself notes. Run it only for a named deficiency, for example if the workbook cannot be maintained by Ranjan's team, and then test only one or two tools on that single task.
  - **Category.** The more relevant category may be formula-preserving financial-model tools or spreadsheet AI, not business-plan writers. R6 is checking this.
- **R6 result** (`research/R6-ai-tools-independent.md`):
  - **Agreed with Codex:** buy nothing; no vendor substantiates its training claims.
  - **Disagreed with Codex, with evidence:**
    1. Upmetrics should not be the first test candidate. It claims a "specifically trained" layer, but its terms name OpenAI and Anthropic as providers, and its financial export is values-only (no live formulas).
    2. Plan Pilot is not a credible "evidence lead": its privacy page returns 404, its app returns HTTP 530 and no company is named.
    3. The three-output, multi-vendor sample test is not worth running: most candidates fail basic export requirements before any scoring.
  - **Smallest useful addition:** a planted-error check and an independent recalculation in each workbook review. If Ranjan wants one test: an audit of a fictional copy of the workbook with a spreadsheet AI already licensed. No purchase.

## Short recommendation for Codex to review

1. Keep COVERAGE (as a floor), the CP-gates, the challenge cases and the model rules. Delete WORKFLOW §3's restated artifact contents and point to `commercial/README.md`.
2. Update decision rights for Ranjan's 7 Oct delegation (RAN-13, RAN-14).
3. Add three rules or rows:
   - the cash-critical path (actual product cost first; funding starts at CP-G1 if runway at launch is under 9 months);
   - counsel procurement as a dated, budgeted action;
   - prospect-data and anti-spam sourcing.
4. Add coverage for the ideal-customer profile and demographics (aggregates only), the expansion market for the investor story, the founders' agreement, and the 9 Oct team plan as a model input.
5. Treat the live website's claims as a present risk with an owner. Changing them needs Ranjan's authorization.
6. Never run two Claude writers; one review cycle per batch.
7. AI tools: no purchase; no multi-vendor sample test. Add a planted-error check and an independent recalculation to the workbook review (R6).
